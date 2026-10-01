# Architecture

StrayPaw is a Next.js 15 (App Router) app on Vercel, backed by a single
Supabase Postgres database. This document describes how data flows from the
database to the browser, the spatial rollup pipeline, caching, and how the
system is designed to stay fast as the register grows past 1M records.

## Regions (why this matters first)

- **Supabase** project runs in `ap-northeast-2` (Seoul).
- **Vercel functions** are pinned to `icn1` (Seoul) in [`vercel.json`](../vercel.json).

They are deliberately co-located. Before this was set, functions ran in
`iad1` (Virginia) and every server-side query crossed the Pacific (~200 ms
round trip); SSR pages that issue several sequential reads paid that several
times over. Co-locating made the per-query hop local (~1–5 ms) and cut warm
SSR latency on data pages roughly 4–6×. `icn1` is also closer to the primarily
Indian audience than Virginia, so it helps the user→function hop too.

**Implication for new code:** latency is dominated by *round-trip count*, not
by the size of a single bounded read. Prefer one query, or `Promise.all` of
independent queries, over a chain of sequential awaits.

## Request flow

```
Browser
  │
  ├─ Static/edge assets ........ served from the nearest Vercel PoP
  │
  └─ Dynamic routes ............ Next.js server components + /api routes
        │                         run as Vercel functions in icn1
        ▼
     Supabase Postgres (Seoul)
        • public_* views ........ read by the anon key (RLS-safe projections)
        • SECURITY DEFINER RPCs .. aggregate reads that must bypass per-row RLS
        • spatial_city_cells ..... pre-aggregated H3 rollups for the map
        • base tables ............ writes only, behind RLS + definer functions
```

Two Supabase clients exist (`src/lib/supabase.ts`):

- **Anon client** (`getSupabase`) — the public, browser-safe key. Used for all
  public reads. Backed by a 7 s `AbortController` fetch timeout so a stalled
  request fails fast instead of holding a function open to Vercel's limit.
- **Service-role client** (`getSupabaseAdmin`) — server-only, used by the
  protected `/api/report`, admin and partner routes and the spatial refresh
  cron. Never imported into client components.

## The performance contract

Every public (unauthenticated) surface must honour these invariants:

1. **The shell appears immediately.** Loading rails ("Reading the register")
   are placeholders that hydrate into bounded data; they are never the end state.
2. **No visitor request reads the whole country/register.** Public reads hit
   compact rollups or are bounded by an explicit `.limit()` / `.in()` / `.eq()`.
3. **Maps load aggregates first, detailed animals only for a city/viewport.**
4. **Common reads are bounded, indexed and cached.**
5. **Errors degrade gracefully** — an empty/error state, never a blank page,
   an endless spinner, a 50 s query or a 503 loop.

The data layer that enforces this lives in `src/lib/spatial/server.ts`,
`src/lib/data.ts`, `src/lib/landing/story.ts`, `src/lib/community-case-stories.ts`
and `src/lib/org-public.ts`. Hard caps are defined at the top of each
(`MAX_CITIES`, `MAX_CELLS`, `MAX_ANIMALS`, `LANDING_LIMITS`, `DATASET_LIMITS`).

## Spatial pipeline (the heart of the map)

Raw operational rows are aggregated into H3 (resolution-8) cells, keyed by
city, so the public map and all totals read a few hundred rollup rows instead
of tens of thousands of animals.

```
dogs ─┐
cases ─┤  rebuild_spatial_city(city)         spatial_city_cells
medical_events ─┘  (SECURITY DEFINER)   ──►  (city, h3_r8, animals, needs_help,
                                               sterilised, vaccinated, cases,
                                               open_cases, care_events, latest_seen)
                                                      │
                 list_public_spatial_cities(limit) ◄──┘   → /api/stats, India totals,
                 spatial_city_cells reads               → /api/spatial (cities & cells)
                                                         → maps, Insights, city views
```

- `rebuild_spatial_city(p_city)` deletes and rebuilds one city's cells. Animals
  anchor the cell; cases and care join **through the canonical animal/location
  relationship** (imported historical cases prefer the linked animal's place).
  This keeps aggregates agreeing with raw data.
- `list_public_spatial_cities(p_limit)` sums cells per city for the cities list,
  India totals and the top-bar counters — no exact `COUNT(*)` over the register.
- Client map flow: `/api/spatial?kind=cities` → pick a city →
  `?kind=cells&city=…` → at close zoom `?kind=dataset` or `/api/spatial/patch`
  for a bounded set of animals in the viewport.

### Refresh (never a synchronous global rebuild)

Imports and edits **enqueue** affected cities into `spatial_refresh_queue`
(`enqueue_spatial_refresh`). A visitor or import request never rebuilds the
national register inline. The queue is drained by:

- **Cron:** `GET /api/admin/spatial/refresh` daily at 03:00 UTC, authorised by
  `CRON_SECRET`, rebuilding up to `BATCH` (60) queued cities per run.
- **Operator:** `POST /api/admin/spatial/refresh` with `ADMIN_SECRET`.

If `CRON_SECRET` is unset in the environment the scheduled drain is rejected and
rollups go stale after imports — so that variable must exist in production.

## Caching & revalidation

- **Server data layer:** `unstable_cache` wraps the expensive public reads
  (city rollups, landing story, org impacts) with `revalidate` windows of
  60–300 s, keyed by a version string. Bump the version suffix (e.g.
  `…-v4`) when the shape changes to invalidate cleanly.
- **HTTP:** read APIs set `Cache-Control: public, s-maxage=…,
  stale-while-revalidate=…` so the Vercel edge serves repeat hits without
  re-invoking the function.
- **Browser storage** is used only for per-device conveniences (followed
  animals, drafts); it is never a source of shared truth.

## Scalability model (30k → 1M+)

What stays flat as rows grow, because reads are bounded and indexed:

- **Map / totals / Insights** read `spatial_city_cells` and
  `list_public_spatial_cities`. Cell count grows with *geographic spread*
  (cities × populated H3 cells), not with raw animal count, and is capped by
  `MAX_CELLS`. Totals are sums over a few hundred rows.
- **Animal/case/care detail reads** are always filtered (`city`, `dog_id IN`,
  viewport bbox) and `.limit()`-bounded, backed by indexes on `cases(city)`,
  `cases(dog_id, …)`, FK columns, and partial indexes for the common public
  sorts (`dogs(last_seen) where needs_help`, etc. — see `DATABASE.md`).
- **Rollup rebuild cost** is per-city and bounded; the queue drains a fixed
  batch per cron run, so a large import spreads its refresh over runs instead
  of blocking.

Watch items as volume climbs toward 1M (tracked in the hardening report):

- Keep the landing/story sample a single fresh city (already bounded).
- Consider converting the hottest public views to materialized views if their
  per-request planning/scan cost rises (e.g. `public_case_facts`' per-row
  follow-up aggregate).
- Keep an eye on function cold-start on the dynamic pages; introduce ISR for
  globally-identical pages if cold latency becomes user-visible.
