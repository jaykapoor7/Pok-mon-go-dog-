# StrayPaw

> **Every street animal on the record.**

StrayPaw is a community-powered web app and animal-welfare operations platform
for India's street animals. People report and explore animals on a live map;
NGOs and municipalities run cases, care, sterilisation and vaccination records,
imports, surveys and dashboards on top of the same data. It runs in any browser
and deploys to a URL — there is no native app.

Live: **https://straypaw.org**

- **Stack:** Next.js 15 (App Router, React 19) · TypeScript · Tailwind · MapLibre/Mapbox GL + H3 · Supabase (Postgres 17 + PostGIS) · Vercel.
- **Scale today:** ~30k animals, ~23k cases across ~28 cities, designed to stay bounded to 1M+ records (see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

## How it fits together

```
 Browser ──► Next.js (Vercel functions, region icn1 / Seoul)
                │  server components + /api routes
                ▼
          Supabase Postgres (ap-northeast-2 / Seoul)
            • bounded public views  (public_* )
            • SECURITY DEFINER RPCs  (list_public_spatial_cities, …)
            • H3 cell rollups        (spatial_city_cells)
            • RLS on every base table
```

Vercel functions are pinned to **`icn1` (Seoul)** to sit next to the Supabase
project in **`ap-northeast-2` (Seoul)**; every server-side database read is then
a local round trip rather than a cross-Pacific one. Full data-flow, the spatial
rollup pipeline, caching and the scalability model are in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

The golden rule: **no visitor request ever reads the whole register.** Public
surfaces read compact city/cell rollups and, only at close zoom, a bounded set
of animals inside a viewport. See the performance contract in the architecture doc.

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System map, data flow, spatial pipeline, caching/revalidation, performance contract, scalability to 1M+ |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema overview, key tables/views/RPCs, RLS strategy, index strategy |
| [`docs/IMPORTS.md`](docs/IMPORTS.md) | Chunked/resumable/idempotent import pipeline and the spatial refresh queue |
| [`docs/QA-CHECKLIST.md`](docs/QA-CHECKLIST.md) | Manual QA pass before a release |
| [`REVERT.md`](REVERT.md) | Rollback options |

## Local setup

Requirements: Node 20+ (CI and production use 22/24), npm.

```bash
npm install
cp .env.example .env.local   # fill in at least the NEXT_PUBLIC_SUPABASE_* values
npm run dev                  # http://localhost:3000
```

With no Supabase keys the app still runs; reads simply return empty. For real
data, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe
to expose — all writes are guarded by RLS and `SECURITY DEFINER` functions).
See [`.env.example`](.env.example) for the full list and what each variable does.

## Checks (what CI runs)

```bash
npm run typecheck            # tsc --noEmit
npm run build                # next build (prebuild guards against test fixtures)
npm run test:spatial         # spatial engine + rollup regression
npm run test:master-import   # import pipeline (+ :pagination :locality :staging :resume)
npm run test:sql-rpc-mapping # RPC argument-mapping guard
npm run test:e2e             # Playwright (mobile + desktop)
```

The quality gate (`.github/workflows/dev-check.yml`) runs all of these plus
`npm audit --omit=dev --audit-level=critical` on every push/PR to `main`/`dev`.

Playwright boots a production build. On an image that ships its own Chromium,
point it at the binary: `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## Deployment

Vercel is connected to this repo; **pushing to `main` deploys production**
(`straypaw.org`). Preview deployments build for every other branch. Region,
crons and git behaviour live in [`vercel.json`](vercel.json).

- **Cron:** `/api/admin/spatial/refresh` runs daily at 03:00 UTC to drain the
  spatial refresh queue (see [`docs/IMPORTS.md`](docs/IMPORTS.md)). It is
  authorised by `CRON_SECRET` — set that env var in Vercel or the scheduled
  drain is rejected.
- **Rollback:** reassign the production alias to a previous deployment, or see
  [`REVERT.md`](REVERT.md).

## Database migrations

SQL lives in [`supabase/`](supabase/). Apply a migration set with the pooler URL
(Supabase → Connect → Session pooler):

```bash
SUPABASE_POOLER_URL='postgresql://…' npm run db:migrate -- pilot
```

Sets are defined in [`scripts/db-migrate.mjs`](scripts/db-migrate.mjs)
(`pilot`, `rollout`, `register`, `wards`, `personal`, `all`). The GitHub
Action **Apply Supabase migration** runs the same script with the
`SUPABASE_POOLER_URL` repository secret. Day-to-day schema changes are applied
as tracked Supabase migrations; recovery/hardening history is captured in
[`supabase/final-site-recovery.sql`](supabase/final-site-recovery.sql) and
[`supabase/post-recovery-hardening.sql`](supabase/post-recovery-hardening.sql).
See [`docs/DATABASE.md`](docs/DATABASE.md) for the schema and index strategy.

## Repository layout

```
src/app/            Next.js routes (public pages, /app community, /partner org console, /api)
src/components/      React components (app shell, spatial map, casefile, partner, …)
src/lib/             Data layer, spatial engine, import pipeline, taxonomy, utilities
supabase/            SQL schema, migrations, RPCs, views, RLS (see docs/DATABASE.md)
scripts/             Migration runner, regression tests, import staging, media tooling
e2e/                 Playwright specs (design, rebuild, report)
docs/                Architecture and operational documentation
```
