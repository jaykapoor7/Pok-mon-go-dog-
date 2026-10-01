-- Historical census injury flags are source facts, not current requests.
-- Only a current open case makes a public-dataset dog operationally flagged.
create or replace function public.sp_current_attention(p_flag boolean,p_status text,p_provenance text,p_dog uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select (coalesce(p_flag,false) or p_status='injured') and
 (p_provenance is distinct from 'public_dataset' or exists (
   select 1 from public.cases c where c.dog_id=p_dog and not coalesce(c.is_demo,false)
   and c.status_class in ('open','in_progress')
 ));
$$;
revoke all on function public.sp_current_attention(boolean,text,text,uuid) from public;
grant execute on function public.sp_current_attention(boolean,text,text,uuid) to anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.list_org_spatial_cells(p_city text, p_limit integer DEFAULT 4000)
 RETURNS TABLE(city text, state text, zone text, h3_r8 text, animals bigint, needs_help bigint, sterilised bigint, vaccinated bigint, open_cases bigint, cases bigint, care_events bigint, latest_seen timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (
    select public.my_ngo() as ngo_id
  ), a as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::bigint as animals,
           count(*) filter (where public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id))::bigint as needs_help,
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
$function$
;

CREATE OR REPLACE FUNCTION public.list_org_spatial_cities(p_limit integer DEFAULT 100)
 RETURNS TABLE(city text, state text, animals bigint, needs_help bigint, sterilised bigint, vaccinated bigint, cases bigint, open_cases bigint, care_events bigint, cells bigint, latest_seen timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with me as (
    select public.my_ngo() as ngo_id
  ), a as (
    select d.city, max(d.state) as state,
           count(*)::bigint as animals,
           count(*) filter (where public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id))::bigint as needs_help,
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
$function$
;

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
end $function$
;

create or replace view public.public_animal_profiles as
 SELECT d.id,
    d.name,
    d.species,
    d.zone,
        CASE
            WHEN d.lat >= '-90'::integer::double precision AND d.lat <= 90::double precision AND d.lng >= '-180'::integer::double precision AND d.lng <= 180::double precision AND NOT (d.lat = 0::double precision AND d.lng = 0::double precision) THEN round(d.lat::numeric, 2)::double precision
            ELSE NULL::double precision
        END AS lat,
        CASE
            WHEN d.lat >= '-90'::integer::double precision AND d.lat <= 90::double precision AND d.lng >= '-180'::integer::double precision AND d.lng <= 180::double precision AND NOT (d.lat = 0::double precision AND d.lng = 0::double precision) THEN round(d.lng::numeric, 2)::double precision
            ELSE NULL::double precision
        END AS lng,
    CASE WHEN d.provenance='public_dataset' AND NOT public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id) THEN 'seen' ELSE d.status END AS status,
    d.cover_photo,
    d.size,
    d.color,
    d.is_friendly,
    public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id) AS needs_help,
    d.sterilised,
    d.vaccinated,
    d.sterilisation_status,
    d.vaccination_status,
    d.ear_notch,
    d.trust_score,
    d.sightings_count,
    d.feed_count,
    d.first_seen,
    d.last_seen,
    d.last_fed_at,
    d.created_at,
    d.ngo_id,
    d.code,
    d.provenance,
    n.name AS ngo_name,
    d.straypaw_id,
    d.sex,
    d.city,
    d.state,
    d.data_source_id,
    d.source_record_id,
    d.original_observed_at,
    d.observed_date_precision,
    d.external_image_url,
    d.source_metadata ->> 'photo_attribution'::text AS photo_attribution,
    d.source_metadata ->> 'photo_source_url'::text AS photo_source_url
   FROM dogs d
     LEFT JOIN ngos n ON n.id = d.ngo_id
  WHERE NOT COALESCE(d.is_demo, false) AND d.species = 'dog'::text;

create or replace view public.public_spatial_animals as
 SELECT id,
    h3_r8,
        CASE
            WHEN lat >= '-90'::integer::double precision AND lat <= 90::double precision AND lng >= '-180'::integer::double precision AND lng <= 180::double precision AND NOT (lat = 0::double precision AND lng = 0::double precision) THEN round(lat::numeric, 2)::double precision
            ELSE NULL::double precision
        END AS lat,
        CASE
            WHEN lat >= '-90'::integer::double precision AND lat <= 90::double precision AND lng >= '-180'::integer::double precision AND lng <= 180::double precision AND NOT (lat = 0::double precision AND lng = 0::double precision) THEN round(lng::numeric, 2)::double precision
            ELSE NULL::double precision
        END AS lng,
    city,
    district,
    state,
    zone,
    COALESCE(location_precision, 'approximate'::text) AS location_precision,
        CASE
            WHEN provenance = 'community_report'::text THEN 'resident'::text
            ELSE 'field'::text
        END AS source,
    name,
    code,
    straypaw_id,
    species,
    cover_photo,
    CASE WHEN d.provenance='public_dataset' AND NOT public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id) THEN 'seen' ELSE d.status::text END AS status,
    public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id) AS needs_help,
    sterilisation_status,
    vaccination_status,
    ear_notch,
    first_seen,
    last_seen,
    sightings_count,
    ngo_id
   FROM dogs d
  WHERE NOT COALESCE(is_demo, false);

-- Refresh only this derived metric; keep all animals, locations and source data.
with help as (
 select d.city,d.h3_r8,count(*) filter(where public.sp_current_attention(d.needs_help,d.status::text,d.provenance,d.id))::integer n
 from public.dogs d where not coalesce(d.is_demo,false) group by d.city,d.h3_r8
)
update public.spatial_city_cells s set needs_help=h.n from help h where s.city=h.city and s.h3_r8=h.h3_r8;
select public.enqueue_spatial_refresh('Ranchi','historical_attention_scope_corrected');
