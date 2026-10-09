-- Public animal appearance: sex and size on the public spatial view.
--
-- Non-destructive: the view keeps every existing column, in order, and
-- appends two. Sex is normalised to 'male' / 'female' (anything else is
-- null, never guessed); size is the recorded size class. Neither field
-- identifies a person or a location. Used to describe unnamed animals
-- ("Female · medium") instead of inventing names.

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
            WHEN lower(trim(sex)) IN ('m', 'male') THEN 'male'::text
            WHEN lower(trim(sex)) IN ('f', 'female') THEN 'female'::text
            ELSE NULL::text
        END AS sex,
    size::text AS size
   FROM dogs d
  WHERE NOT COALESCE(is_demo, false);
