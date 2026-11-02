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
| Kaju contracts | 14: scope/fail-closed reads, private-route gate, cancellation, provider error/malformed response, safe citations/proposals, unknown counts, numeric audit IDs and honest exported findings. |
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
6. Provision the real municipal reviewing office and reviewer assignments before a production municipal pilot. The 2 November read-only production check found neither configured; staged acceptance is not production acceptance.

## Final local candidate checks

Application commit `379985c7` passed the final production build, lint and TypeScript checks. All 15 homepage, AI, assistant, NGO and municipal placements passed Chromium page-error, horizontal-overflow and axe WCAG A/AA checks across 1440px desktop, 834px tablet and 390px phone. Authenticated pages waited for loaded content. The real nine-check Kaju journey passed again on this built candidate. Character screenshots were inspected against the original reference, including all 23 hydrated states; the paw-ground geometry assertion passed. This does not establish native Safari or owner art acceptance.

[PR #45](https://github.com/jaykapoor7/Pok-mon-go-dog-/pull/45) carries the branch. Hosted preview `f616bced` reached READY. Its real nine-check authenticated Kaju journey and all 15 desktop/tablet/phone visual/accessibility checks passed again through Vercel protection, using only isolated staging sessions. Actual native HTTP document checks passed 16 assertions, including five export/readback formats, GeoJSON/KML coordinates, anonymous denial and upload size limits. Ten real recurring-intelligence permission/persistence checks passed.

The full PR CI run exposed a focus race that the slower staging permission check had masked. Launcher focus is now captured in a layout effect before thread autofocus. A no-database authenticated request fails closed with 401 consistently with GET. The existing hero workflow-anchor regression now clicks its actual section target. The contact test supplies the required mocked IP/rate policy and verifies denied buckets cannot send email; production limiter behavior is preserved. Exported operational findings use the validated snapshot and display Unknown/Not set rather than a missing denominator as zero.

The final CI, hosted application SHA and production rollout results are maintained in the linked PR description. Do not infer production deployment from a branch push or preview READY state.


## Dependency safety check

The production dependency audit found a critical tar advisory and high findings in the old SheetJS/image parser, nested PostCSS and Zod trees. Targeted, pinned fixes preserve the existing Next.js, PptxGenJS, Anthropic SDK and OIDC versions: official SheetJS 0.20.3 tarball (lockfile integrity recorded), image-size 2.0.4, tar 7.5.22, PostCSS 8.5.32 and Zod 4.6.7. Parser/provider contract tests and the master import regression passed after installation. CI now gates high as well as critical advisories.

The new production-dependency audit reports **zero high and zero critical findings**. Six moderate advisory entries remain in the legacy optional canvas installation chain; no major unpdf upgrade is included in this polish pass. Operational CSV rows now retain the snapshot ID, checked-at timestamp and rule version even though CSV does not render report footnotes. A real authenticated staged CSV readback verified Not set plus the exact immutable snapshot ID, and the temporary deadline setting was restored.

The unapproved public-greeting exception now strips page/workspace context and role before provider access. An adversarial contract checks that private strings supplied through those fields never enter the provider request. Private authenticated requests still make zero provider calls without an approved route. The patched build repeated all 16 native-document HTTP checks and the 30-step desktop/phone ABC journey successfully.

Manual phone screenshot review caught an initially clipped empty greeting that axe did not flag. Empty conversations now start at scroll position zero; automatic following begins only after a message or a pending request. The browser and authenticated visual harnesses explicitly check the greeting stays in view on short screens.
