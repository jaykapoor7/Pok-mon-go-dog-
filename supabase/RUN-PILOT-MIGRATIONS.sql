-- ════════════════════════════════════════════════════════════════
-- StrayPaw, the PAWS Chennai pilot migrations, in one file.
--
-- HOW TO RUN THIS
--
-- Supabase dashboard → SQL Editor → New query → paste this whole file →
-- Run. Once. That is the entire job.
--
-- Run it in one go rather than file by file. The parts depend on each
-- other: the access-code section only adds columns to a table the
-- email-invites section creates, so running them out of order fails with
-- "relation org_email_invites does not exist", and every function defined
-- after that point is missing too. That is what "could not find the
-- function admin_list_orgs" and "could not find admin_retire_org" mean:
-- not a bug, just a file that never finished.
--
-- It assumes the base schema is already there: dogs, sightings, ngos,
-- ngo_members, my_ngo(). If this is a brand new Supabase project, run
-- RUN-ALL-MIGRATIONS.sql first, then this.
--
-- Idempotent, and verified to be: applied twice in a row to a fresh
-- database with no errors. Nothing here deletes data, so a run that failed
-- part way through is fixed by running the whole thing again.
--
-- Contents, in dependency order:
--   1. observation-identity.sql     One animal, many observations, and never a guess about which
--   2. analytics.sql                Product analytics for the reporting funnel
--   3. adoption-and-documents.sql   Adoption listings, and scanned paperwork attached to records
--   4. no-similarity-merge.sql      Removes merging animals that merely look alike
--   5. abc-programme.sql            Sterilisation and rabies status, three-valued
--   6. org-invite-codes.sql         Volunteer reporting codes
--   7. org-email-invites.sql        Organisation membership by email, and the moderation tools
--   8. org-access-codes.sql         One six-character access code per person
-- ════════════════════════════════════════════════════════════════


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ observation-identity.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════
-- StrayPaw, honest animal identity on observations.
--
-- THE PROBLEM THIS FIXES
--
-- approve_sighting() linked an observation to the nearest existing animal
-- within 200 m, and created a new animal only when nothing was in range:
--
--     select * into v_dog from dogs
--     where haversine_m(s.lat, s.lng, lat, lng) <= 200
--     order by haversine_m(s.lat, s.lng, lat, lng) limit 1;
--
-- On an Indian street 200 m contains many distinct animals. That rule
-- silently merged different dogs into one record, inflated
-- dogs.sightings_count, and manufactured the single claim the product rests
-- on, that this is the same animal, seen again. Proximity is evidence that
-- two observations *could* be the same animal. It is not identification.
--
-- WHAT REPLACES IT
--
-- Proximity now produces candidates (nearby_animals) that a person chooses
-- from. Every link records how it was made and how sure we are. An
-- observation nobody has matched becomes its own animal rather than being
-- absorbed into a neighbour, so an unmatched record is visibly unmatched
-- instead of quietly wrong.
--
-- identity_method is the extension point: 'cv_matched' can be written by a
-- future model without changing this schema or the read paths.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, add-moderation.sql, sighting-email.sql.
-- ════════════════════════════════════════════════════════════════

-- ── 1. How each observation came to be attached to an animal ────────

alter table sightings add column if not exists identity_method text;
alter table sightings add column if not exists identity_confidence text;
alter table sightings add column if not exists identity_note text;
-- What the reporter proposed at submission time, before any review.
alter table sightings add column if not exists claimed_dog_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sightings_identity_method_ck'
  ) then
    alter table sightings add constraint sightings_identity_method_ck
      check (identity_method is null or identity_method in (
        'unlinked',           -- no claim made; this observation is its own animal
        'reporter_selected',  -- the person reporting picked an existing animal
        'reviewer_confirmed', -- a reviewer confirmed the match
        'cv_matched',         -- matched by a model (not implemented yet)
        'proximity_auto'      -- legacy: merged by the old 200 m rule
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sightings_identity_conf_ck'
  ) then
    alter table sightings add constraint sightings_identity_conf_ck
      check (identity_confidence is null or identity_confidence in (
        'certain', 'probable', 'uncertain'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'sightings_claimed_dog_fk'
  ) then
    alter table sightings add constraint sightings_claimed_dog_fk
      foreign key (claimed_dog_id) references dogs(id) on delete set null;
  end if;
end $$;

-- Label what already exists for what it is, rather than leaving rows that
-- were merged by proximity looking like confirmed matches.
update sightings
   set identity_method = 'proximity_auto',
       identity_confidence = 'uncertain'
 where dog_id is not null
   and identity_method is null;

update sightings
   set identity_method = 'unlinked'
 where dog_id is null
   and identity_method is null;

create index if not exists sightings_dog_idx on sightings (dog_id)
  where dog_id is not null;
create index if not exists sightings_claimed_idx on sightings (claimed_dog_id)
  where claimed_dog_id is not null;
create index if not exists sightings_status_created_idx
  on sightings (status, created_at desc);

-- ── 2. Candidates for a human to choose from ────────────────────────

-- Deliberately returns distance and last-seen so the chooser can judge, and
-- deliberately does not rank by anything that looks like a confidence score:
-- there is no model behind it, only geometry.
create or replace function nearby_animals(
  p_lat      float,
  p_lng      float,
  p_radius_m int default 300,
  p_limit    int default 8
) returns table (
  id              uuid,
  name            text,
  zone            text,
  cover_photo     text,
  status          dog_status,
  sightings_count int,
  last_seen       timestamptz,
  distance_m      int
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.zone, d.cover_photo, d.status,
         d.sightings_count, d.last_seen,
         haversine_m(p_lat, p_lng, d.lat, d.lng)::int as distance_m
    from dogs d
   where haversine_m(p_lat, p_lng, d.lat, d.lng) <= greatest(p_radius_m, 0)
   order by haversine_m(p_lat, p_lng, d.lat, d.lng)
   limit greatest(least(p_limit, 25), 1);
$$;

grant execute on function nearby_animals(float, float, int, int)
  to anon, authenticated, service_role;

-- ── 3. Keep the observation count honest ────────────────────────────

-- Derived from the observations that actually point at the animal. The old
-- code incremented a counter on every approval, so a wrong merge inflated it
-- permanently and unmerging could not put it back.
create or replace function recount_animal_sightings(p_dog_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  select count(*) into v_n
    from sightings where dog_id = p_dog_id and status = 'live';

  update dogs
     set sightings_count = greatest(v_n, 1),
         last_seen = coalesce(
           (select max(created_at) from sightings
             where dog_id = p_dog_id and status = 'live'),
           last_seen)
   where id = p_dog_id;

  return v_n;
end $$;

-- ── 4. Approval, without the automatic merge ────────────────────────

-- The single-argument version is dropped first. Postgres would otherwise keep
-- both, and approve_sighting(p_sighting_id => ...) becomes ambiguous against a
-- two-argument version whose second parameter has a default, approval would
-- fail outright with "function is not unique". Dropping it is also what
-- guarantees the old proximity merge in add-moderation.sql / auth-accounts.sql
-- cannot still be reached.
drop function if exists approve_sighting(uuid);

-- p_dog_id: a reviewer's explicit choice. When absent, the reporter's own
-- claim is used. When there is neither, the observation becomes a new animal
--, an unmatched record, visibly unmatched.
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

  -- Reviewer's choice wins over the reporter's claim.
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
      cover_photo = coalesce(cover_photo, s.photo_url)
    where id = v_dog.id
    returning * into v_dog;
  else
    -- Nobody matched it, so it stands on its own.
    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                      needs_help, trust_score, sightings_count,
                      first_seen, last_seen)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
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

-- ── 5. Correcting a link after the fact ─────────────────────────────

-- Moving an observation to the right animal has to fix both counts, which is
-- why the counter is derived rather than incremented.
create or replace function relink_sighting(
  p_sighting_id uuid,
  p_dog_id      uuid,
  p_method      text default 'reviewer_confirmed',
  p_confidence  text default 'probable'
) returns json language plpgsql security definer set search_path = public as $$
declare v_old uuid;
begin
  select dog_id into v_old from sightings where id = p_sighting_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not found');
  end if;

  update sightings
     set dog_id = p_dog_id,
         identity_method = p_method,
         identity_confidence = p_confidence
   where id = p_sighting_id;

  if v_old is not null and v_old <> p_dog_id then
    perform recount_animal_sightings(v_old);
  end if;
  perform recount_animal_sightings(p_dog_id);

  return json_build_object('ok', true, 'dog_id', p_dog_id, 'previous', v_old);
end $$;

grant execute on function relink_sighting(uuid, uuid, text, text) to service_role;

-- ── 6. Rebuild every count once, after the rules changed ────────────

do $$
declare r record;
begin
  for r in select distinct dog_id from sightings where dog_id is not null loop
    perform recount_animal_sightings(r.dog_id);
  end loop;
end $$;

-- ── 7. Let the reporter propose a match at submission time ──────────

-- Same shape as before with one trailing argument, so the old call site keeps
-- working while the client is updated.
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
  p_claimed_dog_id uuid default null
) returns json language plpgsql security definer set search_path = public as $$
declare
  v_trust    int;
  v_sighting uuid;
  v_claim    uuid := null;
begin
  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  -- Only accept a claim that names a real animal; a stale or invented id is
  -- dropped rather than stored as a dangling match.
  if p_claimed_dog_id is not null then
    select id into v_claim from dogs where id = p_claimed_dog_id;
  end if;

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id, reporter_email,
                         claimed_dog_id, identity_method)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id,
          nullif(lower(btrim(coalesce(p_reporter_email,''))), ''),
          v_claim,
          case when v_claim is null then 'unlinked' else 'reporter_selected' end)
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust,
    'claimed_dog_id', v_claim);
end;
$$;

grant execute on function report_sighting(
  text,float,float,text,text,text[],text,text,text,uuid,text,uuid
) to anon, authenticated, service_role;


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ analytics.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════
-- StrayPaw, first-party product analytics.
--
-- Enough to answer seven questions and no more:
--   1. How many people use StrayPaw?
--   2. How many observations are created?
--   3. How many unique animals are recorded?
--   4. How many animals have more than one observation?
--   5. How often do people come back?
--   6. Which locations have activity?
--   7. Where do people abandon the reporting flow?
--
-- No third-party script, no cookie banner, no vendor. The events table is
-- append-only from the browser and readable only by the service role, a
-- usage log that anyone could SELECT would expose reporter behaviour, and
-- location props make that a safety question rather than a privacy nicety.
--
-- Deliberately no IP and no user-agent. Neither is needed for the seven
-- questions, and both make this table something we would have to defend.
--
-- Idempotent. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

create table if not exists events (
  id         bigserial primary key,
  name       text not null,
  -- Set when signed in. Null for the many reporters who never make an account.
  user_id    uuid,
  -- Stable per-browser id, generated client-side. Not linked to a person.
  anon_id    text,
  -- One visit. Lets a funnel be reconstructed without joining on time.
  session_id text,
  path       text,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_name_time_idx on events (name, created_at desc);
create index if not exists events_anon_idx on events (anon_id, created_at desc);
create index if not exists events_session_idx on events (session_id);
create index if not exists events_time_idx on events (created_at desc);

alter table events enable row level security;

-- No policies for anon/authenticated: all writes go through track_event below,
-- so the shape of what lands in the table stays controlled, and nobody can
-- read the log back out.
drop policy if exists events_service_all on events;
create policy events_service_all on events
  for all to service_role using (true) with check (true);

-- ── Write path ──────────────────────────────────────────────────────

-- Names are allow-listed. An open text column fills up with typos and
-- renamed events within a month and the funnel quietly stops matching.
create or replace function track_event(
  p_name       text,
  p_anon_id    text default null,
  p_session_id text default null,
  p_path       text default null,
  p_props      jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_name is null or p_name not in (
    'landing_view',
    'app_opened',
    'signup',
    'login',
    'report_started',
    'report_photo_added',
    'report_location_set',
    'report_details_filled',
    'report_submitted',
    'report_failed',
    'existing_animal_selected',
    'animal_viewed',
    'timeline_viewed',
    'organisation_invited'
  ) then
    return;
  end if;

  insert into events (name, user_id, anon_id, session_id, path, props)
  values (
    p_name,
    auth.uid(),
    nullif(btrim(coalesce(p_anon_id, '')), ''),
    nullif(btrim(coalesce(p_session_id, '')), ''),
    left(coalesce(p_path, ''), 300),
    coalesce(p_props, '{}'::jsonb)
  );
end $$;

grant execute on function track_event(text, text, text, text, jsonb)
  to anon, authenticated, service_role;

-- ── Read path: the seven questions ──────────────────────────────────

-- Q1, Q2, Q3, Q4. Observations and animals come from the real tables, not
-- from the event log, an event can be lost to a dropped request, whereas a
-- row in `sightings` is the thing itself.
create or replace view analytics_overview as
select
  (select count(distinct coalesce(user_id::text, anon_id)) from events)      as people_total,
  (select count(distinct coalesce(user_id::text, anon_id)) from events
    where created_at > now() - interval '30 days')                            as people_30d,
  (select count(*) from sightings)                                            as observations_total,
  (select count(*) from sightings where status = 'live')                      as observations_live,
  (select count(*) from dogs)                                                 as animals_total,
  (select count(*) from (
      select dog_id from sightings
       where dog_id is not null and status = 'live'
       group by dog_id having count(*) > 1) t)                                as animals_with_repeat_observations,
  (select count(*) from sightings where identity_method = 'reporter_selected') as observations_claimed_as_repeat,
  (select count(*) from sightings where identity_method = 'reviewer_confirmed') as observations_confirmed_repeat;

-- Q7. Where the reporting flow is abandoned. Counted per session so one
-- person retrying does not read as five people succeeding.
create or replace view analytics_report_funnel as
with s as (
  select session_id,
         max((name = 'report_started')::int)        as started,
         max((name = 'report_photo_added')::int)    as photo,
         max((name = 'report_location_set')::int)   as located,
         max((name = 'report_details_filled')::int) as details,
         max((name = 'report_submitted')::int)      as submitted,
         max((name = 'report_failed')::int)         as failed
    from events
   where session_id is not null
     and name like 'report_%'
   group by session_id
)
select
  count(*) filter (where started = 1)   as started,
  count(*) filter (where photo = 1)     as reached_photo,
  count(*) filter (where located = 1)   as reached_location,
  count(*) filter (where details = 1)   as reached_details,
  count(*) filter (where submitted = 1) as submitted,
  count(*) filter (where failed = 1)    as failed,
  count(*) filter (where started = 1 and submitted = 0) as abandoned
from s;

-- Q5. Return rate: how many distinct days each person shows up on.
create or replace view analytics_returning as
with d as (
  select coalesce(user_id::text, anon_id) as who,
         count(distinct date_trunc('day', created_at)) as days_active,
         min(created_at) as first_seen,
         max(created_at) as last_seen
    from events
   where coalesce(user_id::text, anon_id) is not null
   group by 1
)
select
  count(*)                                as people,
  count(*) filter (where days_active > 1) as returned_at_least_once,
  count(*) filter (where days_active >= 5) as returned_five_days,
  round(avg(days_active)::numeric, 2)     as avg_active_days
from d;

-- Q6. Where the activity is. Reads from observations so it reflects real
-- coverage rather than page views.
create or replace view analytics_locations as
select coalesce(nullif(btrim(zone), ''), 'Unknown') as place,
       count(*)                                     as observations,
       count(distinct dog_id) filter (where dog_id is not null) as animals,
       max(created_at)                              as latest
  from sightings
 group by 1
 order by observations desc;

revoke all on analytics_overview, analytics_report_funnel,
              analytics_returning, analytics_locations from anon, authenticated;
grant select on analytics_overview, analytics_report_funnel,
                analytics_returning, analytics_locations to service_role;


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ adoption-and-documents.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════
-- StrayPaw, two additions.
--
-- 1. ADOPTION LISTINGS
--    An adoption is an episode with its own life, opened by an
--    organisation, then placed or withdrawn. Keeping it off the animal
--    record means a dog that was listed once and stayed on the street
--    does not carry a stale "adoptable" flag forever, and the listing
--    can be closed without touching the animal's history.
--
-- 2. DOCUMENTS
--    Almost no organisation starts digital: the real record is a ward
--    register page, an ABC ledger, a WhatsApp thread. Import already
--    accepts photographs of those, but they were only ever filed as a
--    sighting photo, so the original became unfindable the moment it
--    scrolled off. A document row keeps the scan addressable, optionally
--    attached to the animal it describes, so a transcribed entry can be
--    checked against the page it came from.
--
-- Idempotent. Safe to run more than once.
-- Depends on: schema.sql, partner-onboarding.sql (my_ngo, is_ngo_member).
-- ════════════════════════════════════════════════════════════════

-- ── 1. Adoption listings ────────────────────────────────────────────

create table if not exists adoption_listings (
  id            uuid primary key default uuid_generate_v4(),
  dog_id        uuid not null references dogs(id) on delete cascade,
  ngo_id        uuid not null,
  status        text not null default 'open'
                check (status in ('open', 'placed', 'withdrawn')),
  summary       text,
  -- Free text rather than an enum: what an adopter needs to know varies,
  -- and a fixed vocabulary here would push people into the wrong box.
  good_with     text,
  needs         text,
  contact_name  text,
  contact_phone text,
  contact_email text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index if not exists adoption_open_idx
  on adoption_listings (created_at desc) where status = 'open';
create index if not exists adoption_dog_idx on adoption_listings (dog_id);
create index if not exists adoption_ngo_idx on adoption_listings (ngo_id);

-- One open listing per animal. Two organisations listing the same dog, or
-- the same organisation listing it twice, is a data-quality problem that is
-- much easier to prevent than to reconcile later.
create unique index if not exists adoption_one_open_per_dog
  on adoption_listings (dog_id) where status = 'open';

alter table adoption_listings enable row level security;

-- Open listings are public: that is the point of a listing. Closed ones stay
-- visible only to the organisation that opened them, since a placed animal's
-- contact details have no reason to remain on a public page.
drop policy if exists adoption_public_read on adoption_listings;
create policy adoption_public_read on adoption_listings
  for select using (status = 'open');

drop policy if exists adoption_org_read on adoption_listings;
create policy adoption_org_read on adoption_listings
  for select to authenticated using (ngo_id = my_ngo());

drop policy if exists adoption_service_all on adoption_listings;
create policy adoption_service_all on adoption_listings
  for all to service_role using (true) with check (true);

create or replace function list_animal_for_adoption(
  p_dog_id        uuid,
  p_summary       text default null,
  p_good_with     text default null,
  p_needs         text default null,
  p_contact_name  text default null,
  p_contact_phone text default null,
  p_contact_email text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can list an animal';
  end if;

  -- Reopening rather than duplicating, so the animal keeps one listing row
  -- and the partial unique index above is never fought with.
  update adoption_listings
     set status = 'open', closed_at = null,
         summary = coalesce(p_summary, summary),
         good_with = coalesce(p_good_with, good_with),
         needs = coalesce(p_needs, needs),
         contact_name = coalesce(p_contact_name, contact_name),
         contact_phone = coalesce(p_contact_phone, contact_phone),
         contact_email = coalesce(p_contact_email, contact_email)
   where dog_id = p_dog_id and ngo_id = v_ngo and status <> 'open'
   returning id into v_id;
  if v_id is not null then return v_id; end if;

  insert into adoption_listings (dog_id, ngo_id, summary, good_with, needs,
                                 contact_name, contact_phone, contact_email,
                                 created_by)
  values (p_dog_id, v_ngo, p_summary, p_good_with, p_needs,
          p_contact_name, p_contact_phone, p_contact_email, auth.uid())
  on conflict do nothing
  returning id into v_id;

  return v_id;
end $$;

create or replace function close_adoption_listing(
  p_id     uuid,
  p_status text default 'placed'
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  if p_status not in ('placed', 'withdrawn') then
    raise exception 'status must be placed or withdrawn';
  end if;
  select my_ngo() into v_ngo;
  update adoption_listings
     set status = p_status, closed_at = now()
   where id = p_id and ngo_id = v_ngo;
  return found;
end $$;

grant execute on function list_animal_for_adoption(uuid,text,text,text,text,text,text)
  to authenticated, service_role;
grant execute on function close_adoption_listing(uuid, text)
  to authenticated, service_role;

-- The public list. A view keeps the join in one place and means the page
-- cannot accidentally select a closed listing's contact details.
create or replace view adoptable_animals as
  select a.id            as listing_id,
         a.dog_id,
         a.summary,
         a.good_with,
         a.needs,
         a.contact_name,
         a.contact_phone,
         a.contact_email,
         a.created_at,
         d.name,
         d.zone,
         d.cover_photo,
         d.sterilised,
         d.vaccinated,
         d.is_friendly,
         n.name          as org_name,
         n.slug          as org_slug
    from adoption_listings a
    join dogs d on d.id = a.dog_id
    left join ngos n on n.id = a.ngo_id
   where a.status = 'open';

grant select on adoptable_animals to anon, authenticated, service_role;

-- ── 2. Documents ────────────────────────────────────────────────────

create table if not exists documents (
  id          uuid primary key default uuid_generate_v4(),
  ngo_id      uuid not null,
  -- Both null while a scan has been filed but not yet matched to anything.
  -- That is the ordinary state on the day of a bulk import: the page arrives
  -- first and the matching happens afterwards.
  dog_id      uuid references dogs(id) on delete set null,
  case_id     uuid references cases(id) on delete set null,
  url         text not null,
  kind        text not null default 'register_page'
              check (kind in ('register_page', 'whatsapp', 'medical_note',
                              'consent_form', 'other')),
  title       text,
  notes       text,
  recorded_on date,
  uploaded_by uuid,
  created_at  timestamptz not null default now()
);

create index if not exists documents_ngo_idx on documents (ngo_id, created_at desc);
create index if not exists documents_dog_idx on documents (dog_id) where dog_id is not null;
create index if not exists documents_case_idx on documents (case_id) where case_id is not null;
create index if not exists documents_unfiled_idx on documents (ngo_id, created_at desc)
  where dog_id is null and case_id is null;

alter table documents enable row level security;

-- Not public. A ward register page carries other people's handwriting,
-- phone numbers and addresses; it is working material for the organisation
-- that holds it, not something to publish alongside an animal.
drop policy if exists documents_org_read on documents;
create policy documents_org_read on documents
  for select to authenticated using (ngo_id = my_ngo());

drop policy if exists documents_service_all on documents;
create policy documents_service_all on documents
  for all to service_role using (true) with check (true);

create or replace function add_document(
  p_url         text,
  p_kind        text default 'register_page',
  p_title       text default null,
  p_notes       text default null,
  p_dog_id      uuid default null,
  p_recorded_on date default null,
  p_case_id     uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_id uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then
    raise exception 'Only a verified organisation can file a document';
  end if;
  if coalesce(btrim(p_url), '') = '' then
    raise exception 'A document needs a file';
  end if;

  insert into documents (ngo_id, dog_id, case_id, url, kind, title, notes,
                         recorded_on, uploaded_by)
  values (v_ngo, p_dog_id, p_case_id, p_url, coalesce(p_kind, 'register_page'),
          p_title, p_notes, p_recorded_on, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Attaching a scan after the fact is the common case: the import happens in
-- a batch, the matching happens later. A page can name an animal, belong to
-- a case, or both, so this sets whichever is passed and clears nothing by
-- accident: pass p_clear to detach instead.
create or replace function link_document(
  p_document_id uuid,
  p_dog_id      uuid default null,
  p_case_id     uuid default null,
  p_clear       boolean default false
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return false; end if;

  if p_clear then
    update documents set dog_id = null, case_id = null
     where id = p_document_id and ngo_id = v_ngo;
    return found;
  end if;

  update documents
     set dog_id  = coalesce(p_dog_id, dog_id),
         case_id = coalesce(p_case_id, case_id)
   where id = p_document_id and ngo_id = v_ngo;
  return found;
end $$;

-- The written context that goes with a scan. A photograph of a ledger is not
-- self-explanatory: what it is, whose handwriting, which drive it belongs to,
-- is the part that makes it usable by someone who was not there.
create or replace function update_document(
  p_document_id uuid,
  p_title       text default null,
  p_notes       text default null,
  p_kind        text default null,
  p_recorded_on date default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return false; end if;

  update documents set
    -- Empty string clears a field; null leaves it alone.
    title       = case when p_title is null then title
                       else nullif(btrim(p_title), '') end,
    notes       = case when p_notes is null then notes
                       else nullif(btrim(p_notes), '') end,
    kind        = coalesce(p_kind, kind),
    recorded_on = coalesce(p_recorded_on, recorded_on)
  where id = p_document_id and ngo_id = v_ngo;
  return found;
end $$;

grant execute on function add_document(text,text,text,text,uuid,date,uuid)
  to authenticated, service_role;
grant execute on function link_document(uuid, uuid, uuid, boolean)
  to authenticated, service_role;
grant execute on function update_document(uuid, text, text, text, date)
  to authenticated, service_role;

-- Documents for one animal, for the organisation that holds them.
create or replace function animal_documents(p_dog_id uuid)
returns setof documents language sql stable security definer
set search_path = public as $$
  select * from documents
   where dog_id = p_dog_id and ngo_id = my_ngo()
   order by coalesce(recorded_on, created_at::date) desc, created_at desc;
$$;

grant execute on function animal_documents(uuid) to authenticated, service_role;

create or replace function case_documents(p_case_id uuid)
returns setof documents language sql stable security definer
set search_path = public as $$
  select * from documents
   where case_id = p_case_id and ngo_id = my_ngo()
   order by coalesce(recorded_on, created_at::date) desc, created_at desc;
$$;

grant execute on function case_documents(uuid) to authenticated, service_role;


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ no-similarity-merge.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════
-- StrayPaw, remove merging by similarity.
--
-- WHY
--
-- merge_dogs(keep, remove) moved every sighting, feeding, vaccination,
-- sterilisation, comment and case from one animal onto another and then
-- ran `delete from dogs where id = p_remove`. The interface that drove it
-- proposed candidates from a similarity score: distance, a shared name,
-- the same colour and size, the same zone. On an Indian street those
-- describe most of the dogs on the block.
--
-- The score is the problem. It reads as evidence and it is not: two brown
-- medium dogs 200 m apart in the same ward score highly and are usually
-- two dogs. Acting on that guess deletes a row, so the mistake cannot be
-- found later or undone. A wrongly merged pair is also invisible
-- afterwards, because the record that would have contradicted it is gone.
--
-- WHAT REPLACES IT
--
-- Nothing automatic. Where two records genuinely are one animal, a person
-- moves the observations across with relink_sighting() from
-- observation-identity.sql: one observation at a time, recording who made
-- the link and how sure they were, keeping both animal rows, and
-- recomputing both counts. That is reversible. This was not.
--
-- Idempotent. Safe to run more than once.
-- ════════════════════════════════════════════════════════════════

-- Guarded, because a bare revoke on a function that is already gone is an
-- error, and this file has to survive being run a second time. The drop
-- alone would remove the grants; the revoke is here so that a drop blocked
-- by a dependency still leaves nobody able to call it.
do $$
begin
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'merge_dogs'
       and pg_get_function_identity_arguments(p.oid) = 'uuid, uuid'
  ) then
    execute 'revoke execute on function merge_dogs(uuid, uuid) from authenticated, anon';
  end if;
end $$;

drop function if exists merge_dogs(uuid, uuid);

-- An animal record emptied by moving its observations elsewhere is left
-- standing rather than deleted, so the merge stays visible and reversible.
-- This reports them instead of removing them.
create or replace function animals_without_observations()
returns table (
  id         uuid,
  name       text,
  zone       text,
  first_seen timestamptz,
  last_seen  timestamptz
) language sql stable security definer set search_path = public as $$
  select d.id, d.name, d.zone, d.first_seen, d.last_seen
    from dogs d
   where d.ngo_id = my_ngo()
     and not exists (
       select 1 from sightings s
        where s.dog_id = d.id and s.status = 'live'
     )
   order by d.last_seen desc;
$$;

grant execute on function animals_without_observations()
  to authenticated, service_role;


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ abc-programme.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ org-invite-codes.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ org-email-invites.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

create or replace function admin_remove_from_org(
  p_ngo_id uuid,
  p_email  text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_email text := lower(btrim(coalesce(p_email, ''))); v_user uuid;
begin
  delete from org_email_invites
   where ngo_id = p_ngo_id and lower(btrim(email)) = v_email;

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

  if v_dogs = 0 and v_cases = 0 and v_docs = 0 then
    delete from ngos where id = p_ngo_id;
    return json_build_object('ok', true, 'deleted', true, 'name', v_name);
  end if;

  update ngos set verified = false where id = p_ngo_id;

  return json_build_object(
    'ok', true, 'deleted', false, 'name', v_name,
    'animals', v_dogs, 'cases', v_cases, 'documents', v_docs,
    'codes_revoked', v_codes);
end $$;

grant execute on function admin_retire_org(uuid) to service_role;


-- ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ┃ org-access-codes.sql
-- ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

-- ── 8. Moderation listing carries every code ────────────────────────

-- The moderation page is the place to answer "who has a code for this
-- organisation, and does it still work". That has to include the codes a
-- team lead cut for their own people, not only the ones moderation issued,
-- or the answer is wrong the moment an organisation starts running itself.
create or replace function admin_list_orgs()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(row_to_json(o) order by o.name), '[]'::json)
  from (
    select n.id, n.name, n.slug, n.city, n.verified,
           (select count(*) from ngo_members m where m.ngo_id = n.id) as members,
           (select count(*) from dogs d where d.ngo_id = n.id)        as animals,
           (select count(*) from org_invite_codes c
             where c.ngo_id = n.id and c.active)                      as active_codes,

           -- Staff: dashboard access, one use, burnt on sign-in.
           (select coalesce(json_agg(json_build_object(
                     'id', i.id,
                     'email', i.email,
                     'name', i.person_name,
                     'role', i.role,
                     'code', i.code,
                     'accepted', i.accepted_at is not null,
                     'revoked', i.revoked_at is not null,
                     'expires_at', i.expires_at,
                     -- Whether moderation issued it or the organisation did.
                     -- invited_by is null only for the codes minted here.
                     'by_org', i.invited_by is not null,
                     'created_at', i.created_at) order by i.created_at), '[]'::json)
              from org_email_invites i where i.ngo_id = n.id)         as invites,

           -- Volunteers: reporting only, reusable, usually cut by the lead.
           (select coalesce(json_agg(json_build_object(
                     'id', c.id,
                     'email', c.email,
                     'name', coalesce(c.person_name, c.label),
                     'code', c.code,
                     'active', c.active,
                     'reports', (select count(*) from sightings s
                                  where s.invite_code_id = c.id),
                     'created_at', c.created_at) order by c.created_at), '[]'::json)
              from org_invite_codes c where c.ngo_id = n.id)          as volunteer_codes
      from ngos n
     order by n.name
  ) o;
$$;

grant execute on function admin_list_orgs() to service_role;

-- Moderation can turn any code off, whoever cut it. Used when somebody
-- leaves and nobody at the organisation has got round to it.
create or replace function admin_revoke_code(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_ngo uuid; v_hit boolean := false;
begin
  update org_invite_codes set active = false, revoked_at = now()
   where id = p_id and active;
  if found then return true; end if;

  select accepted_by, ngo_id into v_user, v_ngo
    from org_email_invites where id = p_id;
  if found then
    v_hit := true;
    update org_email_invites set revoked_at = now(), code = null where id = p_id;
    if v_user is not null then
      delete from ngo_members where ngo_id = v_ngo and user_id = v_user;
    end if;
  end if;

  return v_hit;
end $$;

grant execute on function admin_revoke_code(uuid) to service_role;
