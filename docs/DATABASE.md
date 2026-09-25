# Database

## Platform

PostgreSQL on Supabase is the system of record. Supabase Auth provides user identity. The repository stores schema/migration SQL under `supabase/` and uses repeatable migration bundles rather than a single ORM migration directory.

## Core domain

The schema has grown beyond the original prototype. Important entities include:

- `dogs` — legacy-named aggregate animal profiles; later migrations add species and operational fields.
- `sightings` — raw observations/reports linked to animal profiles where known.
- `ngos` — partner organisations.
- `ngo_members` and access/invite tables — organisation membership/onboarding.
- `cases` — organisation case register linked to animals.
- `medical_events` — treatment/medical history.
- `campaigns` — operational programmes/drives.
- `tasks`, `feeding_zones`, `surveys`, `vet_camps`, `documents`, `fundraisers`, adoption and follow-up records.
- spatial/ward/public aggregate structures used by map and coverage products.

This is not exhaustive. Search the current SQL before assuming a table or function does not exist.

## Relationships and ownership

- Sightings may resolve to a dog/animal profile.
- Cases may reference animals and an organisation.
- Organisation-private records carry `ngo_id` or resolve ownership through organisation membership.
- Public records are often derived from base tables through deliberately limited views/RPCs.
- User ownership uses Supabase `auth.uid()`; organisation scope commonly resolves through helpers such as `my_ngo()` / `is_ngo_member()`.

## Migration model

See `supabase/README.md` for exact commands and ordering.

Primary entrypoints:

- `RUN-ALL-MIGRATIONS.sql` — base/new-project bundle.
- `RUN-PILOT-MIGRATIONS.sql` — pilot/current additive bundle.
- boundary loaders and map/search SQL for spatial datasets.

The migration scripts are expected to be idempotent and safe to rerun. Preserve that property.

Do not edit production data manually as a substitute for a reproducible migration. When a standalone SQL file becomes part of the deployed schema, keep the canonical bundle/workflow in sync.

## Schema-change rules

- Prefer `add column if not exists`, `create table if not exists`, guarded constraint creation and `create or replace` where signatures allow it.
- If an RPC signature changes, remove stale overloads explicitly so PostgREST calls cannot become ambiguous.
- Add indexes for real query/filter/join patterns, not speculatively.
- Keep foreign-key delete behavior intentional.
- Preserve unknown/not-examined states; do not coerce missing data to false/zero.
- Avoid destructive table rebuilds except for intentionally reproducible imported boundary/reference data.

## RLS and functions

RLS is part of the schema contract, not an application convenience. Table creation is incomplete until access is defined.

For privileged functions:
- set a safe `search_path`,
- validate the current actor,
- scope organisation reads/writes,
- restrict execute grants,
- use rate limiting for anonymous writes where applicable.

Public views should select named fields only and use `security_invoker` when the view is meant to inherit caller permissions.

## Spatial data

Spatial coverage is operational evidence, not a population estimate. Coarse public map cells intentionally trade precision for privacy. Do not derive exact animal locations from public aggregates or label recorded-animal density as population density.

Boundary imports are reproducible reference data. Follow `supabase/README.md` before changing ward/district loaders.

## Data access in TypeScript

Use the shared Supabase helpers and domain modules in `src/lib/`. Avoid duplicating query logic in presentation components.

`getSupabase()` is the browser/anon client. `getSupabaseAdmin()` is server-only and bypasses RLS; using it creates an obligation to authorize and minimize returned data in application code.

## Validation

For DB/security changes use the relevant repository scripts, including:

```bash
npm run db:security:audit
npm run db:security:matrix
npm run test:sql-rpc-mapping
```

Also run targeted import/spatial tests when touching those subsystems.
