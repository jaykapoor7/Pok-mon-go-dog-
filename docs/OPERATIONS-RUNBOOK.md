# Operations runbook

How StrayPaw is deployed, watched, backed up and restored. Keep this current with every infrastructure change.

## What runs where

| Part | Where | Notes |
|---|---|---|
| Web app and API | Vercel project `pok-mon-go-dog`, deployed from `main` | Preview deployments for other branches |
| Database, auth, storage | Supabase production `toujthlzjmhmoyykmayx` | Postgres 17, PostGIS, region **ap-northeast-2 (Seoul)** |
| Staging | Supabase `ucxfxiddufwqithtdtix` | Test accounts only; migrations go here first |
| Scheduled jobs | Vercel cron | 03:00 UTC spatial refresh, 04:00 UTC Kaju record checks |

**Data residency.** Production data is stored in Seoul. A municipal or state pilot may require personal data to stay in India under the DPDP Act and the department's own terms. Before a government pilot handles personal data, confirm the requirement in writing; if India is required, create a Supabase project in `ap-south-1` (Mumbai), restore into it (below) and switch the Vercel environment variables.

## Health and monitoring

- `GET /api/health` returns the deployed commit. Release checks compare it with `main`.
- `GET /api/health?deep=1` also reads one public row with the anonymous key: `200 ok` when the database answers, `503 degraded` when it does not. Point an uptime monitor at this URL every 5 minutes and alert on two failures in a row.
- Runtime errors: Vercel project → Logs (filter by level `error`). Server routes log a short message without record data (for example `Kaju request failed`, `Kaju check failed after retry`).
- Database health and slow queries: Supabase → Reports and Advisors. Run the security and performance advisors after every migration.
- Kaju checks: `/api/admin/kaju/checks` returns `checked`, `failed` and `retried`; a failed check is retried once and offered again on the next run. Delivery is visible to admins and coordinators on Today (Seen by N of M).

## Backups

- Supabase takes daily backups of the production database. Retention depends on the plan (7 days on Pro); point-in-time recovery is an add-on. Check the current setting in Supabase → Database → Backups before the pilot and record it here.
- Storage objects (photos, evidence files) are not in the database backup. Export the `evidence` and photo buckets weekly to an India-region bucket controlled by StrayPaw.
- Migrations are in `supabase/migrations`, so the schema can be rebuilt from git.

## Restore

1. Decide the restore point (time of the last good state) and note who approved the restore.
2. Restore into a **new** Supabase project, never over production: Supabase → Database → Backups → Restore to new project (or PITR to a timestamp).
3. Check the restored project: run `npm run db:security:audit`, open the public map and one organisation workspace against it, and compare row counts for `dogs`, `cases`, `animal_operation_events` and `operational_audit_log`.
4. Switch `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in Vercel to the restored project and redeploy.
5. Record what was lost between the restore point and the incident, and tell affected organisations.

## Rolling back a release

- Vercel → Deployments → choose the last good production deployment → Promote. Or revert the commit on `main`.
- Migrations in this programme are additive. To undo one, write a new migration that reverses it; do not edit or delete applied migration files.

## Demo workspace

- `demo.straypaw.org` serves the `demo` branch, which builds against **staging**, never production. The `Demo sync` workflow moves `demo` to main's commit after the Quality gate passes on it, so the demo never runs a red build. It only fast-forwards; manual: `git push origin main:demo`.
- The sample records are visible to staging's public views (map, city record) so the demo map and government Overview open on Bengaluru. Production public views are unaffected.
- Sample organisation "Sample · Bengaluru Animal Care Trust" and office "Sample · Bengaluru municipal ABC cell", with five sign-ins: `demo-lead@`, `demo-coordinator@`, `demo-vet@`, `demo-field@` and `demo-municipal@straypaw.invalid`. The password is held by the account owner, not in the repository; rotate it before sharing sign-ins outside the team (each account can change its own password).
- Records are made through the app's own functions by `scripts/staging/seed-demo-workspace.mjs` (`DEMO_PASSWORD=… node scripts/staging/seed-demo-workspace.mjs`). Re-running keeps what exists and adds what is missing; nothing is deleted. The contract is marked illustrative and every organisation name says "Sample".
- Guided live demo (demo.straypaw.org only):
  - **Landing:** on a build pointed at the staging database, the landing page and header show "Start the live demo". It goes to `/try?go=1`.
  - **Auto sign-in:** `/try` signs the visitor in to a sample account through `POST /api/demo/session`. That route needs `DEMO_ACCOUNT_PASSWORD`, which is set in Vercel for Preview on the `demo` branch only. It answers 404 on production and on any build without that variable, and an e2e test checks this.
  - **The guide:** a card (`src/sp/demo/`) walks through 13 steps across the five roles: field, vet, coordinator, lead, then municipal. It highlights the control to look at, and the visitor can roam freely or switch role at any time.
  - **Shared accounts:** visitors share the five sample accounts and can change sample records; re-run the seed script to top them up. `scripts/staging/demo-account-guard.sql` stops a visitor changing a sample account's password, email or phone, or removing its memberships. Apply it to staging only.
  - **Password rotation:** rotate the sample password and update `DEMO_ACCOUNT_PASSWORD` together.
- DNS: `demo` is a CNAME to `cname.vercel-dns.com` at Cloudflare (DNS only, not proxied).

## Staging schema drift

Some public map functions were applied to production directly and never added to `supabase/migrations`, so staging lacked them and every city read on the staging map failed. `public_map_months` is now a migration (identical to production). `scripts/staging/public-map-parity.sql` adds `public_map_cells_v2`, `public_map_case_confidence` and `public_map_followups_live` to staging (identical to production) and a reduced `public_contributor_organisations` stand-in, because staging has no `atlas_area_metrics` or `data_sources` tables. Never apply the parity file to production. Before the pilot, compare `pg_proc` between the two projects and bring the rest of production's public-data functions into migrations.

## Credentials

- Secrets live only in Vercel environment variables and Supabase; never in the repository.
- Rotate the Supabase service role key and `CRON_SECRET` if anyone with access leaves, and after any suspected leak.
- Staging test accounts get temporary passwords only for a test run and are reset to random values afterwards.

## Still to switch on

- Supabase Auth: leaked-password protection (dashboard switch).
- An uptime monitor on `/api/health?deep=1`.
- Weekly storage export to an India-region bucket.
