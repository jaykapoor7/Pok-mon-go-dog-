-- Proposed, not applied. The public "Being helped now" figure leaves out imported cases nobody has confirmed.
--
-- Why: list_public_org_impacts() feeds the embeddable organisation card (src/app/embed/[slug]/page.tsx, "Being helped
-- now"). It counts every case whose status class is open or in progress, including imported historical records whose
-- old status was never confirmed. On production (read-only, 18 Nov 2026) it says 177 for The Pawsome People Project:
-- 2 current community reports and 175 imported records from 2024-2026 that the organisation's own Today and Cases pages
-- keep apart as "Imported, not confirmed". The public card and the NGO's home must not disagree about what is active.
--
-- What changes: active_cases counts an imported historical case only once a person has confirmed it (status_reviewed_at set),
-- the rule Today, Cases and Kaju use (src/nx/data/ngo.ts isHistorical). Every other column is unchanged, and the
-- function keeps its signature, security and settings. Safe to re-run. Rollback: re-apply the previous definition,
-- saved in 2026-11-18-public-impact-active-cases.rollback.sql.

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
      count(*) filter (where c.status_class in ('open','in_progress')
                         and not (c.provenance is not distinct from 'imported_historical_record' and c.status_reviewed_at is null)) as active_cases,
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
