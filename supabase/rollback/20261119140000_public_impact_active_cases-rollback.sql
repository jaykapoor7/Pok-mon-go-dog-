-- Rollback for 2026-11-18-public-impact-active-cases.sql: the definition on production on 18 Nov 2026, unchanged.
create or replace function public.list_public_org_impacts()
 returns table(ngo_id uuid, animals_recorded bigint, sterilised bigint, vaccinated bigint, case_records bigint, active_cases bigint, resolved_cases bigint)
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
