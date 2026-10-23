# StrayPaw current-state audit, 2026-10-23

Written after an independent audit of production:

- Repo: `jaykapoor7/Pok-mon-go-dog-` on `main`, commit before this doc: `ead1e82`
- Vercel project: `pok-mon-go-dog` (production = `straypaw.org`)
- Supabase production: `toujthlzjmhmoyykmayx`

The two columns below each tell the truth as of today, not what public copy
or earlier audits say.

## Database truth

| Table                      | Rows   | What it means                               |
|----------------------------|-------:|---------------------------------------------|
| `dogs`                     | 30,288 | Mostly imports (18 batches)                 |
| `cases`                    | 23,200 | 23,195 imported, 5 native                   |
| `medical_events`           | 22,528 | Real location of ster/vacc activity         |
| `vaccinations`             |      0 | **Duplicate**: data is in `medical_events.kind='vaccination'` (83) |
| `sterilisations`           |      0 | **Duplicate**: data is in `medical_events.kind='sterilisation'` (21,018) |
| `tasks`                    |      0 | Never written to                            |
| `evidence_items`           |      0 | Never written to                            |
| `evidence_reviews`         |      0 | Never written to                            |
| `animal_followups`         |  1,630 |                                             |
| `animal_timeline_events`   | 88,955 |                                             |
| `sightings` (real)         |     65 | Jun–Aug 2026; **0** routed to an org        |
| `ngos`                     |     22 |                                             |
| `ngo_members`              |      7 | 15 of 22 orgs have no logged-in member yet  |
| `import_batches`           |     18 |                                             |
| `helpers`                  |      1 | A single sign-up from June, still unrouted  |

### Schema duplication to resolve

`vaccinations`, `sterilisations`, `tasks`, `evidence_items`, `evidence_reviews`
are empty tables. The real care data lives in `medical_events.kind`. These
tables should either be removed or formally deprecated with a comment that
says so, so the next operator doesn't write to them. Removal is destructive
and needs a review of every reader before it happens, so for now:
leave in place and add a `COMMENT ON TABLE` warning them off. See
`docs/CURRENT-STATE-AUDIT-2026-10-23.md` (this file) for the single source
of truth.

## The report → care chain

The chain exists end-to-end:

1. `/community/report` → `/api/report` → `sightings` (status `live`,
   `ngo_id` null until an org claims it).
2. NGO member signs in → `/ngo/inbox` → `rpc.org_incoming('ours'|'community')`.
3. Member either files picked rows into a drive via
   `rpc.file_sightings_to_campaign` (registers the animal under that
   programme) or opens a case at `/ngo/cases/new?dog=…`.
4. A case is taken via `rpc.claim_case` (or `rpc.take_case_own_or_pool` for
   the pool).
5. Work and follow-ups write to `cases`, `medical_events`, `animal_followups`,
   `animal_timeline_events`.

### What is actually used

- Reports (`sightings`) are tiny: 65 over two months, from one signed-in
  reporter.
- Native cases: 5. Everything else is imports.
- NGO membership: 7 members across 22 orgs. 15 orgs have no logged-in user,
  so their inboxes never get touched.
- The chain is wired, not broken, but adoption is minimal. The public copy
  must never present imports as live-operations activity.

The resident receipt already handles this well: "Your report reached
StrayPaw. It now waits for review. No organisation has accepted it yet, and
nobody has been sent." No action needed on receipt copy.

### What is missing in product, not in code

- Nothing routes a `live` sighting to an NGO on its own; a member has to
  open the Inbox and act. With 15 of 22 orgs having zero members, most
  sightings never surface to anyone. A simple cron that pings an org's
  escalation email when `community` inbox has unopened rows for N days
  would help, once orgs opt in.
- Trust console sees sightings in `Records`/`People`, but the "0 of 65
  routed" number isn't surfaced anywhere; operators should see this.

## Messaging — CareOS / WhatsApp

**Not connected.** Verified 2026-10-23:
`SELECT proname FROM pg_proc WHERE proname LIKE 'careos%'` returns 0 rows.
Code at `src/lib/careos/inbox.ts` already handles this correctly and the
NGO Inbox renders "WhatsApp · Not connected…". `docs/CAREOS-INTEGRATION.md`
previously said "launch confirmed"; rewritten in this change to say "not
connected in production" and point to the capability gate at
`docs/straypaw-2-careos.md`, which is the canonical copy.

## Security

### Fixed in this change

- Nine helper functions (`sp_*`, `assign_straypaw_id`,
  `straypaw_species_code`, `short_straypaw_suffix`) now carry
  `SET search_path = public, pg_catalog`.
  Migration: `harden_helper_search_path_sp_and_straypaw`.

### Attempted and reverted

- Flipping 18 `public_*`/`published_*`/`adoptable_*`/`feeding_zone_*_public`
  views from `SECURITY DEFINER` to `SECURITY INVOKER` broke anon reads on
  `dogs` and other base tables. Reverted immediately. The proper staged fix
  is documented in `docs/SECURITY-DEFINER-VIEWS.md`, with pre-change anon
  counts so regression is testable.

### Known advisor findings not fixed in this change

- `rls_disabled_in_public` on `public.spatial_ref_sys`: PostGIS table,
  owned by PostGIS, do not touch.
- `extension_in_public` for `postgis`: moving the extension is destructive
  and well-known Supabase pain. Document, don't fix.
- `materialized_view_in_api` on `public.public_spatial_animals_cache`: this
  is a legitimate aggregated public cache. If keeping it anon-visible is
  intentional (it is), no change; otherwise revoke anon SELECT.
- `anon_security_definer_function_executable`: 22 functions, three of which
  are PostGIS `st_estimatedextent` (already revoked in migration
  `revoke_postgis_estimatedextent_client_execute_final`; re-verify) and
  the other 19 are intentional public RPCs (`nearby_animals`,
  `track_event`, `india_mask`, `like_sighting`, `add_comment`, `log_feed`,
  `create_feeding_zone`, `list_public_case_stories`, …). These need
  individual rate-limit / payload-size review, not blanket revocation.
- `auth_leaked_password_protection`: Supabase project config toggle, not
  SQL. Enable in the Supabase dashboard when ready.

## Public claims vs reality

- "19 partners across 28 cities" → DB holds 22 NGOs. Verify partner
  identities before publishing.
- "Over 30,000 imported records" → true (30,288 dogs). Not the same as
  "30,000 real animal interactions through StrayPaw this year".
- "WhatsApp launched" → **false** in production. Not deployed.
- Any pricing number ($16–$63/month, $4k–$13k/year) → hypotheses, not
  revenue. Don't present as proof of demand.

## Routes smoke-tested on 2026-10-23

All returned 200 against straypaw.org, except `/animal/<nonexistent>` → 404
(correct):

```
/  /community  /community/report  /community/activity
/community/organisations  /community/feeding
/ngo  /ngo/inbox  /ngo/cases/new  /ngo/import
/city  /city/insights  /city/programmes
/trust  /trust/console  /mission  /our-story  /explore
```
