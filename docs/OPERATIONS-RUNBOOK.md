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

- `demo.straypaw.org` serves the `demo` branch, which builds against **staging**, never production. Keep it in step with `main` (`git push origin main:demo`).
- Sample organisation "Sample · Bengaluru Animal Care Trust" and office "Sample · Bengaluru municipal ABC cell", with five sign-ins: `demo-lead@`, `demo-coordinator@`, `demo-vet@`, `demo-field@` and `demo-municipal@straypaw.invalid`. The password is held by the account owner, not in the repository.
- Records are made through the app's own functions by `scripts/staging/seed-demo-workspace.mjs` (`DEMO_PASSWORD=… node scripts/staging/seed-demo-workspace.mjs`). Re-running keeps what exists and adds what is missing; nothing is deleted. The contract is marked illustrative and every organisation name says "Sample".
- DNS: `demo` is a CNAME to `cname.vercel-dns.com` at Cloudflare (DNS only, not proxied).

## Credentials

- Secrets live only in Vercel environment variables and Supabase; never in the repository.
- Rotate the Supabase service role key and `CRON_SECRET` if anyone with access leaves, and after any suspected leak.
- Staging test accounts get temporary passwords only for a test run and are reset to random values afterwards.

## Still to switch on

- Supabase Auth: leaked-password protection (dashboard switch).
- An uptime monitor on `/api/health?deep=1`.
- Weekly storage export to an India-region bucket.
