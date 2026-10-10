-- PROPOSED, NOT APPLIED. Needs the owner's approval before it runs on production.
--
-- Clinic care-register records are not requests for help.
--
-- The Jamshedpur import (supabase/functions/import-jamshedpur) stores one
-- `cases` row per animal, titled "CNVR clinical care record": a historical
-- sterilisation/vaccination clinic entry (2013-2016), closed on import. Counting
-- those rows as "cases" makes Jamshedpur read as 20,915 requests for help,
-- puts 92% of all cases in "closed without action", and gives every one a
-- "same day" first action. They stay in `cases` (nothing is deleted or changed);
-- every count of requests, cases and case histories would leave them out, and
-- they remain counted as animals and as care events (medical_events).
--
-- Measured before this change (read-only SQL, 2026-10-10):
--   cases 23,200 = 20,915 clinic care records (all Jamshedpur) + 2,285 others
--   spatial_city_cells.cases for Jamshedpur = 20,915, open_cases = 0
--
-- Expected after: Jamshedpur cases 0 (care_events 20,915 unchanged); total cases
-- 2,285; public_case_facts 2,285 rows.
--
-- Apply, then:  select public.rebuild_spatial_city('Jamshedpur');
-- Rollback:     supabase/rollback/care-register-records-rollback.sql

create or replace function public.is_care_register_record(p_category text, p_provenance text, p_title text)
returns boolean language sql immutable parallel safe
as $$ select p_provenance = 'imported_historical_record'
          and p_category in ('sterilisation', 'vaccination')
          and coalesce(p_title, '') ilike '%clinical care record%' $$;

comment on function public.is_care_register_record(text, text, text) is
  'True for an imported clinic care-register entry stored as a case (title ends "clinical care record"). Such rows are care records, not requests for help.';

-- Public case facts: requests and their outcomes only.
create or replace view public.public_case_facts as
 SELECT c.id,
    c.dog_id,
    c.ngo_id,
    c.h3_r8,
    c.city,
    c.district,
    c.zone,
    COALESCE(c.source_event_at, c.created_at) AS occurred_at,
    c.condition_class,
    c.status_class,
    c.closure_reason,
    c.intake_channel,
    c.severity::text AS severity,
        CASE
            WHEN c.first_action_at IS NOT NULL THEN GREATEST(0, c.first_action_at::date - COALESCE(c.source_event_at, c.created_at)::date)
            ELSE NULL::integer
        END AS first_action_days,
        CASE
            WHEN c.resolved_at_source = 'recorded'::text AND c.resolved_at IS NOT NULL THEN GREATEST(0, c.resolved_at::date - COALESCE(c.source_event_at, c.created_at)::date)
            ELSE NULL::integer
        END AS resolved_days,
    c.resolved_at_source,
    c.resolved_at,
        CASE
            WHEN c.provenance = 'imported_historical_record'::text THEN 'field'::text
            ELSE 'resident'::text
        END AS source,
    COALESCE(f.done, 0::bigint) AS followups_done,
    COALESCE(f.missed, 0::bigint) AS followups_missed,
    COALESCE(f.upcoming, 0::bigint) AS followups_upcoming,
    c.status_reviewed_at AS reviewed_at
   FROM cases c
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE a.status = 'done'::text) AS done,
            count(*) FILTER (WHERE a.status = 'missed'::text) AS missed,
            count(*) FILTER (WHERE a.status = 'upcoming'::text) AS upcoming
           FROM animal_followups a
          WHERE a.case_id = c.id) f ON true
  WHERE NOT COALESCE(c.is_demo, false)
    AND NOT public.is_care_register_record(c.category::text, c.provenance, c.title);

-- City / cell rollup: `cases` and `open_cases` count requests only.
CREATE OR REPLACE FUNCTION public.rebuild_spatial_city(p_city text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET max_parallel_workers_per_gather TO '0'
AS $function$
declare v_rows integer;
begin
  if nullif(btrim(p_city), '') is null then return 0; end if;

  delete from public.spatial_city_cells where city = btrim(p_city);

  with animal_cells as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::integer as animals,
           count(*) filter (where public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id))::integer as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::integer as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::integer as vaccinated,
           max(d.last_seen) as latest_seen
      from public.dogs d
     where d.city = btrim(p_city)
       and d.species = 'dog'
       and d.h3_r8 is not null
       and not coalesce(d.is_demo, false)
     group by d.city, d.h3_r8
  ), case_points as (
    select
      case when c.provenance = 'imported_historical_record' and d.city is not null
           then d.city else coalesce(c.city, d.city) end as city,
      case when c.provenance = 'imported_historical_record' and d.state is not null
           then d.state else coalesce(c.state, d.state) end as state,
      case when c.provenance = 'imported_historical_record' and d.zone is not null
           then d.zone else coalesce(c.zone, d.zone) end as zone,
      case when c.provenance = 'imported_historical_record' and d.h3_r8 is not null
           then d.h3_r8 else coalesce(c.h3_r8, d.h3_r8) end as h3_r8,
      c.status_class
    from public.cases c
    left join public.dogs d on d.id = c.dog_id
    where not coalesce(c.is_demo, false)
      and not public.is_care_register_record(c.category::text, c.provenance, c.title)
      and (d.id is null or (not coalesce(d.is_demo,false) and d.species='dog'))
  ), case_cells as (
    select city, max(state) as state, max(zone) as zone, h3_r8,
           count(*)::integer as cases,
           count(*) filter (where status_class in ('open', 'in_progress'))::integer as open_cases
      from case_points
     where city = btrim(p_city) and h3_r8 is not null
     group by city, h3_r8
  ), care_cells as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::integer as care_events
      from public.medical_events m
      join public.dogs d on d.id = m.dog_id
     where d.city = btrim(p_city)
       and d.species = 'dog'
       and d.h3_r8 is not null
       and not coalesce(d.is_demo, false)
       and not coalesce(m.is_demo, false)
     group by d.city, d.h3_r8
  ), cell_keys as (
    select city, h3_r8 from animal_cells
    union
    select city, h3_r8 from case_cells
    union
    select city, h3_r8 from care_cells
  )
  insert into public.spatial_city_cells
    (city, state, zone, h3_r8, animals, needs_help, sterilised, vaccinated,
     open_cases, cases, care_events, latest_seen, refreshed_at)
  select k.city,
         coalesce(a.state, c.state, m.state),
         coalesce(a.zone, c.zone, m.zone),
         k.h3_r8,
         coalesce(a.animals, 0),
         coalesce(a.needs_help, 0),
         coalesce(a.sterilised, 0),
         coalesce(a.vaccinated, 0),
         coalesce(c.open_cases, 0),
         coalesce(c.cases, 0),
         coalesce(m.care_events, 0),
         a.latest_seen,
         now()
    from cell_keys k
    left join animal_cells a on a.city = k.city and a.h3_r8 = k.h3_r8
    left join case_cells c on c.city = k.city and c.h3_r8 = k.h3_r8
    left join care_cells m on m.city = k.city and m.h3_r8 = k.h3_r8;

  get diagnostics v_rows = row_count;
  delete from public.spatial_refresh_queue where city = btrim(p_city);
  return v_rows;
end
$function$;

-- Organisation impact: case_records counts requests, not clinic register entries.
CREATE OR REPLACE FUNCTION public.list_public_org_impacts()
 RETURNS TABLE(ngo_id uuid, animals_recorded bigint, sterilised bigint, vaccinated bigint, case_records bigint, active_cases bigint, resolved_cases bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET max_parallel_workers_per_gather TO '0'
 SET jit TO 'off'
AS $function$
begin
  return query
  with animal_counts as (
    select d.ngo_id,
      count(*) as animals_recorded,
      count(*) filter (where d.sterilisation_status='sterilised' or (d.sterilisation_status is null and d.sterilised)) as sterilised,
      count(*) filter (where d.vaccination_status='vaccinated' or (d.vaccination_status is null and d.vaccinated)) as vaccinated
    from public.dogs d
    where d.ngo_id is not null and not coalesce(d.is_demo,false)
    group by d.ngo_id
  ), case_counts as (
    select c.ngo_id,
      count(*) as case_records,
      count(*) filter (where c.status_class in ('open','in_progress')) as active_cases,
      count(*) filter (where c.status_class='closed') as resolved_cases
    from public.cases c
    where c.ngo_id is not null and not coalesce(c.is_demo,false)
      and not public.is_care_register_record(c.category::text, c.provenance, c.title)
    group by c.ngo_id
  )
  select coalesce(a.ngo_id,x.ngo_id),coalesce(a.animals_recorded,0),coalesce(a.sterilised,0),coalesce(a.vaccinated,0),
    coalesce(x.case_records,0),coalesce(x.active_cases,0),coalesce(x.resolved_cases,0)
  from animal_counts a full join case_counts x on a.ngo_id=x.ngo_id;
end $function$;

-- Platform totals: requests and care-register records reported separately.
CREATE OR REPLACE FUNCTION public.get_public_platform_totals()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET max_parallel_workers_per_gather TO '0'
AS $function$
  select jsonb_build_object(
    'animals', (select count(*) from public.dogs where not coalesce(is_demo, false)),
    'cases', (select count(*) from public.cases c where not coalesce(c.is_demo, false)
                and not public.is_care_register_record(c.category::text, c.provenance, c.title)),
    'care_register_records', (select count(*) from public.cases c where not coalesce(c.is_demo, false)
                and public.is_care_register_record(c.category::text, c.provenance, c.title)),
    'care', (select count(*) from public.medical_events where not coalesce(is_demo, false)),
    'mapped_animals', (select coalesce(sum(animals), 0) from public.spatial_city_cells),
    'mapped_cases', (select coalesce(sum(cases), 0) from public.spatial_city_cells),
    'mapped_care', (select coalesce(sum(care_events), 0) from public.spatial_city_cells)
  );
$function$;

-- "Animals with case histories": histories of requests only.
CREATE OR REPLACE FUNCTION public.count_public_case_stories(p_city text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET max_parallel_workers_per_gather TO '0'
 SET jit TO 'off'
AS $function$
declare total bigint;
begin
  if p_city is null then
    select count(*) into total from public.dogs d
    where not coalesce(d.is_demo,false) and d.species='dog'
      and exists (select 1 from public.cases c where c.dog_id=d.id and not coalesce(c.is_demo,false)
                    and not public.is_care_register_record(c.category::text, c.provenance, c.title));
  else
    select count(*) into total from public.dogs d
    where not coalesce(d.is_demo,false) and d.species='dog'
      and (btrim(lower(d.city))=btrim(lower(p_city))
        or (p_city='Delhi' and d.city='New Delhi')
        or (p_city='Hyderabad' and d.city='Secunderabad'))
      and exists (select 1 from public.cases c where c.dog_id=d.id and not coalesce(c.is_demo,false)
                    and not public.is_care_register_record(c.category::text, c.provenance, c.title));
  end if;
  return total;
end $function$;
