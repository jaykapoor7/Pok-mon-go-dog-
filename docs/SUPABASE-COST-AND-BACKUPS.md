# Supabase cost, Free plan readiness and backups

Audit date: 23 Nov 2026. Measured on the live projects. Re-check the numbers before acting if this is more than a few weeks old.

## Verdict

Production qualifies for the Supabase Free plan with large headroom. Every quota is under 25% used, and no Pro-only feature is in use. Free removes three things we rely on today: daily backups, protection from pausing, and the Micro compute size. This branch replaces the first two:

- **Backups.** A nightly encrypted backup runs in GitHub Actions, with a weekly restore drill and a weekly copy of Storage objects (`.github/workflows/db-backup.yml`).
- **Pausing.** Staging gets a daily keep-alive (`.github/workflows/staging-keepalive.yml`). Production already has real traffic and the hourly deep health probe.

The Nano compute size is the one real trade-off; see [Risks](#risks-and-tradeoffs).

**Recommendation: move the organisation to Free** once the backup workflow has run green with a restore drill, using the procedure below. **Fallback:** if a trigger in [When to go back to paid](#when-to-go-back-to-paid) fires, keep production on Pro and move staging to its own Free organisation. That costs **$25/month**.

| Setup | Monthly cost |
|---|---|
| Today: Pro org, two Micro projects | $25 + ~$9.62 net compute + tax ≈ **$37** (latest invoice $35.64) |
| **Recommended: both projects on Free** | **$0** |
| Cheapest paid fallback: production alone on Pro, staging in a separate Free org | $25 + tax ≈ **$27** (one Micro is covered by Pro's $10 compute credit) |

Saving: about **$37/month (~$445/year)**, or ~$10/month with the fallback.

## Current architecture

| Part | Where | Used by |
|---|---|---|
| Production DB, Auth, Storage | Supabase `toujthlzjmhmoyykmayx` ("jaykapoor7's Project"), Seoul, PG 17, Micro | Vercel **Production** (www.straypaw.org) |
| Staging DB, Auth, Storage | Supabase `ucxfxiddufwqithtdtix` (straypaw-staging), Mumbai, PG 17, Micro | Vercel **Preview**: the public `demo` branch (demo.straypaw.org, linked from production) and signed-in e2e |
| Development | No local stack until now (`staging/local` was an unfinished PG16 kit) | — |
| Web | Vercel Pro team, project `pok-mon-go-dog`, region icn1 | 4 daily Vercel crons |
| Jobs in GitHub Actions (public repo: minutes are free) | Hourly production probe, AnimalID worker every 10 min, manual migrations | — |

There is one Supabase organisation (Pro) with exactly these two projects. Free allows two active projects per owner, so both fit. Staging is not redundant: it carries the public demo and the e2e suite, and keeps test data out of production. The two projects share no data.

## Measured usage vs Free limits

| Resource | Production | Staging | Free limit |
|---|---|---|---|
| Database size | **96 MB**. 16 MB of that is pg_cron run history. | 47 MB | 500 MB per project |
| Storage | **249 MB** in 66 objects. 222 MB are July photos of 6–9 MB each; new uploads since August are compressed (~17 KB). | 11 MB | 1 GB |
| Largest file | 9 MB | — | 50 MB upload limit |
| Auth users / MAU (30 days) | 12 / **3** | 32 / 30 | 50,000 MAU |
| API traffic (24 h) | ~12k edge requests, small JSON; 3 Storage requests | low | Egress 5 GB + 5 GB cached per month |
| Realtime | 4 tables (`nx_*` missions and messages) | same | 200 concurrent, 2M messages |
| Edge Functions | 2 deployed (`import-jamshedpur`, `import-hyderabad-inaturalist`), no invocations in the last 24 h | 0 | 500k invocations |
| Connections | 22 of 60 | 14 of 60 | 60 direct, 200 pooled (Nano) |
| Extensions | postgis, vector, pg_cron, http, pgcrypto, uuid-ossp, vault | same minus http | All available on Free |
| Branching, PITR, custom domain, IPv4, log drains | **None** | None | Pro-only or add-ons; not needed |

Egress could not be read through the API. From the request logs it is far below 5 GB. **Confirm on the dashboard:** Organisation → Usage → Egress (current cycle).

### Background work (production, 24 h)

| pg_cron job | Schedule | DB time/day |
|---|---|---|
| `refresh-map-snapshots` | every 15 min | 243 s (2.5 s avg; 18 s historical mean) |
| `refresh-public-animal-cache` | 4×/hour | 76 s |
| `straypaw-spatial-refresh` | every minute | 31 s |
| `nx-mission-tick` | every minute | 23 s |
| `nx-automations-tick` | hourly | 2 s |

pg_cron keeps every run forever: 94,000 rows so far. `supabase/migrations/20261123120000_cron_history_retention.sql` keeps 7 days. It is **not applied** yet; it needs your approval.

## Pro features you lose on Free

| Feature | Impact for StrayPaw | Replacement |
|---|---|---|
| Daily backups, 7-day retention | The only off-site copy today | Nightly encrypted logical backup + weekly restore drill + weekly Storage copy (this branch). RPO 24 h. |
| No pausing for inactivity | Free projects pause after ~7 days of too little database activity | Production: real traffic + hourly deep probe. Staging: daily keep-alive. Supabase emails a warning about a week before any pause. A paused project restores from the dashboard. |
| Micro compute (1 GB, 2-core shared) | Nano: up to 0.5 GB, shared CPU | Database is 96 MB and fits in memory. Watch the slow queries listed under Risks. |
| Log retention 7 days | 1 day on Free | Vercel logs + GitHub probe history |
| Email support | Community support only | — |
| Overage billing (spend cap) | Free has no overages: exceeding a quota leads to **restrictions** (read-only or 402) after a grace period | Quotas are at ≤25%; review monthly |

Free keeps custom SMTP, Auth rate-limit settings, RLS, the Data API, pg_cron, PostGIS, pgvector, Realtime and Edge Functions.

Project refs, URLs, API keys, JWT secret and pooler URIs **do not change** on a plan change. **No environment variable changes are needed** in Vercel or GitHub.

## Backups and recovery (new)

| What | How | When | Where |
|---|---|---|---|
| Production database | `supabase db dump` roles + schema + data (Supabase's documented restorable format), row counts parsed from the dump, SHA-256 sums, age-encrypted | Daily 02:11 IST | GitHub Actions artifact, 30-day retention |
| Restore drill | Restores that night's dump into a throwaway local Supabase stack on the runner. Fails unless every table's row count equals the dump's. | Sundays, and on demand | Job log and summary |
| Storage objects | Every bucket and object, with a manifest of sizes and SHA-256, age-encrypted | Sundays, and on demand | Artifact, 35-day retention |

The repository is **public**, so its artifacts can be downloaded by anyone signed in to GitHub. Everything is encrypted to the owner's age public key before upload, and the private key never goes to GitHub. Lose the private key and the backups are unreadable: keep two offline copies.

Tested on 23 Nov 2026 against a local PostgreSQL. 12/12 checks passed for the database scripts:

- Encrypt, decrypt, restore and verify all work, and awkward text (newlines, tabs, backslashes, Unicode, `\.`) comes back byte-for-byte.
- The scripts refuse to run with no recipient key.
- A wrong key, a tampered file and a row-count mismatch are each rejected.
- Production and unconfirmed hosted targets are refused.

7/7 checks passed for Storage against a mock API: more than 1,000 objects, nested folders, odd filenames, byte-identical restore, and the checksum and production guards. The GitHub workflow itself (Supabase CLI dump and the drill on the runner) runs for the first time when you trigger it (step 3 below).

### Restore procedure (incident)

1. Decide the restore point and record who approved it.
2. Download the artifact (Actions → Database backup → run → Artifacts) and unzip it to get the `.tar.gz.age` file.
3. Restore into a **new** project, never over production. On Free, a third project only fits after pausing staging (Free allows two active projects). Alternatively, upgrade to Pro for the duration.
   ```bash
   TARGET_DB_URL='postgresql://postgres.<new-ref>:<pw>@<pooler-host>:5432/postgres' \
   ALLOW_REMOTE_RESTORE=<new-ref> AGE_IDENTITY_FILE=~/straypaw-backup.key \
     npm run db:restore -- production-<stamp>.tar.gz.age
   ```
   The script verifies checksums, restores in one transaction and compares every table's row count.
4. Storage:
   ```bash
   age -d -i key production-storage-<stamp>.tar.age | tar -x
   SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… \
   ALLOW_STORAGE_RESTORE=<new-ref> npm run storage:backup -- restore production-storage-<stamp>
   ```
5. Re-create anything not in a dump:
   - Auth settings (SMTP, URL configuration, rate limits)
   - Realtime publication tables, if missing
   - Edge Functions (`supabase/functions`)
   - pg_cron jobs, if `cron.job` was not carried
6. Run `npm run db:security:audit` against it, open the map and one workspace, then switch the three Supabase variables in Vercel and redeploy (OPERATIONS-RUNBOOK → Restore).

## Local development (new)

`npm run db:local -- start` runs a full Supabase stack in Docker. Set `STAGING_DB_URL` (staging Session pooler) the first time to load StrayPaw's schema, without any rows. `npm run db:local -- env` prints the `.env.local` lines. Production data never goes to a laptop. The stack lives in `.supabase-local/` (gitignored), apart from `supabase/migrations`, because that folder alone does not rebuild the schema (see OPERATIONS-RUNBOOK → Staging schema drift).

## Downgrade procedure

### 0. Settle the failed invoice first (separately)

The failed $35.64 invoice stays owed after a downgrade. Per Supabase's billing FAQ, an **overdue invoice leads to projects being paused**. It also triggers Fair Use restrictions on the whole organisation, whatever the plan.

1. Organisation → Billing → Invoices: pay the failed invoice. Use a card that allows USD charges from Singapore.
2. If the charge itself is wrong, open a support ticket with the invoice number before paying.
3. Downgrading also bills any usage in arrears and credits unused Pro time to the org (no cash refund). Expect one final small invoice.

### 1. Pre-checks (all must pass)

- [ ] Failed invoice paid; Billing shows no overdue balance.
- [ ] Organisation → Usage, current cycle, per project: DB < 350 MB, Storage < 700 MB, Egress < 3.5 GB, MAU < 35k (70% of Free).
- [ ] No other Free projects owned by any Owner/Admin of this org (Free allows two active projects per person).
- [ ] No branches, PITR, custom domain, IPv4 or log drain add-ons: Project → Settings → Add-ons shows none. This was true on 23 Nov.
- [ ] `BACKUP_AGE_RECIPIENTS` set; the **Database backup** workflow run manually with *restore drill* and *storage* ticked is green.
- [ ] Downloaded that run's artifacts and test-decrypted them locally: `age -d -i key file | tar -tz | head`.
- [ ] Independent copy: on Pro, Database → Backups → download the latest daily backup and keep it with the age key.
- [ ] Staging keep-alive workflow has run green once.

### 2. Downgrade (owner, dashboard)

1. Pick a low-traffic window: night in India. Tell partner NGOs or pilot contacts if any are mid-session.
2. Organisation → Billing → Change subscription plan → **Free**. Read the modal, then confirm.
3. Expect a short restart while compute moves from Micro to Nano. Supabase quotes 1–2 minutes for a paid-to-Free move.

### 3. Verify (within 30 minutes)

- [ ] `curl https://www.straypaw.org/api/health?deep=1` → `status ok, database ok`. Same for `https://demo.straypaw.org/api/health?deep=1`.
- [ ] Sign in to production; check that these open:
  - the public map
  - an animal page
  - an NGO workspace
  - a government dashboard
  - Kaju (ask one question)
- [ ] Upload a photo on staging (Storage writes).
- [ ] `select jobname, status, end_time from cron.job_run_details where end_time > now() - interval '30 minutes' order by end_time desc;` shows successful runs.
- [ ] Run the **Signed-in e2e** workflow against staging.
- [ ] Next morning: the nightly backup is green.

### Rollback

Organisation → Billing → Change plan → **Pro**. This takes effect immediately and keeps the same refs and keys, so Vercel is unaffected. Then, in each project you want back on Micro, go to Settings → Compute and Disk → **Micro**: up to ~2 minutes of downtime each. On a paid plan, Nano is billed at the Micro price anyway. Re-upgrading restores daily backups and no-pause going forward, but not the backups lost while on Free.

## When to go back to paid

Move to the fallback (production alone on Pro, $25) if any of these happen:

- A signed pilot contract or a government department requires managed backups, point-in-time recovery or a support SLA. Note that in-India data residency would need a new Mumbai production project regardless of plan.
- Database > 350 MB, Storage > 700 MB, or Egress > 3.5 GB in a month.
- Nano is too slow: sustained CPU or memory pressure in Reports, or the map refresh regularly over ~10 s.
- Supabase sends a pause warning for production.

The fallback, step by step:

1. Create a new **Free** organisation.
2. Transfer **staging** into it: Project → Settings → General → Transfer. The project must have no GitHub integration connection.
3. Keep the original org on Pro with only production. Its $10 compute credit covers one Micro.

## Risks and tradeoffs

- **Nano compute.** These are the heaviest production queries since June, measured on Micro:
  - `refresh_map_snapshots` (18 s mean historically, 2.5 s in the last day)
  - the public city RPC (2.7 s mean)
  - `list_public_org_impacts` (3.4 s mean)

  With half the memory and shared CPU these can get slower. The database fits in RAM, so this is CPU-bound and usually acceptable at current traffic. Rollback takes minutes.
- **Backups become ours.** RPO goes from Supabase's daily backup to our nightly one (equivalent). Storage RPO is one week; new uploads are rare and small. If the workflow breaks, nobody else is watching: a red nightly run is the alert. GitHub also disables scheduled workflows in public repositories after 60 days without commits.
- **Hard quota limits.** On Free, going over a quota leads to restrictions, not bills. Today's headroom is 4×.
- **Support.** Community only. The workaround for an outage is the rollback above, which restores paid support immediately.

## Further optimisations (not done; product decisions)

- `/animal/[id]` is `force-dynamic` and makes ~17 Supabase queries per view, about 600 views/day (crawlers via the sitemap). ISR with `revalidate = 300` would cut that sharply. The cost: a hidden or edited record could stay visible for up to 5 minutes. Owner's call.
- The performance advisor lists 42 `auth_rls_initplan` and 136 unindexed-foreign-key findings. These are harmless at this size; fix them before data grows tenfold.
- Two unused Edge Functions (`import-jamshedpur`, `import-hyderabad-inaturalist`) can be deleted. Their source is in `supabase/functions`.
- Vercel stays on Pro (Hobby is for non-commercial use only). Deployment Storage is its largest usage line (~$0.08/day across the team's 10 projects). A deployment retention policy (Project → Settings → Security → Deployment Retention) trims it.
