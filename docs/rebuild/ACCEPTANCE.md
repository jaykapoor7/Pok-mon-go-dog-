# Acceptance matrix (living)

Against `docs/rebuild/handoff/CLAUDE_MASTER_PROMPT.md` and `03_Engineering/09_DELIVERY_TEST_AND_MIGRATION.md`.
Status words: **Verified** (implemented and checked, with the check named), **Built, not yet verified** (code exists; the
check that proves it is still to run), **Blocked (external)** (works up to an owner action in `OWNER_ACTIONS.md`),
**Incomplete** (with the reason). Nothing is marked Verified on the strength of a build or a type check alone.

Checks referred to (all run on 2026-11-15 on this branch):
- `test:db` — 125 checks on a local Postgres running every rebuild migration, acting as different people through row-level security (`scripts/db-tests/run.mjs`, in CI).
- `test:routes` — 7 checks: every sidebar link, every screen Kaju can open and every mapped old link opens a page; no classic route exists (in CI).
- `test:kaju-planner` (plan validation, composer, model planner against a mock client), `test:kaju-reliability` (47), `test:kaju-polish` (27), `test:kaju-automations` (12), `test:notify-delivery`, `test:inference-off`, `test:state-machines`, `test:operational-cohorts` and ten more suites — all passing, in CI. (Until 2026-11-15 the automations, intake, package, state-machine and record-rule suites were not in `dev-check.yml`, although this list said so; they are now.)
- e2e — Playwright on a production build, phone (Pixel 7) and desktop (1440): 672 tests; the full run had 601 passing and 23 failing, all fixed and their specs re-run to green (accessibility and rebuild 168/168, NGO, government/health, public and map 433 passing). Signed-in checks run on demo.straypaw.org after each sync (`signed-in-e2e.yml`).
- axe — WCAG 2.2 A/AA (serious and critical) on 24 app and public pages, light and dark, phone and desktop (`e2e/accessibility.spec.ts`).
- staging — checks on the staging database (`ucxfxiddufwqithtdtix`) with its sample organisations, inside a transaction that is rolled back; traces in `docs/rebuild/TRACE-STAGING.md`.
- signed in locally — a production build pointed at staging, signed in as the One Health sample people (NGO coordinator, clinician, laboratory scientist, programme lead, field worker). The classic sample roles (municipal reviewer, veterinarian) run in `signed-in-e2e.yml` on demo.straypaw.org, which holds their password.
- screens — 102 screenshots, 17 pages × 390/768/1440 × light/dark, none with sideways scroll or a page error (`docs/rebuild/shots/app/`).

## 1. Classic retired

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Every classic page and route removed | Verified | `src/app/(app)` deleted (95 pages); `test:routes` "no classic route is still a page"; e2e "retired application addresses are not pages and do not redirect" (404). |
| No Classic links, menu entries or fallbacks | Verified | "Classic view" link and `classicOf` removed; every rebuilt and public page is checked for links to retired addresses (`e2e/retired.ts`, used by the nx-* and public specs). |
| No redirects to Classic | Verified | Application redirects removed from `next.config.mjs`; only public-site aliases remain. Old stored links open current pages through `src/lib/routes/canonical.ts`, which is not a redirect to Classic. |
| Obsolete components and dead code removed | Verified | 368 modules unreachable from any page, route, script or test deleted, plus the sign-in sheet and the classic-only `readiness_board` flag; a reachability pass now finds none. |
| Guided demo, onboarding, emails, docs, tests use the new app only | Verified | Tour steps, sign-in gateway, onboarding, join codes, connection returns, help centre, emails and pushes (`canonicalHref` in delivery), Kaju's screens and how-to answers; classic specs removed or rewritten. |
| One navigation, no Classic mode | Verified | One frame (`src/nx/Shell.tsx`) at canonical addresses; screenshots. |
| Records, audit, permissions, exports, APIs preserved | Verified (no destructive change) · Built for replacements | No migration drops or rewrites data; every replacement calls the same RPC or API as classic (`MIGRATION-MAP.md`, a scripted check that each classic write has a caller in the new app). |

## 2. Operational parity

| Area | Status | Evidence / reason |
| --- | --- | --- |
| NGO cases: create, edit, assign, next step, follow-ups, delete/restore | Built, verified signed out · signed-in on demo | e2e nx-ngo-records (sample data); signed-in checks on demo after sync. |
| Animals: server filters, record, care, identifiers, identity review | Built, verified signed out | As above. |
| Organisation map | Verified (signed out) | Operations › Map reads with the member's token only; e2e "the organisation map asks a visitor to sign in". |
| Field mode with offline drafts and idempotent sync | Verified (phone browser, staging) | `e2e/field-offline-staging.spec.ts`: record with no signal, ciphertext on the phone, the first answer lost after the server saved, failure shown on the record, retry answered from the first save (one case, one event, one evidence item for two sends). Found and fixed: field intake failed for members without a volunteer row. |
| ABC/ARV evidence, vet sign-off, release | Built, verified signed out | `AbcEvidence` on the classic `abc_*` RPCs, on the case record (`?tab=abc`) and the procedure record; signed-out reads nothing (e2e). |
| Packages: monthly, claims, submit, answer, downloads | Built, verified signed out | e2e nx-ngo-setup. |
| Government review: decisions, items, finalise, payment reference | Built, verified signed out · signed-in on demo | e2e nx-gov-health; the reviewer's own queue in `signed-in-e2e.yml` on demo (the classic reviewer account signs in only there). Decisions themselves are not exercised signed in. |
| Programme setup, partners, invitations, estimates, Where to act map | Built, verified signed out | e2e nx-gov-health; programme-lead session exercised on staging read paths (one assignment change undone). |
| Healthcare: bites, PEP (clinician-entered), referrals, services | Built, verified signed out and as a clinician on staging | Worker report: clinician session on staging (wound washing changed and undone). |
| Bite keeps its referral | Verified (database) · live on staging and production | `test:db` "A bite recorded from a referral" (5 checks); staging bundle sent. |
| Laboratory sample lifecycle | Verified (staging trace) · read paths signed in | `TRACE-STAGING.md` §1: received, testing, result signed by a named scientist; only the receiving laboratory can move a sample; result notices reach the sender and the coordinators. |
| Independent veterinary clinics | Verified (database) · UI built | `test:db` "Independent veterinary clinics"; clinic Today and Patients wired; staging bundle sent. |
| Research access requests, approval, revocation, versioned extracts | Verified (database, staging) | `test:db`; tables present on staging. |
| Organisation discovery, requests, invitations, roles, onboarding | Verified (database) · UI built | `test:db` "Finding an organisation and asking to join". |
| Notifications | Verified (database, delivery logic) | `test:db`; `test:notify-delivery`; old stored links mapped in delivery. |
| Global search | Built, verified signed out | e2e "Command bar … hands words to Kaju without running them". |
| Saved views, pins, persistent tabs | Verified (database, staging) · UI built | `test:db` "Saved views and pins"; tables on staging. |
| ABC reporting rules turned on before the rebuild | Built | Listed in Kaju › Automations with Run now, Pause, Resume, Remove (same RPCs as before). |

## 3. Collaboration

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Channels, DMs, threads, unread | Verified | `test:db` DM privacy; e2e channels. |
| @mentions notified only to people who can read the channel | Verified (database, staging) | `test:db`; staging: outsider mention dropped, member notified, outsider sees nothing. |
| Reactions, files, edit/delete with history, announcements | Verified (database) · UI built | `test:db` channel checks. |
| Message search respecting access | Verified (database, staging) | `test:db`; staging search isolation. |
| Record-attached discussions | Verified (database) · UI built | Discussion tab on case, animal and package records. |
| Cross-organisation programme channels, revocation | Verified (database) · UI built | `test:db`. |
| Mobile push | Blocked (external) | Built; needs VAPID keys (OWNER_ACTIONS 5). |

## 4. Kaju

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Compact panel on every page and full page, shared state | Verified (browser) | e2e "the compact panel and the full page share one conversation". |
| Composer that understands while typing, corrections, one submit | Verified (logic, browser) | `test:kaju-planner`; e2e "details are recognised before sending" (4 spans, correction). |
| Reliable conversation: invalid or unsafe replies refused, stop, time-out with retry, late answers dropped, expired session, workspace change hides the thread | Verified (browser) | `e2e/nx-kaju-transport.spec.ts` (7 tests, phone and desktop). |
| Model provider abstraction with Claude | Verified (mock) · Blocked (external) for live | `test:kaju-planner` against a mock client; live needs OWNER_ACTIONS 3. |
| Tool registry with levels, validated inputs, org rules stricter only | Verified | `test:kaju-planner`; `test:db` policies. |
| Durable missions: steps, trace, retries with backoff, idempotency, recovery | Verified (database, staging) · cancel and reject not tested | `test:db`; staging mission (27 cases found, approval wait, 27 tasks, same key → same mission). `nx_mission_cancel`, the reject decision and the missed-deadline notice have no test. |
| Human approval; person-only decisions never run | Verified (database) | `test:db`. |
| Organisation memory with approval and revocation | Verified (database) · UI built | `test:db`. |
| Screens Kaju opens exist and respect roles | Verified | `test:routes`; `src/lib/kaju/screens.ts`. |
| Connected services with permission boundaries | Built · Blocked (external) | Needs OAuth apps (OWNER_ACTIONS 8). |
| Automations across workspaces | Partly verified · see `AUTOMATIONS-AUDIT.md` | `test:db` covers 7 of the 15 rules and the scheduler tick with nobody signed in. Three rules counted the wrong thing and are fixed (`20261116170000`). Against the 30-row matrix: 1 Verified, 1 Built, 1 Blocked (external), 27 Incomplete — rules notify but do not follow up or escalate. |

## 5. Healthcare, government, research specifics

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| PEP reminder scheduling, consent, delivery log, retry | Verified (database: scheduling, consent, masking) · retry untested · Blocked (external) for sending | `test:db`; the outbox retry (`nx_pep_outbox_mark`) and the worker's sending loop have no test; sending needs OWNER_ACTIONS 6. |
| Independent veterinary clinic onboarding | Verified (database) · UI built | Start page "Veterinary clinic"; clinic Today, Patients, Appointments. |
| Offline capture and idempotent sync | Verified (phone browser, staging) | `e2e/field-offline-staging.spec.ts`. |
| Coverage and surveillance with suppression, provenance, denominators | Built (earlier releases) | Programme Coverage tab shows only dated estimates; small counts hidden. |

## 6. Design, mobile, accessibility, performance

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| 390 / 768 / 1440, light and dark | Verified | 102 screenshots, none with sideways scroll or page errors; contact sheets in `docs/rebuild/shots/app/`. |
| WCAG 2.2 AA automated checks | Verified (serious and critical) | axe on 24 pages × 2 themes × 2 devices; contrast tokens raised, list semantics fixed, inline links underlined, 24px targets; a skip link added to the frame (2.4.1) and focus returned after dialogs close (2.4.3). Manual screen-reader pass not done. |
| Reduced motion | Verified (automated) | Every axe and screenshot run uses reduced motion; Kaju and lists use `useReducedMotion`. |
| Performance | Measured (local production build) | `docs/rebuild/shots/app/perf.json`: largest paint 76–292 ms on localhost, layout shift ≤ 0.019, 334 KB JS on the first app page. Not measured on a real network or device. |

## 7. The 15 scenarios (09_DELIVERY_TEST_AND_MIGRATION.md)

A real cross-workspace flow is traced on staging (`TRACE-STAGING.md` §1). A citizen's notice goes to the clinic, the
clinician records the bite, the NGO follows up and sends a sample, the laboratory records a result, and the
coordinators are notified. Five workspaces take part, each through row-level security, and the whole flow is rolled
back.

| # | Scenario | Status |
| --- | --- | --- |
| 1 | New NGO signs up, invites, opens a case, posts in a channel | Built; steps covered separately (Start, Team invite API, case, channel); not scripted end to end |
| 2 | Municipal field worker records a vaccination, reviewer receives it | Built; field capture verified on staging (scenario 13); the reviewer's queue signed in on demo; the hand-over from one to the other not scripted end to end |
| 3 | Independent vet clinic | Verified (database) |
| 4 | Hospital bite case, clinician PEP schedule, consented reminder, non-clinical denied | Verified (database reminders, permissions; staging trace: NGO, laboratory and programme lead denied the patient record); UI as clinician on staging |
| 5 | Lab result recorded by staff, parties notified, Kaju cannot validate | Verified (staging trace: only the laboratory records a result, signed by name; the sender and coordinators notified; database: person-only steps) |
| 6 | Programme coordinator creates programme, invites partners | Built; invite and setup exercised on staging read paths |
| 7 | Government reviewer decides; Kaju cannot approve | Verified (database: person-only); UI signed out |
| 8 | Research access, versioned extract, revocation | Verified (database, staging tables) |
| 9 | @Kaju summarises a thread, proposes a task, user confirms | Built (earlier release) |
| 10 | Composer identifies ward/date/person, correction, one submit | Verified (logic, browser) |
| 11 | Mission pauses for approval, resumes, retry without duplicates | Verified (database, staging) |
| 12 | Mixed-organisation isolation including search | Verified (database, staging) |
| 13 | Offline report caches and syncs without double posting | Verified (phone browser, staging) |
| 14 | Reduced motion and keyboard only | Verified (automated) | `e2e/nx-keyboard.spec.ts` with reduced motion: skip link first, sidebar, list row, command bar (/ and Ctrl+K, arrows, Enter), Kaju (Ctrl+J); visible focus each time; focus returns to the page when the command bar or Kaju closes (it fell to the document before; fixed). |
| 15 | Charts and maps with numerator, denominator, freshness | Built (earlier releases) |
