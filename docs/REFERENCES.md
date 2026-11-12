# StrayPaw: interaction references (12 Nov 2026)

These are patterns to adopt, not branding. Tags such as [L4] point to Sources at the end. **†** means the claim was read from the primary page through a search extract, because the page could not be fetched. **(unverified)** means I found no primary source. GovDash pages are vendor marketing. Where a pattern conflicts with DESIGN.md, DESIGN.md wins.

## 1. Screens

**(a) Sign-in and invitation acceptance. Strongest: Clerk**
- Two steps: email, Continue; then the code, Verify. Offer "I need a new code" (30 s cooldown, code valid 10 min) and "Start over" [K1].
- Errors sit under the field that caused them; Verify is disabled while the request runs [K1].
- Each invitation carries one role and lands on our own accept page with sign-in embedded; a signed-in person goes straight in [K2]. Show the place and role before asking for an email.
- Verified email domains: "Join" adds at once; "Request to join" badges the switcher and waits for an admin [K3]. A person with no place yet must choose one first [K5†].
- Avoid: password-first sign-in, or an empty app for a pending member.

**(b) First-time onboarding per role. Strongest: Clerk gate plus Geist empty states**
- One `onboardingComplete` flag, checked on the page itself; reload the user after writing it, because tokens lag about 60 s [K4†].
- Geist: never auto-launch a tour; pair "Start tour" with "Skip" [V5]. This conflicts with FirstDay; the owner decides.
- A "guide" empty state with starter content, so people learn by doing [V5]. It ends on verb-and-noun actions ("Record a bite"), never "Get started" [V5].
- Training for the role is assigned automatically at registration [T6†].
- Avoid: questionnaires or carousels before any real work.

**(c) App shell. Strongest: Linear (desktop), Vercel (phone)**
- Place switcher top-left [L1]. Switching place keeps the same page [V3]; "all places" versus "this place" is one click [V1].
- Sidebar slightly dimmer than the work [L6]; labels and icons on one grid [L5]. A collapsed sidebar opens on hover, like StrayPaw's handle [L6]. Each person chooses counts as a number or a dot [L7].
- ⌘K: recent items when the input is empty; 1–2 word group headings; sub-pages past about 30 items; Backspace goes back and keeps the query; verb items with their keys; focus returns on close [V4].
- Phone: a floating bottom bar for one hand [V1].
- Avoid: moving tabs into the sidebar, as Vercel did [V2]. StrayPaw's tabs are Pipeline views.

**(d) Role home and daily priorities. Strongest: GovDash Dash Pulse**
- "Dash Pulse ranks your to-dos each morning" [G1]; the ranking method is not published.
- A summary at about 6:00 local time, daily or weekly by choice, with "Play" to hear it read aloud [L12]. Read-aloud suits low-literacy users.
- Scheduled runs flag at-risk items and write the result onto the record [G2].
- Decision sections "ready to approve / to review / ready to reject" [R1]; Inbox "Priority" and "Other" tabs [L2].
- Avoid: ranking by engagement, as Linear Pulse's "Popular" does [L12].

**(e) Animal record. Strongest: Attio**
- Name on top, actions under it; a resizable "Record Details" column with named sections and attribute search [A1][A2]. Up to six highlights on Overview [A2].
- Tabs: Overview, Activity, Notes, Tasks, Files, plus relationship tables (cases, procedures) [A1].
- Right-click a value for "View edit history", which shows who or what changed it. Enter saves an inline edit [A1][A4]. Add a 5–10 s Undo toast [V7]; an Attio Undo toast is (unverified).
- List preview opens on the right, keeps the row lit, resizes, and moves with ↑/↓ while showing "1 of 500" [A1].
- Avoid: an AI summary above the facts [A2]. Kaju's summary stays folded.

**(f) Case record with timeline. Strongest: Attio Activity, plus SORMAS structure**
- One timeline holds events, notes, attribute changes and tasks (overdue, upcoming, done), filterable by type, with the filter remembered [A1][A5].
- SORMAS case sections: Case data, Person, Hospitalization, Symptoms, Epidemiological data, Therapy, Follow-up, Clinical course, Contacts [S5†].
- Cases close automatically after a set time (default 90 days); linked contacts, samples and tasks close with them; archives are write-protected [S2].
- Macro actions are written into the timeline [I5†].
- Avoid: entries like "status A→B" with no person or reason.

**(g) Intake inbox and assignment. Strongest: Intercom, plus Linear Triage**
- List with a preview on the right. L switches to a table with configurable columns; select several, then Assign [I1][I2].
- Assigning a person keeps the team assignment. An away person's items return to the team; team inboxes can rotate (round robin) [I2].
- The SLA badge shows the nearest deadline: grey over 5 min, orange under 5, red overdue, "paused" while snoozed. Sort by "Next SLA target" [I3]. Map red to flame, orange to amber.
- Linear triage keys: Accept 1, Decline 2, Duplicate 3 (merges into the original), Snooze H (until a time or new activity). Priority can be required; AI suggests assignee and duplicates [L4]. That is Kaju's role here.
- Avoid: bulk actions that skip items silently [I2]. Say "3 skipped, and why".

**(h) Field mobile capture, offline queue and follow-ups. Strongest: CommCare**
- The unsent count sits under the home Sync button [C1].
- Incomplete forms are saved encrypted. Reopening the case offers resume or "delete old copy"; keep that short, since the case can go stale [C1].
- One question per screen with Next and Back; single-choice questions advance by themselves; inline notes are green, yellow or red [C3†].
- The phone list fits about two columns; tag IDs are searchable but hidden; barcode search; follow-ups "due in 7 days", urgent first [C2†][C4†].
- GPS accuracy is always visible; map areas download for offline use [F3].
- Avoid: CommCare's unsent forms, which cannot be viewed one by one [C1]. List each queued record.

**(i) Veterinary sign-off and evidence review queue. Strongest: Ramp**
- Only items with complete requirements reach the Inbox. Tabs: Needs review, Flagged, Fully approved [R2].
- Each item's feed shows the rationale, the policy text cited and its version, and updates when new evidence arrives [R1]. Flags such as "duplicate" or "previously used" map to a reused release photo [R1].
- Rejecting means "Request changes" (a thread attached to the item) or "Request repay". "Remind" chases what is missing [R2].
- Approve by group checkbox; there is no bulk undo, but one item can go back to the previous approver [R2]. Thumbs up or down on each assessment; overrides are logged [R1].
- Avoid: auto-approval [R1]. DESIGN forbids automatic clinical approval; bulk is for non-clinical evidence only.

**(j) Report packages and approval history. Strongest: Ramp, plus GovDash**
- Every figure traces to its source [G1]: each package number opens the records it counts.
- Exceptions need a written justification, logged with time and approval path [R3†]. A correction is a new entry; the original stays (Ramp blog) [R4†].
- Each state has an internal and a public label, with a notice on change. A reply moves "waiting" back to "in progress" automatically [I6†].
- Avoid: approval that releases money with no undo [R5†]. Acceptance is not payment.

**(k) Hospital bite/exposure record and treatment course. Strongest: OpenMRS O3**
- A fixed patient header; dashboards listed on the left [O2†].
- Data entry happens in a "workspace": a side panel on desktop, full screen on the phone. It persists across pages; opening the same type brings it forward; closing unsaved asks first [O2†].
- A visit must start before forms. Each form submission is an encounter of coded observations [O1†]: exposure → doses → vaccine, batch, site.
- Order basket on the right, then "Sign and close", with errors shown on each order [O3†]. The dose course is the basket, signed by the clinician.
- Avoid: Kaju proposing doses; StrayPaw records decisions, never makes them.

**(l) Laboratory sample tracking. Strongest: SORMAS**
- A sample belongs to a case, contact, event participant or the environment; the status map colours by which [S4†].
- Results: positive, negative, pending, indeterminate [S6†].
- An incoming lab result attaches automatically only when it matches one person; a possible duplicate goes to a human; a date window decides existing case or new one [S3].
- Shipped, received, adequate and referred steps: (unverified).
- Avoid: merging uncertain matches automatically.

**(m) Municipal review queue, contracts and ward map. Strongest: Ramp (queue), Felt (map)**
- Review tabs as in Ramp, with a change-request thread [R2]. Contract changes are approved or rejected one by one [G1].
- Map: legend on the left; detail panel on the right (Style, Filter, Data); table at the bottom (T). Controls depend on access (Edit, Contribute, view-only) [F1].
- Clicking a bar filters the map, and Reset clears it. "Update based on view" is an explicit setting [F2].
- Avoid: a map without a table equivalent.

**(n) Spatial and research analytics. Strongest: Metabase, plus Felt**
- Clicking a point offers: Filter by this value, View these records, Break out by time/location/category, Zoom in, See this month by week, Automatic insights [M2].
- Cross-filtering lets one chart filter the dashboard; custom destinations pass the clicked value [M1].
- Verified badges are removed when the item is edited [M3†]. Drag across a histogram or time series to filter a range [F2].
- Avoid: drilling to raw rows on public views (Metabase disables it) [M4†]. Keep small-count suppression.

**(o) Staff training. Strongest: TalentLMS**
- A "My training" card shows the courses, a progress bar and an expiry badge [T1†].
- Finishing a course assigns the next one; team paths carry over to new members [T4][T5†]. Due dates and hard end times [T2†].
- Certification events: acquired, expiring in X hours, expired [T3†]. Offline download, with progress synced later [T7†].
- Avoid: a separate portal. Link the two-minute unit from the control it teaches (unverified as a TalentLMS feature).

**(p) Kaju in context. Strongest: GovDash Dash, plus Linear's Agent Interaction Guidelines**
- Opens on any record with context; named one-click actions ("Prepare the October package") [G1]. "Every answer cites its source, and every change waits for your approval" [G1].
- A run log of inputs, tool calls, outputs, errors and changes; any run can be opened and followed up [G2][G3]. Assumptions and gaps stated, "not vague 'AI confidence'" [G4].
- It says it is an agent, acknowledges at once, shows thinking/waiting/executing/finished, stops when asked; a human stays accountable [L13]. First reply within 10 s [L14†].
- A draft to edit, with sources under it; internal sources are marked [I7†]. Kaju sees only what the person sees [G3].
- Avoid: confidence percentages, or agents that run before their setup is reviewed [G2].

**(q) Citizen reporting (public, no account). Strongest: Intercom tickets, plus Linear Asks**
- Public state labels separate from internal ones, with a notice on each change [I6†].
- Confirmation when filed; messages when completed or cancelled, with copy we can edit [L16†].
- A form built from a template, one question per screen, location by crosshair with "Add point" and an accuracy readout [L16†][C3†][F3].
- Duplicates merge into the original [L4].
- Avoid: Linear's web forms, which require sign-in [L16†].

## 2. Cross-cutting

- **Provenance and audit:** every value answers "who or what changed this" [A1]. Decisions show their rationale, the policy cited and its version [R1]. Kaju runs log their tool calls [G2]. Label every actor: a person, Kaju, or an import.
- **Permissions and roles:** show only the controls a person can use (Felt: Edit, Contribute, or nothing) [F1]. ⌘K items follow permissions [I4]. Ramp employees never see AI assessments [R1]. SORMAS hides cases outside the person's area [S2]. Metabase drill-through needs query permission [M2].
- **Uncertainty and data quality:** verified badges that drop when edited [M3†]; three recommendation buckets instead of scores [R1]; assumptions and gaps [G4]; the scope stated ("counts only what is in view") [F2]; "pending" and "indeterminate" kept as results [S6†]; no automatic match when ambiguous [S3]. Keep "Not read", never zero.
- **Empty and loading:** match the empty-state type to the case; one verb-and-noun action; errors with a request ID and "Try again", announced politely [V5]. Skeletons match the final size, shimmer off under reduced motion, region marked busy [V6]. An error that needs fixing stays visible in its row [V7].
- **Keyboard and commands:** G then I, O then V, ? lists keys, / searches, J/K move, Space peeks (hold it), ⌥V saves a view, ⌘Z/⇧⌘Z undo and redo [L2][L3][L9][L10†][L11†]. Single-letter keys only outside the text box [I4]. Never make a key the only path for field staff.

## 3. Ten details that separate premium from average

1. Submenus that stay open on a diagonal mouse path (a "safe triangle") [L8].
2. Undo for almost everything, and 5–10 s Undo toasts only where undoing is safe [L11†][V7].
3. Previewing a record without losing your place: the row stays lit, with "1 of 500" [A1][L10†].
4. Changing place keeps you on the same page [V3].
5. Shortcuts taught in ⌘K and right-click menus [L8][I4].
6. ⌘K remembers recent items, the query and focus [V4].
7. Deadline badges with stated thresholds and a "paused" state [I3].
8. Filters stay personal until "Save for everyone" or "Save as new view" [A3†].
9. An agent's state is always visible, and it stops when asked [L13].
10. Exact-size skeletons, and a dimmer sidebar so the work leads [V6][L6].

## Sources
- L1 https://linear.app/docs/conceptual-model
- L2 https://linear.app/docs/inbox
- L3 https://linear.app/docs/custom-views
- L4 https://linear.app/docs/triage
- L5 https://linear.app/blog/how-we-redesigned-the-linear-ui
- L6 https://linear.app/changelog/2026-03-12-ui-refresh
- L7 https://linear.app/changelog/2024-12-18-personalized-sidebar
- L8 https://linear.app/blog/invisible-details
- L9 https://linear.app/enablement/guide/navigating-linear
- L10 https://linear.app/docs/peek
- L11 https://linear.app/changelog/undo-actions
- L12 https://linear.app/docs/pulse
- L13 https://linear.app/developers/aig
- L14 https://linear.app/developers/agent-interaction
- L16 https://linear.app/docs/linear-asks
- A1 https://attio.com/help/reference/managing-your-data/records/create-and-view-records
- A2 https://attio.com/help/reference/managing-your-data/records/configure-record-pages
- A3 https://attio.com/help/reference/managing-your-data/views/filter-and-sort-views
- A4 https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views
- A5 https://attio.com/changelog/2026/new-activity-timeline
- G1 https://www.govdash.com/platform
- G2 https://www.govdash.com/blog/ai-agents-built-for-the-way-govcon-works
- G3 https://www.govdash.com/platform/dash-agents
- G4 https://www.govdash.com/blog/dash-now-surfaces-chain-of-thought
- V1 https://vercel.com/changelog/new-dashboard-navigation-available
- V2 https://vercel.com/changelog/dashboard-navigation-redesign-rollout
- V3 https://vercel.com/changelog/improved-experience-for-moving-between-your-teams-and-projects
- V4 https://vercel.com/geist/command-menu
- V5 https://vercel.com/geist/empty-state
- V6 https://vercel.com/geist/skeleton
- V7 https://vercel.com/geist/toast
- I1 https://www.intercom.com/help/en/articles/6258745-the-inbox-explained
- I2 https://www.intercom.com/help/en/articles/6561699-assign-conversations-to-teammates-and-teams
- I3 https://www.intercom.com/help/en/articles/6546152-set-slas-for-conversations-and-tickets
- I4 https://www.intercom.com/help/en/articles/6272267-how-to-use-command-k-with-intercom-inbox
- I5 https://www.intercom.com/help/en/articles/6584504-using-macros-in-the-inbox
- I6 https://www.intercom.com/help/en/articles/8687982-customize-ticket-states
- I7 https://www.intercom.com/help/en/articles/8587194-how-to-use-copilot
- C1 https://dimagi.atlassian.net/wiki/spaces/commcarepublic/pages/2143947406/CommCare+Form+Management+Features
- C2 https://confluence.dimagi.com/display/commcarepublic/Case+List+and+Case+Detail+Configuration
- C3 https://confluence.dimagi.com/display/commcarepublic/Advanced+CommCare+Android+Formatting
- C4 https://dimagi.com/social-impact-program-case-management-techniques
- R1 https://support.ramp.com/use-policy-agent-for-approvals
- R2 https://support.ramp.com/hc/en-us/articles/4417421399699-Reviewing-transactions-from-Ramp-cards
- R3 https://ramp.com/answers/policy-enforcement/can-violations-be-overridden-or-approved
- R4 https://ramp.com/blog/what-are-audit-trails
- R5 https://support.ramp.com/reviewing-reimbursements
- F1 https://help.felt.com/getting-started/tour-the-interface
- F2 https://help.felt.com/dashboards-and-apps/components
- F3 https://help.felt.com/field-app/tour-the-field-app
- M1 https://www.metabase.com/docs/latest/dashboards/interactive
- M2 https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/questions/drill-through
- M3 https://www.metabase.com/docs/latest/exploration-and-organization/content-verification
- M4 https://www.metabase.com/docs/latest/embedding/public-links
- S1 https://sormasfoundation.atlassian.net/wiki/spaces/SORMAS/pages/32866340/Contacts
- S2 https://sormasfoundation.atlassian.net/wiki/spaces/SORMAS/pages/32866327/Cases
- S3 https://sormasfoundation.atlassian.net/wiki/spaces/SORMAS/pages/53706882/Automatic+Lab+Message+Processing
- S4 https://sormasfoundation.atlassian.net/wiki/x/DQDsAQ
- S5 https://sormasfoundation.atlassian.net/wiki/spaces/SORMAS/pages/22642971/Glossary
- S6 https://sormas.org/?p=283
- O1 https://openmrs.atlassian.net/wiki/spaces/docs/pages/515899478/OpenMRS+Information+Model
- O2 https://openmrs.atlassian.net/wiki/spaces/docs/pages/150962924/Launching+Workspaces
- O3 https://openmrs.atlassian.net/wiki/spaces/projects/pages/962756610/Order+Sets+in+OpenMRS+O3
- K1 https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp
- K2 https://clerk.com/docs/guides/organizations/invitations
- K3 https://clerk.com/docs/guides/organizations/verified-domains
- K4 https://clerk.com/docs/guides/development/add-onboarding-flow
- K5 https://clerk.com/docs/guides/configure/session-tasks
- T1 https://help.talentlms.com/hc/en-us/articles/22625862311708-What-is-the-Learner-experience-with-Learning-Paths-in-TalentLMS
- T2 https://help.talentlms.com/hc/en-us/articles/9651387967004-How-to-work-with-assignments-in-TalentLMS
- T3 https://help.talentlms.com/hc/en-us/articles/9651467334044-How-to-work-with-notifications-in-TalentLMS
- T4 https://www.talentlms.com/blog/talentlms-september-2026-release/
- T5 https://www.talentlms.com/blog/talentlms-july-2026-release/
- T6 https://help.talentlms.com/hc/en-us/articles/9651391053212-How-to-assign-courses-to-users-upon-registration-in-TalentLMS
- T7 https://www.talentlms.com/blog/talentlms-mobile-app/
