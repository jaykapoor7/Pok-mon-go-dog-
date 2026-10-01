-- ════════════════════════════════════════════════════════════════════
-- Data-correctness pass: authoritative aggregates for every surface
--
-- The bug this fixes: bounded detail datasets (the ~1,200-animal per-city
-- SpatialDataset, the 48-row stories page) were being counted and shown as
-- authoritative totals. The rule now: counts come from the rollups below;
-- maps/lists/cards keep their bounded detail for dots and rows.
--
-- All statements are additive / replace-in-place. No data is modified and no
-- import is re-run. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ── City rollup: carry every headline metric, not just animals/cases ─────
-- list_public_spatial_cities now sums needs_help, sterilised, vaccinated and
-- care_events from spatial_city_cells too, so Community Home, Insights and the
-- map read citywide totals from one cheap authoritative source (≈500 rows).
drop function if exists public.list_public_spatial_cities(integer);
create or replace function public.list_public_spatial_cities(p_limit integer default 200)
returns table(
  city text, state text,
  animals bigint, needs_help bigint, sterilised bigint, vaccinated bigint,
  cases bigint, open_cases bigint, care_events bigint, cells bigint,
  latest_seen timestamptz
)
language sql security definer set search_path = public stable as $$
  select s.city, max(s.state) as state,
         sum(s.animals)::bigint, sum(s.needs_help)::bigint, sum(s.sterilised)::bigint, sum(s.vaccinated)::bigint,
         sum(s.cases)::bigint, sum(s.open_cases)::bigint, sum(s.care_events)::bigint, count(*)::bigint,
         max(s.latest_seen)
    from public.spatial_city_cells s
   group by s.city
   order by sum(s.animals) desc, s.city
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;
grant execute on function public.list_public_spatial_cities(integer) to anon, authenticated, service_role;

-- ── Stories: scope by city, count authoritatively ───────────────────────
-- Expose the animal's city on the public stories view so a page can be one
-- city's stories, and add a cheap count so the headline is the real total for
-- the scope, never the length of a 48-row page.
create or replace view public_case_stories as
select
  c.id, c.dog_id, c.ngo_id, n.name as ngo_name,
  c.category::text as category, c.status::text as status, c.title,
  coalesce(nullif(c.zone, ''), d.zone) as zone,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.resolved_at, c.resolution::text as outcome,
  d.name as animal_name, d.code as animal_code, d.species, d.cover_photo,
  d.city as city
from cases c
left join ngos n on n.id = c.ngo_id
join dogs d on d.id = c.dog_id
where c.dog_id is not null;
grant select on public_case_stories to anon, authenticated;

create or replace function public.count_public_case_stories(p_city text default null)
returns bigint
language sql security definer set search_path = public stable as $$
  select count(distinct s.dog_id)::bigint
    from public_case_stories s
   where p_city is null or btrim(lower(s.city)) = btrim(lower(p_city));
$$;
grant execute on function public.count_public_case_stories(text) to anon, authenticated, service_role;
