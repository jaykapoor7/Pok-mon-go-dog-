# StrayPaw continuation — security and authenticated journeys

Final follow-up results and owner actions: [release handoff](RELEASE-2026-11-01.md). Later results there supersede the pending checks below.

This supplements the earlier continuation. It supersedes its deployment, security, rate-limit and authenticated-workflow status. Historical-data cleanup remains unapproved and was not executed.

| Area | Verified | Incomplete or externally blocked |
| --- | --- | --- |
| Previous deployment | ae15736d READY; 949ab452 superseded; canonical production browser suite 33 passed, 1 device skip | New changes below need their own deployment check |
| ABC operations | Isolated staging: 64 RPC/storage checks, 24 permission checks; 30 actual desktop/phone browser journey checks | Production reviewing office and approved reviewer onboarding remain owner tasks |
| Kaju actions | 11 existing audited-write checks; 22 confirmation/idempotency/isolation checks using real sessions | Live model/Gateway response and hosted multi-step journey still require verification |
| Recurring checks | 10 real-session checks; six explained rules, scoped append-only snapshots and lead-supplied deadline | Production scheduled invocation has not been observed; no external notification delivery claim |
| Database security | Staging tested before production; 15 authenticated/anonymous checks | Remaining intentional public projections and password-policy advisory below |
| Explorer | Canonical art identity and existing placements preserved | Articulated texture rig and visual/motion review in progress |
| Documents/connections | Native format library tests passed in prior release; reviewer exports pass actual browser journey | New native HTTP round-trip checks pending; external provider credentials absent |

## Applied database changes

Applied the first three new migrations to staging, tested them with isolated new users and organisations, then applied the same final SQL to production. No production customer records were edited or removed. The migrations add tables, permissions, guarded functions and append-only audit/check records.

- Operational anonymous writes now require an authenticated actor. Anonymous table mutation grants and unsafe administrative/maintenance function execution are revoked. Public read projections retain SELECT and receive security barriers; projection write grants are revoked. Anonymous telemetry remains intentional and is not operational write access.
- Shared rate limits now fail closed, validate parameters, lock concurrent windows and return an explicit boolean. Authenticated callers use a fixed policy tied to `auth.uid()` and cannot choose arbitrary buckets or limits. Counter rows are not deleted in this work.
- Four existing Kaju actions use a transactional, session-scoped confirmation RPC. The request ID and payload hash prevent double writes on retry. A separate source/audit read is required before the API reports verified success. Medical authorisation and municipal acceptance remain human workflows.
- Six recurring rules cover overdue follow-ups, missing ABC evidence, pending veterinary authorisation, municipal clarification, programme record inactivity and a lead-supplied reporting deadline. Findings include explanation, sources, sample cap and rule version. `/api/admin/kaju/checks` is scheduled daily at 04:00 UTC; it requires the existing cron secret and processes at most ten due organisations. It does not send messages or approve work.

Staging lacked production location wrappers and several map RPCs/projection fields. These existing production read paths were restored only to staging. Migration filenames mark these parity repairs. Existing production definitions were inspected before reuse; no production historical-data cleanup was included.

Production postchecks confirm anonymous feeding/comment/log/like writes and arbitrary authenticated rate policies are denied, while public animal/map reads remain available. Remaining advisor findings include 18 definer-view projections, 14 anonymous definer functions and disabled leaked-password protection. These are not all equivalent vulnerabilities: public privacy projections intentionally execute with the owner privileges needed to avoid exposing private base tables. `connection_secrets` intentionally has RLS without client policies. Enable leaked-password protection through Supabase Auth settings after checking the project's supported plan/configuration.

## Authenticated staging evidence

New random test accounts, two organisations and a reviewing office are labelled `STAGING TEST`; organisations use demo mode. Session/password material is private in `/tmp`, excluded from Git, screenshots and reports. Existing users and production data were not changed. Fixture-aware scripts preserve legacy environment-based usage.

`scripts/staging/browser-journey.mjs` passed 30 checks across desktop and phone. It creates a case through the UI, uploads four actual private evidence files, records release location, verifies role-separated veterinary authorisation and operator approval, submits a package, downloads and parses reviewer PDF/XLSX containing the actual case, completes clarification and acceptance, then independently reads the accepted status and audit thread. Another organisation receives HTTP 403 for that export. Evidence is explicitly fictional test material, not a verified clinical outcome.

Real session scripts: `abc-workflow-check.mjs` 64, `roles-evidence-check.mjs` 24, `ai-write-check.mjs` 11, `confirmed-action-check.mjs` 22, `insights-check.mjs` 10, `security-check.mjs` 15. These results demonstrate staging behaviour; they are not a production customer-readiness certificate.

The initial broad authenticated navigation audit passed 62 of 70 checks. Failures exposed missing staging map/report reads (repaired; targeted recheck pending) and import configuration (still blocked). A later recheck was interrupted because a concurrent local build replaced the running server's chunk files; its MIME/chunk errors are invalid release evidence and will be rerun with a stable server.

## Environment isolation and owner dependencies

Preview previously inherited production database admin, admin/cron and email credentials. Removed Preview targets while preserving Production targets. Preview now defaults to the staging public URL/key. No secret was decrypted, copied or printed. The owner must set the staging project's own `SUPABASE_SERVICE_ROLE_KEY` in the primary Vercel project's Preview environment to test server-side imports. Do not copy the production key.

Gateway authentication is added through Vercel's deployment identity, preserving direct Anthropic configuration. An available Gateway credential does not prove an actual successful model call. Verify `engine: model`, real tool results, sourced follow-ups and confirmed-action readback on the hosted deployment before marketing natural model-backed chat as live. Provider funding/credits may still require owner setup.

External Connections remain unavailable without their OAuth/application credentials and encryption key. No external email, chat, calendar or SMS was sent. Provider acknowledgement copy no longer asserts delivery. WhatsApp remains disconnected. Exact provider setup is in [Connections](../CONNECTIONS.md).

Do not market external Connections, autonomous clinical verification, observed scheduled production execution, complete Explorer motion, resolved public-data provenance or full customer readiness until the corresponding end-to-end checks are recorded.
