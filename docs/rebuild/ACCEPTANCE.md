# Acceptance matrix (living)

Against `docs/rebuild/handoff/CLAUDE_MASTER_PROMPT.md` and `03_Engineering/09_DELIVERY_TEST_AND_MIGRATION.md`.
Status words: **Verified** (implemented and checked, with the check named), **Built, not yet verified** (code exists; the
check that proves it is still to run), **Blocked (external)** (works up to an owner action in `OWNER_ACTIONS.md`),
**Incomplete** (with the reason). Nothing is marked Verified on the strength of a build or a type check alone.

Checks referred to (all run on 2026-11-15 on this branch):
- `test:db` — 215 checks on a local Postgres running every rebuild migration, acting as different people through row-level security (`scripts/db-tests/run.mjs`, in CI).
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
| Durable missions: steps, trace, retries with backoff, idempotency, cancel, reject, deadline, recovery | Verified (database, staging) | `test:db` ("Kaju missions: reject and cancel", "a passed deadline": the owner is told once and nothing runs by itself); staging mission (27 cases found, approval wait, 27 tasks, same key → same mission). |
| Human approval; person-only decisions never run | Verified (database) | `test:db`. |
| Organisation memory with approval and revocation | Verified (database) · UI built | `test:db`. |
| Screens Kaju opens exist and respect roles | Verified | `test:routes`; `src/lib/kaju/screens.ts`. |
| Connected services with permission boundaries | Built · Blocked (external) | Needs OAuth apps (OWNER_ACTIONS 8). |
| Automations across workspaces | Partly verified · see `AUTOMATIONS-AUDIT.md` | `test:db` covers 8 of the 15 rules, the scheduler tick with nobody signed in, and follow-up: a notice is acknowledged with an outcome, escalated to the leads once after the rule's hours, and closed when nothing is left (`20261116180000`, on staging and production). Four rules that counted the wrong thing or too little are fixed (`20261116170000`). Against the 30-row matrix: 2 Verified, 1 Built, 1 Blocked (external), 26 Incomplete — what each row still lacks is listed in the audit. |

## 5. Healthcare, government, research specifics

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| PEP reminder scheduling, consent, delivery log, retry | Verified (database and sending loop) · Blocked (external) for sending | `test:db` "PEP reminders: sent only while they still hold, retried, then given up" (20 checks: the wait before a retry, giving up, never twice, and a reminder no longer sent once the dose is given, its date passes or moves, the course stops, consent is withdrawn or the number changes); `test:notify-delivery` runs the worker's sending loop with a stand-in sender. Sending needs OWNER_ACTIONS 6. |
| Independent veterinary clinic onboarding | Verified (database) · UI built | Start page "Veterinary clinic"; clinic Today, Patients, Appointments. |
| Offline capture and idempotent sync | Verified (phone browser, staging) | `e2e/field-offline-staging.spec.ts`. |
| Coverage and surveillance with suppression, provenance, denominators | Built (earlier releases) | Programme Coverage tab shows only dated estimates; small counts hidden. |

## 6. Design, mobile, accessibility, performance

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| 390 / 768 / 1440, light and dark | Verified | 102 screenshots, none with sideways scroll or page errors; contact sheets in `docs/rebuild/shots/app/`. |
| Populated, empty and error states | Verified (signed in on staging, 12 views × 390 and 1440) | `docs/rebuild/shots/states/` (sheets and `report.json`). After sign-in, every read except the workspace list is answered with nothing, or with a server error. Found and fixed: Government Overview and Surveillance said "does not oversee a programme" when the read failed; laboratory Results, Samples, Referrals, PEP and Studies showed zeros on a failed read (list pages now say the read failed and show no counts); Today stayed on "Reading your work…"; the NGO lists' view chips showed 0 beside "nothing is shown as zero". PEP's "empty" capture crashed only because the test answered an object-returning function with a list, which the database never does. |
| WCAG 2.2 AA automated checks | Verified (serious and critical) | axe on 24 pages × 2 themes × 2 devices; contrast tokens raised, list semantics fixed, inline links underlined, 24px targets; a skip link added to the frame (2.4.1) and focus returned after dialogs close (2.4.3). Also run with every impact level and axe's best-practice rules on 13 app pages, phone and desktop: one moderate finding (the channel side panel skipped a heading level), fixed. A manual screen-reader pass with VoiceOver or TalkBack is still to be done by a person; it cannot be done from this environment. |
| Reduced motion | Verified (automated, recorded) | Every axe and screenshot run uses reduced motion; Kaju and lists use `useReducedMotion`. Recordings of the Kaju panel, command bar, list to record and view chips, with and without reduced motion, in `docs/rebuild/shots/motion/`. |
| Performance | Largest paint on target on a slow phone · blocking time above target | Local production build, phone-class conditions (Pixel 7, CPU 4× slower, slow 4G, cold cache). Before: largest paint 3.7–4.1 s on six of seven pages (`perf-throttled.json`). The pages showed "Opening…" until the browser had checked the session, and on government, health and channel pages the longer public storage notice was the largest thing on screen. Now (`perf-throttled-after.json`): 1.1–1.6 s on all seven, under the 2.5 s mark. Visitors get the sample page straight from the server HTML; a browser that holds a session keeps it hidden until its own workspace is read (checked in a browser). Total blocking time 259–425 ms (the 200 ms "good" mark is not met), a tap on a list row answers in 230–253 ms, layout shift 0. Since then, app pages no longer download the landing page's scripts (about 144 KB, pulled in by a `next/link` on the not-found page): JS per page 335–379 KB → 294–340 KB (`perf-throttled-notfound-fix.json`). Blocking time did not fall measurably (two runs: 264–581 ms, noisy). A trace shows where it goes: React's own start-up (about 180 ms on this CPU), hydrating the shell and page (about 200 ms), the Supabase client (about 80 ms) and the first layout and style pass (about 150 ms, of which the public site's style sheets are about 50 ms). Getting under 200 ms needs the shell rendered on the server or split into smaller pieces; that is not done. Not measured on a real device or network. |

## 7. The 15 scenarios (09_DELIVERY_TEST_AND_MIGRATION.md)

A real cross-workspace flow is traced on staging (`TRACE-STAGING.md` §1). A citizen's notice goes to the clinic, the
clinician records the bite, the NGO follows up and sends a sample, the laboratory records a result, and the
coordinators are notified. Five workspaces take part, each through row-level security, and the whole flow is rolled
back.

| # | Scenario | Status |
| --- | --- | --- |
| 1 | New NGO signs up, invites, opens a case, posts in a channel | Verified (staging trace, rolled back): registration, the lead's sign-in, an invitation, the colleague's sign-in, a case, #general and a post, as each person; a member cannot invite, another NGO sees nothing and cannot post (`TRACE-STAGING.md` §6). The registration and sign-in emails themselves were not sent. |
| 2 | Municipal field worker records a vaccination, reviewer receives it | Verified (staging trace, rolled back): field intake and vaccination, evidence, the coordinator's identity decision, vet sign-off, evidence review, a package claimed at the contract rate and submitted, then found, decided and closed by the municipal reviewer; the field worker cannot sign off or confirm identity and the operator cannot decide its own claim (`TRACE-STAGING.md` §7). A vaccination entered with the quick ARV form, rather than the lifecycle form, does not record the operation a contract can require (see §7). |
| 3 | Independent vet clinic | Verified (database) |
| 4 | Hospital bite case, clinician PEP schedule, consented reminder, non-clinical denied | Verified (database reminders, permissions; staging trace: NGO, laboratory and programme lead denied the patient record); UI as clinician on staging |
| 5 | Lab result recorded by staff, parties notified, Kaju cannot validate | Verified (staging trace: only the laboratory records a result, signed by name; the sender and coordinators notified; database: person-only steps) |
| 6 | Programme coordinator creates programme, invites partners | Verified (staging trace, rolled back): programme with wards, a hospital partner, an email-bound invitation accepted once by the doctor; refused for another email, a second use, an outsider adding partners and a laboratory role at a hospital (`TRACE-STAGING.md` §8). The copied invitation link pointed at a page that no longer exists; fixed, and `test:routes` now checks it. |
| 7 | Government reviewer decides; Kaju cannot approve | Verified (database: person-only); UI signed out |
| 8 | Research access, versioned extract, revocation | Verified (database, staging tables) |
| 9 | @Kaju summarises a thread, proposes a task, user confirms | Verified (database: only readers of the channel can ask; nothing is created until accepted; accepting twice creates each task once) · owners and dates are not taken from the thread |
| 10 | Composer identifies ward/date/person, correction, one submit | Verified (logic, browser) |
| 11 | Mission pauses for approval, resumes, retry without duplicates | Verified (database, staging) |
| 12 | Mixed-organisation isolation including search | Verified (database, staging) |
| 13 | Offline report caches and syncs without double posting | Verified (phone browser, staging) |
| 14 | Reduced motion and keyboard only | Verified (automated) | `e2e/nx-keyboard.spec.ts` with reduced motion: skip link first, sidebar, list row, command bar (/ and Ctrl+K, arrows, Enter), Kaju (Ctrl+J); visible focus each time; focus returns to the page when the command bar or Kaju closes (it fell to the document before; fixed). |
| 15 | Charts and maps with numerator, denominator, freshness | Built (earlier releases) |
