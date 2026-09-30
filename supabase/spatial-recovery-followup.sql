-- ════════════════════════════════════════════════════════════════════
-- Spatial recovery follow-up
--
-- production-recovery.sql introduced the bounded map architecture (city/cell
-- rollups in spatial_city_cells, filled by rebuild_spatial_city from a queue
-- the dog/case triggers feed). Two things were missing in production after the
-- large imports, and this file records the fixes that were applied directly:
--
--   1. spatial_city_cells was empty — nothing had drained spatial_refresh_queue,
--      so the public map (list_public_spatial_cities + getPublicSpatialCityCells)
--      returned nothing. A one-time full rebuild seeds it; a Vercel cron now
--      drains the queue on a schedule (see /api/admin/spatial/refresh GET),
--      keeping it fresh after imports without touching visitor requests.
--
--   2. Indexes the enlarged public views rely on were missing.
--
-- Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ── Indexes ─────────────────────────────────────────────────────────────

-- cases had no index on dog_id at all: public_field_activity, public_case_facts
-- and per-animal story/care lookups all filter by it.
create index if not exists cases_dog_idx on public.cases (dog_id) where dog_id is not null;

-- Historical-record classification used by public_field_activity and the
-- source split in the public views.
create index if not exists dogs_provenance_idx  on public.dogs  (provenance);
create index if not exists cases_provenance_idx on public.cases (provenance);

-- public_contributor_organisations view: per-org published source/area counts.
create index if not exists data_sources_reporting_org_idx
  on public.data_sources (reporting_org_id)
  where reporting_org_id is not null;
create index if not exists atlas_area_metrics_reporting_org_idx
  on public.atlas_area_metrics (reporting_org_id, publication_status)
  where reporting_org_id is not null;

-- ── One-time rollup seed ────────────────────────────────────────────────
-- Rebuild every city's rollup from the current register (a full replace, the
-- same shape rebuild_spatial_city produces per city). After this the cron drain
-- keeps it current; run this again only if the rollups are ever cleared.
begin;
delete from public.spatial_city_cells;
insert into public.spatial_city_cells
  (city,state,zone,h3_r8,animals,needs_help,sterilised,vaccinated,latest_seen)
select city, max(state), max(zone), h3_r8,
       count(*)::int,
       count(*) filter (where needs_help)::int,
       count(*) filter (where sterilisation_status='sterilised')::int,
       count(*) filter (where vaccination_status='vaccinated')::int,
       max(last_seen)
from public.dogs
where city is not null and btrim(city) <> '' and h3_r8 is not null
  and not coalesce(is_demo, false)
group by city, h3_r8;
commit;

analyze public.spatial_city_cells;
