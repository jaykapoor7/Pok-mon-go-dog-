# Imports & spatial refresh

## Workspace import (NGOs, self-serve)

An organisation imports its own register from **NGO → Import your register**
(`/ngo/import`, also on the Work dashboard, the Animals page and the top of
the NGO "More" menu). No operator step is needed.

- **Read in the browser** (`src/lib/ngo-import/read.ts`): every sheet; the
  header row is found under title rows; sheets are recognised by name and
  columns (rescue, treatment, vaccination, sterilisation, follow-up,
  adoption, animal list; finance/staff/summary sheets are left out);
  columns are matched by meaning; contact columns (informer, caller, phone,
  owner…) are dropped before anything is sent. Dates are read day-first,
  from date cells, Excel serials and text; "26-Oct" takes its sheet's year,
  advancing when months wrap and never landing in the future, and the
  person can set that year per sheet. CSV cells stay text so SheetJS never
  reads them the American way.
- **Written in chunks of 50** (`src/lib/ngo-import/write.ts`, route
  `src/app/api/partner/import`): `start` opens or resumes the batch for the
  same workbook, `rows` writes a chunk, `finish` closes it. The browser
  retries a failed chunk and can continue from where it stopped.
- **Idempotent across imports**: records carry
  `import_source_key = ngo:<org>:rec:<content hash>` and animals
  `ngo:<org>:animal:<animal ID | name@locality | rec:<hash>>`. Existing
  keys are skipped, so re-importing the register, or a longer copy, adds
  only new rows. An animal ID the team already uses links to that animal.
- **Places**: register GPS; else the locality, geocoded once with Mapbox,
  cached in `import_location_cache` and accepted only within ~45 km of the
  city; else the city centre (`geographic_precision` says which).
- Rows about other species or owned pets are held, with a reason; open
  historical cases arrive as `needs_review` for Historical review.

Tests: `npm run test:ngo-import` (reader on Pawsome-, Mission Rabies- and
generic-shaped workbooks; writer against an in-memory database, including
retries, re-imports and ID linking).

## Operator master import

Large third-party registers (e.g. the Kind Hour historical rescue ledger) are
brought in through a staged import pipeline that is **chunked, resumable,
idempotent and scoped to a city/source** — never a single giant transaction and
never a synchronous national rebuild.

Code: `src/lib/master-import/` (`pipeline`, `staging`, `commit`,
`commit-resumable`, `enrichment`, `cleanup`). Entry points: the admin import
routes under `src/app/api/admin/imports/*` and the partner import route
`src/app/api/partner/import/*`. Regression tests: `scripts/test-master-import*.ts`.

## Pipeline stages

```
source file ─► parse/normalize ─► stage (import_rows) ─► commit in chunks ─► enrich ─► enqueue refresh
```

1. **Parse / normalize.** Rows are parsed and normalized into a canonical
   shape (city, place, dates, condition, care). Validation (e.g. INR cost
   parsing) happens here; see `scripts/test-case-input-validation.ts`.
2. **Stage.** Every source row is written to `import_rows` with its raw and
   normalized payload, a `batch_id`, and nullable links
   (`imported_dog_id`, `imported_case_id`, `imported_sighting_id`,
   `matched_dog_id`). This ledger is what makes imports resumable and auditable.
3. **Commit in chunks.** Dogs/cases/medical events are written in bounded
   chunks (≈100–250 rows) rather than one transaction. `commit-resumable`
   tracks progress by `batch_id`, so a retried or interrupted import continues
   from where it stopped. Verified by `test-master-import:pagination`
   (2324 rows across 5 pages, a retry creates **0** duplicates) and
   `test-master-import:resume` (205 rows as 100 + 100 + 5, retry zero dupes).
4. **Enrich.** `src/app/api/admin/imports/enrich` backfills derived fields
   (vaccination/sterilisation status, case status, follow-ups) in `inChunks`
   batches of 100, scoped by `batch_id` and `ngo_id`.
5. **Enqueue refresh.** The affected cities are queued via
   `enqueue_spatial_refresh`; the rollups are rebuilt asynchronously (below).

## Idempotency & scoping

- **Idempotent:** a re-run keys on the staged `import_rows` and the existing
  links, so committing the same batch again does not create duplicate dogs,
  cases or events (the pagination/resume tests assert zero duplicates on retry).
- **City/source scoped:** rebuilds and enrichment are filtered by `batch_id`,
  `ngo_id` and city. An import for one city never scans or rewrites another.
- **No global synchronous rebuild:** the import path only *enqueues* cities;
  it never calls `rebuild_spatial_city` for the whole country inline.

## Spatial refresh queue

After any write that changes a city's animals/cases/care (imports, edits,
enrichment), that city is placed in `spatial_refresh_queue`. The queue is
drained out-of-band so no visitor or import request pays the rebuild cost:

| Trigger | Auth | Behaviour |
|---|---|---|
| `GET /api/admin/spatial/refresh` (Vercel Cron, daily 03:00 UTC) | `CRON_SECRET` | Rebuild up to 60 queued cities per run. |
| `POST /api/admin/spatial/refresh` (operator) | `ADMIN_SECRET` | Same drain, on demand. |

`rebuild_spatial_city(city)` deletes and recreates that city's
`spatial_city_cells` rows from `dogs` + `cases` + `medical_events`, joining
through the canonical animal/location relationship so the rollup agrees with
raw data. `BATCH = 60` bounds each run; a very large import spreads its refresh
across runs rather than blocking.

> **Operational note:** `CRON_SECRET` must be set in the Vercel project, or the
> scheduled `GET` drain returns 401 and rollups go stale until an operator
> `POST`s a manual drain. After a one-off bulk import you can drain immediately
> with the operator `POST`, or (service role) run
> `select rebuild_spatial_city(city) from (select distinct city from dogs where
> city is not null and h3_r8 is not null and not coalesce(is_demo,false)) q;`.

## Manual verification after an import

```sql
-- rollup agrees with raw data for a city
select (select sum(animals) from spatial_city_cells where city = 'Coimbatore') as rollup_animals,
       (select count(*) from dogs where city = 'Coimbatore' and h3_r8 is not null and not coalesce(is_demo,false)) as raw_animals;
-- queue should drain to zero after the cron/operator run
select count(*) from spatial_refresh_queue;
```
