-- Public read performance: organisation directory counts and published stories.
--
-- Production evidence (2026-11-08, read-only EXPLAIN ANALYZE):
--  * list_public_org_impacts() took 1.4–10.5 s. Its case filter called
--    is_care_register_record() once per case; that function carries
--    `SET search_path`, which stops Postgres inlining it, so 23,200 full
--    function calls ran on a small shared instance. The same expression
--    written inline measured 99 ms against 195 ms through the function, and
--    the gap grows when the instance is busy (3.1 s seen for the scan).
--  * public_case_stories sorted every case joined to every animal by
--    coalesce(source_event_at, created_at) to return 25 rows (2.6 s), so the
--    stories page timed out under load (AbortError in Vercel logs).
--
-- This migration changes no permissions and no results:
--  1. list_public_org_impacts keeps its signature, owner, security definer,
--     settings and grants; only the filter is written inline, with the exact
--     semantics of is_care_register_record().
--  2. An index matching the stories view's filter and sort order, so the
--     newest stories are read first and the scan stops at the page size.
-- Additive and safe to re-run. Test on staging first; production needs the
-- owner's approval.

CREATE INDEX IF NOT EXISTS cases_public_story_order_idx
  ON public.cases ((COALESCE(source_event_at, created_at)) DESC, id DESC)
  WHERE dog_id IS NOT NULL AND NOT COALESCE(is_demo, false);

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
      -- Inline form of public.is_care_register_record(category, provenance, title),
      -- including its NULL behaviour (a NULL provenance yields NULL, as before).
      and not (c.provenance = 'imported_historical_record'
               and c.category::text in ('sterilisation', 'vaccination')
               and coalesce(c.title, '') ilike '%clinical care record%')
    group by c.ngo_id
  )
  select coalesce(a.ngo_id,x.ngo_id),coalesce(a.animals_recorded,0),coalesce(a.sterilised,0),coalesce(a.vaccinated,0),
    coalesce(x.case_records,0),coalesce(x.active_cases,0),coalesce(x.resolved_cases,0)
  from animal_counts a full join case_counts x on a.ngo_id=x.ngo_id;
end $function$;
