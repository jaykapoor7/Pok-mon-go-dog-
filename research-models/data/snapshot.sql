-- Snapshot v1. Read-only aggregates from existing public-facing StrayPaw views.
-- No identifiers, coordinates, row exports or credential material enter the site.
-- The WHERE clauses describe the selection used on 2026-11-10.
WITH ranchi AS (
  SELECT h3_r8
  FROM public.public_spatial_animals
  WHERE city = 'Ranchi' AND vaccination_status = 'vaccinated'
), cell_counts AS (
  SELECT count(*) AS n
  FROM ranchi
  WHERE h3_r8 IS NOT NULL
  GROUP BY h3_r8
  HAVING count(*) >= 20
), ranked AS (
  SELECT n, row_number() OVER (ORDER BY n DESC) AS rank, count(*) OVER () AS cells
  FROM cell_counts
)
SELECT (SELECT count(*) FROM ranchi) AS recorded_vaccinations,
       count(*) AS eligible_cells, sum(n) AS vaccinations_in_eligible_cells,
       ceil(count(*) * 0.2)::int AS top_cells,
       sum(n) FILTER (WHERE rank <= ceil(cells * 0.2)) AS vaccinations_in_top_cells
FROM ranked;

SELECT extract(year FROM occurred_at AT TIME ZONE 'UTC')::int AS year, condition_class, count(*) AS n
FROM public.public_case_facts
WHERE source = 'field'
  AND occurred_at >= timestamptz '2024-01-01 00:00:00+00'
  AND occurred_at < timestamptz '2026-01-01 00:00:00+00'
  AND condition_class IN ('Dog bite', 'Road accident', 'TVT')
GROUP BY year, condition_class
ORDER BY condition_class, year;

WITH female_months AS (
  SELECT date_trunc('month', e.event_date)::date AS month, count(*) AS n
  FROM public.public_care_facts e
  JOIN public.public_spatial_animals a ON a.id = e.dog_id
  WHERE e.kind = 'sterilisation' AND a.sex = 'female' AND a.city = 'Jamshedpur'
    AND e.event_date >= date '2013-01-01' AND e.event_date < date '2017-01-01'
  GROUP BY month
)
SELECT count(*) AS active_months, percentile_cont(0.5) WITHIN GROUP (ORDER BY n) AS median_female_surgeries
FROM female_months;

SELECT animals_recorded AS census_register_size
FROM public.public_programme_cards
WHERE kind = 'census' AND city = 'Mohanpur' AND starts_on = date '2019-09-11' AND ends_on = date '2024-01-15';
