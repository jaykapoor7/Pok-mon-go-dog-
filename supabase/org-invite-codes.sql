-- ════════════════════════════════════════════════════════════════
-- StrayPaw, NGO volunteer reporting by invite code.
--
-- THE PROBLEM
--
-- A field volunteer standing on a street with a dog in front of them
-- should not have to invent a password and verify an email before they
-- can record it. But an organisation still needs to know which of its
-- people filed which record.
--
-- THE SHAPE
--
-- The organisation has real authenticated admin accounts. Those admins
-- mint short invite codes (PAWS-7K2M). A volunteer types the code once
-- and their name once; both live on their device afterwards. Every report
-- they file carries the organisation and their name.
--
-- SECURITY
--
-- The code, not the client, decides the organisation. Nothing here is
-- callable by anon: the codes are resolved and the write is performed
-- server-side with the service role, after the code has been checked. A
-- browser can therefore never name an organisation it does not hold a
-- code for, and the database is not made publicly writable to achieve
-- frictionless reporting.
--
-- Codes are per-organisation, so adding the next NGO is minting codes,
-- not changing this workflow.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, partner-onboarding.sql, abc-programme.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. The codes ────────────────────────────────────────────────────

create table if not exists org_invite_codes (
  id         uuid primary key default uuid_generate_v4(),
  ngo_id     uuid not null,
  code       text not null unique,
  -- What this code is for: a drive, a ward team, one person. Lets an
  -- organisation revoke a batch without revoking everyone.
  label      text,
  active     boolean not null default true,
  -- Null means unlimited. A drive-specific code can be capped.
  max_uses   int,
  uses       int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists invite_codes_ngo_idx on org_invite_codes (ngo_id, created_at desc);
create unique index if not exists invite_codes_code_idx on org_invite_codes (upper(code));

alter table org_invite_codes enable row level security;

-- No anon or authenticated policy at all. Codes are read by the server
-- with the service role when a report comes in, and listed for admins
-- through a definer function below. A readable code table would let anyone
-- enumerate every organisation's codes.
drop policy if exists invite_codes_service_all on org_invite_codes;
create policy invite_codes_service_all on org_invite_codes
  for all to service_role using (true) with check (true);

-- ── 2. Attribution on the observation ───────────────────────────────

alter table sightings add column if not exists ngo_id         uuid;
alter table sightings add column if not exists volunteer_name text;
alter table sightings add column if not exists invite_code_id uuid;

create index if not exists sightings_ngo_idx
  on sightings (ngo_id, created_at desc) where ngo_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sightings_invite_code_fk') then
    alter table sightings add constraint sightings_invite_code_fk
      foreign key (invite_code_id) references org_invite_codes(id) on delete set null;
  end if;
end $$;

-- ── 3. Admin: mint and revoke ───────────────────────────────────────

-- Ambiguous characters are left out. These get read off a phone screen and
-- typed by someone standing outside; O/0 and I/1/l cost more in support
-- than the extra entropy is worth.
create or replace function generate_invite_code(p_prefix text)
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  body text := '';
  i int;
begin
  for i in 1..4 loop
    body := body || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return upper(coalesce(nullif(btrim(p_prefix), ''), 'ORG')) || '-' || body;
end $$;

create or replace function create_invite_code(
  p_label    text default null,
  p_max_uses int default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_ngo    uuid;
  v_prefix text;
  v_code   text;
  v_id     uuid;
  v_try    int := 0;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can create invite codes';
  end if;

  -- Prefix from the organisation's own name, so a volunteer can see at a
  -- glance which organisation the code belongs to.
  select upper(regexp_replace(coalesce(nullif(slug, ''), name), '[^a-zA-Z]', '', 'g'))
    into v_prefix from ngos where id = v_ngo;
  v_prefix := left(coalesce(nullif(v_prefix, ''), 'ORG'), 4);

  loop
    v_try := v_try + 1;
    v_code := generate_invite_code(v_prefix);
    begin
      insert into org_invite_codes (ngo_id, code, label, max_uses, created_by)
      values (v_ngo, v_code, nullif(btrim(p_label), ''), p_max_uses, auth.uid())
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 8 then raise exception 'Could not allocate a unique code'; end if;
    end;
  end loop;

  return json_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function revoke_invite_code(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  update org_invite_codes
     set active = false, revoked_at = now()
   where id = p_id and ngo_id = v_ngo and active;
  return found;
end $$;

-- An admin's view of their own codes, with how much each has been used.
create or replace function my_invite_codes()
returns table (
  id         uuid,
  code       text,
  label      text,
  active     boolean,
  max_uses   int,
  uses       int,
  created_at timestamptz,
  revoked_at timestamptz,
  reports    bigint,
  volunteers bigint
) language sql stable security definer set search_path = public as $$
  select c.id, c.code, c.label, c.active, c.max_uses, c.uses,
         c.created_at, c.revoked_at,
         (select count(*) from sightings s where s.invite_code_id = c.id) as reports,
         (select count(distinct lower(btrim(s.volunteer_name)))
            from sightings s
           where s.invite_code_id = c.id
             and coalesce(btrim(s.volunteer_name), '') <> '') as volunteers
    from org_invite_codes c
   where c.ngo_id = my_ngo()
   order by c.active desc, c.created_at desc;
$$;

grant execute on function create_invite_code(text, int) to authenticated, service_role;
grant execute on function revoke_invite_code(uuid)      to authenticated, service_role;
grant execute on function my_invite_codes()             to authenticated, service_role;

-- ── 4. Server-side: resolve a code ──────────────────────────────────

-- Service role only. This is what the API route calls to turn a typed code
-- into an organisation, and it is the single place that decision is made.
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
    return json_build_object('ok', false, 'error', 'This code has been turned off.');
  end if;
  if c.max_uses is not null and c.uses >= c.max_uses then
    return json_build_object('ok', false, 'error', 'This code has reached its limit.');
  end if;

  select * into n from ngos where id = c.ngo_id;

  return json_build_object(
    'ok', true,
    'code_id', c.id,
    'ngo_id', c.ngo_id,
    'org_name', coalesce(n.name, 'the organisation'));
end $$;

grant execute on function resolve_invite_code(text) to service_role;

-- ── 5. Server-side: file a report on an organisation's behalf ───────

-- Service role only, and deliberately so. It takes an organisation id, and
-- the only caller that has one is the API route that just resolved a code.
-- Granting this to anon would let a browser attribute reports to any
-- organisation it liked.
create or replace function report_sighting_for_org(
  p_photo_url      text,
  p_lat            float,
  p_lng            float,
  p_zone           text,
  p_ngo_id         uuid,
  p_code_id        uuid,
  p_volunteer_name text,
  p_nickname       text default null,
  p_mood_tags      text[] default '{}',
  p_notes          text default null,
  p_owner_hash     text default null,
  p_user_id        uuid default null,
  p_reporter_email text default null,
  p_claimed_dog_id uuid default null,
  p_sterilisation_status text default null,
  p_vaccination_status   text default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_trust    int;
  v_sighting uuid;
  v_claim    uuid := null;
  v_ster     text;
  v_vacc     text;
  v_who      text;
begin
  v_who := nullif(btrim(coalesce(p_volunteer_name, '')), '');

  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    -- A named volunteer reporting under an organisation's code is a
    -- stronger record than an anonymous passer-by.
    + case when v_who is not null then 10 else 0 end
    + 12);

  if p_claimed_dog_id is not null then
    select id into v_claim from dogs where id = p_claimed_dog_id;
  end if;

  v_ster := case when p_sterilisation_status in ('sterilised','not_sterilised','unknown')
                 then p_sterilisation_status else 'unknown' end;
  v_vacc := case when p_vaccination_status in ('vaccinated','not_vaccinated','unknown')
                 then p_vaccination_status else 'unknown' end;

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id, reporter_email,
                         claimed_dog_id, identity_method,
                         sterilisation_status, vaccination_status,
                         ngo_id, volunteer_name, invite_code_id)
  values (null, v_who, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email,''))), ''),
          v_claim,
          case when v_claim is null then 'unlinked' else 'reporter_selected' end,
          v_ster, v_vacc,
          p_ngo_id, v_who, p_code_id)
  returning id into v_sighting;

  update org_invite_codes set uses = uses + 1 where id = p_code_id;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust,
    'ngo_id', p_ngo_id, 'volunteer_name', v_who);
end $$;

grant execute on function report_sighting_for_org(
  text,float,float,text,uuid,uuid,text,text,text[],text,text,uuid,text,uuid,text,text
) to service_role;

-- ── 6. Approval keeps the organisation on the animal ────────────────

drop function if exists approve_sighting(uuid);

create or replace function approve_sighting(
  p_sighting_id uuid,
  p_dog_id      uuid default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  s            sightings;
  v_dog        dogs;
  v_status     dog_status := 'seen';
  v_needs_help boolean := false;
  v_friendly   boolean := true;
  v_method     text;
  v_conf       text;
begin
  select * into s from sightings where id = p_sighting_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not found');
  end if;
  if s.status = 'live' then
    return json_build_object('ok', true, 'already', true, 'dog_id', s.dog_id);
  end if;

  if 'injured' = any(s.mood_tags) then
    v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(s.mood_tags) then
    v_status := 'hungry'; v_needs_help := true;
  end if;
  v_friendly := 'friendly' = any(s.mood_tags) or not ('shy' = any(s.mood_tags));

  if p_dog_id is not null then
    select * into v_dog from dogs where id = p_dog_id;
    v_method := 'reviewer_confirmed';
    v_conf   := 'probable';
  elsif s.claimed_dog_id is not null then
    select * into v_dog from dogs where id = s.claimed_dog_id;
    v_method := 'reporter_selected';
    v_conf   := 'uncertain';
  end if;

  if v_dog.id is not null then
    update dogs set
      last_seen   = greatest(last_seen, s.created_at),
      status      = case when v_needs_help then v_status else status end,
      needs_help  = needs_help or v_needs_help,
      name        = coalesce(name, s.nickname),
      cover_photo = coalesce(cover_photo, s.photo_url),
      -- An animal already belonging to an organisation stays with it. A
      -- community animal that an organisation's volunteer reports becomes
      -- theirs to work on.
      ngo_id      = coalesce(ngo_id, s.ngo_id),
      sterilisation_status = case
        when s.sterilisation_status in ('sterilised','not_sterilised')
          then s.sterilisation_status
        else sterilisation_status end,
      vaccination_status = case
        when s.vaccination_status in ('vaccinated','not_vaccinated')
          then s.vaccination_status
        else vaccination_status end
    where id = v_dog.id
    returning * into v_dog;
  else
    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                      needs_help, trust_score, sightings_count,
                      first_seen, last_seen, ngo_id,
                      sterilisation_status, vaccination_status)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at, s.ngo_id,
            coalesce(s.sterilisation_status, 'unknown'),
            coalesce(s.vaccination_status, 'unknown'))
    returning * into v_dog;
    v_method := 'unlinked';
    v_conf   := null;
  end if;

  update sightings
     set status = 'live',
         dog_id = v_dog.id,
         identity_method = v_method,
         identity_confidence = v_conf
   where id = p_sighting_id;

  perform recount_animal_sightings(v_dog.id);

  return json_build_object(
    'ok', true, 'dog_id', v_dog.id, 'sighting_id', p_sighting_id,
    'identity_method', v_method, 'ngo_id', v_dog.ngo_id);
end $$;

grant execute on function approve_sighting(uuid, uuid) to service_role;

-- ── 7. The organisation's own reports, with who filed them ──────────

create or replace function org_reports(
  p_limit  int default 100,
  p_offset int default 0
) returns table (
  id                   uuid,
  dog_id               uuid,
  photo_url            text,
  zone                 text,
  lat                  double precision,
  lng                  double precision,
  nickname             text,
  notes                text,
  mood_tags            text[],
  sterilisation_status text,
  vaccination_status   text,
  volunteer_name       text,
  status               text,
  created_at           timestamptz,
  total_count          bigint
) language sql stable security definer set search_path = public as $$
  select s.id, s.dog_id, s.photo_url, s.zone, s.lat, s.lng, s.nickname,
         s.notes, s.mood_tags, s.sterilisation_status, s.vaccination_status,
         coalesce(s.volunteer_name, s.reporter_name) as volunteer_name,
         s.status, s.created_at,
         count(*) over () as total_count
    from sightings s
   where s.ngo_id = my_ngo()
   order by s.created_at desc
   limit greatest(least(p_limit, 500), 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function org_reports(int, int) to authenticated, service_role;

-- Who has been reporting under this organisation's codes. Named distinctly
-- from org_volunteers(), which already exists and lists people who signed up
-- offering to help. Replacing that one would have broken /partner/volunteers.
create or replace function org_reporting_volunteers()
returns table (
  volunteer_name text,
  reports        bigint,
  first_report   timestamptz,
  last_report    timestamptz
) language sql stable security definer set search_path = public as $$
  select btrim(s.volunteer_name) as volunteer_name,
         count(*)      as reports,
         min(s.created_at) as first_report,
         max(s.created_at) as last_report
    from sightings s
   where s.ngo_id = my_ngo()
     and coalesce(btrim(s.volunteer_name), '') <> ''
   group by btrim(s.volunteer_name)
   order by count(*) desc, max(s.created_at) desc;
$$;

grant execute on function org_reporting_volunteers() to authenticated, service_role;
