# Automations audit against the automation matrix

**What was audited:** `docs/rebuild/handoff/03_Engineering/08_AUTOMATION_MATRIX.md`: the 30 automation rows, the
implementation schema (AutomationDefinition, MissionRun), the communications consent section and the AI quality and
safety tests. Each was checked against the code and tests on this branch.

**Date:** 2026-11-15.

**Method:** the code and the tests were read. No test, server, database or network service was run for this audit.
Where this file says a test exists, the test is in the repository and asserts the behaviour. It does not mean the test
was seen passing today.

**Status words**
- **Verified**: the code exists and a named automated test exercises it.
- **Built, not yet verified**: the code exists, but no test proves it.
- **Blocked (external)**: it works up to an owner action in `docs/rebuild/OWNER_ACTIONS.md` (the item number is given).
- **Incomplete**: something is missing or partial, and the row says exactly what.

**How a row was judged.** A row is Verified only when four things are all present: its trigger, the work Kaju does,
the decision boundary and the completion measure, with a test that exercises that path. If any of the four is missing,
the row is Incomplete. Its built and tested parts are still named. Some browser tests run on the signed-out sample
data in `src/nx`. Those tests show that the screen works. They do not show that the automation works, so they do not
count as proof.

**Which tests count**
- In CI (`.github/workflows/dev-check.yml:46-82`): `test:db`, `test:routes`, `test:kaju-polish` (which also runs
  `scripts/test-kaju-automations.ts`), `test:kaju-reliability`, `test:report-isolation`, `test:connections`,
  `test:kaju-planner`, `test:notify-delivery`, `test:inference-off` and the Playwright suite.
- In the repository but not run in CI: `test:kaju-intake`, `test:careos-webhook`, `test:package-check`,
  `test:auto-approve`, `test:state-machines` and `test:operational-cohorts`. These are marked "(not in CI)".
- Staging scripts (`scripts/test-one-health-permissions.ts`, `scripts/staging/*.mjs`) need staging credentials and the
  network. These are marked "(staging script)".

**Four facts that affect many rows**
1. The automation rules only count things and send in-app notifications (`nx_automation_run`,
   `supabase/migrations/20261116140000_rebuild_automations_v2.sql:137-243`). No rule starts a mission, creates a task,
   follows up or escalates when nobody answers. The one exception is the lead notice in `overdue_tasks`.
   `nx_missions.source` accepts the value `'automation'` (`20261116110000_rebuild_kaju_engine.sql:87`), but nothing
   ever sets it. So every row whose work is "remind, then escalate, then record the outcome" stops at the first notice.
2. The scheduling inside the database depends on pg_cron. The jobs `nx-automations-tick` and `nx-mission-tick` are
   only scheduled if the pg_cron extension is installed (`automations_v2.sql:263-268`, `kaju_engine.sql:529-534`).
   Nothing in the repository checks that the jobs exist. No test calls `nx_automations_tick`. `nx_mission_tick` is
   called by `test:db`.
3. `test:db` runs 4 of the 15 rules: `overdue_tasks`, `pep_doses_due`, `pep_missed` and `pep_reminders`
   (`scripts/db-tests/run.mjs:235-265`). In the test schema, the stand-in `animal_followups` table has no `ngo_id`
   column (`scripts/db-tests/base.sql:27`). As written, `followups_due` and `weekly_summary` could not run there.
4. The older NGO reporting rules (`automation_run` and `automation_due` in
   `supabase/migrations/20261113120000_automations.sql`) have no test. That migration is not in the list `test:db`
   applies.

## 1. The 30 rows

| # | Trigger | What exists | Decision boundary as built | Test that proves it | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | New approved WhatsApp citizen report | A signed webhook, `src/app/api/careos/webhook/route.ts`. It returns 503 until `WHATSAPP_VERIFY_TOKEN` and `WHATSAPP_APP_SECRET` are set. It checks `X-Hub-Signature-256`, turns the payload into jobs keyed by Meta's message id (`toJobs`, `src/lib/careos/webhook.ts`) and calls `careos_enqueue`. Intake: `fromJob` and `groupByThread` (`src/lib/careos/intake.ts`), then `planIntake`, which extracts the facts, finds the case type and the city or location, checks for an open-case duplicate and returns proposals. The Inbox WhatsApp tab uses `careos_inbox_list` and `careos_inbox_act` (`src/nx/data/ngo.ts:289-293`). **Missing:** none of `careos_enqueue`, `careos_inbox_list` or `careos_inbox_act` is defined by any migration in this repository. No acknowledgement reply exists, permitted or otherwise. Delivery statuses are parsed into jobs, but nothing in this repository stores them. | D is enforced for the record. Intake returns proposals only. An animal is linked only on an exact tag, and a locality match is offered but never linked. The "A for permitted acknowledgement" part is not built. | `test:kaju-intake` (not in CI): "a WhatsApp webhook fixture becomes one masked, prepared report through the same planner" and "a locality match is offered for comparison, never linked automatically…". `scripts/test-careos-webhook.ts` (not in CI) checks the signature and the job keys. | **Incomplete** (also needs OWNER_ACTIONS 7) |
| 2 | Inbox email about vaccination evidence | The Gmail tool `find_email` reads only metadata and snippets, wrapped as untrusted text (`src/sp3/ai/connectTools.ts:107-109`). `draft_email` returns a proposal. **Missing:** nothing triggers on incoming email (no watch and no polling). No step matches an email to a programme, builds an evidence checklist from it or tracks a reply deadline. | D for sending is enforced: the email is only a proposal, and a mission's `send_external` step waits for approval. Matching an email to an organisation or programme is not built. | `test:connections`: "an email is a proposal; send is off unless the account allows sending; bad addresses dropped" and "Gmail search reads metadata and snippets, never full bodies". | **Incomplete** (also needs OWNER_ACTIONS 8) |
| 3 | NGO coordinator asks for daily plan | The "Prepare follow-ups" plan (`src/lib/kaju/registry.ts:100-106`): `find_due_followups` (level 0), then `create_followup_tasks` (level 3), then `post_message`, run by `nx_tool_exec`. There is also the `weekly_summary` rule and the `work_summary` tool. **Missing:** worker availability, a proposed schedule or route, a record of acknowledgements, conflict detection and a daily digest. The only digest is weekly. | D for assignment is enforced: `create_followup_tasks` is level 3 (`kaju_engine.sql:29`) and waits at `kaju_engine.sql:369-374`. A for the internal digest exists only weekly. | `test:db`, section "Kaju missions: approval, idempotency, retries": "creating several tasks waits for approval", "nothing is created before approval" and "two tasks are created, none for the case that had one". `test:kaju-planner`: "creating several tasks waits; finding and posting do not". No test for `weekly_summary`. | **Incomplete** |
| 4 | Field task overdue | The `overdue_tasks` rule (`automations_v2.sql:153-164`). Each assignee is told about their own overdue tasks. Leads are told only about tasks overdue by more than `params.days` (default 3). **Missing:** no entry on the case timeline, no record of an acknowledgement or a reason, no prompt to reschedule. Outreach to third parties is not built. | A within rules is enforced: the notices stay inside StrayPaw, and nothing is reassigned or closed. D for third parties: not built, so nothing is sent outside. | `test:db`, section "Automations for every workspace": "a member cannot turn automations on", "overdue tasks are found", "the assignee is reminded about their own task" and "the same day is never delivered twice". No test checks the lead escalation. | **Incomplete** |
| 5 | Voice/photo field update | Field mode capture with an offline outbox. Text intake through `prepare_intake` and `extract_field_message`. A photo appears in the intake text as `[photo received]` (`src/lib/careos/intake.ts:17-19`). **Missing:** there is no voice transcription anywhere in `src`, no photo analysis and no form fields proposed from audio. Keeping the source audio depends on the CareOS backend, which is outside this repository. | D for merging an animal is enforced for text intake, which never links an animal on locality alone. | `test:kaju-intake` (not in CI): "an exact tag links the animal…" and "a locality match is offered for comparison, never linked automatically…". | **Incomplete** |
| 6 | Animal possible duplicate | The `possible_duplicates` rule counts `dogs.identity_state = 'possible_duplicate'` and tells leads (`automations_v2.sql:168-170`). A person sets that state in field mode (`20261103004523_offline_intake_and_lifecycle.sql:134-136`). The `find_duplicates` tool groups animals with the same name and locality (`src/sp3/ai/tools.ts:243-257`). No merge function exists. **Missing:** candidates are not compared on identifiers, photos or history. There is no record of a person accepting or declining a candidate pair. | H is enforced: neither Kaju nor a rule has any way to merge records. | No test for the rule. `test:kaju-intake` (not in CI) covers "never linked automatically". The e2e "Inbox: … a suggested match stays a suggestion" runs on sample data. | **Incomplete** |
| 7 | Upcoming animal recovery/follow-up | The `followups_due` rule counts `animal_followups` due by tomorrow and tells leads (`automations_v2.sql:165-167`). The `overdue_followups` tool proposes reschedules for a person to confirm. **Missing:** no visit or task is created from the plan, the assignee is not told and nothing escalates when a visit is not recorded. | A for the routine count. H for plan changes is enforced: the rule writes nothing to the plan. | No test for the rule, which cannot run on the test schema (`base.sql:27`). For the tool, `test:kaju-automations`: "overdue follow-ups come back as at most six reschedules to confirm, never as saved changes". | **Incomplete** |
| 8 | ABC/ARV submission approaching | Six fixed checks in `kaju_refresh_checks` (`20261101094041_kaju_recurring_insights.sql:40-80`): missing evidence, waiting for a vet, an open question from the office, a reporting deadline set by a lead, a quiet programme and overdue follow-ups. They run daily through `/api/admin/kaju/checks` (`vercel.json`, 04:00 UTC). The NGO reporting rules tell leads (`automation_run`, `20261113120000_automations.sql:111-178`). The `claim_draft` tool drafts the claim and lists the records still blocked. **Missing:** no correction tasks are made from the findings, there is no check for inconsistent dates and no packet is prepared when the deadline nears. | D for sending the packet is enforced: `claim_draft` never submits. H for government acceptance is enforced: `verify_claim` is level 4. | `test:kaju-automations`: "every automation reports a failed read as a failure, never as empty data", which includes `claim_draft`. `test:package-check` (not in CI). Staging script `scripts/staging/insights-check.mjs`. No test for `automation_run` or `automation_due`. | **Incomplete** |
| 9 | Govt verification batch arrives | `check_package` (`src/sp3/ai/packageCheck.ts`) compares each claim with its evidence, sign-offs, rate, arithmetic and repeats, and drafts review notes. Also the `office_brief` tool and the `packages_waiting` rule (`automations_v2.sql:212-216`). **Missing:** anomaly scores. Nothing fires when a batch arrives: the rule is a daily count of waiting packages. | H is enforced: `verify_claim` is level 4 and never runs (`kaju_engine.sql:33`, `364-368`). The office brief decides nothing. | `test:db`: "a decision only a person can make is never run by Kaju" and "the person marks it done and the mission continues". `test:kaju-automations`: "the office brief pre-checks waiting packages and links each one; it decides nothing". `test:package-check` (not in CI). No test for `packages_waiting`. | **Incomplete** |
| 10 | Campaign weekly update | The `post_message` tool (level 2) posts a fixed text in a channel. The `programme_report` and `ward_activity` tools answer on request. **Missing:** no weekly campaign update is scheduled. No message is prepared with verified and unverified counts and dated denominators. No draft is made for publication outside StrayPaw. | A for the internal post exists. D for publication outside: not built. | `test:db`: "Kaju posts once in the channel, attributed". The coverage tests in `test:kaju-automations` cover the tool only. | **Incomplete** |
| 11 | Ward has data/coverage gap | The `ward_activity` tool shows recorded coverage, with unknown status kept apart, and drops or spikes against each ward's own history (`src/sp3/ai/automations.ts`). Programme coverage is shown only where a dated estimate exists. This only detects the gap. **Missing:** no outreach is proposed. Staff capacity and geographic clusters are not analysed. No acceptance or rejection of a recommendation is recorded. | Nothing is decided for anyone, but nothing is proposed either. | `test:kaju-automations`: "a drop or spike is flagged only against enough earlier activity; a quiet ward is never a "drop"", "ward coverage counts unknown status separately and never as "no"" and "rows without a ward are not invented into one". | **Incomplete** |
| 12 | Citizen bite report | Public bite help (`src/oh/BiteChat.tsx`) gives wound-washing guidance and says "see a doctor today". It does not assess the wound. An optional notice goes through `oh_submit_bite_notice` (`20261110230655_one_health_v2_2_workflows.sql:275-295`) into `health.citizen_notices`, routed to the nearest listed facility. A callback number is kept only with consent. **Missing:** no draft handoff to the animal team. Only one facility is suggested. The clinic acknowledges by changing a status by hand. | "No diagnosis" is enforced: the text is fixed and no model is involved. Clinical triage is left to staff. | None in CI. The staging script `test-one-health-permissions` checks only that the public finder carries no patient data. Nothing tests the notice. | **Incomplete** |
| 13 | PEP appointment scheduled by clinician | Only a clinician enters dose dates: `oh_prescribe` (`v2_2_workflows.sql:114-131`) checks the role and that the dates are in order. Three rules, `pep_doses_due`, `pep_missed` and `pep_reminders` (`automations_v2.sql:182-199`), queue reminders in `health.reminder_outbox`. A reminder is queued only where `reminder_consent` is set and a phone number exists. It uses a fixed template, at most one per dose per day. Staff see a masked log through `nx_pep_reminders`. The delivery worker (`src/app/api/admin/notifications/deliver/route.ts:53-66`) marks each reminder `not_connected` until MSG91 is set up, and retries with backoff (`nx_pep_outbox_mark`). Staff record a given dose with `oh_record_dose`. | A under an approved protocol is enforced: the content is fixed and consent is required (CHECK at `20261110230441_one_health_v2_1_core.sql:397`). H for medical changes is enforced: the rules never write doses. | `test:db`: "doses due today are counted from the clinician's schedule", "the nurse is told, with a count and no patient details", "a missed dose is flagged for the clinical team", "a reminder is queued only for the patient who consented", "staff see the reminder with the number masked", "nobody outside the clinic sees it", "the reminder queue itself is not readable through the API" and "running it again the same day queues nothing new". **Not tested at audit time:** the worker's sending path and the retry and backoff in `nx_pep_outbox_mark`. Since then: `test:db` "PEP reminders: sent only while they still hold, retried, then given up" and the PEP checks in `test:notify-delivery` (the sending loop, moved to `src/lib/notify/pep.ts`). Writing them found that a queued reminder was sent even after the dose was given, the course stopped, consent was withdrawn or the number changed; `20261117120000` cancels those, with the reason. | **Blocked (external)**: OWNER_ACTIONS 6 |
| 14 | PEP reminder missed/no response | `pep_missed` tells the clinical staff, with a count only. Staff log call outcomes with `oh_log_reminder` (`health.reminder_log`) from the exposure record. **Missing:** a consenting patient gets no follow-up reminder for a missed dose, because `pep_reminders` covers only doses due today or tomorrow. The SMS loop (`route.ts:57-66`) has no quiet hours for patients. Nothing links staff acknowledgement to the flag. | H for treatment decisions is enforced: nothing is rescheduled. | `test:db`: "a missed dose is flagged for the clinical team". | **Incomplete** |
| 15 | Referral pending receipt | The `referrals_waiting` rule counts `oh_handoffs` sent to the organisation and still open after N hours, and tells the receiving organisation's leads (`automations_v2.sql:200-202`). **Missing:** patient referrals are stored in `health.transfers` (status `sent`), which this rule does not read. Nothing is requeued or escalated to the sender, and no proof of acceptance or rejection is captured beyond the existing statuses. | A for the routine notice. H for rerouting is enforced: the rule changes nothing. | None at audit time. Now `test:db`: "a patient referred here and not yet arrived is counted", "the notice names no patient", and the follow-up checks (acknowledged with an outcome, raised with the leads once, closed when nothing is left). | **Verified** (since the audit: `20261116170000` and `20261116180000`) |
| 16 | Facility vaccine/RIG availability stale | Every confirmation expires within 14 days (CHECK at `v2_1_core.sql:222`). `oh_service_now` shows an expired entry as `not_verified` (`20261111100000_one_health_v2_4_network_alerts.sql:52-58`). There is also the `services_stale` rule (`automations_v2.sql:203-205`). **Defect:** `oh_service_status` gets a new row for every confirmation (`v2_2_workflows.sql:323`). The rule counts every row older than the limit, old ones included, instead of the latest row per service as `oh_service_now` does. A facility that confirms every day is still told its services are out of date. **Missing:** suggesting verified alternatives for a person to review. | A for the internal request is enforced, and nothing is shown as "available now" without a current confirmation (`oh_service_now`). D for a suggestion shown to patients: not built. | None for the rule or for `oh_service_now`. The e2e tests "Facilities: services as last confirmed…" and "Partners: … services shown as last confirmed" run on sample data. | **Incomplete** |
| 17 | Wound-wash location enquiry | `/bite-help` (`src/oh/BiteChat.tsx`) shows fixed first-aid text. Its list of centres comes from `oh_public_services`, which gives each service's latest status. An expired confirmation shows as `not_verified` with "last confirmed …" (`BiteChat.tsx:115-118`). No model is involved. | A for information is enforced. The code does not record whether the guidance text was checked against a protocol. | None in CI. The staging script `test-one-health-permissions` checks "the public finder answers anonymous visitors" and "the public finder carries no patient or programme-internal data", but not freshness. | **Built, not yet verified** |
| 18 | Laboratory sample overdue | The `samples_overdue` rule counts samples in `received` or `testing` that are older than N days by `created_at`, and tells the laboratory staff (`automations_v2.sql:206-208`). **Missing:** the chain-of-custody milestones in `oh_sample_events` are not read. Nothing escalates to the team that sent the sample, and no expected date is captured. | A under the SLA is enforced: the rule only counts. | None. | **Incomplete** |
| 19 | Lab result validated | The `results_released` rule counts samples moved to `resulted` since its last run, and tells the clinical staff of the organisation that sent them (`automations_v2.sql:209-211`). `validate_result` is level 4 and never runs. No Kaju tool reads results. **Missing:** acknowledgements are not tracked and surveillance officers are not notified. There is no validation step separate from `resulted`: it is one state (CHECK at `v2_1_core.sql:270`). | "No AI interpretation" is enforced: the notice is a count and a link. | No test for the rule. The level-4 logic is tested only through `verify_claim` (`test:db`). | **Incomplete** |
| 20 | Possible geospatial incident pattern | The `alerts_open` rule counts unacknowledged programme signals from `oh_alerts` and says "A signal is not an outbreak declaration" (`automations_v2.sql:217-220`). **Defect:** `oh_alerts` refuses anyone who is not a programme partner, which it checks with `auth.uid()` (`v2_4_network_alerts.sql:121`). The scheduled tick runs with no signed-in user, so every scheduled run of this rule fails. It works only from "Run now". **Missing:** no summary of evidence, methods and uncertainty, and no tasks for investigators. | "No outbreak assertion" is enforced. | No test for the rule. The e2e "Surveillance: … alerts never declare an outbreak" runs on sample data. | **Incomplete** |
| 21 | Staff training due | The `training_due` rule counts `training_assignments` due within N days and tells leads (`automations_v2.sql:171-175`). **Defect:** completed assignments are counted, because nothing checks `training_progress`. **Missing:** the person assigned is not reminded, and there is no competency sign-off step. | H for competency sign-off: not built as a step. The rule signs off nothing. | None. | **Incomplete** |
| 22 | Community campaign preparation | Nothing specific. Free-form drafting would come from the model (OWNER_ACTIONS 3). **Missing:** scheduled outreach, an approval step before public release and tracking of RSVPs and feedback. | Not built. | None. | **Incomplete** |
| 23 | Research dataset requested | A researcher asks with `nx_request_data`, and the programme coordinator is told. `nx_decide_data_request` approves or revokes. `nx_take_extract` makes versioned extracts of suppressed counts that record the exact query (`20261116120000_rebuild_research_access.sql`). `grant_data_access` is level 4. The `data_requests_waiting` rule reminds (`automations_v2.sql:221-223`). **Missing:** Kaju does not draft the request or the list of variables: the researcher fills in a form. The reminder goes to the leads of every organisation in the programme, not only to the data steward, and it has no test. | H is enforced and tested. | `test:db`, section "Research data access": "the programme's coordinator is asked to decide", "no data before approval", "the researcher cannot approve their own request", "the extract is versioned and records its exact query", "only the approved variables are in the extract", "it holds counts, never patient rows" and "after revocation the extracts can no longer be read". | **Incomplete** |
| 24 | Research user asks for analysis | Studies with `nx_study_snapshot`, which is versioned and records the query and caveats (`20261115130000_rebuild_people_studies_vet.sql:141-165`). **Missing:** Kaju does not build queries, tables, charts or maps for a study. The snapshot function has no test. | D for final output: the researcher writes the snapshot themselves. | The e2e "Research studies and reports: snapshots are fixed…" runs on sample data. | **Incomplete** |
| 25 | Incoming partner WhatsApp/email updates | The `partner_requests` tool reads open handoffs (title, place, due date) and no clinical data. **Missing:** partner WhatsApp messages and emails are not taken in. Commitments are not summarised, no tasks are proposed from a message and replies are not tracked. | Reading is limited to the animal side, which is enforced. Triage and confirmation: not built. | `test:kaju-automations`: "partner requests: reads the request only (title, place, due date), never a clinical count or a patient record". | **Incomplete** (also needs OWNER_ACTIONS 7 and 8) |
| 26 | 'Follow up until municipality replies' | The `send_external` tool (level 3, external) puts a message in `nx_outbox` only after approval. The worker sends an email as the approver, through their connected account (`src/lib/connections/send.ts`). SMS and WhatsApp messages are marked not connected (`route.ts:67-79`). **Missing:** reminders on a schedule, tracking of the thread and the reply, and escalation when nobody replies. `send_external` does not check the recipient's consent or opt-in. | D for the external send is enforced and tested. | `test:db`: "a message to someone outside StrayPaw waits for approval", "nothing is queued before approval", "after approval it is queued with who approved it…" and "a colleague cannot read the recipients". No test for the worker's sending path. | **Incomplete** (also needs OWNER_ACTIONS 8) |
| 27 | Kaju mission step fails | `nx_mission_advance` (`kaju_engine.sql:332-396`) retries a failed step with backoff (2, 4, 8, 16 minutes) up to `max_attempts` (5). After that the step is `failed`, the mission is `blocked` and the owner gets the notice "Kaju stopped…". `nx_tool_effects`, keyed by an idempotency key, stops a retried step from repeating what it already did. `nx_mission_retry` lets only the owner recover the mission. Every change is traced in `nx_mission_events`. The UI offers retry and cancel (`src/nx/kaju/data.ts:75-76`). | A for safe retries: they happen automatically. H for risky recovery: once the step stops, only the owner can retry it. | `test:db`: "a failed step is scheduled to try again later", "after five tries the step stops", "the mission shows as blocked, not done", "the owner is told it stopped", "after the cause is fixed, retry completes it", "the message was posted exactly once" and "running a finished step again never creates duplicates". | **Verified** |
| 28 | New organisation signs up | The Start page. People can join by request or invitation (`nx_find_orgs`, `nx_request_join`, `nx_decide_join`), and a veterinary clinic can register. **Missing:** no starter channels or programmes are created, no sample import is suggested and nothing guides setup by role. | H for sensitive roles is enforced. | `test:db`, section "Finding an organisation and asking to join" (7 checks), including "a request cannot be approved straight into the lead role". Also the `test:db` section "Independent veterinary clinics" and the e2e "Start: every kind of organisation has a way in, and none is self-granted". | **Incomplete** |
| 29 | Channel asks '@Kaju create tasks' | `nx_kaju_reply` (`20261115110000_rebuild_kaju_in_channel.sql`) reads the last 40 messages the caller can read, quotes up to 8 sentences that read as things to do, and posts them as a proposal. "Create N tasks" upserts them under unique (source_message_id, title) (`src/nx/live.tsx:128-131`, `20261115100000_rebuild_foundations.sql:94`). **Missing:** owners and dates are not extracted, and single tasks cannot be edited or dropped before creating: it is all or nothing. | D is enforced: nothing is created until a person accepts. | The e2e "Channel: Kaju proposes tasks and creates them only when accepted" runs on the signed-out sample channel (`src/nx/pages/Channel.tsx:190-202`). That channel fakes the reply in the browser and never calls `nx_kaju_reply` or the database. Nothing tests the RPC or the protection against creating tasks twice. | **Incomplete** |
| 30 | Weekly executive summary | The `weekly_summary` rule, for NGOs only, sends on Mondays to everyone in the organisation: open cases, open tasks, overdue follow-ups and missions waiting (`automations_v2.sql:176-181`). The `weekly_digest` tool gives cited answers on request, and there is `office_brief`. **Missing:** programme figures, clinical aggregates, partner replies, verification and data quality. The scheduled note has no citations, and it covers NGOs only. | A for a private briefing: the scheduled note goes to everyone in the organisation (audience `everyone`, `src/lib/automations/v2.ts:16`). D for distribution outside StrayPaw: not built. | No test for `weekly_summary`, which cannot run on the test schema. For the tool, `test:kaju-automations`: "the digest says unknown for unreadable sources and nothing is invented for a quiet week" and "the router answers digest and follow-up questions…". | **Incomplete** |

**Rows by status:** Verified 1 (row 27). Built, not yet verified 1 (row 17). Blocked (external) 1 (row 13). Incomplete 27.
Rows 1, 2, 25 and 26 also need owner actions 7 and 8, but they have missing code of their own, so they are counted as
Incomplete.

## 2. Implementation schema

### AutomationDefinition

Checked against `public.nx_automations` (`automations_v2.sql:18-34`) and the older `public.automations`
(`20261113120000_automations.sql:10-26`).

| Field | Exists? | Where | Note |
| --- | --- | --- | --- |
| id | Yes | `nx_automations.id` | |
| org_id | Yes | `nx_automations.org_id` | |
| owner | Partly | `nx_automations.created_by` | This is the person who created it, not an owner who can be assigned. Saving it again does not change it. |
| natural_language_intent | No | none | There is only a fixed library name. |
| canonical structured rule | Partly | `nx_automations.rule` (one of 15) and `params` | Each rule is a branch of SQL inside `nx_automation_run`, not data. |
| trigger (event, schedule, threshold or reply) | Partly | `nx_automations.every` (hour, day or week) | Schedule only. A threshold exists only as `automations.min_count` in the older table. There is no event or reply trigger. |
| filters | Partly | `nx_automations.params` | Only `days` or `hours`. |
| allowed tools | No | none | The rules call no tools. Missions have organisation-wide tool rules: `nx_kaju_policies (org_id, tool, level, enabled)`. |
| allowed data scopes | No | none | They follow from each rule's SQL. |
| recipients | Partly | `nx_automations.audience` (leads, everyone, clinical, lab) | Role groups, resolved by `nx_org_members`. Named people cannot be chosen. |
| approval mode | No | none | The rules only notify. Mission steps carry a level each. |
| quiet hours | No | none | Each person's quiet hours apply only to email and push (`nx_notification_settings.quiet_from/quiet_to`, `20261116100000_rebuild_collaboration.sql:346-351`). Patient SMS has none. |
| escalation | No | none | The only escalation is the lead notice in `overdue_tasks`, set by `params.days`. |
| rate cap | Partly | `nx_automation_runs` unique (automation_id, dedupe_key) | At most one delivery per period. There is no cap on notices per person. |
| version | No | none | `kaju_check_runs.rules_version` exists, but only for the older checks. |
| active state | Yes | `nx_automations.status` (active, paused) | |

### MissionRun

Checked against `nx_missions` and `nx_mission_steps` (`20261115100000_rebuild_foundations.sql:113-136`, widened by
`kaju_engine.sql:87-106`), and against `nx_mission_events`, `nx_tool_effects` and `nx_outbox` (`kaju_engine.sql:109-160`).

| Field | Exists? | Where | Note |
| --- | --- | --- | --- |
| input refs | Partly | `nx_missions.request`, `nx_missions.channel_id`, `nx_mission_steps.input` | There are no structured links to the source records or messages. |
| scope | Partly | `nx_missions.org_id`, `owner_id` | Steps run as the owner (`nx_mission_advance` sets the JWT claims). There is no separate data scope. |
| plan | Yes | `nx_mission_steps (position, label, tool, input)` | |
| step states | Yes | `nx_mission_steps.state` (9 values), trace in `nx_mission_events` | |
| tool command idempotency | Yes | `nx_mission_steps.idempotency_key`, `nx_tool_effects.idempotency_key`, `nx_missions.start_key`, `nx_outbox.idempotency_key` | |
| policy approvals | Yes | `nx_mission_steps.level`, `needs_approval`, `approved_by`, `approved_at`, `why`; `nx_kaju_policies`; `nx_kaju_prefs.autonomy_cap` | |
| external delivery state | Yes | `nx_outbox.status`, `attempts`, `next_attempt_at`, `last_error`, `provider_ref`, `approved_by`, linked by `mission_id` and `step_id` | There is no "sending" state that claims a row (see Gaps). |
| retry schedule | Yes | `nx_mission_steps.attempts`, `max_attempts`, `next_attempt_at` | |
| human blockers | Yes | step state `waiting_approval` or `waiting_person` with `why`; `nx_missions.state` `waiting_person` or `blocked`; `nx_missions.error` | |
| outcome | Partly | `nx_missions.state` (completed, cancelled, blocked), `error`; `nx_mission_steps.result`, `note` | There is no outcome summary field. |

Also present: `nx_missions.deadline` and `deadline_noted`.

### Communications consent (short)

| Requirement | As built |
| --- | --- |
| A connected account with permission | `sendEmailAs` needs a connected account with `mail.send` (`src/lib/connections/send.ts:13-17`). SMS needs MSG91. Sending on WhatsApp is not built, so every WhatsApp message is marked not connected. |
| Approved templates | PEP SMS uses `MSG91_PEP_TEMPLATE_ID` (DLT) with three variables. There are no WhatsApp templates. |
| Recipient opt-in or consent | PEP: `reminder_consent` is required (CHECK at `v2_1_core.sql:397`, and the rule at `automations_v2.sql:196`). Missions: `send_external` checks no consent. |
| Clear sending semantics | Messages are queued only after approval (`test:db`), and `not_connected` is recorded (`route.ts`). |
| Internal channels first when the recipient is a member | Not built. `send_external` does not check whether the recipient is a StrayPaw member. |
| No mass messaging, no sensitive details | `send_external` has one recipient per step, at most 20 steps and at most 10 missions a minute. Notification emails carry only the title and a link (`test:notify-delivery`: "the email carries the title and a link, not the message's wording"). PEP SMS carries the facility, the dose number and the date. |

## 3. AI quality and safety tests

| Test in the matrix | Does a test make it fail safely and visibly? | Citation | Status |
| --- | --- | --- | --- |
| False entity matches | Yes | `test:kaju-planner`: "a place that is not in the organisation is left as words, not guessed", "two people called Ana: asked once, inline" and "nothing can be submitted while it is ambiguous". `test:kaju-reliability`: "a rough place word matches only a place in the records; an unmatched word is said, never guessed" and "a case that is not found… two matches are listed, never chosen". `test:kaju-intake` (not in CI): "a locality match is offered for comparison, never linked automatically…". | **Verified** |
| Cross-org permission attempts | Yes | `test:db`: "another NGO cannot see a channel", "search never returns another organisation's messages", "an outsider cannot start a mission in the organisation", "another organisation cannot see the runs", "nobody outside the clinic sees it", "a hospital the person was not referred to cannot claim the referral" and "another NGO sees nothing". `test:kaju-automations`: "NGO automations need an organisation…". | **Verified** |
| Unapproved external sends | Yes, in the database. The worker's filter is not tested. | `test:db`: "a message to someone outside StrayPaw waits for approval", "nothing is queued before approval", "after approval it is queued with who approved it…" and "a rule cannot make a tool looser than the registry". `test:connections`: "an email is a proposal; send is off unless the account allows sending…". `test:notify-delivery`: "WhatsApp: not connected, never pretended". The worker's `approved_at` filter (`route.ts:69`) has no test. | **Verified** |
| Invalid clinical PEP dose suggestion | No | Kaju has no dose tool, and `clinical_decision` is level 4. `test:kaju-reliability` checks "case summary reads only the animal's case… never the health schema, and says so when asked about people". Nothing tests that a dose suggestion is refused. The date checks in `oh_prescribe` (`v2_2_workflows.sql:121-125`) have no test, because `test:db` inserts doses directly. When a model is on, the only guard is the system prompt (`src/sp3/ai/engine.ts:54`). | **Incomplete** |
| Stale facility stock | No | The code exists: `oh_service_now` shows `not_verified` after expiry, and the 14-day CHECK. No test calls it. The only browser tests run on sample data. The `services_stale` rule counts old rows (row 16). | **Built, not yet verified** |
| Lab result prior to validation | No | `results_released` counts only `resulted`, a CHECK ties the result to that status, and `validate_result` is level 4. No test covers any of these. | **Built, not yet verified** |
| Repeated webhook deliveries | Partly | `scripts/test-careos-webhook.ts` (not in CI) shows that jobs are keyed by Meta's id (`wa:msg:<id>`). The function that would store each job once (`careos_enqueue`) is not in this repository, so nothing shows that a second delivery stores nothing. | **Incomplete** |
| Timeout/retry duplicates | Yes | e2e `nx-kaju-transport.spec.ts`: "a request that times out can be retried and its late answer never appears" and "stopping and clearing drop a late answer". `test:db`: "starting twice with the same key gives the same mission", "running a finished step again never creates duplicates", "the message was posted exactly once", "the same day is never delivered twice" and "running it again the same day queues nothing new". | **Verified** |
| Revoked connector tokens | No | When a token refresh fails, the connection is marked expired (`src/lib/connections/server.ts:150`, `161`). `ProviderAuthError` marks it expired in `src/app/api/connections/act/route.ts:97` and `src/sp3/ai/connectTools.ts:66`. But `sendEmailAs` catches every error as a failure on a working connection (`send.ts:26`), so a revoked account is retried five times and never marked expired. No test covers any of this. | **Incomplete** |
| Translation/voice mismatch | No | No voice transcription exists. Translation comes from the CareOS backend, and intake prefers `text_en` over the original (`src/lib/careos/intake.ts:34`). No mismatch is detected and no test exists. | **Incomplete** |
| Injection attempts from emails/WhatsApp | Partly | `test:connections`: "file text cannot close its fence and is marked as data", which tests the same `untrusted()` function that wraps email snippets (`connectTools.ts:109`). `test:kaju-planner`: "a hostile plan with an invented tool is refused whole". No test sends instructions hidden in an email or a WhatsApp message through intake or the model path. | **Built, not yet verified** |
| Deadline missed while assistant offline | No | `nx_mission_tick` notes a missed deadline once and tells the owner (`kaju_engine.sql:518-523`). It runs only if pg_cron is installed. `test:db` never sets a deadline. | **Built, not yet verified** |

## 4. Gaps

### Code that can be built in this repository

1. **`services_stale` counts old confirmations** (`automations_v2.sql:204`). Needed: count only the latest row per
   service (`DISTINCT ON (service) … ORDER BY service, verified_at DESC`, as `oh_service_now` does), plus a
   `test:db` check in which a facility confirms twice.
2. **Scheduled `alerts_open` runs always fail** because `oh_alerts` checks `auth.uid()`. Needed: run the rule as
   its `created_by` (set the JWT claims as `nx_mission_advance` does), or count through a function made for the
   scheduler. Add a `test:db` check that calls `nx_automations_tick()` with no user signed in.
3. **`training_due` counts completed training and tells only leads.** Needed: leave out assignments that are
   complete, notify each assignee, and add a test.
4. **Most rules have no test.** Needed: `test:db` checks for the 11 untested rules and for `nx_automations_tick`:
   period keys, the failure path, retry on the next tick and paused rules. Also give the stand-in `animal_followups`
   in `scripts/db-tests/base.sql` the columns it lacks (`ngo_id`, `kind`, and a status default the rules use), so
   that `followups_due` and `weekly_summary` can run. Add the older `20261113120000_automations.sql` to the test's
   migration list, or retire it.
5. **Automations never follow up.** Needed: let a rule start a mission (`source = 'automation'`) or create tasks, and
   give rules an escalation step that fires when a notice is unread or unanswered after N hours. `nx_notifications`
   already has `read_at`. This covers rows 4, 7, 14, 15, 18, 19 and 20.
6. **Referrals:** count the patient referrals in `health.transfers` with status `sent` (counts only, never patient
   details) in `referrals_waiting`, and escalate to the facility that sent them.
7. **Laboratory:** measure overdue samples from the `received` event in `oh_sample_events`, tell the team that sent
   the sample, and record an expected date. For results, track acknowledgement.
8. **PEP:** add a reminder for a missed dose to consenting patients, with a clinic-approved template and the clinic
   turning it on. Add quiet hours for patients to the SMS loop. Move the PEP and `nx_outbox` loops out of
   `route.ts` into pure functions (as `src/lib/notify/deliver.ts` already is) and test them with test doubles,
   including the retry and backoff of `nx_pep_outbox_mark`. *Done for the PEP loop (`src/lib/notify/pep.ts`) and the
   retry and backoff; the `nx_outbox` loop is still in `route.ts`.*
9. **Outbox claims:** add a `sending` state, or an atomic claim, before a provider is called, and pass a provider
   idempotency key where the provider offers one. As it stands, a crash between sending and writing the status
   sends the message again.
10. **Revoked tokens:** in `sendEmailAs`, treat `ProviderAuthError` as not connected and mark the connection
    expired. Add tests for revocation in `act`, `connectTools` and the worker.
11. **AutomationDefinition fields:** add `natural_language_intent`, `version` (or a rules version, as `kaju_check_runs`
    has), trigger kinds other than a schedule, named recipients, quiet hours, escalation, a rate cap and an approval
    mode.
12. **Mission tests that are missing:** `nx_mission_cancel`, the `reject` decision and the missed-deadline notice.
13. **Channel tasks:** a `test:db` check for `nx_kaju_reply`, and for accepting the same proposal twice creating
    nothing. Also extract owners and dates, and let a person edit or drop single tasks before creating them.
14. **CI:** add `test:kaju-intake`, `test:careos-webhook`, `test:package-check`, `test:state-machines`,
    `test:operational-cohorts` and `test:auto-approve` to `dev-check.yml`.
15. **Clinical:** a `test:db` check for the date rules in `oh_prescribe`. A planner test in which `clinical_decision`
    and `validate_result` become person-only steps. A test against the mock model in which a reply containing dose
    figures is caught.
16. **Injection:** tests that pass an email snippet and a WhatsApp message containing instructions through
    `connectTools` and intake, and assert that no extra tool call or proposal appears.
17. **Scheduler check:** a check, for example an admin route or a staging script, that `cron.job` contains
    `nx-mission-tick` and `nx-automations-tick`. Without it, "runs inside the database" cannot be verified.
18. **Data request reminder:** notify only the coordinating organisation's data steward, not every organisation in
    the programme.
19. **Duplicate review:** compare candidates on identifiers, photos and history, and record a person's acceptance or
    rejection of a candidate pair.
20. **Missing work:** the following are not built at all: an incoming email trigger with reply-deadline tracking
    (rows 2, 25 and 26), reply detection for "follow up until they reply", starter channels for a new organisation
    (row 28), a daily plan with availability (row 3), campaign messages with approval and RSVP tracking (row 22),
    and analyses that Kaju builds for studies (row 24).
21. **WhatsApp backend:** `careos_enqueue`, `careos_inbox_list` and `careos_inbox_act` are not in this repository.
    Either add them as migrations with tests, or document where they live. Add an acknowledgement reply with an
    approved template.

### Owner actions (OWNER_ACTIONS.md)

- 3, Claude: free-form planning and drafting, for rows 22 and 24 and parts of rows 2 and 25.
- 4, email, and 5, browser push: delivery of automation notices outside the app.
- 6, MSG91 DLT template: PEP reminders (rows 13 and 14).
- 7, WhatsApp Business: rows 1, 5 and 25.
- 8, OAuth apps: rows 2, 25 and 26.
- 9, more frequent delivery: PEP SMS and mission emails go out once a day (04:45 UTC) until this is done.
- 10, clinical and laboratory agreements: real data for rows 12 to 19.

## 5. Where this audit differs from ACCEPTANCE.md

- **"test:state-machines, test:operational-cohorts — all passing, in CI".** Neither runs in
  `.github/workflows/dev-check.yml`.
- **"Automations across workspaces: Verified (database)".** `test:db` runs 4 of the 15 rules. The scheduler tick is
  never tested. `followups_due` and `weekly_summary` cannot run on the test schema. `services_stale` counts old
  confirmations. Scheduled `alerts_open` runs fail.
- **"PEP reminder scheduling, consent, delivery log, retry: Verified (database)".** Nothing tests retry
  (`nx_pep_outbox_mark` is never called), and the worker's PEP path has no test. `test:notify-delivery` covers only
  `nx_deliveries`.
- **"Durable missions: … cancel, recovery: Verified (database, staging)".** `test:db` never calls
  `nx_mission_cancel` or the `reject` decision, and never tests the missed-deadline notice. Recovery is tested.
- **Scenario 5, "Lab result … parties notified, Kaju cannot validate: Verified (database: person-only)".** There
  is no laboratory check in `test:db`. "Parties notified" (`results_released`) has no test. The person-only check
  uses `verify_claim`, not `validate_result`, although it is the same level-4 code path.
- **OWNER_ACTIONS.md header, "Everything below is already built and tested with test doubles".** The sending paths
  for PEP SMS (item 6) and mission email (item 8) in `route.ts` have no test with test doubles. Item 9 says missions
  and automations "already run every minute or hour inside the database". That holds only where pg_cron is
  installed, and nothing in the repository checks it.

## 6. Closed since the audit (same day)

- **Gaps 1–3 fixed, and gap 6 in part,** in `20261116170000_rebuild_automation_rule_fixes.sql`, with eight new
  `test:db` checks. Five of them fail without the migration and pass with it. The other three guard what the fixes
  must not break: the person who finished is not told, the notice names no patient, and a scheduled run finds what a
  run by hand finds.
  - `services_stale` counts only each service's latest confirmation.
  - `training_due` leaves out finished courses and tells each person about their own training.
  - A scheduled `alerts_open` run reads with the access of the person who turned it on. The test calls
    `nx_automations_tick()` with nobody signed in.
  - `referrals_waiting` also counts patients referred to the facility and not yet marked arrived. These are counts
    only, and the test checks that the notice names no patient. Escalating to the sending facility is still not
    built.
- **Gap 14 fixed.** CI now runs `test:kaju-automations`, `test:kaju-intake`, `test:kaju-prepare`,
  `test:careos-webhook`, `test:ai-extract`, `test:auto-approve`, `test:package-check`, `test:monthly`,
  `test:state-machines`, `test:operational-cohorts`, `test:record-dates`, `test:location-cell`,
  `test:bounded-supabase-fetch` and `test:v1-cleanup-chunks`. All of them passed locally first. `test:monthly` had
  been failing, because the monthly plan's links had lost the evidence stage they open; that is fixed.
- **Gap 17 checked by hand.** On production and staging, `cron.job` holds `nx-mission-tick` and
  `nx-automations-tick`, both active, and their runs in the last 24 hours succeeded (`docs/rebuild/TRACE-STAGING.md`).
  No repository check exists yet.
- **Gap 10 fixed, not yet tested.** `sendEmailAs` marks the connection expired on a revoked grant, and the worker
  records the message as not connected instead of retrying it five times. No test covers it yet: `markStatus` needs
  the service-role client, and the connection tests have no test double for it.
- **Gap 12 partly closed.** `test:db` now checks reject and cancel: only the owner may do either, nothing after a
  rejected step runs, and the schedule runs nothing from a cancelled mission. The missed-deadline notice is still
  untested.
- **Row statuses are unchanged by these fixes.** The rules now count the right things, but rows 4, 7, 14, 15, 18, 19
  and 20 still have no follow-up or escalation chain (gap 5). The other gaps above remain as written.

## 7. Follow-up and escalation (gap 5), built the same day

`20261116180000_rebuild_automation_followup.sql` is applied on staging, checked there in a rolled-back run, then
applied on production. `test:db` checks it, and the Automations page shows it.

- Every rule that notifies people now opens a follow-up.
- A member acknowledges it with what is being done, or closes it with the reason. Who, when and what are kept.
- If nobody acknowledges it within the rule's `escalate_hours` (default 24; 0 turns it off), the hourly schedule tells
  the organisation's admins and leads, once.
- A later run that finds nothing closes it. A later run that still finds something carries the open clock and the
  escalation forward, so a daily rule cannot keep restarting the wait.

Effect on the rows:

| # | Now | Still missing |
| --- | --- | --- |
| 4 | Acknowledged, rescheduled or closed with a reason; escalated after the hours set | An entry on the case timeline |
| 7 | Same follow-up on `followups_due` | Visits or tasks created from the signed plan; the rule has no test, because the test schema's `animal_followups` has no `ngo_id` |
| 14 | The clinical team's missed-dose notice is acknowledged and escalated | A reminder to the consenting patient after a missed dose |
| 15 | **Verified**: patients referred and not yet arrived are counted (never named); the notice is acknowledged, escalated and closed | Rerouting stays a person's decision, as the matrix requires |
| 18 | Overdue-sample notices are acknowledged and escalated | Reading the `received` milestone; telling the team that sent the sample |
| 19 | Result notices can be acknowledged | A test for `results_released`; acknowledgement by each named recipient |
| 29 | `test:db` now checks that a proposal creates nothing until accepted, and that accepting twice creates each task once | Owners and dates taken from the thread; editing single tasks before creating them |

Mission tests added the same day: reject, cancel, and the missed-deadline notice (gap 12 closed).

Counts now: 2 Verified (rows 15 and 27), 1 Built, not yet verified (17), 1 Blocked (external) (13), 26 Incomplete.
