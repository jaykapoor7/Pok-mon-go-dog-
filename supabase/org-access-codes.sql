-- ════════════════════════════════════════════════════════════════
-- StrayPaw, one six-character code per person.
--
-- HOW ACCESS WORKS NOW
--
--   1. Moderation creates the organisation and its team lead, by name and
--      email. That mints a code and emails it to them.
--   2. The lead opens StrayPaw, types the six characters, and is in. No
--      account to create, no password to choose, no link to wait for.
--   3. From their dashboard the lead adds their own people the same way:
--      name, email, role. Each one gets their own code.
--
-- Codes are per person, not per organisation, so revoking one person's
-- access does not disturb anybody else, and the record of who used which
-- code and when survives.
--
-- Two roles, two kinds of code, deliberately different:
--
--   staff (lead, member)   Dashboard access. Stored on org_email_invites.
--                          Single use, expiring, and burnt the moment it is
--                          redeemed, because redeeming it opens a session.
--   volunteer              Reporting only. Stored on org_invite_codes, the
--                          table the reporting flow already resolves
--                          against. Reusable, because a phone that gets
--                          wiped mid-drive has to be able to type it again.
--                          It grants no dashboard and no account.
--
-- SECURITY
--
-- A staff code is a bearer credential, and six characters from a
-- 31-character alphabet is 887 million combinations. That is enough only
-- because guessing is bounded elsewhere: the redeem route is rate limited
-- per address, a staff code works once, and it expires. Redeeming never
-- mints a session in here either; the API route hands the bound email to
-- Supabase's own one-time-token machinery and the browser completes the
-- sign-in, so account security stays where Supabase can enforce it.
--
-- Idempotent. Safe to run more than once.
-- Depends on: org-email-invites.sql, org-invite-codes.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────────

alter table org_email_invites add column if not exists code        text;
alter table org_email_invites add column if not exists person_name text;
alter table org_email_invites add column if not exists expires_at  timestamptz;
alter table org_email_invites add column if not exists revoked_at  timestamptz;

create unique index if not exists org_email_invites_code_idx
  on org_email_invites (upper(code)) where code is not null;

-- A volunteer code now carries who it was cut for, so the reporting flow
-- can fill their name in and the dashboard can list people rather than
-- opaque strings.
alter table org_invite_codes add column if not exists person_name text;
alter table org_invite_codes add column if not exists email       text;

-- ── 2. The code itself ──────────────────────────────────────────────

-- Six characters, no O/0 and no I/1/l. These get read off a phone screen
-- and typed by someone standing outside, so the ambiguous pairs cost more
-- in support than the entropy they add is worth.
create or replace function generate_code6()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  out text := '';
  i int;
begin
  for i in 1..6 loop
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return out;
end $$;

-- The volunteer generator keeps its signature so existing callers are
-- unchanged, but drops the organisation prefix: every code on StrayPaw is
-- now the same six characters, and one shape is one thing to explain.
create or replace function generate_invite_code(p_prefix text)
returns text language plpgsql as $$
begin
  return generate_code6();
end $$;

-- ── 3. Minting ──────────────────────────────────────────────────────

-- Shared by moderation and by an organisation's own team page. Re-adding
-- an address replaces its code rather than adding a second one, so there
-- is always exactly one live code per person and the previous one stops
-- working the moment a new one is issued.
create or replace function mint_access_code(
  p_ngo_id uuid,
  p_email  text,
  p_name   text,
  p_role   text,
  p_by     uuid,
  p_days   int default 30
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_role  text := case when p_role in ('lead', 'member', 'volunteer')
                       then p_role else 'member' end;
  v_code  text;
  v_id    uuid;
  v_try   int := 0;
  v_org   text;
begin
  if v_email = '' or v_email not like '%@%.%' then
    raise exception 'A valid email address is required';
  end if;
  if v_name is null then
    raise exception 'A name is required, so the code can be traced to a person';
  end if;

  select name into v_org from ngos where id = p_ngo_id;
  if v_org is null then raise exception 'No such organisation'; end if;

  loop
    v_try := v_try + 1;
    v_code := generate_code6();
    begin
      if v_role = 'volunteer' then
        -- Reporting codes live where the reporting flow already looks for
        -- them, and stay reusable: one person may file many sightings.
        insert into org_invite_codes (ngo_id, code, label, person_name, email, created_by)
        values (p_ngo_id, v_code, v_name, v_name, v_email, p_by)
        returning id into v_id;
      else
        insert into org_email_invites
          (ngo_id, email, person_name, role, code, expires_at, invited_by)
        values (p_ngo_id, v_email, v_name, v_role, v_code,
                now() + make_interval(days => greatest(p_days, 1)), p_by)
        on conflict (ngo_id, lower(btrim(email))) do update
          set role        = excluded.role,
              person_name = coalesce(excluded.person_name, org_email_invites.person_name),
              code        = excluded.code,
              expires_at  = excluded.expires_at,
              revoked_at  = null,
              -- A reissued code is a fresh start: whoever holds the old one
              -- has to be given the new one to get back in.
              accepted_at = null,
              accepted_by = null
        returning id into v_id;
      end if;
      exit;
    exception when unique_violation then
      if v_try > 8 then raise exception 'Could not allocate a unique code'; end if;
    end;
  end loop;

  return json_build_object(
    'ok', true, 'id', v_id, 'code', v_code, 'email', v_email,
    'name', v_name, 'role', v_role, 'org_name', v_org,
    'kind', case when v_role = 'volunteer' then 'volunteer' else 'staff' end);
end $$;

-- Moderation. Service role only, behind ADMIN_SECRET at the route.
create or replace function admin_mint_access_code(
  p_ngo_id uuid,
  p_email  text,
  p_name   text,
  p_role   text default 'lead'
) returns json language sql security definer set search_path = public as $$
  select mint_access_code(p_ngo_id, p_email, p_name, p_role, null, 30);
$$;

-- An organisation adding its own people. The organisation comes from the
-- caller's own membership, never from a parameter, so a lead cannot mint a
-- code into somebody else's organisation.
create or replace function create_team_code(
  p_email text,
  p_name  text,
  p_role  text default 'member'
) returns json language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_role text; v_lead boolean;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can add people';
  end if;

  v_role := case when p_role in ('lead', 'member', 'volunteer')
                 then p_role else 'member' end;

  -- Anyone in the organisation can cut a volunteer a reporting code, since
  -- that grants nothing but attribution. Giving somebody the dashboard is
  -- a lead's decision.
  if v_role <> 'volunteer' then
    select exists (
      select 1 from ngo_members m
       where m.user_id = auth.uid() and m.ngo_id = v_ngo
         and m.role in ('admin', 'lead')
      union all
      select 1 from org_email_invites i
       where i.ngo_id = v_ngo and i.role = 'lead' and i.accepted_by = auth.uid()
    ) into v_lead;
    if not coalesce(v_lead, false) then
      raise exception 'Only a team lead can give someone dashboard access';
    end if;
  end if;

  return mint_access_code(v_ngo, p_email, p_name, v_role, auth.uid(), 30);
end $$;

grant execute on function mint_access_code(uuid, text, text, text, uuid, int) to service_role;
grant execute on function admin_mint_access_code(uuid, text, text, text)      to service_role;
grant execute on function create_team_code(text, text, text) to authenticated, service_role;

-- ── 4. The organisation's own team list ─────────────────────────────

-- Both kinds of code in one list, because on the dashboard they are one
-- thing: the people this organisation has given something to.
create or replace function org_team_codes()
returns table (
  id          uuid,
  kind        text,
  person_name text,
  email       text,
  role        text,
  code        text,
  active      boolean,
  accepted    boolean,
  reports     bigint,
  created_at  timestamptz
) language sql stable security definer set search_path = public as $$
  select i.id, 'staff'::text, i.person_name, i.email, i.role, i.code,
         i.revoked_at is null
           and (i.expires_at is null or i.expires_at >= now())
           and i.accepted_at is null                       as active,
         i.accepted_at is not null                          as accepted,
         0::bigint                                          as reports,
         i.created_at
    from org_email_invites i
   where i.ngo_id = my_ngo()
  union all
  select c.id, 'volunteer'::text, c.person_name, c.email, 'volunteer'::text, c.code,
         c.active,
         exists (select 1 from sightings s where s.invite_code_id = c.id) as accepted,
         (select count(*) from sightings s where s.invite_code_id = c.id) as reports,
         c.created_at
    from org_invite_codes c
   where c.ngo_id = my_ngo()
   order by 10 desc;
$$;

-- Works on either kind. Scoped to the caller's own organisation.
create or replace function revoke_team_code(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_user uuid; v_hit boolean := false;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return false; end if;

  update org_invite_codes set active = false, revoked_at = now()
   where id = p_id and ngo_id = v_ngo and active;
  if found then v_hit := true; end if;

  -- Revoking staff access takes the code away and takes them out of the
  -- organisation, so somebody already signed in loses the dashboard too.
  select accepted_by into v_user from org_email_invites
   where id = p_id and ngo_id = v_ngo;
  if found then
    v_hit := true;
    update org_email_invites set revoked_at = now(), code = null where id = p_id;
    if v_user is not null then
      delete from ngo_members where ngo_id = v_ngo and user_id = v_user;
    end if;
  end if;

  return v_hit;
end $$;

grant execute on function org_team_codes()      to authenticated, service_role;
grant execute on function revoke_team_code(uuid) to authenticated, service_role;

-- ── 5. Redeeming a staff code ───────────────────────────────────────

-- Service role only. Turns a typed code into the address it belongs to.
-- It issues nothing: the route takes that address to Supabase's one-time
-- token machinery and the browser completes the sign-in.
create or replace function resolve_access_code(p_code text)
returns json language plpgsql stable security definer
set search_path = public as $$
declare i org_email_invites; v_org text;
begin
  if coalesce(btrim(p_code), '') = '' then
    return json_build_object('ok', false, 'error', 'no code');
  end if;

  select * into i from org_email_invites
   where upper(code) = upper(btrim(p_code));

  if not found then
    return json_build_object('ok', false, 'error', 'That code was not recognised.');
  end if;
  if i.revoked_at is not null then
    return json_build_object('ok', false, 'error', 'That code has been turned off.');
  end if;
  if i.expires_at is not null and i.expires_at < now() then
    return json_build_object('ok', false, 'error', 'That code has expired. Ask for a new one.');
  end if;

  select name into v_org from ngos where id = i.ngo_id;

  return json_build_object(
    'ok', true, 'id', i.id, 'email', i.email, 'ngo_id', i.ngo_id,
    'role', i.role, 'name', i.person_name, 'org_name', v_org);
end $$;

-- Called once the sign-in has actually happened, with the user id read
-- from a verified session on the server. Joins them and burns the code.
create or replace function redeem_access_code(p_code text, p_user_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare i org_email_invites; v_org text;
begin
  select * into i from org_email_invites
   where upper(code) = upper(btrim(p_code))
     and revoked_at is null
     and (expires_at is null or expires_at >= now());
  if not found then
    return json_build_object('ok', false, 'error', 'That code is no longer valid.');
  end if;

  insert into ngo_members (ngo_id, user_id, role)
  values (i.ngo_id, p_user_id, case when i.role = 'lead' then 'admin' else 'member' end)
  on conflict (user_id) do update set ngo_id = excluded.ngo_id;

  update org_email_invites
     set accepted_at = coalesce(accepted_at, now()),
         accepted_by = coalesce(accepted_by, p_user_id),
         code = null                      -- burnt: one code, one sign-in
   where id = i.id;

  select name into v_org from ngos where id = i.ngo_id;

  return json_build_object('ok', true, 'ngo_id', i.ngo_id, 'org_name', v_org,
                           'role', i.role, 'name', i.person_name);
end $$;

grant execute on function resolve_access_code(text)      to service_role;
grant execute on function redeem_access_code(text, uuid) to service_role;

-- ── 6. Who am I ─────────────────────────────────────────────────────

-- Backs the profile panel: the signed-in person's name, their
-- organisation, and whether they can add people to it.
create or replace function my_profile()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_ngo   uuid;
  v_org   text;
  v_name  text;
  v_role  text;
  v_lead  boolean := false;
begin
  if v_uid is null then
    return json_build_object('signed_in', false);
  end if;

  select lower(btrim(email)) into v_email from auth.users where id = v_uid;
  select ngo_id, role into v_ngo, v_role from ngo_members where user_id = v_uid limit 1;

  if v_ngo is not null then
    select name into v_org from ngos where id = v_ngo;
    select person_name into v_name from org_email_invites
     where ngo_id = v_ngo and lower(btrim(email)) = v_email limit 1;
    v_lead := coalesce(v_role in ('admin', 'lead'), false)
              or exists (select 1 from org_email_invites
                          where ngo_id = v_ngo and role = 'lead'
                            and lower(btrim(email)) = v_email);
  end if;

  return json_build_object(
    'signed_in', true, 'email', v_email, 'name', v_name,
    'ngo_id', v_ngo, 'org_name', v_org, 'role', coalesce(v_role, 'none'),
    'is_lead', v_lead);
end $$;

grant execute on function my_profile() to authenticated, service_role;

-- ── 7. A volunteer code now carries a name ──────────────────────────

create or replace function resolve_invite_code(p_code text)
returns json language plpgsql stable security definer
set search_path = public as $$
declare c org_invite_codes; n ngos;
begin
  if coalesce(btrim(p_code), '') = '' then
    return json_build_object('ok', false, 'error', 'no code');
  end if;

  select * into c from org_invite_codes
   where upper(code) = upper(btrim(p_code));

  if not found then
    return json_build_object('ok', false, 'error', 'unknown code');
  end if;
  if not c.active then
    return json_build_object('ok', false, 'error', 'That code has been turned off.');
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    return json_build_object('ok', false, 'error', 'That code has reached its limit.');
  end if;

  select * into n from ngos where id = c.ngo_id;

  return json_build_object(
    'ok', true,
    'code_id', c.id,
    'ngo_id', c.ngo_id,
    'volunteer_name', c.person_name,
    'org_name', coalesce(n.name, 'the organisation'));
end $$;

grant execute on function resolve_invite_code(text) to service_role;

-- ── 8. Moderation listing carries the code ──────────────────────────

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
                     'id', i.id,
                     'email', i.email,
                     'name', i.person_name,
                     'role', i.role,
                     'code', i.code,
                     'accepted', i.accepted_at is not null,
                     'revoked', i.revoked_at is not null,
                     'expires_at', i.expires_at) order by i.created_at), '[]'::json)
              from org_email_invites i where i.ngo_id = n.id)         as invites
      from ngos n
     order by n.name
  ) o;
$$;

grant execute on function admin_list_orgs() to service_role;
