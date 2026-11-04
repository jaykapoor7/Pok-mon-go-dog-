# Founder Intelligence — implementation and release gate

Status: **staging implementation branch**. No production migrations or deployment authorized by this document.

## Files
- `src/app/founder/analytics/page.tsx`: private founder route.
- `src/components/founder/FounderDashboard.tsx` + `founder.css`: responsive metrics, sources, reporting funnel, partner organizations, pilot registration/updates, care and data quality.
- `src/app/api/admin/founder/route.ts`: server-only API, admin Bearer token (existing `ADMIN_SECRET`), no-store data, non-production guard, real Supabase rollup and optional Vercel Analytics API.
- `supabase/founder-intelligence.sql`: two private tables and source-aware report rollup.
- `supabase/founder-operational-events.sql`: append-only qualifying workflow event ledger, non-blocking server-side triggers on cases, case updates, animals, medical events and follow-up completions; private activity summary.

## Security
The dashboard prompts for the existing server admin secret, kept in memory only. It does not use URL query passwords or browser storage. All API routes require the Bearer credential; server-side Supabase service-role credentials are never sent to the browser. New tables revoke access from anon/authenticated and enable RLS. The rollup uses SECURITY INVOKER with EXECUTE permission solely for service_role. Inspect advisor findings separately: do not auto-modify `spatial_ref_sys` without reviewing PostGIS access.

The API refuses to load during a Vercel preview if its `NEXT_PUBLIC_SUPABASE_URL` points to the known production project. Preview environment variables must target the staging database. The standalone staging Vercel project must also be checked before any deployment.

## Configuration
Already used: `ADMIN_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Optional for traffic inside Founder Intelligence (server only):
- `FOUNDER_VERCEL_ANALYTICS_TOKEN`: Vercel token scoped to reading Web Analytics for the correct team/project. Never expose it in `NEXT_PUBLIC_` variables.
- `FOUNDER_VERCEL_TEAM_ID`: defaults to the connected StrayPaw team.
- `FOUNDER_VERCEL_PROJECT_ID`: defaults to the connected StrayPaw production Vercel project.

Without a valid token or a matching verified Vercel snapshot, traffic cards deliberately show unavailable. They must never be filled with estimates from product events or summed daily visitors.

## Data dictionary
- `website visitors`: Vercel aggregated privacy-preserving visitor metric in exact selected period; not signed-in users.
- `registered accounts`: Supabase Auth non-anonymous accounts.
- `new signups`: account creation inside the time window.
- `last sign-in`: users whose most recent Auth sign-in falls inside the period, not WAU.
- `native cases`: cases with null import batch, non-demo flag, and provenance distinct from imported historical records.
- `native resolved`: eligible cases whose recorded resolved date is inside the period. This is **not** a cohort resolution rate.
- `verified case resolutions`: subset with `proof_verified=true` and native resolved date in window.
- `native clinical events`: non-imported non-demo procedure rows created inside period; not unique animals or platform-caused impact.
- `native follow-ups completed`: non-imported scheduled follow-ups with completion timestamp in selected period.
- `weekly active organization`: distinct verified NGOs with authenticated, verified organization members carrying out native actor-attributed work in a complete last-seven-day observation window. Until seven full days have elapsed since instrumented tracking began, this is unavailable. Legacy audit activity is diagnostic only.
- `weekly active user`: distinct Auth-validated actors performing case creation/update, native animal recording, or medical record creation during a complete seven-day tracking window. Anonymous case activity is recorded, but does not become an authenticated active user.
- `pilot stage`: staff-maintained record, *never* inferred from database registrations or imports.
- `report funnel`: unique session IDs for started reports and respective stage occurrence within those sessions. Does not assert ordering or completed reports without submit events.
- `historical records`: inventory / documented historical work, never credited as StrayPaw-generated outcome.

## Smoke tests already expected in staging
1. `select public.founder_analytics_rollup(now() - interval '30 days',now());` returns JSON with explicit source types and 0 or empty arrays for truly empty tables.
2. `select has_table_privilege('anon','public.founder_pilots','select');` is false.
3. `select has_table_privilege('authenticated','public.founder_pilots','insert');` is false.
4. `select has_function_privilege('anon','public.founder_analytics_rollup(timestamptz,timestamptz)','execute');` is false.
5. `select has_function_privilege('service_role','public.founder_analytics_rollup(timestamptz,timestamptz)','execute');` is true.
6. Invalid date windows (future, reversed, greater than 93 days) must error.
7. API without ADMIN_SECRET configured returns 503. With invalid Bearer returns 401.
8. Preview configured with the known production database returns 503; never query production from a PR preview.
9. UI must show staging banner, preserve zero vs unavailable, and never label import totals as platform impact.
10. Pilot creation requires a real non-demo organization and updates existing pilot stage by ID.
11. Verify build, lint, TypeScript, browser/mobile and server auth isolation before production.
12. Check actual production query counts against baseline before migrating production; no automated publish.
13. Confirm that staging fixture flags correctly identify `staging_demo` animals/cases and explicit demo clinical rows; test that they do not inflate native operations.
14. Validate operational trigger inside a transaction and ROLLBACK. A staged case-resolution transition creates one event with a null resolver (rather than falsely crediting its creator). After rollback, zero test events persist.
15. Assert all public role permissions on the workflow table and activity RPC remain denied.

## Remaining prerequisites before release
- **Vercel Web Analytics token** required for website traffic inside Founder Intelligence, or implement a verified server-to-server snapshot ingestion job with properly stored period windows.
- **Action instrumentation** now captures native case, case update, animal and clinical writes through database triggers after migration. WAU/WAO remain unavailable until complete seven-day collection coverage and operational validation. Volunteer activities are not yet fully instrumented; do not infer them from sign-in or audit data. More complete 30-day retention requires a full window.
- **Clinical attribution and deduplication** required for verified unique-animal impact and before/after time saved.
- **Pilot baselines/criteria** may be stored with a pilot record and must be reviewed with contributors before public claims.
- **Review deployment**: preview build, browser smoke, PostgREST RPC with service role, staging-only test data. The production release remains gated on manual approval.

## Staging result (October 29 / 30, 2026)
- Both migrations applied only to `straypaw-staging`.
- Source-separated rollup and activity rollup execute. Anonymous and authenticated roles lack read/write/EXECUTE access; service_role has the appropriate grants.
- Corrected existing **explicitly marked QA fixtures**: three animals and two cases with `provenance='staging_demo'`, two clinical events carrying `source_metadata.demo=true`, and one `DEMO ·` organization. These remain available to QA but are excluded by existing demo flags. No production records were touched.
- Verified the staging rollup reports zero real animals, zero native cases and zero native clinical events after the correction; this does not imply production has no real data.
- Tested case-resolution trigger in a transaction with rollback. It created a source-linked event in-transaction and left zero persisted test events afterward.
