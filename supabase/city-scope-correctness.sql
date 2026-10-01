-- City-scope correctness hardening, 2026-10-01.
-- Keeps public and organisation city/cell totals authoritative while bounded
-- detail datasets remain samples for rich interaction.

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

drop function if exists public.list_org_spatial_cities(integer);
create function public.list_org_spatial_cities(p_limit integer default 100)
returns table(
  city text, state text, animals bigint, needs_help bigint,
  sterilised bigint, vaccinated bigint, cases bigint, open_cases bigint,
  care_events bigint, cells bigint, latest_seen timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.my_ngo() as ngo_id
  ), a as (
    select d.city, max(d.state) as state,
           count(*)::bigint as animals,
           count(*) filter (where coalesce(d.needs_help, false) or d.status::text = 'injured')::bigint as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::bigint as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::bigint as vaccinated,
           count(distinct d.h3_r8)::bigint as cells,
           max(d.last_seen) as latest_seen
      from public.dogs d cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and d.ngo_id = me.ngo_id
       and d.city is not null
       and d.h3_r8 is not null
     group by d.city
  ), c as (
    select coalesce(nullif(btrim(c.city), ''), d.city) as city,
           count(*)::bigint as cases,
           count(*) filter (where c.status_class in ('open','in_progress'))::bigint as open_cases
      from public.cases c
      left join public.dogs d on d.id = c.dog_id
      cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and coalesce(c.ngo_id, d.ngo_id) = me.ngo_id
     group by coalesce(nullif(btrim(c.city), ''), d.city)
  ), k as (
    select d.city, count(*)::bigint as care_events
      from public.medical_events m
      join public.dogs d on d.id = m.dog_id
      cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and d.ngo_id = me.ngo_id
     group by d.city
  )
  select a.city, a.state, a.animals, a.needs_help, a.sterilised, a.vaccinated,
         coalesce(c.cases,0), coalesce(c.open_cases,0), coalesce(k.care_events,0),
         a.cells, a.latest_seen
    from a
    left join c on c.city = a.city
    left join k on k.city = a.city
   order by a.animals desc, a.city
   limit greatest(1, least(coalesce(p_limit,100),200));
$$;

revoke all on function public.list_org_spatial_cities(integer) from public, anon;
grant execute on function public.list_org_spatial_cities(integer) to authenticated, service_role;

create or replace function public.list_org_spatial_cells(p_city text, p_limit integer default 4000)
returns table(
  city text, state text, zone text, h3_r8 text,
  animals bigint, needs_help bigint, sterilised bigint, vaccinated bigint,
  open_cases bigint, cases bigint, care_events bigint, latest_seen timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.my_ngo() as ngo_id
  ), a as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::bigint as animals,
           count(*) filter (where coalesce(d.needs_help, false) or d.status::text = 'injured')::bigint as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::bigint as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::bigint as vaccinated,
           max(d.last_seen) as latest_seen
      from public.dogs d cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and d.ngo_id = me.ngo_id
       and d.city = nullif(btrim(p_city),'')
       and d.h3_r8 is not null
     group by d.city, d.h3_r8
  ), c as (
    select coalesce(nullif(btrim(c.city), ''), d.city) as city,
           coalesce(c.h3_r8, d.h3_r8) as h3_r8,
           count(*)::bigint as cases,
           count(*) filter (where c.status_class in ('open','in_progress'))::bigint as open_cases
      from public.cases c
      left join public.dogs d on d.id = c.dog_id
      cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and coalesce(c.ngo_id, d.ngo_id) = me.ngo_id
       and coalesce(nullif(btrim(c.city), ''), d.city) = nullif(btrim(p_city),'')
       and coalesce(c.h3_r8, d.h3_r8) is not null
     group by coalesce(nullif(btrim(c.city), ''), d.city), coalesce(c.h3_r8, d.h3_r8)
  ), k as (
    select d.city, d.h3_r8, count(*)::bigint as care_events
      from public.medical_events m
      join public.dogs d on d.id = m.dog_id
      cross join me
     where auth.uid() is not null
       and me.ngo_id is not null
       and d.ngo_id = me.ngo_id
       and d.city = nullif(btrim(p_city),'')
       and d.h3_r8 is not null
     group by d.city, d.h3_r8
  )
  select a.city, a.state, a.zone, a.h3_r8, a.animals, a.needs_help,
         a.sterilised, a.vaccinated, coalesce(c.open_cases,0), coalesce(c.cases,0),
         coalesce(k.care_events,0), a.latest_seen
    from a
    left join c on c.city = a.city and c.h3_r8 = a.h3_r8
    left join k on k.city = a.city and k.h3_r8 = a.h3_r8
   order by a.animals desc, a.h3_r8
   limit greatest(1, least(coalesce(p_limit,4000),4000));
$$;

revoke all on function public.list_org_spatial_cells(text, integer) from public, anon;
grant execute on function public.list_org_spatial_cells(text, integer) to authenticated, service_role;

-- Correct the already-materialised public help/medical rollup immediately.
update public.spatial_city_cells set needs_help = 0;
with attention as (
  select d.city, d.h3_r8,
         count(*) filter (where coalesce(d.needs_help, false) or d.status::text = 'injured')::integer as n
    from public.dogs d
   where d.city is not null
     and d.h3_r8 is not null
     and not coalesce(d.is_demo, false)
   group by d.city, d.h3_r8
)
update public.spatial_city_cells s
   set needs_help = a.n,
       refreshed_at = now()
  from attention a
 where a.city = s.city and a.h3_r8 = s.h3_r8;
