# KAJU AUTOMATION CATALOG — REAL WORK REMOVED

Notation: **A** = safe/low-risk automatic with prior org authorization; **D** = prepare draft and ask for confirmation; **H** = human-only approval/decision. Each workflow must have source refs, ownership, explicit trigger, follow-up, retry and exception plan.

| # | Trigger / user goal | Kaju end-to-end work | Decision boundary | Completion / failure measure |
|---|---|---|---|---|
| 1 | New approved WhatsApp citizen report | Transcribe/extract, suggest case type, identify geo, check possible duplicate, prepare intake and reply | D if ambiguous/clinical/sensitive; A only for permitted acknowledgement | Case linked or explicit triage; delivery logged |
| 2 | Inbox email about vaccination evidence | Interpret email, match municipal programme, compile demanded data, create evidence checklist and draft reply | D for external send and uncertain entity matching | Reviewer approves/send; tracks reply deadline |
| 3 | NGO coordinator asks for daily plan | Read assignments, worker availability, case priority, geographic data; propose schedule and notify after sign-off | D for assignment; A for routine internal digest | Tasks created, ack logged; conflicts surfaced |
| 4 | Field task overdue | Detect due state, send permitted internal reminder, escalate based on SLA, update timeline | A within rules; D for third-party outreach | Acknowledged/rescheduled/closed with reasons |
| 5 | Voice/photo field update | Transcribe and extract animal/encounter, propose match and form fields, attach evidence | D for patient/animal merge or disputed attributes | Worker confirms; source audio/photo retained |
| 6 | Animal possible duplicate | Compare identifiers, locations, history, photos; flag cases and show evidence | H for merge/verification | Accepted/declined with trace, no auto-destructive merge |
| 7 | Upcoming animal recovery/follow-up | Create eligible reminder/visit from signed plan; notify assignees | A for routine task; H for clinical plan changes | Visit documented or exception escalated |
| 8 | ABC/ARV submission approaching | Assemble event IDs/evidence, check missing fields, flag inconsistent dates, produce correction tasks, prepare packet | D for packet send; H for govt acceptance | Submission delivered and ack; return corrections linked |
| 9 | Govt verification batch arrives | Deduplicate event refs, deterministic rules, anomaly scores, summarize evidence and reasons | H for verify/reject/claim approval | Signed reviewer decision + auditable basis |
| 10 | Campaign weekly update | Compute verified vs unverified counts, dated denominators and trends, prepare progress message | A for internal summary; D external publication | Source-linked report, caveats visible |
| 11 | Ward has data/coverage gap | Analyze verified dates, denominator confidence, geo clusters and staff capacity; propose outreach | D for resource decisions | Owner accepts/rejects recommendation with reasons |
| 12 | Citizen bite report | Extract necessary incident facts, open restricted intake, suggest authorized clinical/animal teams and referral draft | D/H clinical triage; no diagnosis | Clinical acknowledgement + animal investigation handoff |
| 13 | PEP appointment scheduled by clinician | Schedule consented reminders using **deterministic clinic-approved schedule**, track delivery, due/missed flags | A under approved protocol; H for medical changes | Administered recorded by clinician or escalated |
| 14 | PEP reminder missed/no response | Respect consent/quiet hours, attempt allowed follow-up, flag responsible clinical team | A within clinic rules; H any treatment decisions | Staff acknowledgement, follow-up outcome captured |
| 15 | Referral pending receipt | Track sent/received status, remind accepting clinic, requeue or escalate under protocol | A routine; H reroute/clinical recommendation | Acceptance/rejection with proof |
| 16 | Facility vaccine/RIG availability stale | Prompt responsible facility to refresh data, label stale status, suggest *verified* alternatives for review | A internal request; D external patient-facing suggestion | Data freshness timestamp, no fake 'available now' |
| 17 | Wound-wash location enquiry | Pull verified directory, provide approved urgent care guidance and freshness information | A informational, protocol vetted | Safe source/verified location displayed |
| 18 | Laboratory sample overdue | Check chain-of-custody milestones, remind lab team, escalate to authorized requester | A under SLA | Resolution/expected ETA captured |
| 19 | Lab result validated | Notify precisely authorized receiving clinicians/surveillance officers; track acknowledgment | A with signed validation and notification protocol | Receipt/ack + log; no AI lab interpretation |
| 20 | Possible geospatial incident pattern | Summarize linked evidence, methods and uncertainty, prepare investigator tasks | D/H public-health alert & outbreak language | Reviewer decision; no unreviewed outbreak assertion |
| 21 | Staff training due | Assign sanctioned modules under manager rules, remind, track completion and validated competency | A reminder; H competency sign-off | Completion and quality result logged |
| 22 | Community campaign preparation | Draft multilingual approved messaging, schedule reviewed outreach, track RSVPs/feedback | D public release | Approved copy, schedule and delivery results |
| 23 | Research dataset requested | Identify custodian, draft access request, permitted variable list and review queue | H for restricted access and de-identification policy | Formal approval/versioned extract or denial |
| 24 | Research user asks for analysis | Build query/table/chart/map with source, methods, missingness and caveats; save reproducible artifact | D for final research/public output | User validates methods; dataset version linked |
| 25 | Incoming partner WhatsApp/email updates | Recognize programme, summarize commitments and create proposed canonical tasks, link original source | D if ambiguous/cross-org; A internal triage within policy | Confirmed tasks and ownership, reply tracked |
| 26 | 'Follow up until municipality replies' | Draft approved original note, track sent message/thread, authorized reminders at cadence, escalate nonreply | D external send; A reminders per mandate | Reply logged and unresolved item resolved/blocked |
| 27 | Kaju mission step fails | Detect partial work, preserve idempotent state, retry within policy, notify user and expose repair action | A for safe retry, H for risky recovery | Accurate status and no duplicate writes |
| 28 | New organization signs up | Guide role-based setup, suggest sample data import, create approved starter channels/programmes, invite team | A internal defaults; H sensitive roles | User lands with first working queue and clear status |
| 29 | Channel asks '@Kaju create tasks' | Read authorized thread, extract tasks/owners/dates, inline ambiguity editing, create on confirmation | D | Source-linked tasks in Work tab, no double-creation |
| 30 | Weekly executive summary | Pull relevant operations, programme, clinical aggregates, partner replies, verification, data quality; produce cited actions | A private briefing; D distribution | Useful exception-first brief with audited sources |

## Automation implementation schema
`AutomationDefinition`: id, org_id, owner, natural_language_intent, canonical structured rule, trigger(event|schedule|threshold|reply), filters, allowed tools, allowed data scopes, recipients, approval mode, quiet hours, escalation, rate cap, version, active state.

`MissionRun`: input refs, scope, plan, step states, tool command idempotency, policy approvals, external delivery state, retry schedule, human blockers and outcome.

## Communications consent
Email/WhatsApp Business actions require a connected, permissioned account, approved templates where required, recipient opt-in/consent and clear send semantics. Can't assume Meta verification is complete. Internal StrayPaw channels take precedence for team communication when member exists. No unauthorized mass messaging or sensitive details in unprotected channels.

## Suggested default personal Kaju modes
- **Morning briefing:** top decisions, urgent items, evidence needed, outreach due, resolved overnight; one-click 'handle routine items'.
- **Weekly programme review:** coverage quality, delayed partner handoffs, signed events vs submitted, training gaps.
- **My outstanding replies:** email, WhatsApp Business and channels, with 'waiting on them' and 'waiting on me' states.
- **My missions:** durable projects with active/blocked/waiting/completed, sources and editable plan.

## AI quality/safety tests
Test false entity matches, cross-org permission attempts, unapproved external sends, invalid clinical PEP dose suggestion, stale facility stock, lab result prior to validation, repeated webhook deliveries, timeout/retry duplicates, revoked connector tokens, translation/voice mismatch, injection attempts from emails/WhatsApp, and deadline missed while assistant offline. All must fail safely and visibly.
