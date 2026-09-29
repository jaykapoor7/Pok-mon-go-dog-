-- Licensed profile photos and provenance repair.
-- The photographs remain served from iNaturalist's public image URLs; no copy
-- is made into StrayPaw storage. Attribution stays with each public profile.

with image_credit(source_record_id, attribution) as (
  values
    ('187143803', '(c) Gannu03, some rights reserved (CC BY-SA)'),
    ('201615072', '(c) Alix Sanchis, some rights reserved (CC BY)'),
    ('201615344', '(c) Alix Sanchis, some rights reserved (CC BY)'),
    ('259490094', '(c) Jens-Christian Svenning, some rights reserved (CC BY)'),
    ('293699078', '(c) Gannu03, some rights reserved (CC BY-SA)'),
    ('367604243', '(c) Raja Sekhar Chimirala, some rights reserved (CC BY)')
)
update public.dogs as d
set
  cover_photo = coalesce(d.cover_photo, d.external_image_url),
  source_metadata = coalesce(d.source_metadata, '{}'::jsonb) || jsonb_build_object(
    'photo_attribution', c.attribution,
    'photo_source_url', 'https://www.inaturalist.org/observations/' || d.source_record_id
  ),
  updated_at = now()
from image_credit c
join public.data_sources s on s.slug = 'inaturalist-india-domestic-dog-observations'
where d.data_source_id = s.id
  and d.source_record_id = c.source_record_id
  and d.external_image_url is not null;

-- The source's case import already has the 141 animal records. Restore their
-- source reference so source counts and organisation pages remain truthful.
update public.dogs as d
set data_source_id = s.id, updated_at = now()
from public.data_sources s
where s.slug = 'kind-hour-rescue-register-2024-2026'
  and d.import_batch_id = '79384718-0421-eb76-c472-13dda928152c'
  and d.data_source_id is null;

-- Keep the existing public projection and its location rounding intact, while
-- exposing only the credit and canonical source link needed for a licensed photo.
create or replace view public.public_animal_profiles as
select
  d.id,
  d.name,
  d.species,
  d.zone,
  case
    when d.lat >= -90 and d.lat <= 90 and d.lng >= -180 and d.lng <= 180
      and not (d.lat = 0 and d.lng = 0)
      then round(d.lat::numeric, 2)::double precision
    else null::double precision
  end as lat,
  case
    when d.lat >= -90 and d.lat <= 90 and d.lng >= -180 and d.lng <= 180
      and not (d.lat = 0 and d.lng = 0)
      then round(d.lng::numeric, 2)::double precision
    else null::double precision
  end as lng,
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
  n.name as ngo_name,
  d.straypaw_id,
  d.sex,
  d.city,
  d.state,
  d.data_source_id,
  d.source_record_id,
  d.original_observed_at,
  d.observed_date_precision,
  d.external_image_url,
  d.source_metadata ->> 'photo_attribution' as photo_attribution,
  d.source_metadata ->> 'photo_source_url' as photo_source_url
from public.dogs d
left join public.ngos n on n.id = d.ngo_id;

grant select on public.public_animal_profiles to anon, authenticated;
