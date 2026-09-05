-- ════════════════════════════════════════════════════════════════
-- StrayPaw, grant organisation access by email, before or after signup.
--
-- THE PROBLEM
--
-- Attaching someone to an organisation required their auth.users row to
-- exist, so the only workable order was: they sign up, tell you, you run
-- something, they reload. Every step in that chain is a place a pilot
-- stalls, and it puts the fiddliest part on the person you are trying to
-- make welcome.
--
-- THE FIX
--
-- Access is granted to an email address. Whether that address has an
-- account yet does not matter. When somebody signs in, the app calls
-- claim_org_membership(), which looks for an invitation matching their
-- verified email and joins them to the organisation. Invite first, sign up
-- later, in either order, with no follow-up step.
--
-- The email comes from the session's own JWT, not from anything the client
-- passes, so an invitation cannot be claimed by someone else typing an
-- address they do not control.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, partner-onboarding.sql.
-- ════════════════════════════════════════════════════════════════

create table if not exists org_email_invites (
  id          uuid primary key default uuid_generate_v4(),
  ngo_id      uuid not null,
  email       text not null,
  -- 'lead' can mint invite codes and invite others; 'member' works the
  -- dashboard. Both see the same organisation data.
  role        text not null default 'member' check (role in ('lead', 'member')),
  invited_by  uuid,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid
);

create unique index if not exists org_email_invites_unique
  on org_email_invites (ngo_id, lower(btrim(email)));
create index if not exists org_email_invites_email_idx
  on org_email_invites (lower(btrim(email))) where accepted_at is null;

alter table org_email_invites enable row level security;

-- Invitations are not readable by anon or by ordinary authenticated users:
-- the list is who an organisation is hiring, and the email addresses are
-- personal. Claiming happens through the definer function below.
drop policy if exists org_email_invites_service on org_email_invites;
create policy org_email_invites_service on org_email_invites
  for all to service_role using (true) with check (true);

-- ── Claiming ────────────────────────────────────────────────────────

-- Called by the app right after sign-in. Safe to call every time: it does
-- nothing when there is no pending invitation, and nothing when the person
-- is already in an organisation.
create or replace function claim_org_membership()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid;
  v_email text;
  inv     org_email_invites;
  v_name  text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return json_build_object('ok', false, 'reason', 'not signed in');
  end if;

  -- Read the address from the account, never from a parameter. Otherwise
  -- anyone could claim an invitation by naming someone else's email.
  select lower(btrim(email)) into v_email from auth.users where id = v_uid;
  if v_email is null then
    return json_build_object('ok', false, 'reason', 'no email on account');
  end if;

  if exists (select 1 from ngo_members where user_id = v_uid) then
    -- Already in an organisation. Mark any matching invitation as taken up
    -- so it stops showing as outstanding on the moderation page.
    update org_email_invites
       set accepted_at = coalesce(accepted_at, now()),
           accepted_by = coalesce(accepted_by, v_uid)
     where lower(btrim(email)) = v_email and accepted_at is null;
    return json_build_object('ok', true, 'already_member', true);
  end if;

  select * into inv from org_email_invites
   where lower(btrim(email)) = v_email and accepted_at is null
   order by created_at asc
   limit 1;

  if not found then
    return json_build_object('ok', false, 'reason', 'no invitation');
  end if;

  insert into ngo_members (ngo_id, user_id) values (inv.ngo_id, v_uid)
  on conflict do nothing;

  update org_email_invites
     set accepted_at = now(), accepted_by = v_uid
   where id = inv.id;

  select name into v_name from ngos where id = inv.ngo_id;

  return json_build_object('ok', true, 'joined', true,
                           'ngo_id', inv.ngo_id, 'org_name', v_name);
end $$;

grant execute on function claim_org_membership() to authenticated, service_role;

-- ── Moderation: create an organisation and grant access ─────────────

-- Service role only. These back the moderation page, which already
-- authenticates with ADMIN_SECRET before it can call anything.
create or replace function admin_create_org(
  p_name  text,
  p_city  text default null,
  p_slug  text default null
) returns json language plpgsql security definer set search_path = public as $$
declare v_slug text; v_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'An organisation needs a name';
  end if;

  v_slug := lower(regexp_replace(coalesce(nullif(btrim(p_slug), ''), btrim(p_name)),
                                 '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := btrim(v_slug, '-');

  select id into v_id from ngos where slug = v_slug;
  if v_id is not null then
    update ngos set verified = true,
                    city = coalesce(nullif(btrim(p_city), ''), city)
     where id = v_id;
    return json_build_object('ok', true, 'id', v_id, 'slug', v_slug,
                             'created', false);
  end if;

  insert into ngos (name, slug, city, verified)
  values (btrim(p_name), v_slug, nullif(btrim(p_city), ''), true)
  returning id into v_id;

  return json_build_object('ok', true, 'id', v_id, 'slug', v_slug,
                           'created', true);
end $$;

create or replace function admin_invite_to_org(
  p_ngo_id uuid,
  p_email  text,
  p_role   text default 'member'
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  uuid;
  v_inv   uuid;
begin
  if v_email = '' or v_email not like '%@%.%' then
    raise exception 'A valid email address is required';
  end if;
  if not exists (select 1 from ngos where id = p_ngo_id) then
    raise exception 'No such organisation';
  end if;

  insert into org_email_invites (ngo_id, email, role)
  values (p_ngo_id, v_email, case when p_role = 'lead' then 'lead' else 'member' end)
  on conflict (ngo_id, lower(btrim(email))) do update
    set role = excluded.role
  returning id into v_inv;

  -- If they already have an account, join them now rather than making them
  -- sign in again to trigger the claim.
  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is not null and not exists (select 1 from ngo_members where user_id = v_user) then
    insert into ngo_members (ngo_id, user_id) values (p_ngo_id, v_user)
    on conflict do nothing;
    update org_email_invites
       set accepted_at = now(), accepted_by = v_user
     where id = v_inv;
    return json_build_object('ok', true, 'invite_id', v_inv,
                             'joined_immediately', true);
  end if;

  return json_build_object('ok', true, 'invite_id', v_inv,
                           'joined_immediately', false);
end $$;

-- Taking somebody's access away has to take all of it, or it comes back.
-- Deleting the membership alone left their invitation standing, so their
-- code still worked and claim_org_membership() re-joined them on the next
-- sign-in. Removal now takes the membership, the invitation and its code,
-- and any volunteer code cut for that address.
create or replace function admin_remove_from_org(
  p_ngo_id uuid,
  p_email  text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_user uuid;
begin
  delete from org_email_invites
   where ngo_id = p_ngo_id and lower(btrim(email)) = v_email;

  -- Volunteer codes live in another table and are not memberships, but a
  -- person who has been removed should not keep filing under the
  -- organisation's name either.
  begin
    update org_invite_codes
       set active = false, revoked_at = coalesce(revoked_at, now())
     where ngo_id = p_ngo_id and lower(btrim(coalesce(email, ''))) = v_email
       and active;
  exception when undefined_table or undefined_column then null; end;

  select id into v_user from auth.users where lower(email) = v_email;
  if v_user is not null then
    delete from ngo_members where ngo_id = p_ngo_id and user_id = v_user;
  end if;
  return true;
end $$;

-- Everything the moderation page needs to show, in one call.
create or replace function admin_list_orgs()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(o) order by o.name), '[]'::json)
  from (
    select n.id, n.name, n.slug, n.city, n.verified,
           (select count(*) from ngo_members m where m.ngo_id = n.id) as members,
           (select count(*) from dogs d where d.ngo_id = n.id)        as animals,
           (select count(*) from org_invite_codes c
             where c.ngo_id = n.id and c.active)                      as active_codes,
           (select coalesce(json_agg(json_build_object(
                     'email', i.email, 'role', i.role,
                     'accepted', i.accepted_at is not null) order by i.created_at), '[]'::json)
              from org_email_invites i where i.ngo_id = n.id)         as invites
      from ngos n
     order by n.name
  ) o;
$$;

grant execute on function admin_create_org(text, text, text)        to service_role;
grant execute on function admin_invite_to_org(uuid, text, text)     to service_role;
grant execute on function admin_remove_from_org(uuid, text)         to service_role;
grant execute on function admin_list_orgs()                         to service_role;

-- ── Retiring an organisation, without destroying its records ────────

-- The moderation console used to hard-delete the ngos row. Postgres
-- refused whenever the organisation held anything (cases_ngo_id_fkey), and
-- the raw constraint error surfaced in the interface. That refusal was
-- correct: deleting an organisation that holds cases, animals and scans
-- would take real fieldwork with it, and a foreign key is a poor place to
-- discover you meant something gentler.
--
-- So removing an organisation now means removing people's access to it.
-- Memberships and invitations go, the organisation is marked unverified so
-- it cannot be used, and the records it holds stay. The row itself is
-- deleted only when it holds nothing at all, which is the case the console
-- was really for: a mistyped organisation created a minute ago.
create or replace function admin_retire_org(p_ngo_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_cases   bigint := 0;
  v_dogs    bigint;
  v_docs    bigint := 0;
  v_codes   bigint := 0;
  v_name    text;
begin
  select name into v_name from ngos where id = p_ngo_id;
  if v_name is null then
    return json_build_object('ok', false, 'error', 'No such organisation');
  end if;

  select count(*) into v_dogs from dogs where ngo_id = p_ngo_id;
  -- These tables arrive with later migrations, so their absence is not an
  -- error on an older database.
  begin select count(*) into v_cases from cases where ngo_id = p_ngo_id;
  exception when undefined_table or undefined_column then v_cases := 0; end;
  begin select count(*) into v_docs from documents where ngo_id = p_ngo_id;
  exception when undefined_table or undefined_column then v_docs := 0; end;
  begin select count(*) into v_codes from org_invite_codes where ngo_id = p_ngo_id;
  exception when undefined_table or undefined_column then v_codes := 0; end;

  -- Access goes in every case. This is what "remove" is actually for.
  delete from ngo_members where ngo_id = p_ngo_id;
  delete from org_email_invites where ngo_id = p_ngo_id;
  begin
    update org_invite_codes
       set active = false, revoked_at = coalesce(revoked_at, now())
     where ngo_id = p_ngo_id and active;
  exception when undefined_table then null; end;

  -- Volunteer sign-ups point at the organisation with a real foreign key,
  -- and they are an association rather than a record of work, so retiring
  -- the organisation releases them. Without this, deleting an otherwise
  -- empty organisation failed on volunteers_ngo_id_fkey, which is the same
  -- raw constraint error that cases_ngo_id_fkey used to produce.
  begin
    update volunteers set ngo_id = null where ngo_id = p_ngo_id;
  exception when undefined_table or undefined_column then null; end;

  if v_dogs = 0 and v_cases = 0 and v_docs = 0 then
    -- Guarded. Any table added later that references ngos would otherwise
    -- surface its constraint name to whoever clicked Remove; retiring the
    -- organisation is the right answer in that case too.
    begin
      delete from ngos where id = p_ngo_id;
      return json_build_object('ok', true, 'deleted', true, 'name', v_name);
    exception when foreign_key_violation then
      update ngos set verified = false where id = p_ngo_id;
      return json_build_object(
        'ok', true, 'deleted', false, 'name', v_name, 'held_elsewhere', true,
        'animals', 0, 'cases', 0, 'documents', 0, 'codes_revoked', v_codes);
    end;
  end if;

  update ngos set verified = false where id = p_ngo_id;

  return json_build_object(
    'ok', true, 'deleted', false, 'name', v_name,
    'animals', v_dogs, 'cases', v_cases, 'documents', v_docs,
    'codes_revoked', v_codes);
end $$;

grant execute on function admin_retire_org(uuid) to service_role;
