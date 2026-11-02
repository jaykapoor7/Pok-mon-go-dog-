# Kaju polish and reliability — 2 November 2026

This pass preserves the production agent, blue-and-white interface and Explorer artwork. No providers, model upgrades, clinical approvals or silent external actions were added. WhatsApp/CareOS remain untouched and disconnected. No historical production data was cleaned.

## Evidence and gaps

| State | Capability |
| --- | --- |
| Existing, verified | Isolated staging NGO → veterinary → municipal journey on desktop and phone: four evidence uploads, authorisation, operator review, submission, query/answer/acceptance, PDF/XLSX downloads and independent audit/RLS checks (30 assertions). |
| Implemented, staging verified | Scope-keyed conversations; contextual record/checklist reads; ambiguous write clarification; reviewed notes with transactional confirmation, duplicate prevention and source/audit readback. The new nine-check browser journey includes reload receipt recovery and another actor/organisation denial. |
| Implemented, verified locally | Cancellation, bounded provider use, malformed reply rejection, safe sources, expiry recovery, keyboard focus and reduced motion. Articulated gait, posture transitions, eye blinks and offscreen pauses refined. |
| Existing, observed in production | Two service-authored daily snapshots at 04:34 UTC on 2 November, all six rules, no human actor. This matches the configured job window; no platform invocation trace was retrieved. |
| Externally blocked | Private-text model processing requires owner confirmation of an approved data-processing route. Staging imports require the staging service key in Preview. Real Connections depend on account credentials and provider approval. |
| Incomplete | Native iOS/Safari inspection and owner acceptance of the generated 2D artwork against the original sheet. Do not claim pixel-exact reproduction or complete character approval. |

## Changes

- Conversation storage uses server-verified user, organisation, role and reviewing-office scope. Changed access hides stale text and aborts pending replies. Legacy user-only history is discarded rather than transferred between organisations.
- Stable conversation scroll, contextual prompts, one visible thread, keyboard focus restoration, stop/retry controls, model/record-tool attribution, safe sources and complete proposal text. Responses are buffered; the interface does not simulate token streaming.
- Private workspace text cannot reach an external model unless `STRAYPAW_AI_APPROVED_DATA_ROUTE` exactly matches the configured transport/model. The flag remains unset in this release. Only an exact, single-message public greeting can reach the existing provider without it. Private record checks, sources and confirmed writes remain available inside StrayPaw.
- Selected-case reads are tenant-filtered and use the real ABC checklist. Ambiguous notes/follow-ups show matching records instead of choosing one. Numeric audit identifiers are normalized. Reloading a confirmed proposal reads its receipt without replaying its write.
- Findings show explanations, source links, timestamps and unknown values. Dashboard refresh follows a real operational check. Notifications and business actions remain reviewable.
- `20261102053715_kaju_calendar_daily_checks.sql` changes only the due-run predicate to a UTC calendar day. Yesterday's afternoon check no longer suppresses today's schedule. Batch caps and service-only permissions remain. Transaction tests verify yesterday/today behavior and anon/auth denial; temporary test data was rolled back.
- Existing PNGs remain unchanged. Four phased walking contacts, diagonal trot pairs, articulated knees/ankles, crossfaded postures, clipped eye blinks and calmer transitions use the retained rig. Hidden/ambient-off/reduced-motion states stop loops.
- Public-page muted labels and inline links receive contrast/underline fixes without redesigning the hero or layout. Illustrative workflows are labelled as examples.

## Tests before hosted release checks

| Check | Actual result |
| --- | --- |
| Production build, lint, TypeScript | Passed; rerun after any further source changes. |
| Kaju contracts | 12: scope/fail-closed reads, private-route gate, cancellation, provider error/malformed response, safe citations/proposals, unknown counts, numeric audit IDs. |
| Existing reliability / native files & Connections / export isolation | 21 / 33 / 4 passed. Provider tests use isolated fakes; they do not establish real external account availability. |
| Relevant desktop/phone browser regression | 67 passed, 3 intentional skips; the final focused suite passed 14 including both phone/desktop timeout cases. |
| Real staging confirmed actions / roles & evidence / security | 22 / 25 / 15 passed. |
| Real staging new Kaju journey | 9 passed: verified role/scope, forged-scope rejection, selected record/checklist, cross-org denial, prepare-before-confirm, double-submit lock, independent exact note/audit read, reload receipt, other-actor receipt denial. |
| Full authenticated ABC browser journey | 30 passed across desktop/phone, including actual exported package content. |
| Account switching / dashboard refresh | Passed with isolated staging sessions. |
| Character harness | All 23 states hydrate and load actual artwork; walking phases/knees, measured stance contacts and reduced-motion suppression passed. |

Evidence logs/screenshots are local under `/tmp/kaju-polish-*` and `/tmp/straypaw-rig/`; no customer sessions or credentials are committed. Chromium phone widths do not establish native Safari compatibility. Existing staging advisor findings include intended public privacy projections, PostGIS reference data/functions and disabled leaked-password protection; this pass does not claim a zero-finding database audit.

## Owner actions and marketing limits

1. Confirm the private-data processor/route and contractual approval before setting the exact route flag in Vercel. A configured gateway credential alone is not approval. Do not market private natural-language model chat as enabled while the flag is unset.
2. Set the **staging** project's service-role key in **Preview only** for staging imports. Never copy the production key into Preview.
3. Complete provider-owned OAuth/SMS setup and real account tests before advertising those Connections as live. WhatsApp stays disconnected.
4. Review Kaju on an actual iPhone and compare with the original reference. Existing generated textures are derivatives.
5. Historical-data cleanup still requires separate owner approval. No cleanup is included here.

Hosted deployment and final checks will be appended after verification.
