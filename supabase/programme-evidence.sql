-- Public programme evidence: keep aggregate register totals separate from
-- individually linked animal records. Safe to rerun.
--
-- IMPORTANT: CREATE OR REPLACE VIEW requires every existing column to keep
-- its name, ordinal position AND data type. The original three count columns
-- are bigint because PostgreSQL count() returns bigint, so keep them bigint
-- and append the two new evidence columns afterwards.

create or replace view public_programme_cards as
select
  c.id,
  c.name,
  c.kind,
  c.starts_on,
  c.ends_on,
  c.zone,
  c.public_summary,
  n.name as ngo_name,
  n.slug as ngo_slug,
  n.city,
  n.state,
  coalesce(nullif(count(d.id), 0), c.source_rows_count) as animals_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.sterilisation_status = 'sterilised'), 0),
    case when c.kind = 'sterilisation' then c.source_rows_count else 0 end
  ) as sterilised_recorded,
  coalesce(
    nullif(count(d.id) filter (where d.vaccination_status = 'vaccinated'), 0),
    case when c.kind = 'vaccination' then c.source_rows_count else 0 end
  ) as vaccinated_recorded,
  c.source_rows_count as source_rows_count,
  count(d.id) as traceable_animals_recorded
from campaigns c
join ngos n on n.id = c.ngo_id
left join dogs d on d.campaign_id = c.id
where c.public_visibility in ('summary', 'public')
  and c.archived_at is not null
group by c.id, n.id;

grant select on public_programme_cards to anon, authenticated;

-- Community case stories. This is deliberately narrower than the private
-- NGO case table: no reporter details, phone numbers, exact coordinates,
-- raw descriptions, costs, assignments or private medical notes. It exposes
-- just enough to browse rescue/completion records and then open the already
-- public animal profile for the full longitudinal story.
create or replace view public_case_stories as
select
  c.id,
  c.dog_id,
  c.ngo_id,
  n.name as ngo_name,
  c.category::text as category,
  c.status::text as status,
  c.title,
  coalesce(nullif(c.zone, ''), d.zone) as zone,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.resolved_at,
  c.resolution::text as outcome,
  d.name as animal_name,
  d.code as animal_code,
  d.species,
  d.cover_photo
from cases c
left join ngos n on n.id = c.ngo_id
join dogs d on d.id = c.dog_id
where c.dog_id is not null;

grant select on public_case_stories to anon, authenticated;

-- Public animal profiles expose the permanent StrayPaw identity as an
-- additional final column. `code` remains the NGO/source identifier and is
-- never promoted into StrayPaw identity.
create or replace view public_animal_profiles as
select
  d.id, d.name, d.species, d.zone,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lat::numeric, 2)::double precision end as lat,
  case when d.lat between -90 and 90 and d.lng between -180 and 180
         and not (d.lat = 0 and d.lng = 0)
       then round(d.lng::numeric, 2)::double precision end as lng,
  d.status, d.cover_photo, d.size, d.color, d.is_friendly, d.needs_help,
  d.sterilised, d.vaccinated, d.sterilisation_status, d.vaccination_status,
  d.ear_notch, d.trust_score, d.sightings_count, d.feed_count,
  d.first_seen, d.last_seen, d.last_fed_at, d.created_at, d.ngo_id, d.code,
  d.provenance, n.name as ngo_name,
  d.straypaw_id
from dogs d left join ngos n on n.id = d.ngo_id;

grant select on public_animal_profiles to anon, authenticated;
