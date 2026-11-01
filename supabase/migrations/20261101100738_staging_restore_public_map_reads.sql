-- Staging parity only: restore existing production projections; no row changes.
CREATE OR REPLACE FUNCTION public.sp_current_attention(p_flag boolean, p_status text, p_provenance text, p_dog uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select (coalesce(p_flag,false) or p_status='injured') and
 (p_provenance is distinct from 'public_dataset' or exists (
   select 1 from public.cases c where c.dog_id=p_dog and not coalesce(c.is_demo,false)
   and c.status_class in ('open','in_progress')
 ));
$function$
;
revoke all on function public.sp_current_attention(boolean,text,text,uuid) from public,anon,authenticated;
grant execute on function public.sp_current_attention(boolean,text,text,uuid) to anon,authenticated,service_role;
CREATE OR REPLACE VIEW public.public_spatial_animals WITH(security_barrier=true) AS  SELECT id,
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
        CASE
            WHEN provenance = 'public_dataset'::text AND NOT sp_current_attention(needs_help, status::text, provenance, id) THEN 'seen'::text
            ELSE status::text
        END AS status,
    sp_current_attention(needs_help, status::text, provenance, id) AS needs_help,
    sterilisation_status,
    vaccination_status,
    ear_notch,
    first_seen,
    last_seen,
    sightings_count,
    ngo_id,
        CASE
            WHEN lower(TRIM(BOTH FROM sex)) = ANY (ARRAY['m'::text, 'male'::text]) THEN 'male'::text
            WHEN lower(TRIM(BOTH FROM sex)) = ANY (ARRAY['f'::text, 'female'::text]) THEN 'female'::text
            ELSE NULL::text
        END AS sex,
    size,
    COALESCE(photo_sensitive, false) AS photo_sensitive
   FROM dogs d
  WHERE NOT COALESCE(is_demo, false);
CREATE OR REPLACE FUNCTION public.public_map_case_confidence_cities()
 RETURNS TABLE(city text, open_unconfirmed integer, open_30_unconfirmed integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.city,
    count(*) filter (where p.status_class in ('open','in_progress'))::int,
    count(*) filter (where p.status_class in ('open','in_progress') and p.occurred_at < now() - interval '30 days')::int
  from public_case_facts p join cases c on c.id = p.id
  where p.city is not null and c.provenance = 'imported_historical_record' and c.status_reviewed_at is null
    and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day')
  group by 1;
$function$
;
revoke all on function public.public_map_case_confidence_cities() from public;
grant execute on function public.public_map_case_confidence_cities() to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.public_map_cities_v2()
 RETURNS TABLE(city text, animals integer, needs_help integer, ster_yes integer, ster_no integer, ster_unknown integer, vacc_yes integer, cases integer, open_cases integer, open_30 integer, status_unknown integer, care integer, treatments integer, areas integer, last_activity timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with a as (
    select city, count(*)::int animals, count(*) filter (where needs_help)::int needs_help,
      count(*) filter (where sterilisation_status = 'sterilised')::int ster_yes,
      count(*) filter (where sterilisation_status = 'not_sterilised')::int ster_no,
      count(*) filter (where sterilisation_status is null or sterilisation_status not in ('sterilised','not_sterilised'))::int ster_unknown,
      count(*) filter (where vaccination_status = 'vaccinated')::int vacc_yes,
      count(distinct h3_r8)::int areas, max(last_seen) last_seen
    from public_spatial_animals where h3_r8 is not null and city is not null group by 1
  ),
  k as (
    select city, count(*)::int cases,
      count(*) filter (where status_class in ('open','in_progress'))::int open_cases,
      count(*) filter (where status_class in ('open','in_progress') and occurred_at < now() - interval '30 days')::int open_30,
      count(*) filter (where status_class is null)::int status_unknown,
      max(occurred_at) last_case
    from public_case_facts where city is not null group by 1
  ),
  c as (
    select an.city, count(*)::int care, count(*) filter (where f.kind not in ('sterilisation','vaccination'))::int treatments, max(f.event_date)::timestamptz last_care
    from public_care_facts f join public_spatial_animals an on an.id = f.dog_id where an.city is not null group by 1
  )
  select a.city, a.animals, a.needs_help, a.ster_yes, a.ster_no, a.ster_unknown, a.vacc_yes,
    coalesce(k.cases,0), coalesce(k.open_cases,0), coalesce(k.open_30,0), coalesce(k.status_unknown,0), coalesce(c.care,0), coalesce(c.treatments,0), a.areas,
    greatest(a.last_seen, k.last_case, c.last_care)
  from a left join k on k.city = a.city left join c on c.city = a.city;
$function$
;
revoke all on function public.public_map_cities_v2() from public;
grant execute on function public.public_map_cities_v2() to anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.public_map_unplaced()
 RETURNS TABLE(zone text, district text, open_cases integer, cases integer, latest timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(nullif(btrim(zone),''), 'Place not recorded'), district,
    count(*) filter (where status_class in ('open','in_progress'))::int, count(*)::int, max(occurred_at)
  from public_case_facts where city is null group by 1, 2 order by 3 desc, 4 desc;
$function$
;
revoke all on function public.public_map_unplaced() from public;
grant execute on function public.public_map_unplaced() to anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
