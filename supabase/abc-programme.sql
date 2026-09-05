-- ════════════════════════════════════════════════════════════════
-- StrayPaw, ABC and rabies programme tracking.
--
-- THE PROBLEM
--
-- dogs.sterilised and dogs.vaccinated are booleans defaulting to false.
-- A boolean cannot tell "we checked, this animal is not sterilised" apart
-- from "nobody has looked". Every animal ever recorded therefore reads as
-- not sterilised, which is exactly the number an ABC programme is judged
-- on. A coverage percentage computed from that is not a measurement.
--
-- So both become three-valued. Unknown is the default and the honest
-- starting point: a dog someone photographed from across a road has an
-- unknown sterilisation status, and saying so is what makes the dogs that
-- were actually checked worth counting.
--
-- The booleans stay, kept in step by a trigger, because the map, the
-- marker states and get_city_stats() all read them. Nothing that works
-- today stops working.
--
-- Statuses are recorded on the observation as well as the animal, so the
-- answer is attributable to whoever gave it and a later correction does
-- not erase what was said at the time.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, partner-onboarding.sql, animals.sql,
--             observation-identity.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Three-valued status on the animal ────────────────────────────

alter table dogs add column if not exists sterilisation_status text;
alter table dogs add column if not exists vaccination_status  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dogs_ster_status_ck') then
    alter table dogs add constraint dogs_ster_status_ck
      check (sterilisation_status in ('sterilised', 'not_sterilised', 'unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dogs_vacc_status_ck') then
    alter table dogs add constraint dogs_vacc_status_ck
      check (vaccination_status in ('vaccinated', 'not_vaccinated', 'unknown'));
  end if;
end $$;

-- Backfill. A true boolean is a positive record and carries over. A false
-- one is the column default and was never a statement that anybody checked,
-- so it becomes unknown rather than "not sterilised". Reading those as
-- negatives would invent a denominator out of the absence of data.
update dogs set sterilisation_status =
  case when sterilised then 'sterilised' else 'unknown' end
 where sterilisation_status is null;

update dogs set vaccination_status =
  case when vaccinated then 'vaccinated' else 'unknown' end
 where vaccination_status is null;

alter table dogs alter column sterilisation_status set default 'unknown';
alter table dogs alter column vaccination_status  set default 'unknown';

-- Existing readers (the map, marker states, get_city_stats) use the
-- booleans, so the two representations are kept in step rather than one
-- being migrated away from under them.
create or replace function sync_dog_status_booleans()
returns trigger language plpgsql as $$
begin
  new.sterilisation_status := coalesce(new.sterilisation_status, 'unknown');
  new.vaccination_status   := coalesce(new.vaccination_status, 'unknown');
  new.sterilised := (new.sterilisation_status = 'sterilised');
  new.vaccinated := (new.vaccination_status = 'vaccinated');
  return new;
end $$;

drop trigger if exists dogs_sync_status on dogs;
create trigger dogs_sync_status
  before insert or update of sterilisation_status, vaccination_status, sterilised, vaccinated
  on dogs for each row execute function sync_dog_status_booleans();

-- Partial indexes: the programme views count these constantly, and an ABC
-- team's most common question is "which ones are not done yet".
create index if not exists dogs_ster_status_idx on dogs (ngo_id, sterilisation_status);
create index if not exists dogs_vacc_status_idx on dogs (ngo_id, vaccination_status);
create index if not exists dogs_ngo_recent_idx on dogs (ngo_id, created_at desc);

-- ── 2. The same answer, recorded on the observation ─────────────────

alter table sightings add column if not exists sterilisation_status text;
alter table sightings add column if not exists vaccination_status  text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sightings_ster_status_ck') then
    alter table sightings add constraint sightings_ster_status_ck
      check (sterilisation_status is null or
             sterilisation_status in ('sterilised', 'not_sterilised', 'unknown'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sightings_vacc_status_ck') then
    alter table sightings add constraint sightings_vacc_status_ck
      check (vaccination_status is null or
             vaccination_status in ('vaccinated', 'not_vaccinated', 'unknown'));
  end if;
end $$;

-- ── 3. Capture at report time ───────────────────────────────────────

create or replace function report_sighting(
  p_photo_url      text,
  p_lat            float,
  p_lng            float,
  p_zone           text,
  p_nickname       text default null,
  p_mood_tags      text[] default '{}',
  p_notes          text default null,
  p_reporter_name  text default null,
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
begin
  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  if p_claimed_dog_id is not null then
    select id into v_claim from dogs where id = p_claimed_dog_id;
  end if;

  -- An unrecognised value is stored as unknown rather than rejected: losing
  -- the whole observation over one field would cost more than the field.
  v_ster := case when p_sterilisation_status in ('sterilised','not_sterilised','unknown')
                 then p_sterilisation_status else 'unknown' end;
  v_vacc := case when p_vaccination_status in ('vaccinated','not_vaccinated','unknown')
                 then p_vaccination_status else 'unknown' end;

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id, reporter_email,
                         claimed_dog_id, identity_method,
                         sterilisation_status, vaccination_status)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email,''))), ''),
          v_claim,
          case when v_claim is null then 'unlinked' else 'reporter_selected' end,
          v_ster, v_vacc)
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust,
    'claimed_dog_id', v_claim);
end;
$$;

grant execute on function report_sighting(
  text,float,float,text,text,text[],text,text,text,uuid,text,uuid,text,text
) to anon, authenticated, service_role;

-- ── 4. Approval carries the status onto the animal ──────────────────

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
      -- A later observation that actually checked overrides an unknown, and
      -- overrides an older answer. An observation that did not check leaves
      -- what is already recorded alone.
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
                      first_seen, last_seen,
                      sterilisation_status, vaccination_status)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at,
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
    'identity_method', v_method);
end $$;

grant execute on function approve_sighting(uuid, uuid) to service_role;

-- ── 5. Updating an animal's programme status from the console ───────

create or replace function set_animal_programme_status(
  p_dog_id uuid,
  p_sterilisation_status text default null,
  p_vaccination_status   text default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can update programme status';
  end if;

  update dogs set
    sterilisation_status = case
      when p_sterilisation_status in ('sterilised','not_sterilised','unknown')
        then p_sterilisation_status else sterilisation_status end,
    vaccination_status = case
      when p_vaccination_status in ('vaccinated','not_vaccinated','unknown')
        then p_vaccination_status else vaccination_status end
  where id = p_dog_id and ngo_id = v_ngo;

  return found;
end $$;

grant execute on function set_animal_programme_status(uuid, text, text)
  to authenticated, service_role;

-- ── 6. Programme totals ─────────────────────────────────────────────

-- Deliberately reads the same table and the same columns the filtered list
-- reads. A dashboard whose totals come from somewhere other than the rows
-- they summarise is how a number and its own list stop agreeing.
create or replace function org_programme_stats()
returns json language plpgsql stable security definer
set search_path = public as $$
declare v_ngo uuid; v json;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return null; end if;

  select json_build_object(
    'total',            count(*),
    'sterilised',       count(*) filter (where sterilisation_status = 'sterilised'),
    'not_sterilised',   count(*) filter (where sterilisation_status = 'not_sterilised'),
    'ster_unknown',     count(*) filter (where sterilisation_status = 'unknown'),
    'vaccinated',       count(*) filter (where vaccination_status = 'vaccinated'),
    'not_vaccinated',   count(*) filter (where vaccination_status = 'not_vaccinated'),
    'vacc_unknown',     count(*) filter (where vaccination_status = 'unknown'),
    'needs_help',       count(*) filter (where needs_help),
    'added_7d',         count(*) filter (where created_at > now() - interval '7 days'),
    'added_30d',        count(*) filter (where created_at > now() - interval '30 days'),
    -- Percentage of animals whose status was actually established, not of
    -- every row. An unknown is not a negative and is not counted as one.
    'ster_pct_of_known', case
      when count(*) filter (where sterilisation_status in ('sterilised','not_sterilised')) = 0
        then null
      else round(
        100.0 * count(*) filter (where sterilisation_status = 'sterilised')
        / count(*) filter (where sterilisation_status in ('sterilised','not_sterilised')), 1)
      end,
    'ster_pct_of_all', case when count(*) = 0 then null
      else round(100.0 * count(*) filter (where sterilisation_status = 'sterilised')
                 / count(*), 1) end,
    'vacc_pct_of_known', case
      when count(*) filter (where vaccination_status in ('vaccinated','not_vaccinated')) = 0
        then null
      else round(
        100.0 * count(*) filter (where vaccination_status = 'vaccinated')
        / count(*) filter (where vaccination_status in ('vaccinated','not_vaccinated')), 1)
      end
  ) into v
  from dogs where ngo_id = v_ngo;

  return v;
end $$;

grant execute on function org_programme_stats() to authenticated, service_role;

-- ── 7. The filtered list behind those totals ────────────────────────

create or replace function org_animals(
  p_search    text default null,
  p_ster      text default null,   -- 'sterilised' | 'not_sterilised' | 'unknown'
  p_vacc      text default null,
  p_zone      text default null,
  p_from      timestamptz default null,
  p_to        timestamptz default null,
  p_needs     boolean default null,
  p_limit     int default 200,
  p_offset    int default 0
) returns table (
  id                   uuid,
  name                 text,
  code                 text,
  species              text,
  zone                 text,
  cover_photo          text,
  status               dog_status,
  assignee_name        text,
  sterilisation_status text,
  vaccination_status   text,
  needs_help           boolean,
  sightings_count      int,
  lat                  double precision,
  lng                  double precision,
  created_at           timestamptz,
  last_seen            timestamptz,
  recorded_by          text,
  total_count          bigint
) language sql stable security definer set search_path = public as $$
  with scoped as (
    select d.*
      from dogs d
     where d.ngo_id = my_ngo()
       and (p_ster is null or d.sterilisation_status = p_ster)
       and (p_vacc is null or d.vaccination_status = p_vacc)
       and (p_zone is null or d.zone ilike '%' || p_zone || '%')
       and (p_from is null or d.created_at >= p_from)
       and (p_to   is null or d.created_at <  p_to)
       and (p_needs is null or d.needs_help = p_needs)
       and (
         p_search is null or btrim(p_search) = '' or
         d.name ilike '%' || p_search || '%' or
         d.code ilike '%' || p_search || '%' or
         d.zone ilike '%' || p_search || '%' or
         d.id::text ilike p_search || '%'
       )
  )
  select s.id, s.name, s.code, coalesce(s.species, 'dog'), s.zone,
         s.cover_photo, s.status, s.assignee_name,
         s.sterilisation_status, s.vaccination_status, s.needs_help,
         s.sightings_count, s.lat, s.lng, s.created_at, s.last_seen,
         -- Who put it on the record. The earliest observation is the one
         -- that registered the animal.
         (select coalesce(sg.reporter_name, 'A team member')
            from sightings sg
           where sg.dog_id = s.id
           order by sg.created_at asc limit 1) as recorded_by,
         count(*) over () as total_count
    from scoped s
   order by s.created_at desc
   limit greatest(least(p_limit, 1000), 1)
  offset greatest(p_offset, 0);
$$;

grant execute on function org_animals(
  text,text,text,text,timestamptz,timestamptz,boolean,int,int
) to authenticated, service_role;

-- The places this organisation actually works in, for the location filter.
create or replace function org_zones()
returns table (zone text, n bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(btrim(d.zone), ''), 'Unrecorded') as zone, count(*) as n
    from dogs d
   where d.ngo_id = my_ngo()
   group by 1
   order by n desc, 1;
$$;

grant execute on function org_zones() to authenticated, service_role;

-- ── 8. Registering an animal directly from the field ────────────────

-- A team doing ABC work registers the animal they are holding, rather than
-- reporting a sighting for someone else to approve. This writes straight to
-- the organisation's registry with the programme status attached.
create or replace function register_org_animal(
  p_name        text default null,
  p_code        text default null,
  p_zone        text default null,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_cover_photo text default null,
  p_sterilisation_status text default 'unknown',
  p_vaccination_status   text default 'unknown',
  p_notes       text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can register an animal';
  end if;

  insert into dogs (name, zone, lat, lng, status, cover_photo, ngo_id, code,
                    intake_notes, sightings_count, first_seen, last_seen,
                    sterilisation_status, vaccination_status)
  values (p_name, coalesce(p_zone, ''), coalesce(p_lat, 0), coalesce(p_lng, 0),
          'seen', coalesce(p_cover_photo, ''), v_ngo, p_code, p_notes,
          1, now(), now(),
          case when p_sterilisation_status in ('sterilised','not_sterilised','unknown')
               then p_sterilisation_status else 'unknown' end,
          case when p_vaccination_status in ('vaccinated','not_vaccinated','unknown')
               then p_vaccination_status else 'unknown' end)
  returning id into v_id;

  return v_id;
end $$;

grant execute on function register_org_animal(
  text,text,text,double precision,double precision,text,text,text,text
) to authenticated, service_role;
