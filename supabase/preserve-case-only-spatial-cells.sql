-- Preserve spatial cells that contain case or care activity even when no
-- current animal point falls in that H3 cell. This keeps public city/case
-- rollups equal to the canonical public register when a case location differs
-- from the animal's current location.

create or replace function public.rebuild_spatial_city(p_city text)
returns integer
language plpgsql
security definer
set search_path to 'public'
set max_parallel_workers_per_gather to '0'
as $function$
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
