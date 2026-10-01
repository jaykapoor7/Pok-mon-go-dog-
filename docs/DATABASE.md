# Database

A single Supabase Postgres 17 database (PostGIS enabled) in `ap-northeast-2`.
SQL lives in [`supabase/`](../supabase/). Day-to-day changes are applied as
tracked Supabase migrations; the SQL files are the readable source of record.

## Core model

| Table | Role |
|---|---|
| `dogs` | The animal register (species-agnostic despite the name). Canonical `city`, `zone`, `h3_r8`, `lat/lng`, status, `sterilisation_status`, `vaccination_status`, `ngo_id`, `provenance`, `is_demo`. |
| `cases` | Welfare cases/encounters. `dog_id`, `city`, `h3_r8`, `status_class` (open/in_progress/closed), `severity`, `condition_class`, `provenance`, timestamps. |
| `medical_events` | Care ledger (treatment, diagnostics, sterilisation, vaccination events). `dog_id`, `kind`, `event_date`. |
| `sightings` | Community observations of an animal. |
| `animal_followups` | Scheduled/completed follow-ups for a case (`case_id`, `status`, `due_at`). |
| `import_rows` | Staging ledger for every imported source row (see `IMPORTS.md`). |
| `ngos`, `ngo_members`, `volunteers`, `partner_requests` | Organisations and membership. |
| `surveys`, `survey_areas`, `survey_responses`, `feeding_zones*`, `fundraisers*`, `campaigns`, `tasks`, `documents`, `adoption_listings` | Operational modules for the partner console. |
| `wards`, `atlas_area_metrics`, `data_sources` | Administrative geography and third-party/area metrics. |

### Rollup / cache objects

| Object | Kind | Role |
|---|---|---|
| `spatial_city_cells` | table | H3-r8 rollup per city: animals, needs_help, sterilised, vaccinated, cases, open_cases, care_events, latest_seen. The map/stats/Insights source. |
| `spatial_refresh_queue` | table | Cities awaiting a rollup rebuild (drained by the cron). |
| `public_spatial_animals_cache` | materialized view | Compact per-animal projection for bounded detail reads. |

## Public projection pattern

The browser's anon key never touches a base table. Instead, every public
surface reads a `public_*` view that exposes only safe columns and rounds
coordinates to ~1 km (exact coordinates stay server-side, available to verified
partners via `get_precise_locations`). Reporter names are redacted in the public
projections.

Key public views: `public_animal_profiles`, `public_spatial_animals`,
`public_case_facts`, `public_care_facts`, `public_sighting_facts`,
`public_case_stories`, `public_field_activity`, `public_live_sightings`,
`public_org_map_cells`, `public_programme_cards`, `public_atlas_area_metrics`.

`public_case_facts` is location-canonicalised: for imported historical records
it prefers the linked animal's place over the raw case coordinate, so cases
aggregate onto the same H3 cell as their animal.

## RPCs (SECURITY DEFINER aggregates)

Aggregate reads that must bypass per-row RLS run as `SECURITY DEFINER` functions
with a pinned `search_path`, granted narrowly:

| Function | Grant | Purpose |
|---|---|---|
| `list_public_spatial_cities(limit)` | anon, authenticated | Per-city rollup for the cities list, India totals, top-bar counters. |
| `rebuild_spatial_city(city)` | service_role | Rebuild one city's `spatial_city_cells` from dogs + cases + medical_events. |
| `enqueue_spatial_refresh(...)` | service_role | Queue cities for refresh after writes/imports. |
| `list_public_org_impacts()` | service_role | Per-NGO impact counts for the `/orgs` directory (one grouped scan, cached 300 s). |
| `get_precise_locations(...)` | verified partners | Exact coordinates for authorised org users only. |

## RLS strategy

- **Every base table has RLS enabled.** Public read access is granted only on
  the `public_*` views and the definer RPCs above, never on base tables.
- **Writes** go through `SECURITY DEFINER` functions or service-role API routes
  that enforce ownership/tenancy (`ngo_id`, `user_id`).
- **Own-row policies** (`sightings_own_read`, `volunteers_self_read`,
  `ngo_members_self`, `partner_requests_own_read`) use `user_id = (select
  auth.uid())` — the `(select …)` form evaluates the auth call once per query
  instead of once per row.
- **Per-role statement timeouts** bound runaway queries: `anon` and
  `authenticated` 8 s, `authenticator` 8 s (+8 s lock timeout), `service_role`
  30 s (long enough for a spatial rebuild). The public 8 s cap is what makes a
  slow query fail fast instead of exhausting the 60-connection pool.

## Index strategy

Indexes exist to keep every bounded public read and every aggregate join fast:

- **Foreign keys are covered.** All FK columns used in joins have a covering
  index (sterilisations/vaccinations/comments/feed_events `dog_id`,
  case_stories/evidence_items/evidence_reviews, import_rows `imported_*` /
  `matched_dog_id`, animal_timeline_events, sightings `invite_code_id`). This
  backs the care/sterilisation/vaccination/case joins the rollups depend on.
- **Rollup/lookup:** `spatial_city_cells (city, animals desc)`,
  `cases (city)`, `dogs (city)`, `animal_followups (case_id, status)`.
- **Public-read partial indexes** match the exact sorts the public pages use:
  `cases ((coalesce(source_event_at, created_at)) desc, id desc) where dog_id
  is not null and not is_demo`, `cases (dog_id, event-time desc)`,
  `dogs (last_seen desc) where needs_help`, `dogs (sightings_count desc)`,
  `dogs (last_seen desc) where cover_photo is not null`,
  `sightings (dog_id, created_at desc)`, `cases (ngo_id, status_class)`.

Verify the live index/RLS health any time with Supabase's advisors
(`get_advisors` performance/security). The covering-FK and RLS-initplan
warnings should both read clean.

The exact additive SQL for the recovery/hardening indexes and functions is in
[`supabase/final-site-recovery.sql`](../supabase/final-site-recovery.sql) and
[`supabase/post-recovery-hardening.sql`](../supabase/post-recovery-hardening.sql).

## Don'ts

- No `select("*")` on large tables from public paths — select explicit columns.
- No exact `COUNT(*)` over the register for a counter — sum the city rollup.
- No destructive SQL against production; never delete legitimately imported data.
