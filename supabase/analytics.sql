-- ════════════════════════════════════════════════════════════════
-- StrayPaw — first-party product analytics.
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
-- append-only from the browser and readable only by the service role — a
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
-- from the event log — an event can be lost to a dropped request, whereas a
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
