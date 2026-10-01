-- Exclude recording/demo rows from public profiles and stories; preserve every row.
CREATE OR REPLACE VIEW public.public_animal_profiles AS
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
    d.status,
    d.cover_photo,
    d.size,
    d.color,
    d.is_friendly,
    d.needs_help,
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
 WHERE NOT coalesce(d.is_demo, false) AND d.species = 'dog';

CREATE OR REPLACE VIEW public.public_case_stories AS
SELECT c.id,
    c.dog_id,
    c.ngo_id,
    n.name AS ngo_name,
    c.category::text AS category,
    c.status::text AS status,
    c.title,
    COALESCE(NULLIF(c.zone, ''::text), d.zone) AS zone,
    COALESCE(c.source_event_at, c.created_at) AS occurred_at,
    c.resolved_at,
    c.resolution::text AS outcome,
    d.name AS animal_name,
    d.code AS animal_code,
    d.species,
    d.cover_photo,
    d.city
   FROM cases c
     LEFT JOIN ngos n ON n.id = c.ngo_id
     JOIN dogs d ON d.id = c.dog_id
  WHERE c.dog_id IS NOT NULL AND NOT coalesce(c.is_demo, false) AND NOT coalesce(d.is_demo, false) AND d.species = 'dog';

CREATE OR REPLACE FUNCTION public.count_public_case_stories(p_city text DEFAULT NULL)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public
SET max_parallel_workers_per_gather TO 0 AS $$
  SELECT count(DISTINCT s.dog_id)::bigint FROM public.public_case_stories s
  WHERE p_city IS NULL OR btrim(lower(s.city)) = btrim(lower(p_city))
    OR (p_city = 'Delhi' AND s.city = 'New Delhi')
    OR (p_city = 'Hyderabad' AND s.city = 'Secunderabad');
$$;

