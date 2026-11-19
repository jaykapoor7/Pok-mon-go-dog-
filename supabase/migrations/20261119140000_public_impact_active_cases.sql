-- The public organisation card keeps every case, and shows old imported ones as archived.
--
-- Why: list_public_org_impacts() feeds the embeddable organisation card (src/app/embed/[slug]/page.tsx). "Being helped
-- now" counted every case whose status class is open or in progress, including imported historical records whose old
-- status nobody has confirmed. On production (read-only, 18 Nov 2026) it said 177 for The Pawsome People Project:
-- 2 current community reports and 175 imported records from 2024-2026 with no outcome recorded. Those 175 are not
-- removed or hidden: they get their own figure, "Archived, no outcome recorded", the same group the organisation's
-- own Cases page shows.
--
-- What changes: a new column archived_cases (open imported historical cases never confirmed, status_reviewed_at null),
-- and active_cases no longer includes them. Every other column is unchanged; case_records still counts every case.
-- The return type changes, so the function is dropped and recreated with the same security, settings and grants
-- (execute for service_role only). Safe to re-run.
-- Rollback: supabase/rollback/20261119140000_public_impact_active_cases-rollback.sql.

drop function if exists public.list_public_org_impacts();

create or replace function public.list_public_org_impacts()
 returns table(ngo_id uuid, animals_recorded bigint, sterilised bigint, vaccinated bigint, case_records bigint, active_cases bigint, resolved_cases bigint, archived_cases bigint)
 language plpgsql stable security definer
 set search_path to 'public'
 set max_parallel_workers_per_gather to '0'
 set jit to 'off'
as $function$
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
      count(*) filter (where c.status_class in ('open','in_progress')
                         and not (c.provenance is not distinct from 'imported_historical_record' and c.status_reviewed_at is null)) as active_cases,
      count(*) filter (where c.status_class='closed') as resolved_cases,
      count(*) filter (where c.status_class in ('open','in_progress')
                         and c.provenance is not distinct from 'imported_historical_record' and c.status_reviewed_at is null) as archived_cases
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
    coalesce(x.case_records,0),coalesce(x.active_cases,0),coalesce(x.resolved_cases,0),coalesce(x.archived_cases,0)
  from animal_counts a full join case_counts x on a.ngo_id=x.ngo_id;
end $function$;
revoke all on function public.list_public_org_impacts() from public, anon, authenticated;
grant execute on function public.list_public_org_impacts() to service_role;
