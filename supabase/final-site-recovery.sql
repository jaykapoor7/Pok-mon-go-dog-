-- Final post-import recovery: query pressure + canonical spatial attribution.
-- Additive and safe to re-run. Apply only after the matching app branch passes.

create index if not exists cases_public_story_order_idx
  on public.cases ((coalesce(source_event_at, created_at)) desc, id desc)
  where dog_id is not null and not coalesce(is_demo, false);

create index if not exists cases_dog_event_idx
  on public.cases (dog_id, (coalesce(source_event_at, created_at)) desc)
  where dog_id is not null;

create index if not exists animal_followups_case_status_idx
  on public.animal_followups (case_id, status);

create index if not exists sightings_dog_created_idx
  on public.sightings (dog_id, created_at desc)
  where dog_id is not null;

create index if not exists cases_ngo_status_class_idx
  on public.cases (ngo_id, status_class)
  where ngo_id is not null and not coalesce(is_demo, false);

create index if not exists dogs_public_help_recent_idx
  on public.dogs (last_seen desc)
  where needs_help;

create index if not exists dogs_public_sightings_rank_idx
  on public.dogs (sightings_count desc nulls last, id);

create index if not exists dogs_public_photo_recent_idx
  on public.dogs (last_seen desc)
  where cover_photo is not null;

create or replace function public.list_public_org_impacts()
returns table (
  ngo_id uuid,
  animals_recorded bigint,
  sterilised bigint,
  vaccinated bigint,
  case_records bigint,
  active_cases bigint,
  resolved_cases bigint
)
language sql
security definer
set search_path = public
set max_parallel_workers_per_gather = 0
stable
as $
  with animal_counts as (
    select d.ngo_id,
           count(*) as animals_recorded,
           count(*) filter (where d.sterilisation_status = 'sterilised'
             or (d.sterilisation_status is null and d.sterilised)) as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated'
             or (d.vaccination_status is null and d.vaccinated)) as vaccinated
      from public.dogs d
     where d.ngo_id is not null and not coalesce(d.is_demo, false)
     group by d.ngo_id
  ), case_counts as (
    select c.ngo_id,
           count(*) as case_records,
           count(*) filter (where c.status_class in ('open','in_progress')) as active_cases,
           count(*) filter (where c.status_class = 'closed') as resolved_cases
      from public.cases c
     where c.ngo_id is not null and not coalesce(c.is_demo, false)
     group by c.ngo_id
  )
  select coalesce(a.ngo_id, x.ngo_id),
         coalesce(a.animals_recorded, 0),
         coalesce(a.sterilised, 0),
         coalesce(a.vaccinated, 0),
         coalesce(x.case_records, 0),
         coalesce(x.active_cases, 0),
         coalesce(x.resolved_cases, 0)
    from animal_counts a
    full join case_counts x using (ngo_id)
$;

revoke all on function public.list_public_org_impacts() from public, anon, authenticated;
grant execute on function public.list_public_org_impacts() to service_role;

-- Imported case coordinates/cells were historical source locations and can
-- disagree with the canonical animal cell created by the normalized import.
-- For those rows only, prefer the linked animal's place. Live/resident cases
-- keep their case-specific location.
create or replace view public.public_case_facts as
select
  c.id, c.dog_id, c.ngo_id,
  case when c.provenance = 'imported_historical_record' and d.h3_r8 is not null
       then d.h3_r8 else coalesce(c.h3_r8, d.h3_r8) end as h3_r8,
  case when c.provenance = 'imported_historical_record' and d.city is not null
       then d.city else coalesce(c.city, d.city) end as city,
  case when c.provenance = 'imported_historical_record' and d.district is not null
       then d.district else coalesce(c.district, d.district) end as district,
  case when c.provenance = 'imported_historical_record' and d.zone is not null
       then d.zone else coalesce(c.zone, d.zone) end as zone,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.condition_class, c.status_class, c.closure_reason, c.intake_channel,
  c.severity::text as severity,
  case when c.first_action_at is not null
       then greatest(0, (c.first_action_at::date - coalesce(c.source_event_at, c.created_at)::date)) end as first_action_days,
  case when c.resolved_at_source in ('recorded') and c.resolved_at is not null
       then greatest(0, (c.resolved_at::date - coalesce(c.source_event_at, c.created_at)::date)) end as resolved_days,
  c.resolved_at_source,
  c.resolved_at,
  case when c.provenance = 'imported_historical_record' then 'field' else 'resident' end as source,
  coalesce(f.done, 0) as followups_done,
  coalesce(f.missed, 0) as followups_missed,
  coalesce(f.upcoming, 0) as followups_upcoming,
  c.status_reviewed_at as reviewed_at
from public.cases c
left join public.dogs d on d.id = c.dog_id
left join lateral (
  select count(*) filter (where status = 'done') as done,
         count(*) filter (where status = 'missed') as missed,
         count(*) filter (where status = 'upcoming') as upcoming
  from public.animal_followups a where a.case_id = c.id
) f on true
where not coalesce(c.is_demo, false);

grant select on public.public_case_facts to anon, authenticated, service_role;

create or replace view public.org_case_facts with (security_invoker = true) as
select
  c.id, c.dog_id, c.ngo_id, c.case_code, c.title,
  case when c.provenance = 'imported_historical_record' and d.zone is not null
       then d.zone else coalesce(c.zone, d.zone) end as zone,
  case when c.provenance = 'imported_historical_record' and d.h3_r8 is not null
       then d.h3_r8 else coalesce(c.h3_r8, d.h3_r8) end as h3_r8,
  case when c.provenance = 'imported_historical_record' and d.city is not null
       then d.city else coalesce(c.city, d.city) end as city,
  case when c.provenance = 'imported_historical_record' and d.district is not null
       then d.district else coalesce(c.district, d.district) end as district,
  c.lat, c.lng, c.location_precision,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.status::text as status, c.stage, c.severity::text as severity,
  c.condition_class, c.status_class, c.closure_reason, c.intake_channel,
  c.first_action_at, c.resolved_at, c.resolved_at_source,
  c.assignee_id, c.assignee_name, c.last_activity_at, c.follow_up_at, c.next_action,
  c.provenance, c.species,
  d.name as animal_name, d.straypaw_id, d.cover_photo,
  coalesce(f.done, 0) as followups_done,
  coalesce(f.missed, 0) as followups_missed,
  coalesce(f.upcoming, 0) as followups_upcoming,
  f.next_due,
  c.status_reviewed_at as reviewed_at
from public.cases c
left join public.dogs d on d.id = c.dog_id
left join lateral (
  select count(*) filter (where status = 'done') as done,
         count(*) filter (where status = 'missed') as missed,
         count(*) filter (where status = 'upcoming') as upcoming,
         min(due_at) filter (where status = 'upcoming') as next_due
  from public.animal_followups a where a.case_id = c.id
) f on true;

revoke all on public.org_case_facts from anon, authenticated;
grant select on public.org_case_facts to authenticated, service_role;

create or replace function public.rebuild_spatial_city(p_city text)
returns integer
language plpgsql
security definer
set search_path = public
set max_parallel_workers_per_gather = 0
as $$
declare v_rows integer;
begin
  if nullif(btrim(p_city), '') is null then return 0; end if;

  delete from public.spatial_city_cells where city = btrim(p_city);

  with animal_cells as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::integer as animals,
           count(*) filter (where coalesce(d.needs_help, false) or d.status::text = 'injured')::integer as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::integer as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::integer as vaccinated,
           max(d.last_seen) as latest_seen
      from public.dogs d
     where d.city = btrim(p_city)
       and d.h3_r8 is not null
       and not coalesce(d.is_demo, false)
     group by d.city, d.h3_r8
  ), case_points as (
    select
      case when c.provenance = 'imported_historical_record' and d.city is not null
           then d.city else coalesce(c.city, d.city) end as city,
      case when c.provenance = 'imported_historical_record' and d.h3_r8 is not null
           then d.h3_r8 else coalesce(c.h3_r8, d.h3_r8) end as h3_r8,
      c.status_class
    from public.cases c
    left join public.dogs d on d.id = c.dog_id
    where not coalesce(c.is_demo, false)
  ), case_cells as (
    select city, h3_r8,
           count(*)::integer as cases,
           count(*) filter (where status_class in ('open', 'in_progress'))::integer as open_cases
      from case_points
     where city = btrim(p_city) and h3_r8 is not null
     group by city, h3_r8
  ), care_cells as (
    select d.city, d.h3_r8, count(*)::integer as care_events
      from public.medical_events m
      join public.dogs d on d.id = m.dog_id
     where d.city = btrim(p_city)
       and d.h3_r8 is not null
       and not coalesce(d.is_demo, false)
       and not coalesce(m.is_demo, false)
     group by d.city, d.h3_r8
  )
  insert into public.spatial_city_cells
    (city, state, zone, h3_r8, animals, needs_help, sterilised, vaccinated,
     open_cases, cases, care_events, latest_seen, refreshed_at)
  select a.city, a.state, a.zone, a.h3_r8, a.animals, a.needs_help,
         a.sterilised, a.vaccinated,
         coalesce(c.open_cases, 0), coalesce(c.cases, 0),
         coalesce(k.care_events, 0), a.latest_seen, now()
    from animal_cells a
    left join case_cells c on c.city = a.city and c.h3_r8 = a.h3_r8
    left join care_cells k on k.city = a.city and k.h3_r8 = a.h3_r8;

  get diagnostics v_rows = row_count;
  delete from public.spatial_refresh_queue where city = btrim(p_city);
  return v_rows;
end $$;

revoke all on function public.rebuild_spatial_city(text) from public, anon, authenticated;
grant execute on function public.rebuild_spatial_city(text) to service_role;

insert into public.spatial_refresh_queue (city, reason)
select distinct d.city, 'final_recovery'
from public.dogs d
where d.city is not null and d.h3_r8 is not null and not coalesce(d.is_demo, false)
on conflict (city) do update
set requested_at = excluded.requested_at, reason = excluded.reason;
