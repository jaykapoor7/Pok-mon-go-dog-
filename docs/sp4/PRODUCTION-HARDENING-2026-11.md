# StrayPaw production hardening pass (1 November 2026)

What was checked, what was found, what was fixed, and what still depends on
something outside the codebase. WhatsApp/CareOS was deliberately left alone
and stays labelled **not connected**.

## 1. Database: release activation and new migration

### 1a. ABC release migration (`supabase/proposed/2026-10-31-release.sql`), applied to production

| Safety check | Result |
|---|---|
| Same as the staging migration | 16 function bodies hash-identical to staging (`fb37327c…`) |
| Additive only | No drop, delete or truncate. Updates touch only the new tables, inside the new functions |
| Overwrites nothing | None of the 16 functions, 5 tables or 5 triggers existed in production |
| RLS not weakened | RLS enabled on the 5 new tables only; the 63 existing policies are unchanged (same hash) |
| Recovery path | `2026-10-31-release.rollback.sql`. Staging dependency check: nothing outside the release depends on its objects, so the rollback drops cleanly |
| Backup | Supabase Pro plan daily backups. The available tools cannot list them, so confirm today's backup in the dashboard |
| Existing records unchanged | Before and after hashes are identical for cases (23,200), dogs (30,288), case_updates, ngo_members, animal_followups, medical_events, operational_audit_log, campaigns, ngos, policies, functions, triggers, RLS flags and grants |

Live production workflow test, run as real roles inside one transaction that was then
rolled back (afterwards: 0 test organisations, 0 test users, counts unchanged).
**28/28 passed:**

- **Case creation:** a field member's case is created as `operator_created`; the create writes an audit row; an AI-marked note writes `ai_assisted_insert` naming the person; follow-ups are audited; `org_followup_scope_counts` works.
- **Evidence rules refused:** a photo without a file; review before the evidence is complete; authorisation by a non-vet; review by a vet; any read or write from another organisation; direct inserts into sign-off records.
- **Return and approval:** a returned record shows in the queue, then is approved.
- **Packages:** a reviewer cannot see a draft; the operator cannot accept their own package; a submitted record is locked; an outsider can neither see nor accept.
- **Reviewer:** sees the submitted package, its cases and its sign-offs; raises a query, the operator answers, the reviewer accepts.
- **Case outcome:** the checklist then shows government accepted, and the case history has 13 entries.
- **Anonymous:** refused.

### 1b. Roles and evidence photos (`supabase/proposed/2026-11-01-roles-and-evidence.sql`)

Found: production `set_member_role` accepted only member, admin and field_worker. **Nobody
could be made a veterinarian or coordinator**, so the ABC workflow could not be used for
real. Fixed, and applied to staging first, then production:

- **Roles:** leads can now assign Veterinarian and Coordinator. The last lead cannot be demoted, and every change is written to `operational_audit_log`.
- **Evidence storage:** a private `abc-evidence` bucket. Uploads are allowed only into `<own org>/<own case>/`, with no overwrite, no client delete and no public URL. Reviewers can read files only for cases in packages submitted to their office.
- **Admin lookup:** `admin_user_id_by_email` is callable by the service role only.
- **Staging:** 24/24 checks with real sessions (`scripts/staging/roles-evidence-check.mjs`).
- **Production:** function bodies are identical to staging, and the rolled-back production check passed 9/9. Existing members are unchanged (same hash). The previous definitions are saved in `…previous.sql`.

### 1c. Data cleanup: proposal only, not executed

`docs/sp4/CLEANUP-PROPOSAL-2026-11.md`, with its SQL and exact rollback. It covers:

- 27,857 research-dataset animals to be scoped out of operational figures;
- 2,280 imported cases to be relabelled from `verified` to `source_record`;
- 2 mislabelled organisation cases.

Nothing is deleted. It needs separate approval.

## 2. Product features added

| Feature | Where | Verified |
|---|---|---|
| Assign Veterinarian / Coordinator | NGO → Team (leads) | Staging UI: role list shows both; DB rules 24/24 |
| Evidence photo from the phone camera or files (private, linked to the case) | Verification → case → Evidence | Staging UI on a phone: upload → "Capture photo added", count rose, file opened through a signed link |
| Reviewing offices: create, rename, add or remove reviewers | Moderation console → Setup → Reviewing offices (`/api/admin/offices`, ADMIN_SECRET) | Build, types, audit rows; API refuses without the secret (503/401) |

## 3. Website and app audit

- **Route crawl** (`scripts/qa/crawl.mjs`): 142 routes (102 listed plus 40 discovered through links) at desktop 1440, tablet 834 and phone 390, giving 426 page loads. Every internal link (308) was checked. Results are in `docs/sp4/qa/ROUTE-CRAWL.md`.
- **Clipped text on phones** (`scripts/qa/clip.mjs`): every route at 390px wide.
- **Signed-in role QA on staging** (`scripts/qa/roles-qa.mjs`): admin, coordinator, veterinarian, municipal reviewer and a community account with no organisation, every sidebar destination at desktop and phone. Screenshots are in `docs/sp4/qa/roles/`.

Signed-in role QA result (final run, commit d286268): **58/70 page checks passed, and every
workflow check passed** (team roles, phone photo upload and signed link, vet sees no approve
action, StrayPaw AI answers from records). The other 12 are environment-only and come from
the local staging copy, not the product:

- map and spatial APIs answer 503 because staging has no spatial cache or service key;
- Import answered 401 because the copy has no service key. It now says 503 "not configured"
  instead of asking the user to sign in.

### Issues found and fixed

| # | Severity | Issue | Fix |
|---|---|---|---|
| 1 | Critical | No way to make anyone a veterinarian or coordinator in production, so the ABC workflow was unusable | Roles migration and Team UI |
| 2 | High | Evidence could only be attached as a pasted link, with no photo upload | Private bucket, camera or file upload, signed links |
| 3 | High | Reviewing offices could only be created with SQL | Console section and API |
| 4 | High | Phone: product demo cards on `/`, `/ai`, `/abc-operations` and `/for-governments` were cut off at both screen edges | Fluid fragments; panel aspect ratio dropped on phones |
| 5 | Medium | Verification and Report packages called the database while signed out (401s in the console) | Wait for membership before reading |
| 6 | Medium | NGO Settings "Your public page" linked to `/orgs/<slug>`, which returns 404 | Links to `/community/organisations/<slug>` |
| 7 | Medium | Public map: the Jamshedpur clinical register (2013–16) and the Ranchi campaign (2014–15) were not labelled as historical | Labels now say "Historical … (years)" |
| 8 | Low | `/mission` had no h1 | Added |
| 9 | Low | Import said "sign in" when the server key was missing | Says "not configured" (503) |
| 10 | Staging only | `documents` was not readable by signed-in users on staging (production was correct) | Staging grant aligned |

### Not defects (checked)

- `/_vercel/insights/script.js` returns 404 on local builds only; Vercel serves it in production.
- Map and spatial APIs answer 503 on the staging copy, because staging has no spatial cache or service key. They answer 200 on the production build.

## 4. StrayPaw AI

- **Code:** with `ANTHROPIC_API_KEY`, Claude runs a tool-use loop. Without it, a deterministic tool router answers from the real records, and the reply says that free-form answers are off. Reads use the caller's own session, so RLS applies. Writes are proposals only, confirmed by a person. A database trigger writes `ai_assisted_insert` audit rows (verified live in production, see 1a).
- **Production (Vercel `pok-mon-go-dog`):** `ANTHROPIC_API_KEY` is **not set**, so production runs the record-tools engine only. To turn on full answers, set:
  - `ANTHROPIC_API_KEY` (required): an Anthropic API key with billing enabled.
  - `STRAYPAW_AI_MODEL` (optional): defaults to `claude-opus-5-5`.

  Then redeploy. Nothing else is needed: Supabase URL and anon key are already set.
- **Permissions:** an anonymous caller gets public-only data. A forged token gets 401. A member gets their own organisation's records under RLS (staging 11/11, production live test).

## 5. Automated tests

| Suite | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | Clean |
| ESLint | Clean |
| Production build | Clean |
| Unit / integration scripts (`scripts/test-*.ts`, 22 files) | 22/22 pass |
| `check:fixtures` | Clean |
| Playwright e2e (desktop and mobile) | 185 passed, 9 skipped (see below): full suite 180 + 8 skipped, then the extended ABC spec 13 + 1 skipped |
| Staging ABC workflow (`abc-workflow-check.mjs`) | 55/55 (previous run; schema unchanged since) |
| Staging AI writes (`ai-write-check.mjs`) | 11/11 (previous run) |
| Staging roles and evidence (`roles-evidence-check.mjs`) | 24/24 |
| Production rolled-back live tests | 28/28 ABC; 9/9 roles and storage |

Skipped e2e tests and why:

- `launch.spec` needs the deployed https site; it is run against production after deploy.
- Desktop-only or phone-only navigation tests are skipped on the other project.
- The reporting send test skips where Turnstile, the live human check, cannot be passed by a test.

## 6. External blockers (not code)

1. **StrayPaw AI full answers:** add `ANTHROPIC_API_KEY` in Vercel production (section 4).
2. **WhatsApp / CareOS:** deferred by decision. It stays labelled not connected until Meta verification and real-message tests pass.
3. **Data cleanup:** proposal ready; needs the owner's approval (section 1c).
4. **First reviewing office and reviewers:** must be created in the console with real government contacts. None are invented.
5. **Backups:** confirm today's Supabase backup in the dashboard; the tools cannot list backups.
