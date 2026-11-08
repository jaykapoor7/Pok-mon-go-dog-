# Pilot infrastructure audit — 2026-11-08

**Scope:** Read-only checks against the connected Supabase production and staging projects, Vercel project, and GitHub source. This PR adds a supplemental health-probe script/workflow, a targeted public-aggregate cache/logging mitigation, and this audit report. **No production database, production configuration, DNS, secrets, or live services were changed.**

This is an engineering risk inventory, not a claim that any partner pilot is approved or deployed. The BeST / Bengaluru engagement is still subject to a written agreement and verified data governance.

## Immediate findings

| Area | Verified observation | Next action |
|---|---|---|
| Production logs | Vercel reported errors from `/community/organisations` (twice), `/community/stories`, and a route triggering the published-story cache within the preceding 24h. | Reproduce in the deployed runtime, capture safe PostgREST error codes, and fix slow/failed database reads without leaking record data. |
| Public org impact RPC | `list_public_org_impacts()` is intentionally callable by `service_role`, **not** `anon`. A production `EXPLAIN ANALYZE` returned approximately 10.49 s on the first call and 1.45 s on a repeat. The underlying aggregate query took ~386 ms in a separate run. This is variable performance, **not proof of a particular root cause**. | Profile the deployed PostgREST call and Postgres plans/timeout logs. Preserve service-only permission. Do not solve by granting anonymous access, raising global timeouts, or returning invented zeros. |
| Database parity | 134 recorded production migrations vs 97 staging. Excluding extension-owned functions, production has 289 application-function signatures, staging 320: **59 production-only, 90 staging-only, 57 shared signatures with differing definitions**. These are *differences*, not 206 confirmed defects. | Classify every difference by feature/environment and compare exact deployed function definitions against version-controlled migrations. Reconcile only functions actually required for the pilot. |
| Map parity | `list_public_spatial_cities` has different return shapes: production includes additional care/vaccination/sterilisation counts; staging uses a reduced shape. `scripts/staging/public-map-parity.sql` intentionally has a staging-only contributor-view stub. | Align the public API contract for the pilot where feasible, or clearly label/guard staging limitations. Never copy the staging-only SQL to production. |
| Security advisors | Production reports 18 `security_definer_view` findings, 14 anonymously executable definer functions, and other privilege advisories; some public views are documented intentional. Performance advisor reports 9 `auth_rls_initplan` findings and 1 multi-permissive-policy finding. | Review the exact public data contract and anonymous RPC scope, inspect role checks and `search_path` per function. Do not blindly change view invoker mode or revoke legitimate public reads. |
| Staging invite functions | Some staging-only definer functions (`resolve_access_code`, `resolve_invite_code`) can return invite metadata when supplied a valid code and are callable by `anon`. This may be intentional onboarding behaviour. | Review code entropy, guessing/rate limits, expiry, and response privacy before sharing the public demo. No confirmed exploit was established. |
| Demo domain | `demo.straypaw.org` is attached to Vercel's `demo` branch and Vercel marks its project domain verified, **but** its external DNS check reports `misconfigured: true`. Cloudflare is authoritative. | In Cloudflare add/verify a DNS-only `demo` CNAME to the value currently recommended by Vercel, then check resolution and access. |
| Database location | Production Supabase is `ap-northeast-2` (Seoul); staging is `ap-south-1` (Mumbai). App deployment `vercel.json` currently uses `icn1`. | Get a written decision on municipal pilot data residency, access, transfers and retention before moving live data. Do not migrate automatically. |
| Backups | Runbook describes daily database backups but the connection does not expose plan retention or restore settings. Storage photos/evidence are not covered by database backups; weekly object backup is still proposed. | Confirm plan retention, configured schedules, object-storage export destination, encrypted access, and perform a staging restore drill. |
| Authentication | Supabase Auth leaked-password protection still requires verification in the dashboard. | Enable if available for the project, then test signup/password reset. |
| Monitoring | Deep check exists at `/api/health?deep=1`; no independent, verified 5-minute alerting destination was available from these connections. | Provision external uptime alerts to at least two human contacts. The new GitHub check is supplementary only. |

## Safe improvements delivered in this PR

- `src/lib/org-public.ts`: raises the public, non-sensitive organisation aggregate cache revalidation interval from 60 to 300 seconds (as already documented in `docs/DATABASE.md`) to reduce recurring expensive RPC calls; logs only the PostgREST error **code** on a failure, without dumping response details. This mitigates load and improves diagnosis; it does **not** prove the timeout/root cause is solved.


- `scripts/ops/probe-health.mjs`: probes HTTPS `/api/health?deep=1`, verifies **both** `status=ok` and `database=ok`, has a ten-second network timeout and retries once after thirty seconds. No secrets or payload data logged.
- `.github/workflows/production-health-probe.yml`: hourly best-effort scheduled check plus manual dispatch, checkout pinned to a specific action SHA, no GitHub write permissions.

**Important:** GitHub scheduled workflows can be delayed/skipped; a failed workflow is *not* guaranteed to page an operator. Use an independent external monitor at five-minute intervals with verified push/email/SMS routing. The workflow becomes active only after merge to the default branch.

## Required pilot gate before calling it ready

1. Reproduce and resolve production public-route errors. Inspect Supabase timeout logs and Vercel function logs. Repeat performance tests under service-role API constraints, not only as SQL-editor `postgres`.
2. Build a versioned function-signature/definition inventory for both environments. Reconcile high-value ABC claims/reviewer functions and spatial functions without copying all staging-only `careos` and `sd` code into production.
3. Security-test representative anonymous, NGO, vet, researcher and municipal identities on both datasets. Audit privileged RPCs before modifying grants.
4. Verify the demo domain from an unauthenticated network and prove demo uses only staging data. Keep illustrative records clearly labelled.
5. Confirm backups, retention, encryption, object backups and restoration. Turn on leaked-password protection and external alerts.
6. Obtain partner decisions on data residency, research exports, clinical bite guidance, WhatsApp/provider approvals, and scanner testing.
7. Keep Kaju production inference off until named approval, budget ceilings, provider key and a reviewed data route are explicitly supplied.
8. Record actual CI run, deployment SHA, production health, and field verification evidence. Staging acceptance of illustrative claims must never be presented as a real municipality accepting a package.

## Evidence locations

- Code: `src/lib/org-public.ts`, `src/lib/community-case-stories.ts`, `src/app/api/health/route.ts`
- SQL: `supabase/launch-org-impact-index.sql`, `scripts/staging/public-map-parity.sql`, `supabase/migrations/`
- Operational docs: `docs/OPERATIONS-RUNBOOK.md`, `docs/SECURITY-DEFINER-VIEWS.md`, `docs/SHAPEOS-READINESS.md`
- Provider dashboards: Vercel runtime logs; Supabase Security/Performance advisors; Supabase Database Backups; Cloudflare DNS

**Audit limitation:** Catalog hashes/rowcounts and Vercel logs are point-in-time observations. Initial and repeat timings varied. The audit did not inspect live credentials, execute destructive statements, alter privilege grants, or certify an external clinical/policy requirement.

## Follow-up pass (same day)

**Dashboard visibility.** Production serves the current application code. In production, two things stop people seeing the new dashboards:
- **No reviewing office.** Production has no review office and no reviewer (0 rows in each), so nobody can open the office command Overview at `/city/insights`. It appears once an office and a reviewer membership exist.
- **Field staff on phones.** Six of the seven NGO memberships are field `member` accounts. On phones, the redesigned Today hid its status strip and summary line from members and vets. That rule is removed, so every role now sees them.

The service worker is not the cause: it caches only hashed static assets and the offline shell.

**Public read errors.** `/community/organisations` and `/community/stories` time out for two reasons:
- `list_public_org_impacts()` calls the non-inlinable `is_care_register_record()` once per case, about 23,200 calls. It took 1.4–10.5 s on the shared instance.
- `public_case_stories` sorts every case before returning 25 rows, taking 2.6 s.

`supabase/migrations/20261108100000_public_read_performance.sql` fixes both. It inlines the filter (same results: on production, 8 rows before and after, 0 differences by EXCEPT) and adds a matching index. It is applied to staging and **not to production, pending owner approval**. Until then, the 300 s cache from this PR absorbs most of the cost.

**Function drift** (production versus staging, by name):
- **Missing in production:** only `careos_enqueue`, which belongs to the blocked WhatsApp channel and stays unapplied.
- **Missing in staging:** 32 functions the app calls. The nine needed for the demonstration's record, document, care and cost flows were copied from production, identical (`scripts/staging/record-function-parity.sql`).
- **Staging-only:** `careos_*`, `sd_*` and `founder_*` are prototypes, not pilot-critical.
- **Production-only and never in migrations:** documents, tasks, fundraisers, vet camps, stories, place search and similar. Bringing these into migrations is a separate, owner-approved task.

**Advisors.** Every finding is either intentional (security-definer public readers with fixed `search_path`, public views by design) or already listed above. The exception is leaked-password protection, which is off and is an owner switch in the Supabase dashboard.

**Demonstration label.** Any build that points at the staging database now shows "Demonstration · illustrative records" in the top bar of every signed-in screen ("Demo" on phones). Production never shows it.
