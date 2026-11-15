# KAJU — AI TEAMMATE, RAYCAST-GRADE EXPERIENCE

## Positioning
**Kaju isn't an assistant that describes what to do. It completes the permitted administrative work, coordinates other people and follows through until a real outcome is reached.** Chat + tool-using agent + recurring automation + insights + connected assistant + proactive intelligence + org memory.

## Two surfaces, one continuous context
**Compact:** invocable from any page (keyboard and button), aware of *current permitted* record/list/channel; can quick-answer, draft/update, create a task, open a record or expand. Interface resembles focused Raycast Quick AI: crisp composer, small high-value results, no modal maze.
**Full Kaju page:** Raycast-like conversational centre with side sections for Missions, Automations, Approvals, Insights, History and Files. User can see progress, inspect sources, preview generated artifacts, approve changes and switch to/from compact without losing state. Missions visually borrow Inngest run steps but show plain-language events, e.g., 'Waiting for supervisor approval' rather than API logs.

## Kaju's SIX operational modes
1. **Ask:** explain, summarize, locate, compare, chart, map, answer with source-backed links. Never invent sensitive data.
2. **Do:** write records, assign tasks, prepare evidence, draft/send approved messages, schedule/calendar updates, prepare exports; API tools enforce permissions.
3. **Monitor:** watch due tasks, missing evidence, stock freshness, referrals and external replies even when user closes browser.
4. **Automate:** recurring rules / natural-language playbooks with triggers, source, audience, action and escalation.
5. **Insights:** measure trends, quality gaps, anomalies, workload and next best actions; show denominator/source/method and explain uncertainties.
6. **Coordinate:** across authorised teams and partners; conversations to tasks; remind, chase, route, confirm acknowledgement, escalate and finish.

## Pre-submit intent composer — CRITICAL CREATIVE FEATURE
Inspired by the user's requested 'AI understands while typing, lets me correct it, then I submit **once**' flow.

As user types `Prepare next week's vaccination followups for Ward 12, assign to Ana, and notify the team`, an *asynchronous, cancellable, cost-aware* parser recognizes spans without posting the full prompt:
- **Action:** Prepare follow-up assignments.
- **Date:** next week [calendar picker/edit].
- **Geography:** Ward 12 [select from permitted wards].
- **Assignee:** Ana [resolve to authorized member; ask if multiple matches].
- **Notify:** Team [choose channel or users].
- **Records:** [preview filtered qualified records and size].

Render subtle underlines beneath understood spans; tapping shows small editable menu, not giant chips everywhere. Show a short action preview as intent becomes clear. Highlight unresolved ambiguity once, inline. After the user confirms the complete intent and presses **Run** or **Prepare**, send the single canonical structured request; do not do background writes while parsing. User may opt out of predictive UI; support IME, speech dictation, keyboard and screen readers. Unrecognized clauses stay untouched and visible. Avoid intrusive requests while typing. Early parsing must be isolated from privileged data access.

## Command and results interactions
- `/` and `⌘K`/`Ctrl K` to summon; type to search permitted actions; `/run`, `/ask`, `/summarize`, `/report`, `/followup`, `/create`, `/insights` can be suggestions rather than rigid commands.
- Support attachments, voice input, screenshots/photos where consented, files, relevant record links and context chips.
- Outputs should be interactive objects: table, map, timeline, draft email, change preview, approval queue, generated report; not walls of plain chat text.
- Progressive disclosure: short response -> expand evidence/source -> edit plan -> approve eligible action.
- Suggested prompts must come from actual current context, never irrelevant generic marketing lines.

## Permissions and autonomy — MUST IMPLEMENT
- **Level 0 Read:** answer/explain from authorized context, cite underlying records, no write.
- **Level 1 Draft:** create reversible private drafts, schedules and plans; preview required.
- **Level 2 Auto low-risk:** pre-authorized internal reminders, status from deterministic events, alerts and routine task updates with audit; user/organization configurable.
- **Level 3 Ask approval:** external communication where not previously opted-in, cross-org sharing, bulk changes, case merges, submission sends, referrals, significant tasks.
- **Level 4 Human-only:** clinical treatment/dosing/diagnoses, laboratory result validation, government verification/claim approval, grant/access of restricted data, public declaration of outbreak or serious emergency assessment.
Different orgs can customize narrower policies; never expand beyond server role ACL, explicit consents and jurisdiction-specific clinical/legal rules. Show 'why approval?' and allow approve/reject/edit with a trace.

## Durable execution and failure recovery
Each mission stores: owner/scope, trigger, input/context refs, plan, tool calls, idempotency keys, policy decisions, status, progress, approvals, notifications, retries/backoff, errors, deadlines and final evidence. States: Draft, Ready, Running, Waiting on person, Waiting on partner, Retrying, Blocked, Completed, Canceled. Kaju must be able to resume across sessions and handoff to humans rather than pretending a failed operation succeeded.

## Connected data and communications
Gmail/Outlook, WhatsApp Business (Meta-approved), Calendar, Drive/docs/sheets, StrayPaw records/channels and additional provider adapters where useful. Use least privilege; connect personal app data only after explicit user consent; connector boundaries per user/org; clear disconnection/revocation. No reading others' private email or WhatsApp simply because of shared workspace membership.

## Organization memory
- Context layers: personal preferences (consented), org SOPs/templates (approved), programme/project memory (scoped), conversation/thread summaries (permissioned), workflow history (auditable).
- Store references + source validity, not indiscriminate raw sensitive conversation dumps. Expiration and delete/revoke controls.
- Example: 'How do we usually prepare our government ABC evidence?' -> show established SOP, current records and a reusable mission. No unsupported guesses.

## Proactivity without noise
Daily 'what matters' digest, exceptions-only alert inbox, due follow-ups, reply tracking, suggested bulk actions and resolved follow-up notes. Organization can choose cadence/quiet hours. High-risk alerts never silently suppressed. Avoid compulsive notification spam and misleading success metrics.

## Kaju's visual quality and delight
Raycast style crisp prompt and focus; transition compact -> full screen with shared-element spring; content previews fade/slide; suggestion underlines respond to hover/keyboard; tool runs show animated step icon and meaningful status; approval creates tactile transition; completion uses a small drawn check, settled progress line, subtle surface change or number tick (never confetti). Motion restrained during emergencies and under reduced-motion settings.

## Model and services
Claude API can provide reasoning and agent planning, but workflows need deterministic services for scheduling, message delivery, treatment order execution, duplication enforcement, validation, event sourcing and audit. Tool calls enforce org/role policy and structured input schema; model outputs are untrusted proposals until validated. Background jobs must not depend on leaving chat open. Design model-agnostic interface to avoid vendor lock.

## Metrics worth surfacing
Approved tasks actually completed, median time to first response, manual entry minutes saved (measured/estimated transparently), overdue case resolution, evidence correction cycles, PEP follow-up attempts and clinician-confirmed completions, lab TAT, partner handoff lag, Kaju failure/retry/approval rates, false positive AI suggestions. No invented 'hours saved' without method.
