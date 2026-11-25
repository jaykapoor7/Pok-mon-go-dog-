# Supabase cost, Free plan readiness and backups

Audit date: 23 Nov 2026. Measured on the live projects. Re-check the numbers before acting if this is more than a few weeks old.

## Verdict

Production qualifies for the Supabase Free plan with large headroom. Every quota is under 25% used, and no Pro-only feature is in use. Free removes three things we rely on today: daily backups, protection from pausing, and the Micro compute size. This branch replaces the first two:

- **Backups.** A nightly encrypted backup runs in GitHub Actions, with a weekly restore drill and a weekly copy of Storage objects (`.github/workflows/db-backup.yml`).
- **Pausing.** Staging gets a daily keep-alive (`.github/workflows/staging-keepalive.yml`). Production already has real traffic and the hourly deep health probe.

The Nano compute size is the one real trade-off; see [Risks](#risks-and-tradeoffs).

A standard Supabase CLI dump would **not** restore StrayPaw safely. See [What Supabase's own dump leaves out](#what-supabases-own-dump-leaves-out-verified-24-nov-2026); the backup now covers every gap and proves it on each run.

**Recommendation: move the organisation to Free** once every critical item in the [Readiness checklist](#readiness-checklist) passes, using the procedure below. **Fallback:** if a trigger in [When to go back to paid](#when-to-go-back-to-paid) fires, keep production on Pro and move staging to its own Free organisation. That costs **$25/month**.

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

## Backups and recovery

### What Supabase's own dump leaves out (verified 24 Nov 2026)

`supabase db dump` (CLI 2.122.1, exact `pg_dump` commands from `--dry-run`) is the format Supabase documents for restores. On its own it does **not** restore StrayPaw correctly:

| Gap | Why | Effect on a restore made only from the CLI dump | Covered by |
|---|---|---|---|
| **Privileges come back open** | `pg_dump` writes privileges relative to owner defaults. A fresh Supabase project grants anon/authenticated ALL on every new object. | Production revokes anon on **121 of 154 tables and 394 functions**. All of them would be readable or executable by anyone, including `SECURITY DEFINER` admin functions. Reproduced locally. | `acl.sql`: 4,277 statements on production, exact revokes and grants |
| Storage access rules | Schema `storage` is excluded | 16 policies on production and 18 on staging lost. Nobody could read or upload private files, or the rules differ. | `platform.sql` |
| Custom triggers on Auth tables | Schema `auth` is excluded | Staging's `auth.users.demo_account_guard` lost; production has none | `platform.sql` |
| Extensions | Schema `extensions` is excluded | PostGIS, pgvector and http are not created, so the restore fails at the first geometry column | `extensions.sql` |
| pg_cron jobs | Schema `cron` is excluded; `cron.job` is platform-owned | The 5 production jobs (map refresh, mission tick…) never run | `platform.sql` via `cron.schedule` |
| Cron run history, Realtime messages | Operational or ephemeral | None (not needed) | Deliberately excluded |
| **Materialized views left empty** | A schema dump creates them `WITH NO DATA`; a data dump never refreshes them | `public_spatial_animals_cache` (the public map cache) is unpopulated. Map reads fail, and the 15-minute `REFRESH … CONCURRENTLY` job fails forever. Found by the first production drill. | `platform.sql` refreshes every view populated in the source; the fingerprint records it |
| Auth/Storage service versions differ | Source and target run different Auth/Storage versions | The restore stops on an unknown column. Production's `auth.one_time_tokens.link_token_hash` is missing from the CLI's local stack. | For `auth.*`/`storage.*` only, load the target's columns and report what was left out (counts of non-empty values). Our schemas stay strict. |
| Vault secrets | Encrypted with a per-project key | Cannot be restored | Both projects hold 0; the backup **fails** if any appear |
| Storage file bytes | Not in Postgres | Files missing | `storage-backup.mjs` + metadata reconcile |
| Project settings | Outside Postgres (Auth providers/SMTP/URLs, API settings, Edge Function secrets) | Must be re-entered | Recorded in the restore procedure below |

Included as-is: all application schemas (`public`, `private`, `health`, `straypaw_private`, `operations_private`, staging's `careos`/`sd`) and RLS policies. Also the data of `auth` (users with password hashes, identities, sessions, refresh tokens, MFA) and `storage` (buckets, object rows), Realtime publication membership, sequences and custom roles (no passwords; there are none).

### What runs

| What | How | When | Where |
|---|---|---|---|
| Database, **both projects** | CLI dump + `extensions.sql`, `platform.sql`, `acl.sql`, row counts, and a fingerprint (`structure.tsv`, 2,889 items on production). A fingerprint is taken before and after the dump; the dump is redone if anything changed in between. Age-encrypted. | Daily 02:11 IST | Artifact, 30 days |
| Restore drill, both projects | Fresh local Supabase stack on the runner. Database restored, then must match exactly: row counts, structure, privileges, policies, triggers, cron, buckets, and Auth and Storage digests. Then the Auth server must list every account; Storage files are uploaded, metadata reconciled and every file re-downloaded and hashed. HTTP checks as anon: revoked table refused, public view served, public file served, private file refused. Free-plan size limits. Timings under Nano-like limits. | Every night; Storage on Sundays | Run summary |
| Storage objects, both projects | Every bucket and object, sizes and SHA-256, age-encrypted | Sundays, and on demand | Artifact, 30 days |
| **Backup verification** (PR check) | The real recovery path: dump → encrypt → upload artifact → **download** → decrypt → restore → full drill. Uses a throwaway key that dies with the runner, so the uploaded copy (1 day) is undecryptable. | Every PR that changes backup code | PR checks |

CI logs here are public, so failed restore rows are reported as table + SQLSTATE only, never values. Storage logs name buckets, not files.

Two side effects of restoring a dump are not differences. Definitions written with `BETWEEN` or chained `AND`s come back with flattened brackets, so expression definitions are compared without brackets or whitespace. Function bodies and indexes stay exact.

**First production restore drill: passed on 24 Nov 2026.** Run 45331499481 recovered from the downloaded, encrypted artifact:

- 194 tables and 30,635 rows matched.
- All 2,906 structure, privilege and policy items matched.
- The Auth server listed all 12 accounts.
- Anon was refused on `dogs` (HTTP 401) and served `public_animal_profiles` (HTTP 200).
- Database 77 MB of 500 MB; Storage 237 MB of 1 GB; largest file 8.7 MB.
- Under 1 CPU / 0.5 GB limits, `refresh_map_snapshots` ran in 399 ms and the public reads in 11–24 ms.

Left out as Auth/Storage version differences: 2 Auth columns holding 0 values, and 2 newer Storage tables. Storage files were not part of this run (secrets not yet set).

### Alerts

| Signal | Catches | Setup |
|---|---|---|
| Issue "Database backup failing" (label `backup-alert`), closed by the next success | Any failed or BLOCKED nightly run | None; GitHub notifies you of new issues |
| Daily freshness check (Staging keep-alive workflow) | No successful backup in 30 h: skipped or delayed schedules, a disabled workflow | None |
| **Heartbeat** at healthchecks.io (free) | Nothing ran at all, including GitHub disabling schedules in a public repo after 60 quiet days | Create a check (period 1 day, grace 6 h) and put its ping URL in secret `BACKUP_HEARTBEAT_URL` |
| Telegram | Same as the issue, to your phone | Optional: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` |

GitHub delays scheduled runs heavily: the AnimalID worker, scheduled every 10 minutes, ran about twice a day in November. That is why the freshness check and the heartbeat exist.

### Setup (owner)

**One command does all of it** on your own machine, using your logged-in `gh` and `supabase` CLIs: `bash scripts/ops/setup-backups.sh`.

- It creates your age key at `~/.config/straypaw/straypaw-backup.key`, readable only by you, and sets the public half as `BACKUP_AGE_RECIPIENTS`.
- It reads both projects' service keys with `supabase projects api-keys --reveal` and puts them straight into GitHub secrets.
- It asks, with hidden input, for staging's Session pooler URI, refuses the production one and test-connects.
- It creates the healthchecks.io heartbeat from an API key, or takes an existing ping URL.

Secrets travel only through stdin. None is printed, put on a command line, or written to disk except your private key. Use `setup-backups.sh check` to list what is configured (names only), and `setup-backups.sh verify <artifact.zip>` to decrypt a downloaded backup with your key.

The manual equivalent:

1. `age-keygen -o straypaw-backup.key` on your machine. Keep two offline copies; without the key the backups cannot be read. Optionally create a second key for a co-founder.
2. Repository **variable** `BACKUP_AGE_RECIPIENTS` = the `age1…` public key(s), space separated.
3. Repository **secrets**:
   - production: `SUPABASE_POOLER_URL` (exists), `BACKUP_SUPABASE_URL` (`https://toujthlzjmhmoyykmayx.supabase.co`), `BACKUP_SUPABASE_SERVICE_KEY`
   - staging: `STAGING_POOLER_URL` (Session pooler URI), `STAGING_SUPABASE_URL` (`https://ucxfxiddufwqithtdtix.supabase.co`), `STAGING_SUPABASE_SERVICE_KEY`
   - alerts: `BACKUP_HEARTBEAT_URL`
4. Re-run **Backup verification** on the PR. Both jobs must be green.
5. After merge: Actions → Database backup → Run workflow. Download the artifact and test your key: `CHECK_ONLY=1 AGE_IDENTITY_FILE=straypaw-backup.key npm run db:restore -- <artifact>.zip`.

Local tests (24 Nov 2026), all passing:

- **24/24 full-fidelity checks** against an emulated Supabase: API roles, platform schemas, default privileges granting anon ALL, Storage policies, an `auth.users` trigger and an extension in `extensions`. They cover:
  - the artifact zip decrypting with either of two keys
  - anon still denied on revoked tables and functions after restore, with column grants kept
  - Storage policies and the auth trigger restored, and the trigger not re-firing
  - identical password hashes and sequence positions
  - Storage metadata reconcile
  - no row values in failure logs, and nothing committed on failure
  - **a negative control: a CLI-only restore is caught by the fingerprint, and does let anon read the revoked table**
- 12/12 checks of the core encrypt/restore/guard behaviour.
- 7/7 Storage checks against a mock API.

The generators and fingerprint were also run read-only against both live catalogs (Postgres 17).

### Restore procedure (incident)

1. Decide the restore point and record who approved it.
2. Download the artifact (Actions → Database backup → run → Artifacts). The `.zip` can be passed directly.
3. Restore into a **new** project, never over production. On Free, a third project fits only after pausing staging, or upgrade to Pro for the duration. Then enable nothing by hand: `extensions.sql` does it.
   ```bash
   TARGET_DB_URL='postgresql://postgres.<new-ref>:<pw>@<pooler-host>:5432/postgres' \
   ALLOW_REMOTE_RESTORE=<new-ref> AGE_IDENTITY_FILE=~/straypaw-backup.key \
     npm run db:restore -- production-db-<run>.zip
   ```
   It verifies checksums and restores in one transaction, in this order: extensions, roles, schema, data, platform policies/triggers/cron, exact privileges. It then compares row counts and the full fingerprint.
4. Storage, then put the original metadata back:
   ```bash
   age -d -i key production-storage-<stamp>.tar.age | tar -x
   SUPABASE_URL=https://<new-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=… ALLOW_STORAGE_RESTORE=<new-ref> \
     npm run storage:backup -- restore production-storage-<stamp>
   TARGET_DB_URL=… ALLOW_REMOTE_RESTORE=<new-ref> bash scripts/ops/storage-reconcile.sh <decrypted db backup dir>
   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run storage:backup -- verify production-storage-<stamp>
   ```
5. Re-enter project settings, which live outside Postgres:
   - Auth: Site URL and redirect URLs, providers, custom SMTP, email templates, rate limits, Turnstile/CAPTCHA
   - API: exposed schemas
   - Edge Functions (`supabase/functions`) and their secrets
6. New JWT keys mean existing sessions end; users sign in again with their same passwords. Switch the three Supabase variables in Vercel and redeploy (OPERATIONS-RUNBOOK → Restore).

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
- [ ] Every **critical** item in [Readiness checklist](#readiness-checklist) is ticked. That includes both Backup verification jobs green, a nightly run green for both projects, and your key tested on a real artifact.
- [ ] Independent copy: on Pro, Database → Backups → download the latest daily backup and keep it with the age key.

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

- **Nano compute.** The heaviest work is the 15-minute map refresh. Over 7 days on Micro, `refresh-map-snapshots` ran at p50 2.6 s, **p95 25.6 s and max 89 s**, with no failures. `refresh-public-animal-cache` ran at p95 6.8 s. With half the memory and shared CPU these get slower. The restore drill times them on a copy of production under Nano-like limits (see the run summary). If they misbehave after the downgrade, optimise `refresh_map_snapshots` or re-upgrade: rollback takes minutes.
- **Backups become ours.** RPO goes from Supabase's daily backup to our nightly one (equivalent). Storage RPO is one week; new uploads are rare and small. Failures open an issue, a daily freshness check catches missed schedules, and the external heartbeat catches GitHub not running anything. All three need the setup above.
- **Hard quota limits.** On Free, going over a quota leads to restrictions, not bills. Today's headroom is 4×.
- **Support.** Community only. The workaround for an outage is the rollback above, which restores paid support immediately.

## Security review (24 Nov 2026)

Both projects' security and performance advisors were read in full. Nothing found blocks the downgrade, and none of it is affected by the plan change. No policy or grant was changed.

| Finding | Production | Assessment |
|---|---|---|
| `security_definer_view` (ERROR) | 18 `public_*` views | Intentional and documented (docs/SECURITY-DEFINER-VIEWS.md). Each projects a filtered public subset; base tables stay revoked from anon. Flipping them is a separate, planned change. |
| `anon_security_definer_function_executable` | 27 | Reviewed one by one: public read RPCs (map, totals, stories, bite-help services), `track_event` and `oh_submit_bite_notice` (public by design, rate-limited inside). `org_animals` filters on `my_ngo()`, which is `auth.uid()`-based, so it returns nothing to anon. `nx_messages_notify`/`nx_notifications_queue`/`nx_messages_check` are trigger functions: the Data API cannot call them. **No exposure.** Hygiene item: revoke EXECUTE on those three from anon. |
| `authenticated_security_definer_function_executable` | 331 | The app's write path by design: every write is an RPC that checks membership inside. |
| `rls_enabled_no_policy` | 18 | Deny-all tables reached only through definer functions or the service role (e.g. `connection_secrets`, `kaju_voice_access`). Correct. |
| `function_search_path_mutable` | 8 | Small helpers (`assign_straypaw_id`, `oh_need`, …). Low risk; pin `search_path` in a future migration. |
| `auth_rls_initplan` (performance) | 42 policies, mostly `nx_*` (Kaju, messages) | `auth.uid()` re-evaluated per row. Matters more on Nano as tables grow; rewrite as `(select auth.uid())`. |
| `multiple_permissive_policies` | 2 (`medical_events`, `nx_kaju_policies`) | Minor performance cost; can be merged. |
| `auth_leaked_password_protection` | Disabled | **Pro-only**: it cannot be enabled on Free. Not enabled today, so nothing is lost. |
| Staging only | `spatial_ref_sys` RLS off, PostGIS in `public`, 43 no-policy tables, `campaign_*` executable by anon | Staging drift with test data only; tracked by OPERATIONS-RUNBOOK → Staging schema drift. |

**Found and fixed in the backup system itself:** a CLI-only restore re-opens every revoked table and function to anon (see the gaps table above). The restore now replays exact privileges and fails if any privilege differs.

## Free plan compatibility

| Feature StrayPaw uses | On Free? |
|---|---|
| Postgres 17 with postgis, vector, http, pg_cron, pgcrypto, uuid-ossp, pg_stat_statements, vault | Yes |
| pg_cron (5 jobs in production, 2 every minute) | Yes |
| RLS, `SECURITY DEFINER` RPCs, Data API, custom schemas | Yes |
| Realtime (4 `nx_*` tables) | Yes (200 concurrent, 2M messages) |
| Storage: 9 buckets, limits ≤ 25 MB, public and private | Yes (50 MB per-file cap); image transformations (Pro-only) are not used |
| Auth: email/password, Turnstile CAPTCHA, custom SMTP if configured | Yes. Session timeboxes, leaked-password protection and SAML are Pro-only and not used. |
| Edge Functions (2, unused) | Yes |
| Session pooler for GitHub Actions (IPv4) | Yes (no IPv4 add-on needed) |
| Branching, PITR, read replicas, log drains, custom domain | Not used |
| Daily backups, no-pause, 7-day logs, email support | Lost; covered above or accepted |

Auth settings live outside Postgres and could not be read from here. Before downgrading, open Authentication → Settings and confirm no Pro-only option is switched on: session timebox, inactivity timeout, single session, leaked-password protection.

## Readiness checklist

**Critical**: all must be true before merging *and* before downgrading.

- [ ] Backup verification (this PR): **production** job green. It proves database restore, Auth, privileges, policies and timings from the downloaded encrypted artifact.
- [ ] Backup verification: **production Storage** covered. Needs `BACKUP_SUPABASE_URL` and `BACKUP_SUPABASE_SERVICE_KEY`.
- [ ] Backup verification: **staging** job green. Needs `STAGING_POOLER_URL`, `STAGING_SUPABASE_URL` and `STAGING_SUPABASE_SERVICE_KEY`.
- [ ] `BACKUP_AGE_RECIPIENTS` set; private key stored offline in two places.
- [ ] `BACKUP_HEARTBEAT_URL` set (healthchecks.io, 1 day + 6 h grace) and its alert reaches your phone or email.
- [ ] After merge: manual **Database backup** run green for both projects, with drill and storage. Its artifact decrypted with your key: `CHECK_ONLY=1 … npm run db:restore -- <artifact>.zip`.
- [ ] Failed $35.64 invoice paid; no overdue balance.
- [ ] Usage page: DB < 350 MB, Storage < 700 MB, Egress < 3.5 GB in the current cycle.
- [ ] Nano-like timings in the drill summary: nothing over 30 s, and no memory kill.
- [ ] Auth settings: no Pro-only option enabled.

**Recommended** (not blocking):

- [ ] Apply `20261123120000_cron_history_retention.sql` (staging, then production).
- [ ] Telegram alert secrets.
- [ ] Revoke EXECUTE on the three trigger functions from anon; pin `search_path` on the 8 flagged functions; rewrite the 42 `auth_rls_initplan` policies.
- [ ] Delete the two unused Edge Functions.

## Further optimisations (not done; product decisions)

- `/animal/[id]` is `force-dynamic` and makes ~17 Supabase queries per view, about 600 views/day (crawlers via the sitemap). ISR with `revalidate = 300` would cut that sharply. The cost: a hidden or edited record could stay visible for up to 5 minutes. Owner's call.
- The performance advisor lists 42 `auth_rls_initplan` and 136 unindexed-foreign-key findings. These are harmless at this size; fix them before data grows tenfold.
- Two unused Edge Functions (`import-jamshedpur`, `import-hyderabad-inaturalist`) can be deleted. Their source is in `supabase/functions`.
- Vercel stays on Pro (Hobby is for non-commercial use only). Deployment Storage is its largest usage line (~$0.08/day across the team's 10 projects). A deployment retention policy (Project → Settings → Security → Deployment Retention) trims it.
