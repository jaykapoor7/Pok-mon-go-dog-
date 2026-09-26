# Architecture

## Product shape

StrayPaw is a Next.js application for recording and coordinating street-animal field work. It serves several surfaces from one codebase: public/community pages, personal/field workspaces, organisation/NGO operations, public partner profiles/widgets, administrative tooling, maps/spatial analytics, and exports/reports.

The current repository is much larger than the original Delhi prototype. Do not assume a single-city or dog-only architecture from old names.

## Runtime

- Framework: Next.js 15 App Router, React 19, TypeScript.
- Hosting: Vercel.
- Database/auth/storage: Supabase/Postgres.
- Mapping: MapLibre/Mapbox-compatible tooling, react-map-gl, H3, and spatial helpers.
- Styling: Tailwind plus project CSS/tokens; see `docs/DESIGN_SYSTEM.md`.
- E2E: Playwright.
- Email: Resend for StrayPaw transactional mail; Supabase Auth mail remains a separate provider path.
- Abuse protection: Cloudflare Turnstile where configured plus database-backed rate limiting.

At the time this file was created the repo contains roughly 100+ page routes, 40+ API route handlers, and a large additive Supabase SQL surface. Treat it as a mature multi-surface application.

## Major directories

- `src/app/` — App Router pages, layouts and route handlers.
- `src/components/` — reusable product/UI components.
- `src/lib/` — data access, domain logic, spatial engine, imports, auth helpers and utilities.
- `supabase/` — schema, additive migrations, security/RLS definitions, bundled migration entrypoints and boundary datasets.
- `scripts/` — migration, security, fixture, import, spatial and QA tooling.
- `e2e/` — Playwright coverage.
- `.claude/skills/straypaw-design/` — permanent frontend design rulebook.
- `docs/` — maintained operational and engineering documentation.
- `plans/` — historical design/implementation planning; not authoritative after implementation moves on.

## Data flow

Browser code uses the anonymous Supabase client for operations allowed by RLS/RPC contracts. Privileged server paths may use `getSupabaseAdmin()`, which reads `SUPABASE_SERVICE_ROLE_KEY` and must remain server-only.

Prefer domain/data helpers in `src/lib/` over scattering Supabase queries through components. Organisation reads must remain scoped by RLS or an explicitly authenticated server path.

Public aggregate/spatial surfaces should consume public-safe views or RPCs rather than private base tables. For example, public NGO map footprints are deliberately coarse and field-minimised.

## Workspaces and roles

StrayPaw has multiple user/work spaces. Navigation/space selection is a product concern; authorization is a server/database concern. A stored client role may help UX, but it is never proof of permission.

Organisation data isolation is enforced by membership/auth/RLS helpers such as `my_ngo()`, `is_ngo_member()`, policies and guarded RPCs.

## Caching

Some read-heavy public/community data is cached/revalidated in the Next.js data layer. Do not add caching to mutable or user-private reads without understanding invalidation and authorization.

## Embeds

`/embed/*` is intentionally externally frameable for NGO website widgets. The rest of the site keeps clickjacking protection. Do not broaden this exception globally.

## Architectural change rule

Before adding a new table, route family, client state system, design system, or duplicated data-access layer, search for an existing domain path. Prefer extension over a second competing implementation.
