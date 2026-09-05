-- ════════════════════════════════════════════════════════════════
-- StrayPaw, the published dataset.
--
-- WHY THIS EXISTS
--
-- The point of the whole system is a number nobody in India currently
-- has: how many street dogs there are in a defined area, how many are
-- sterilised, how many are vaccinated, counted rather than estimated, with
-- the method visible.
--
-- A figure like that is only worth anything if somebody else can check it.
-- So what gets published is not a headline, it is a row per area with the
-- counts, the dates it was collected between, how many observations it
-- rests on, and who collected it. Anybody quoting it can see what they are
-- quoting.
--
-- WHAT IS AND IS NOT IN IT
--
-- Only work filed against a drive by the organisation that did it. A
-- sighting somebody sent in and nobody has reviewed is not evidence of
-- anything yet, and it is excluded until a person has taken responsibility
-- for it. That is the same rule the dashboards use, applied outward.
--
-- Unknowns are reported, never folded into a denominator. A ward where 40
-- animals were checked and 60 were not is a ward with 40 data points and a
-- known blind spot, and saying so is the entire difference between a
-- dataset and a claim.
--
-- Public read. There is nothing here that identifies a person: no
-- reporter names, no exact coordinates, no contact details. Areas are
-- reported at the granularity the organisation recorded them at.
--
-- Idempotent. Safe to run more than once.
-- Depends on: campaigns.sql, abc-programme.sql.
-- ════════════════════════════════════════════════════════════════

-- ── One published row per drive ─────────────────────────────────────

create or replace view published_surveys as
  select
    c.id                                   as survey_id,
    n.name                                 as organisation,
    n.city                                 as city,
    n.state                                as state,
    c.name                                 as survey,
    c.kind                                 as method,
    coalesce(nullif(btrim(c.zone), ''), n.city, 'Unspecified') as area,
    c.starts_on,
    c.ends_on,
    count(distinct d.id)                                                 as animals,
    count(distinct d.id) filter (where d.sterilisation_status = 'sterilised')     as sterilised,
    count(distinct d.id) filter (where d.sterilisation_status = 'not_sterilised') as not_sterilised,
    count(distinct d.id) filter (where d.sterilisation_status = 'unknown')        as sterilisation_unknown,
    count(distinct d.id) filter (where d.vaccination_status = 'vaccinated')       as vaccinated,
    count(distinct d.id) filter (where d.vaccination_status = 'not_vaccinated')   as not_vaccinated,
    count(distinct d.id) filter (where d.vaccination_status = 'unknown')          as vaccination_unknown,
    -- Of the animals whose status was established. The honest denominator.
    case when count(distinct d.id) filter (
           where d.sterilisation_status in ('sterilised','not_sterilised')) = 0
      then null
      else round(100.0 * count(distinct d.id) filter (where d.sterilisation_status = 'sterilised')
           / count(distinct d.id) filter (
               where d.sterilisation_status in ('sterilised','not_sterilised')), 1)
    end as sterilised_pct_of_checked,
    case when count(distinct d.id) filter (
           where d.vaccination_status in ('vaccinated','not_vaccinated')) = 0
      then null
      else round(100.0 * count(distinct d.id) filter (where d.vaccination_status = 'vaccinated')
           / count(distinct d.id) filter (
               where d.vaccination_status in ('vaccinated','not_vaccinated')), 1)
    end as vaccinated_pct_of_checked,
    (select count(*) from sightings s where s.campaign_id = c.id)   as observations,
    (select count(distinct nullif(btrim(coalesce(s.volunteer_name, s.reporter_name, '')), ''))
       from sightings s where s.campaign_id = c.id)                 as collectors,
    c.created_at                                                     as published_at
  from campaigns c
  join ngos n on n.id = c.ngo_id
  left join dogs d
    on d.id in (
      select d2.id from dogs d2 where d2.campaign_id = c.id
      union
      select distinct s.dog_id from sightings s
       where s.campaign_id = c.id and s.dog_id is not null
    )
  group by c.id, n.name, n.city, n.state, c.name, c.kind, c.zone,
           c.starts_on, c.ends_on, c.created_at
  -- A drive with nothing filed against it is not a survey.
  having count(distinct d.id) > 0;

grant select on published_surveys to anon, authenticated, service_role;

-- ── The headline, honestly assembled ────────────────────────────────

-- Totals across every published survey, plus the two things that keep a
-- total from being a claim: how many organisations it came from, and how
-- much of it was never checked.
create or replace function published_totals()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'surveys',        count(*),
    'organisations',  count(distinct organisation),
    'areas',          count(distinct area),
    'states',         count(distinct state) filter (where state is not null),
    'animals',        coalesce(sum(animals), 0),
    'sterilised',     coalesce(sum(sterilised), 0),
    'not_sterilised', coalesce(sum(not_sterilised), 0),
    'sterilisation_unknown', coalesce(sum(sterilisation_unknown), 0),
    'vaccinated',     coalesce(sum(vaccinated), 0),
    'not_vaccinated', coalesce(sum(not_vaccinated), 0),
    'vaccination_unknown',   coalesce(sum(vaccination_unknown), 0),
    'observations',   coalesce(sum(observations), 0),
    'collectors',     coalesce(sum(collectors), 0),
    'first_survey',   min(starts_on),
    'last_survey',    max(coalesce(ends_on, starts_on)),
    'sterilised_pct_of_checked',
      case when coalesce(sum(sterilised), 0) + coalesce(sum(not_sterilised), 0) = 0 then null
        else round(100.0 * sum(sterilised) / (sum(sterilised) + sum(not_sterilised)), 1) end,
    'vaccinated_pct_of_checked',
      case when coalesce(sum(vaccinated), 0) + coalesce(sum(not_vaccinated), 0) = 0 then null
        else round(100.0 * sum(vaccinated) / (sum(vaccinated) + sum(not_vaccinated)), 1) end
  ) from published_surveys;
$$;

grant execute on function published_totals() to anon, authenticated, service_role;
