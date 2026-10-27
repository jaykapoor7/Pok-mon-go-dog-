# CareOS verification evidence

Branch: `codex/whatsapp-careos-v1`. Baseline: `e7a90fbb99086f3075c862ea5521ee6c049e7763`.
Inspected and tested 2026-10-27. No production migrations, data writes, secret
changes, merge or deployment were performed.

## Completed checks

- `npm run test:careos`: **38 checks passed**. Actual PostgreSQL/PLpgSQL executes
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

## Not established by these tests

- No real Meta test-number conversation has occurred. Only identifiers were
  provided; the App Secret, WhatsApp access token, recipient verification and
  callback subscription are missing.
- Voice provider calls and structured extraction have not been exercised live.
  Their implementations use the installed AI SDK 7 APIs and live-catalog model
  IDs, but require configured AI Gateway authentication and model variables.
- Hosted Supabase Auth/PostgREST/Storage, the complete production trigger/RLS
  environment and authenticated dashboard rendering need isolated hosted staging
  verification. Local database tests are not a substitute for those services.
- No safely configured hosted staging deployment was available. Automatic branch
  deployment is disabled to prevent inherited production credentials being used.
- A scheduler, real routing areas, linked staff and approved out-of-window utility
  templates must be configured in staging.

The user's definition of done, a real Meta conversation completing the workflow
in hosted Supabase and the dashboard, remains blocked by this external setup.
Use [WHATSAPP.md](WHATSAPP.md) for exact variable names and Meta actions. Do not
click production Verify and Save or approve a production rollout on this evidence.
