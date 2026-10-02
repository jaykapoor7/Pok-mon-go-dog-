-- Public organisation totals need only these care flags. Keep the large dog
-- records out of the count read, using a small partial covering index.
create index if not exists dogs_public_org_impact_idx on public.dogs (ngo_id)
include (sterilisation_status, sterilised, vaccination_status, vaccinated)
where ngo_id is not null and not coalesce(is_demo,false);

-- Plan the aggregate after applying this function's JIT setting, rather than
-- preparing an SQL-function plan before the per-function settings take effect.
create or replace function public.list_public_org_impacts()
returns table(ngo_id uuid,animals_recorded bigint,sterilised bigint,vaccinated bigint,case_records bigint,active_cases bigint,resolved_cases bigint)
language plpgsql stable security definer
set search_path=public set max_parallel_workers_per_gather=0 set jit=off as $$
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
    group by c.ngo_id
  )
  select coalesce(a.ngo_id,x.ngo_id),coalesce(a.animals_recorded,0),coalesce(a.sterilised,0),coalesce(a.vaccinated,0),
    coalesce(x.case_records,0),coalesce(x.active_cases,0),coalesce(x.resolved_cases,0)
  from animal_counts a full join case_counts x on a.ngo_id=x.ngo_id;
end $$;
