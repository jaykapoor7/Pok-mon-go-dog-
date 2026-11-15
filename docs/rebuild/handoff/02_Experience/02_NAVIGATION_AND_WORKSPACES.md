# INFORMATION ARCHITECTURE — FOUR WORKSPACES AND NATIVE COLLABORATION

## Global app anatomy (desktop)
- **Slim global rail:** workspace/organization switcher, Home/Today, Channels, Kaju, Search, notifications, user switcher. Actions have shortcut hints and tooltips.
- **Context sidebar:** current workspace's feature nav, starred records, saved views; lower area for channels/DMs or access via Channels mode. Collapsible/resizable. Avoid two competing giant sidebars.
- **Persistent work tabs:** top content bar preserves animals, cases, programmes, conversations, analyses; close/reorder/restore as appropriate; high-quality transition.
- **Main content:** Attio-style density. Rich table, result board, split view or intentionally composed insights—not default KPI-card grids.
- **Context drawer:** record preview, discussions, Kaju action details, selected items. No navigation loss.
- **Kaju:** small persistent invoke button/shortcut, contextual dock and full-page expansion. Never obscure primary work accidentally.
- **Global search / command bar:** entity search, messages, actions, personal recent items; results filtered by permissions.

## NGO workspace
**Roles:** NGO owner/admin, coordinator, field operator/municipal field worker, authorized vaccinator, volunteer. A municipal field worker can use NGO *functional* surfaces without being falsely labeled an NGO employee; role and organization badges accurately reflect their employer.

**Sidebar (locked broad labels):**
1. **Today** — personal work, urgent cases, handoffs, Kaju prepared tasks, schedule.
2. **Inbox** — citizen/WhatsApp/email reports and referrals; triage, merge suggestions, assign.
3. **Cases** — rescue, investigation, capture-to-release and incident cases.
4. **Animals** — unique identity, photos, timeline, encounters, vaccinations, medical events and evidence.
5. **Operations** — assignments, pickup/transport/capture/release, field visits, schedules, offline sync.
6. **Programmes** — NGO-led or joined campaigns, wards, targets, outreach.
7. **Submissions & Reports** — evidence packages, govt review/corrections, eligible claims, exports.

Secondary: Team/permissions, training, templates, settings, integrations. Cross app: Channels, Kaju, notifications, search, map entry points.

## Government & Programmes workspace
**Roles:** authorized municipal admin, reviewer, programme owner/coordinator, public-health officer, consortium coordinator, analyst. A coordinator can use shared programme functions but cannot access government verification/claims power without government-specific authorization.

**Sidebar:**
1. **Overview** — two home variants: Government oversight vs Programme Coordinator.
2. **Programmes** — organization-owned or shared programmes, targets, geography, coverage, outcomes and plans.
3. **Partners** — invitations, responsibilities, acknowledgements, performance and shared agreements.
4. **Verification** — restricted government review queue of submitted animal/ABC/ARV evidence, discrepancies, claims & audit. Non-government coordinators do not see it.
5. **Surveillance** — permitted incident trends, partner handoffs, investigations, diagnostic signals, maps and response queues.
6. **Reports** — approved programme outputs, evidence packs, contribution and M&E reporting.

Do not create a duplicate separate ‘One Health’/‘Coordinator’ workspace or separate data stores. Keep government-only actions behind server authorization not just hidden links.

## Healthcare workspace: THREE role-specific experiences, ONE WORKSPACE
A user lands in the most relevant experience and can switch only if assigned roles permit. Shared shell and cross-organization referrals stay consistent.

**Veterinary role sidebar:** Today · Animals/Patients · Appointments · Clinical Care · Procedures · Follow-ups.
- Exams, treatment, vaccinations, ABC, clinical authorizations, recovery, referral, certificates.
- Independent clinics manage their own animal patients and scheduling; can collaborate with NGOs on shared animal records.

**Human Healthcare role sidebar:** Today · Bite Cases · PEP · Referrals · Facilities · Surveillance.
- Exposure/bite documentation, clinician-entered PEP/RIG schedules, actual dose events and missed-dose flags; referral acknowledgment and service directories with verification time.
- Restricted patient identity and medical notes; only necessary incident facts shared outside clinical care.

**Laboratory role sidebar:** Work Queue · Samples · Testing · Results · Quality.
- Requests, specimen custody, status and turnarounds; validated results and authorized notifications. Prefer LIMS connector when a lab already has one.

Shared training, reporting, settings and channels accessible appropriately. Do not mix human/veterinary patient lists on one screen or treat lab technicians as clinical prescribers.

## Research workspace
**Roles:** independent researcher, institution admin, analyst, study PI, approved collaborator, evaluation reader.

**Sidebar:** Overview · Datasets · Explore · Maps & Analysis · Studies · Reports.
- Datasets include catalog, permitted schema/metadata and requests, imports, provenance, quality and versions.
- Studies include cohorts, variable definitions, methods, notebooks/reproducible outputs and collaborator access.
- Reports include controlled exports, evidence-linked results, appropriate restrictions.

A researcher can create own projects without joining a public-health programme. Access to another org's data requires explicit approval. Programme M&E uses permissioned aggregations.

## Native collaboration (not a fifth workspace)
- **Channels** accessible throughout app, grouped by organization, team, shared programme; optional favorites and recents.
- DMs, group DMs, threads, mentions, emoji, files, linked records and tasks. Some channels are permission-restricted and may have a read-only announcement mode.
- Channel tabs: Messages · Work · Records · Files (only if channel has linked content); do not create near-empty redundant pages.
- @Kaju replies with citations to records/messages and can propose/exe permitted actions; channel access scopes AI context.

## Responsive layout
**Desktop 1440:** calm app chrome, visible sidebar, 2-3 panel productivity, dense 40-48px rows and optional drawer.
**Tablet 768:** compact rail + main, optional overlays; no sideways viewport scroll.
**Phone 390:** bottom navigation Today / Work / Messages / Kaju / More adapted by role; focused single-screen tasks, stack drilldowns, swipe/long-press context actions with visible accessibility equivalents, full-screen record details and mobile-first capture. 44px+ hit targets and zero table overflow at page level; tables become intentional mobile record rows, not random cards.

## Navigation behavior
- Preserve selected table filters, scroll and open record on back.
- Global quick switcher searches records, channels, programmes, workflows and commands with permission-aware ranking.
- In-app links and @mentions create deep links that open context and preserve workspace.
- Default views selected by role; advanced users save views and pin frequent records/channels.
- Feature names and pages can be adjusted after actual usability tests, but must not expand into redundant silos.
