# COPY THIS INTO CLAUDE CODE

You are taking over the **final, ground-up StrayPaw product rebuild**. The attached directory is the signed-off product/design handoff. **Read every spec file and inspect each reference before changing code.** You have full latitude to reorganize, replace and rebuild legacy UI/UX, navigation and old screens. This is not an incremental visual polish. Preserve actual business capabilities, data, security, safe migrations and operational continuity.

## Non-negotiable user direction
1. **Creativity, visual quality, animation, micro-interactions and real data presentation are top priorities.** The user dislikes generic, spaced-out, outlined-card dashboards and sloppy content. Make the application look and feel very close in design quality and interaction grammar to the *assigned* references, while retaining original StrayPaw identity and not copying proprietary brand assets.
2. **Reference assignment is strict:** Attio -> dominant app appearance, home, inbox, table/list and record pages/activity; Linear -> Insights, analytics, dense workflow hierarchy and refined navigation/motion; Raycast -> Kaju compact and full-page AI experience; Slack -> channels, threads, mentions and messaging; Inngest -> Kaju missions, action traces, statuses, retries and approvals. Do not swap these assignments or produce a Notion clone.
3. **Four workspaces only:** NGO, Government & Programmes, Healthcare (veterinary/human/laboratory role-aware), Research. No One Health-specific workspace. Shared records, maps, reporting, training, channels, Kaju, search, tasks and notifications are capabilities, not random new workspaces.
4. **Every screen must do real work.** Content, correct information architecture, actions, reliable state, search, filters, mobile and permissions matter as much as appearance. No demo-only inert controls presented as functional.
5. **Kaju is the flagship:** AI assistant + proactive agent + connected communications + durable workflow execution + intelligence. It must truly eliminate administrative work. Use Claude as one possible model; persistence, tools, auth, scheduling, audit and approval are separate engineering systems. Include intelligent *pre-submit* composer that discovers entities/intent while typing and lets users correct the specification BEFORE sending once; never automatically send on an unconfirmed guess.
6. **A person signs up independently**, chooses/joins/creates an organization, gets role-specific workspace with minimal setup. Access to restricted clinical, government or partner data is not self-provisioned.
7. **Collaborative daily workplace:** native channels, DMs, threads, file/link sharing, Kaju mentions, channel tabs with linked tasks/records. People should work here rather than coordinate internally through WhatsApp; WhatsApp Business remains an intake/integration channel for external people.
8. **Mobile must be native-feeling:** purposeful phone IA at 390px; 768px tablet; 1440px desktop. Tight, relevant layouts—not an accordion of desktop cards. Touch targets ≥44px; reduced motion and WCAG 2.2 AA.
9. **Do not invent product readiness.** Mark live/staging/planned accurately after codebase audit. Integrations requiring Meta/Google/clinical agreements must have explicit status and functioning fallbacks.

## How to execute
**Stage 0: Audit and plan.** Inspect repo, routes, DB migrations, RLS, tests, existing demos, APIs, workflows, connected integrations and deployment. Produce `AUDIT.md` and a file/route migration map. Mark keep/reuse/migrate/remove/rebuild. Identify working animal/ABC/ARV, Kaju and WhatsApp features; protect data. List discrepancies between code and handoff. Do not use outdated screen names as constraints.

**Stage 1: Design system and working prototypes.** Create original StrayPaw UI tokens and screens for NGO Today, Animal record, Government Insights, collaboration channel, Kaju full page and phone Today/Kaju using authentic-looking **synthetic** datasets. Inspect screenshots at 1440, 768, 390. Compare visual fidelity to Attio/Linear/Raycast/Slack/Inngest references. Iterate until high quality. Do not stop at a one-time mockup.

**Stage 2: Foundations.** Implement organizations, invitations, role/permission checks, programme membership, record relationships, audit and evidence sharing, activity stream, notification engine, tasks/handoffs and navigation. Add safe migrations and feature gates. No orphaned legacy paths.

**Stage 3: Four production workspaces.** Build the page/action matrices in `02_Experience/03_PAGE_BY_PAGE_REQUIREMENTS.md` with dense data layouts, record drawers, linked details, inline actions, server filters and role-appropriate navigation. Maintain the contractual distinction between capturing an event and verifying it.

**Stage 4: Collaboration.** Build real-time organization and permissioned cross-organization channels, threads, DMs, mentions, attachments, record links, read/unread and mobile messaging. Do not accidentally leak patient information through channel membership or search.

**Stage 5: Kaju.** Tool registry, policy controls, multimodal intake, connected app adapters, semantic context, pre-submit composer, user/org memory, proactive rules, durable mission orchestrator, retries, approvals and visible outcome traces. Follow exact workflows in `03_Engineering/08_AUTOMATION_MATRIX.md`. Make tools safe/idempotent. Use deterministic services for medical reminders, due dates, notifications and eligibility. No AI-made clinical or government decisions.

**Stage 6: Acceptance.** Tests for RLS/cross-tenant isolation, clinical privacy, duplicate animal matches, verifications, notifications, failed and retried missions, tool policies and real messaging; UI accessibility tests; phone tests; responsive screenshots; performance and reduced motion. Provide screenshots, audited gaps and user-visible production/staging URLs only after actually verified.

## Deliverables throughout
A running app, a migration plan, working demos with coherent mock data where needed, test results, browser screenshots at 390/768/1440, evidence of interactions and performance, plus a short honest list of remaining blocked external integrations. Keep existing working functionality unless replaced with an explicitly tested equivalent.

## Important behavioral instruction
Treat these specs as a **product contract**, not a request to brainstorm. Resolve coding details proactively using the repo. Ask the user only when a product choice genuinely changes scope or access/authority. Move toward implementing the complete vision in reviewable, tested stages; avoid long prose about possible work without making progress.
