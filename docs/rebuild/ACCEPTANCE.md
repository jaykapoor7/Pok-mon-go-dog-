# Acceptance matrix (living)

Against `docs/rebuild/handoff/CLAUDE_MASTER_PROMPT.md` and `03_Engineering/09_DELIVERY_TEST_AND_MIGRATION.md`.
Status words: **Verified** (implemented and checked, with the check named), **Built, not yet verified** (code exists; the
check that proves it is still to run), **Blocked (external)** (works up to an owner action in `OWNER_ACTIONS.md`),
**Incomplete** (with the reason). Nothing is marked Verified on the strength of a build or a type check alone.

Checks referred to:
- `test:db` — 114 checks on a local Postgres running every rebuild migration, acting as different people through row-level security (`scripts/db-tests/run.mjs`, in CI).
- `test:kaju-planner` — 32 checks: plan validation, fixed-rule plans, the composer, the model planner against a mock client.
- `test:notify-delivery` — 12 checks: quiet hours, providers not set up, retries, approvals not held.
- e2e — Playwright suites in `e2e/` (signed out on every push; signed in on demo.straypaw.org after each sync).
- staging — checks run on the staging database (`ucxfxiddufwqithtdtix`) with its sample organisations, inside a transaction that is rolled back, so nothing is left behind.

## 1. Classic retired

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Every classic page and route removed | Incomplete | Replacements are being integrated; `src/app/(app)` is removed in the retirement change after parity checks. |
| No Classic links, menu entries or fallbacks | Incomplete | "Classic view" link and `classicOf` go in the retirement change. |
| No redirects to Classic | Incomplete | `next.config.mjs` redirects into classic routes go in the retirement change. |
| Obsolete components and dead code removed | Incomplete | Reachability sweep after the retirement change. |
| Guided demo, onboarding, emails, docs, tests use the new app only | Incomplete | Tour already on the new pages; onboarding flow, emails and tests move in the retirement change. |
| Records, audit, permissions, exports, APIs preserved | Built, not yet verified | No migration drops or rewrites data; every replacement calls the same RPC or API as classic (`MIGRATION-MAP.md`). |

## 2. Operational parity

| Area | Status | Evidence / reason |
| --- | --- | --- |
| NGO cases: create, edit, assign, next step, follow-ups, delete/restore | Built, not yet verified | Worker build on the classic RPCs; signed-in checks pending. |
| Animals: server filters, record, care, identifiers, identity review | Built, not yet verified | As above. |
| Field mode with offline drafts and idempotent sync | Built, not yet verified | Reuses `src/lib/field/outbox` and `sync` (request ids); browser offline check pending. |
| ABC/ARV evidence, vet sign-off, release | Built, not yet verified | `AbcEvidence` component on the classic `abc_*` RPCs. |
| Packages: monthly, claims, submit, answer, downloads | Built, not yet verified | Worker build. |
| Government review: decisions, items, finalise, payment reference | Built, not yet verified | Worker build; reviewer session checked on the demo site. |
| Programme setup, partners, invitations, estimates | Built, not yet verified | Worker build on `oh_*` RPCs. |
| Healthcare: bites, PEP (clinician-entered), referrals, services | Built, not yet verified | Worker build. |
| Laboratory sample lifecycle | Built, not yet verified | Worker build on `oh_sample_step`. |
| Research access requests, approval, revocation, versioned extracts | Verified (database) · UI built | `test:db` "Research data access" (request, steward notified, approve, versions, revoke hides extracts). |
| Organisation discovery, requests, invitations, roles, onboarding | Built, not yet verified | Start page, staff codes, programme invitations; team roles in NGO Team. |
| Notifications | Verified (database, delivery logic) | `test:db` notifications; `test:notify-delivery`. |
| Global search | Built, not yet verified | ⌘K searches pages, channels, animals, cases and messages (database-filtered). |
| Saved views, pins, persistent tabs | Verified (database) · UI built | `test:db` "Saved views and pins". |

## 3. Collaboration

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Channels, DMs, threads, unread | Verified | Earlier release; `test:db` DM privacy. |
| @mentions with notifications only to people who can read the channel | Verified (database, staging) | `test:db`: outsider mention dropped, notification without wording; staging 2026-11-15: a mention of another NGO's person was dropped, a member found the message and was notified, the outsider found, was notified about and could read nothing. |
| Reactions, files, edit/delete with history, announcements | Verified (database) · UI built | `test:db` channel checks. |
| Message search respecting access | Verified (database) | `test:db`: search never returns another organisation's or a DM's messages. |
| Record-attached discussions | Verified (database) · UI built | `test:db` record threads; `RecordThread` component. |
| Cross-organisation programme channels, revocation | Verified (database) · UI built | `test:db`: leaving the programme ends access at once. |
| Mobile push | Blocked (external) | Built; needs VAPID keys (OWNER_ACTIONS 5). |

## 4. Kaju

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| Compact panel on every page and full page, shared state | Built, not yet verified | Frame-level provider; browser check pending. |
| Composer that understands while typing, corrections, one submit | Verified (logic) · UI built | `test:kaju-planner` composer checks. |
| Model provider abstraction with Claude | Verified (mock) · Blocked (external) for live | `test:kaju-planner` model planner against a mock client; live needs OWNER_ACTIONS 3. |
| Tool registry with levels, validated inputs, org rules stricter only | Verified | `test:kaju-planner` validation; `test:db` policies. |
| Durable missions: steps, trace, retries with backoff, idempotency, cancel, recovery | Verified (database, staging) | `test:db` "Kaju missions"; staging 2026-11-15: a mission on the sample NGO found 27 open cases, waited for approval, made 27 tasks once approved, the same start key returned the same mission, trace created → waiting_approval → approved → completed. |
| Human approval for consequential steps; person-only decisions never run | Verified (database) | `test:db`. |
| Organisation memory with approval and revocation | Verified (database) · UI built | `test:db` "Organisation memory". |
| Connected services with permission boundaries | Built · Blocked (external) | Approved mission emails send from the approver's own connection; needs OAuth apps (OWNER_ACTIONS 8). |
| Automations across workspaces | Verified (database) · UI built | `test:db` "Automations for every workspace". |

## 5. Healthcare, government, research specifics

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| PEP reminder scheduling, consent, delivery log, retry | Verified (database) · Blocked (external) for sending | `test:db`: queued only with consent, masked log, outbox unreadable via API; sending needs OWNER_ACTIONS 6. |
| Independent veterinary clinic onboarding | Incomplete | Veterinarians join through an NGO today; an independent clinic organisation type is the next change. |
| Offline capture and idempotent sync | Built, not yet verified | Field mode; browser offline test pending. |

## 6. Design, mobile, accessibility, performance

| Requirement | Status | Evidence / reason |
| --- | --- | --- |
| 390 / 768 / 1440, light and dark screenshots | Incomplete | Screenshot matrix runs after integration. |
| WCAG 2.2 AA automated checks | Incomplete | axe in e2e after integration. |
| Performance measurements | Incomplete | After integration. |

## 7. The 15 scenarios (09_DELIVERY_TEST_AND_MIGRATION.md)

| # | Scenario | Status |
| --- | --- | --- |
| 1 | New NGO signs up, invites, opens a case, posts in a channel | Incomplete — scripted after integration |
| 2 | Municipal field worker records a vaccination, reviewer receives it | Incomplete |
| 3 | Independent vet clinic | Incomplete (see section 5) |
| 4 | Hospital bite case, clinician PEP schedule, consented reminder, non-clinical denied | Partly verified (`test:db` reminders) |
| 5 | Lab result validated by staff, parties notified, Kaju cannot validate | Partly verified (`test:db`: validate_result is person-only) |
| 6 | Programme coordinator creates programme, invites partners | Built, not yet verified |
| 7 | Government reviewer decides; Kaju cannot approve | Partly verified (`test:db`: verify_claim is person-only) |
| 8 | Research access, versioned extract, revocation | Verified (database) |
| 9 | @Kaju summarises a thread, proposes a task, user confirms | Built (earlier release) |
| 10 | Composer identifies ward/date/person, correction, one submit | Verified (logic) |
| 11 | Mission pauses for approval, resumes, retry without duplicates | Verified (database, staging) |
| 12 | Mixed-organisation isolation including search | Verified (database, staging) |
| 13 | Offline report caches and syncs without double posting | Built, not yet verified |
| 14 | Reduced motion and keyboard only | Incomplete |
| 15 | Charts and maps with numerator, denominator, freshness | Built (earlier releases) |
