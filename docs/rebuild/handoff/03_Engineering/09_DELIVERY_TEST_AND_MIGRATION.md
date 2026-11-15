# IMPLEMENTATION ROADMAP, MIGRATION & ACCEPTANCE

## Definition of 'complete redesign'
Replace the old page hierarchy, page composition, redundant cards and siloed assumptions with the four locked workspaces, Attio-dominant record UI, Linear insights, Slack-like internal channels and Raycast/Inngest-style Kaju. **Do not** casually delete production records, RLS, working animal/case logic, public API contracts or commitments to current pilot users. Rebuild the experience and functional integration; migrate safely and remove legacy screens only after validated replacements.

## Stage 0 — codebase and deployment audit (required, before changes)
- Build an inventory of routes, app shell/sidebar, screens, tables, RLS policies, auth, user/org roles, programmes, animal medical data, AI endpoints, channels, notifications, WhatsApp intake, exports, reports, current demos and CI.
- Label each **Live / Staging / Partial / Planned / Broken** and cite file paths, migration names and routes. Don't assume past prototype screenshots prove current production.
- Identify legacy ‘One Health’ or BeST-only UX and plan removal/replacement (do not remove underlying cross-sector data or useful capabilities).
- Map old -> new routes, schemas and user roles, preserve deep links or add redirects, define data backfills, restore and rollback.
- Check direct vendor dependencies and integration approvals (Meta WhatsApp Business, Claude/Anthropic key, Gmail/Google OAuth, health-system data agreements).
- Freeze an audited fixture dataset for screenshot/test comparability. Mark all synthetic test data.

## Stage 1 — foundations / system design
- Build reliable organization and membership onboarding, invitations, programme creation by any verified org, multi-role selection, policy checks and seeded user flows.
- Lock visual tokens, typography, interaction grammar and colors. Design foundational table, record drawer, status chip, activity timeline, channel view, message composer, Kaju command input and mission component.
- Build route-level navigation with persistent tabs, cross-app search, keyboard shortcuts, context drawers, phone bottom nav.
- Test at 1440, 768, 390 before multiplying components across 50 pages.

## Stage 2 — operational record surfaces
- Implement NGO Today/Inbox/Animals/Cases/Operations/Programmes/Submissions, Government Overview/Programmes/Partners/Verification/Surveillance/Reports, role-specific Healthcare and Research.
- Reuse canonical records and servers, not duplicated table state; replace old card-based pages. Make every action functional and audited.
- Implement shared activity, tasks/handoffs, document/evidence, maps, reporting, notification history and saved views.

## Stage 3 — native communication and linked collaboration
- Organization channels, message realtime, threads, DMs, mentions, attachments, record/assignment previews, channel tabs and permission-scoped programme channels.
- Mobile notifications and offline/reconnect behavior; test message ordering/race conditions and membership revocation.
- Add @Kaju as an ordinary participant with special tool permissions and visible provenance.

## Stage 4 — Kaju real actions and execution
- Tool registry, auth policy, constrained file/record search, context retrieval, structured previews, pre-send prompt understanding, outcome-based missions, durable queue/orchestrator, retries, approvals, tracing and audit.
- Connect configured external services via explicit OAuth/API scopes and audit. Keep connectors disabled until verified.
- Implement automation templates from `08_AUTOMATION_MATRIX.md` in dependency order: intake -> follow-ups -> submissions -> programme analytics -> clinical notifications after validation -> research assistance.
- Support organization-installed automations as approved configuration, not arbitrary model executable code.

## Stage 5 — evidence-based visual/performance/accessibility QA

### Screenshot matrix (mandatory)
| View | Desktop 1440 | Tablet 768 | Phone 390 | Light/dark | Populated/empty/error |
|---|---|---|---|---|---|
| NGO Today | yes | yes | yes | yes | yes |
| NGO Animals & Animal detail | yes | yes | yes | yes | yes |
| Govt Overview & Insights/Surveillance | yes | yes | yes | yes | yes |
| Vet Patients/Procedures | yes | yes | yes | yes | yes |
| Human PEP/Referral | yes | yes | yes | yes | yes |
| Lab Samples/Results | yes | yes | yes | yes | yes |
| Research Explore/Studies | yes | yes | yes | yes | yes |
| Channels + record-linked thread | yes | yes | yes | yes | yes |
| Kaju compact + full Missions | yes | yes | yes | yes | yes |
| Self-serve onboarding | yes | yes | yes | yes | yes |

### Important end-to-end test scenarios
1. New NGO user signs up, creates org, sees correct sidebar, invites teammate, opens first case and sends in native channel.
2. Municipal field worker invited by government uses operational field UI, captures vaccination event and submits to government reviewer without getting unrelated NGO admin rights.
3. Vet clinic signs up independently, manages appointments and clinical event; NGO partner sees only shared follow-up status.
4. Hospital opens bite case, sets clinician-entered PEP schedule, consented reminder sends on time, follow-up logged; non-clinical user denied patient chart.
5. Lab receives sample, validates result via staff auth and authorized parties notified; Kaju cannot validate test itself.
6. Programme coordinator creates collaborative programme, invites partners, sees shared status not all private organization data.
7. Government reviewer examines evidence, asks correction, performs signed decision; NGO sees status; Kaju cannot approve claim.
8. Researcher requests dataset access, receives reviewed de-identified version, analysis query is reproducible; revocation works.
9. Staff discusses incident in channel, @Kaju summarizes with record citations, proposes task, user confirms; no unsolicited sensitive exposure.
10. Kaju pre-submit composer identifies ward/date/person and allows correction, only sends final structured request after explicit action.
11. Kaju mission pauses on approval, resumes after consent; retry never creates duplicate records or messages.
12. Mixed-org permission tests: user cannot read another org's private channels, documents, clinical record or unapproved research extract even via search or AI.
13. Phone offline report caches safely, syncs without double-post and clearly displays failure/correction state.
14. Browser prefers reduced motion and keyboard-only input; all dynamic states perceivable without animation.
15. Charts and maps show real numerator/denominator, source freshness and drilldown, with no hallucinated figures.

## Visual execution quality gate
- Capture real in-browser screenshots + videos of signature motion interactions. Iterate against official references and original concept boards; Attio is the dominant visual benchmark.
- Reject pages where tables are replaced by repetitive outlined cards; data has poor alignment; large empty above-fold areas; controls have no action; loading lacks skeletons; animations are janky, generic, excessive, unresponsive or block work.
- Measured response/scroll performance; virtualize big tables; maps/charts lazy load; test on lower-end phone.
- Distinguish 'implementation exists' from 'works with connected real app credentials' and 'demonstrated in pilot'.

## External integration and operations gating
- Gmail/Outlook and calendar actions require user-granted OAuth, revocable scopes and per-mailbox boundaries.
- WhatsApp Business requires Meta approval/number/webhooks/templates/rate limits; don't label 'connected' before verified.
- Claude use requires provider credentials, rate/cost controls, prompt injection resistance, audit and human-approval handoffs.
- Human clinical provider data/laboratory integration needs partner technical/legal permissions; mock integration may not be called live.
- Notifications need deterministic scheduling/delivery logs independently of LLM availability.
- PWA, auth, background sync and push notification restrictions differ across browsers; verify behavior on iOS/Android/desktop instead of assuming parity.

## Prioritization (product not one programme fork)
1. Role/org onboarding, canonical records, NGO/Government evidence loop, well-executed visual shell, search.
2. Channels/DMs/threads linked to records, tasks and notifications.
3. Kaju foundational chat, context + real write tools, mission review and approvals.
4. Healthcare vet/human/lab use cases and validated clinical reminders/referrals.
5. Research data governance, analytics and government surveillance linkage.
6. Richer integrations, proactive outreach, institutional scale, multi-species and advanced forecasting when data supports it.

## Delivery evidence
Claude should provide: feature-by-feature implementation checklist, file path changes, schema migration set, test output, screenshot pack, trace of at least one real cross-workspace flow and one Kaju action, integration statuses, deployment URLs actually tested, known limitations and rollback instructions. No 'done' based solely on code generation or passing a build.
