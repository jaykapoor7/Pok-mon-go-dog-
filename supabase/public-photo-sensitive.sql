-- Sensitive photographs: a reviewed flag, appended to the public view.
--
-- Non-destructive: adds one nullable column to dogs and appends it to
-- public.public_spatial_animals (every existing column kept, in order).
-- true means the cover photo shows a wound, blood or other distressing
-- content; the app blurs it until a viewer chooses to see it. Set by a
-- reviewer or by the photo check; never cleared automatically.

alter table public.dogs add column if not exists photo_sensitive boolean;

comment on column public.dogs.photo_sensitive is 'Cover photo shows injury or distressing content; shown blurred until the viewer chooses to see it.';

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
    size::text AS size,
    COALESCE(d.photo_sensitive, false) AS photo_sensitive
   FROM dogs d
  WHERE NOT COALESCE(is_demo, false);

-- Reviewed on 2026-10-09: the two existing cover photos that need a blur.
-- (f2915633… showed dog faeces, not an animal: its photo was later removed
-- outright — cover_photo and external_image_url cleared, the old URL kept in
-- source_metadata.removed_photo — and the iNaturalist importer skips it.)
update public.dogs set photo_sensitive = true
 where id in ('e139dddf-52b8-4bae-8fa2-45de45c41b9b', 'f2915633-3f83-5415-8082-f2d2cd9070f4');

-- public.public_animal_profiles gains the same column, appended last
-- (applied as migration public_profiles_photo_sensitive; existing columns,
-- order and grants unchanged).
