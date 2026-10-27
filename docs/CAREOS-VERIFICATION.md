# CareOS verification evidence

Branch: `codex/whatsapp-careos-v1`. Baseline: `e7a90fbb99086f3075c862ea5521ee6c049e7763`.
Inspected and tested 2026-10-27. No production migrations, data writes, secret
changes, merge or deployment were performed. Existing isolated staging Supabase
was restored and four CareOS migrations were applied there.

## Completed checks

- `npm run test:careos`: **44 checks passed**. Actual PostgreSQL/PLpgSQL executes
  locally through PGlite against synthetic records. Includes the current case
  classifier/trigger and `org_case_facts` dashboard projection, inspected from the
  existing source/catalog. Meta HTTP responses are controlled test doubles;
  Supabase RPC calls are adapted to local SQL in this suite.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, including all three new API surfaces and the native
  route export validation. No production credentials were loaded for the build.
- `e2e/careos.spec.ts`: **8 checks passed**, four on desktop and four on mobile,
  against the production Next.js server on localhost. Confirms exact plain-text
  challenge, token rejection, invalid HMAC rejection, safe disabled-state 503,
  protected worker/media endpoints and signed-out NGO UI gates.
- Existing regressions passed: case INR validation, 33 SQL RPC argument mappings,
  contact delivery (no email sent).

The standard Chromium download failed in this execution environment. The local
browser tests were completed using the matching Chromium 153 serverless binary
obtained in scratch; no browser package was added to the application's dependencies.

## Database workflow exercised

Signed report → durable receipt → consent → description → GPS → urgency →
confirmation → routed existing case and private inbox → staff acceptance →
assignment → explicit animal link → rescue → treatment/vaccination/sterilisation →
INR expense → follow-up → completion → closure → citizen notification → reopening.

The suite also exercises wrong WABA/phone IDs, raw-body tampering, duplicate
events, cross-NGO reads/writes/assignments/animal links, membership revocation,
unverified NGOs, anonymous RPC denial, voluntary opt-out during rate limiting,
private storage under a permissive legacy policy, uncovered-area recovery,
message ordering, stale leases, idempotent expense requests, daily digests,
follow-up reminders, escalation, early/out-of-order delivery receipts, bounded
429 retries, permanent/ambiguous send failures and media host/size checks.

## Hosted staging database evidence

`ucxfxiddufwqithtdtix` was restored to ACTIVE_HEALTHY. Four migrations applied:
core transport, linked-record isolation, attachment/queued-access fixes, and
existing-dashboard synchronization. Older staging's missing case/animal columns
were added without rewriting its records. Supabase MCP records migration versions
at application time; match by migration name/content, not a bulk replay of the
repository's entire historical migration directory.

`scripts/verify-careos-staging.sql` passed against actual hosted PostgreSQL,
including existing triggers/RLS. It exercised guided intake and duplicate events,
real case creation, acceptance/assignment, explicit animal link, rescue, treatment,
vaccination, sterilisation, expense, follow-up completion, closure and a pending
citizen outbox row. The actual legacy dashboard `add_case_note` RPC produced a
private audit and neutral reporter notification; its private note never entered
that notification. Own NGO `org_case_facts` included the case; foreign NGO and
anonymous table/projection access and foreign mutation were rejected.

All synthetic changes rolled back. Before and after counts are identical:

| Existing staging records | Before | After |
| --- | ---: | ---: |
| Animals | 3 | 3 |
| Cases | 2 | 2 |
| Animal timeline events | 4 | 4 |
| Follow-ups | 2 | 2 |
| Medical events | 2 | 2 |
| CareOS inbox/outbox | 0 / 0 | 0 / 0 |

This does not exercise hosted HTTP Auth, PostgREST, Storage or an authenticated
browser. No WhatsApp message was sent. See the full scope and explicit unfinished
gates in [CAREOS-FEATURE-CHECKLIST.md](CAREOS-FEATURE-CHECKLIST.md).

## Deployment audit fixes

- CI's dependency audit identified a critical Next/Sharp issue and high-severity
  dependencies. Next is now at least 15.5.28, with patched transitive dependencies,
  PostCSS 8.5.32 and official SheetJS 0.20.3. `npm audit --omit=dev` reports zero
  vulnerabilities. Existing NGO import regression tests cover the SheetJS change.
- Legacy definer RPCs cannot bypass isolation for newly linked CareOS records.
- A captionless attachment survives the request for a typed description.
- Queued private staff replies are blocked if membership, link or assignment
  access is revoked before claiming the send.
- Website writes now synchronize audit and neutral status notifications; bot
  commands suppress duplicate trigger notifications. Existing unrelated workflows
  are retained.
- Long report confirmation uses complete text rather than an invalid oversized
  interactive body. Template parameters normalize whitespace.
- NGO Work uses assignee user IDs for Mine, with a legacy-name fallback. The
  selected WhatsApp report and its notes refresh without clearing a typed decline
  reason on every poll. Authenticated hosted rendering remains unverified.
- Health requires own-NGO delivered/read evidence; a successful send API response
  or enabled routing area alone cannot claim connection.

## Not established by these tests

- No real Meta test-number conversation has occurred. Only identifiers were
  provided; the App Secret, WhatsApp access token, recipient verification and
  callback subscription and the two-recipient test workflow remain unverified.
  Meta now explicitly restricts the selected WABA pending business verification.
- Voice provider calls and structured extraction have not been exercised live.
  Their implementations use the installed AI SDK 7 APIs and live-catalog model
  IDs, but require configured AI Gateway authentication and model variables.
- Hosted Supabase Auth/PostgREST/Storage, the complete production trigger/RLS
  environment and authenticated dashboard rendering need isolated hosted staging
  verification. Local database tests are not a substitute for those services.
- Fresh Vercel staging project lookups return 404, and the current connected team
  lists only production. No safely configured hosted deployment was available. Automatic branch
  deployment is disabled to prevent inherited production credentials being used.
- A scheduler, real routing areas, linked staff and approved out-of-window utility
  templates must be configured in staging.

The user's definition of done, a real Meta conversation completing the workflow
in hosted Supabase and the dashboard, remains blocked by this external setup.
Use [WHATSAPP.md](WHATSAPP.md) for exact variable names and Meta actions. Do not
click production Verify and Save or approve a production rollout on this evidence.
