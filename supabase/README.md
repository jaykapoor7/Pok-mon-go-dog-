# supabase/ — schema, migrations and SQL

This directory holds the database's SQL: the schema, the migration sets, the
RPCs/views/RLS, and a set of historical one-off scripts. For the data model,
RLS and index strategy see [`../docs/DATABASE.md`](../docs/DATABASE.md).

## How migrations are applied

```bash
SUPABASE_POOLER_URL='postgresql://…' npm run db:migrate -- <set>
```

Sets are defined in [`../scripts/db-migrate.mjs`](../scripts/db-migrate.mjs):

| Set | Contents |
|---|---|
| `pilot` | `RUN-PILOT-MIGRATIONS.sql` + programme-evidence, rollout-hardening, districts, wards-chennai, register-intelligence, case-review |
| `rollout` | `rollout-hardening.sql` |
| `register` | `register-intelligence.sql`, `case-review.sql` |
| `wards` | `ward-density.sql`, districts, `wards-chennai.sql`, `map-search.sql` |
| `personal` | `personal-access-codes.sql` |
| `all` | `RUN-ALL-MIGRATIONS.sql` + the pilot tail |

The GitHub Action **Apply Supabase migration** runs the same script with the
`SUPABASE_POOLER_URL` repository secret (use the Supabase **Session pooler**
URI — GitHub runners are IPv4-only).

- `RUN-PILOT-MIGRATIONS.sql` is **generated** by `npm run db:bundle` from the
  `PARTS` list in [`../scripts/build-bundle.mjs`](../scripts/build-bundle.mjs).
  Edit the part files, not the bundle.
- `RUN-ALL-MIGRATIONS.sql` is a standalone, idempotent paste-once bundle.

## Recovery / hardening (current)

- [`final-site-recovery.sql`](final-site-recovery.sql) — canonical spatial
  attribution: `rebuild_spatial_city` (cases + care joined through the animal),
  `list_public_org_impacts`, bounded public-read indexes, `public_case_facts`.
- [`post-recovery-hardening.sql`](post-recovery-hardening.sql) — covering
  indexes for all FKs, RLS init-plan `(select auth.uid())` rewrites, and the
  remaining recovery indexes. Mirrors what is applied as tracked Supabase
  migrations; additive and idempotent.

## Historical one-off scripts — DO NOT RUN against production

These were written to diagnose or repair a specific past incident on specific
rows. They are kept only as a record. They are **not** part of any migration
set or bundle, several are **destructive**, and running them now could delete
or rewrite live data. Treat them as archived.

| File | What it was for | Destructive? |
|---|---|---|
| `reset.sql` | Wipe/reset data during early development | **Yes** |
| `delete-one-dog.sql` | Remove a single specific animal | **Yes** |
| `the-22-dogs.sql` | One-off fix for 22 specific records | Maybe |
| `merge-dogs.sql` / `unmerge-existing.sql` / `dedupe-sightings.sql` / `diagnose-duplicates.sql` / `no-auto-merge.sql` / `no-similarity-merge.sql` | De-duplication incident work | Maybe |
| `find-pinky.sql` / `what-are-these-dogs.sql` / `why-cant-they-sign-in.sql` / `make-this-code-work.sql` / `find-pinky` | Ad-hoc diagnostic queries | No (reads) |

If any of these encodes a rule that should be permanent, fold that rule into a
proper part file and the bundle instead of re-running the one-off script.

## Conventions

- Additive and idempotent: `create … if not exists`, `create or replace`.
- No destructive statements in migration parts (deletes only inside RPC bodies).
- Public access is granted on `public_*` views and `SECURITY DEFINER` RPCs,
  never on base tables; every base table keeps RLS enabled.
