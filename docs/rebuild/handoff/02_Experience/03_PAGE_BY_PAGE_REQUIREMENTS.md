# PAGE-BY-PAGE FUNCTIONAL REQUIREMENTS

**Design mandate:** Every page has (a) a clear main job, (b) usable meaningful data, (c) primary actions, (d) an appropriate Kaju affordance, (e) loading/empty/error/success states, (f) safe sharing. Most records use table/list + detail drawer + full record, not a card wall. All examples use synthetic/demo data unless live authorization is confirmed.

## NGO

### Today
- Main composition: a short priority briefing, **My Work** (list grouped by due/urgency), assigned cases, next scheduled visits, and Kaju's prepared work/decisions.
- Actions: accept/complete assignment, open related animal/case, reschedule, create report, quick voice/photo capture, review Kaju work.
- Secondary: team activity rollup, campaign snapshot, 7-day operational trend; remove generic vanity KPIs.
- Personalization: field operators see route + mobile checklist; coordinators see triage and team bottlenecks; admins see outcome/quality warnings.

### Inbox
- Unified queues for citizen reports, WhatsApp Business, email ingested intake, partner referrals, duplicated/reported sightings. Each item has source, date, location, urgency triage, owner, due and linked animal/case.
- Actions: classify, merge suggestion **review**, link animal, request missing info, assign, escalate, dismiss with reason; show AI extraction provenance.
- Kaju: extract/report summary, suggested match, draft approved acknowledgment, routing proposal and missing fields.

### Cases
- Table views active/resolved/due, case type, location, assigned team, stage, animal(s), evidence completeness; filter by ward, status, campaign, urgency.
- Record detail: timeline: report -> triage -> field response -> clinical/partner step -> release -> follow-up -> closed; ownership, linked chat thread, photos, files, actions.
- Include bite-related animal investigation tasks but **not** the patient's full medical chart.

### Animals
- Attio-style scalable registry with thumbnails, location, species, identity/confidence, sex/age when documented, vaccine status, ABC status, last encounter, next follow-up, linked cases and source reliability.
- Record: hero thumbnail/name/ID with compact meta; left searchable properties; centre activity/medical/vaccine events; tabs Summary / Interventions / Cases / Evidence / Activity; right contextual tasks/chats.
- Actions: add encounter, upload evidence, start case, refer to vet, request identity merge; verified event changes controlled by authorized policy.
- Show **imported vs recorded vs reviewed vs verified**, with full provenance and correction history.

### Operations
- Live field assignments, day/week calendar, list/map toggle, route constraints, personnel availability, capture/transport/release, follow-ups and offline queue with sync resolution.
- Actions: assign, reassign, accept, update status, capture evidence, create transfer, link clinic referral, release/close.
- Kaju: generate a reviewed schedule, suggest clusters, chase unfinished visits, daily briefing, identify gaps. Never promise safety-critical route optimization without real travel data.

### Programmes
- NGO-created or invited campaigns, geographic scope, planned vs completed work, vaccination targets, animal population denominator where defensible, events by ward, volunteer/community activities.
- Actions: create, invite, assign zone, publish field work, record activity, inspect breakdown; show what data is verified and what isn't.
- Kaju: propose next locations using sourced evidence, summarize variance, prepare field updates.

### Submissions & Reports
- Submission queue by municipal programme, record evidence readiness, claim/procedure eligibility, reviewer questions, correction status and history. Official reviewer has final authority.
- Action: compile packet referencing original records, fix flagged missing fields, submit, withdraw if allowed, respond to requests, export CSV/PDF.
- Billing rules configurable per jurisdiction; e.g. sterilization usually one payable event per animal whereas later vaccination can recur by schedule/policy; never treat rule as universal without validation.

## GOVERNMENT & PROGRAMMES

### Overview (two role-appropriate presets)
- Municipal: current programmes, evidence requiring review, verified coverage vs target with denominator quality, field reports, overdue exceptions, contractor updates, public-health handoffs.
- Coordinator: multi-organization commitments, open handoffs, interventions, programme milestone progress, source freshness, partner readiness and outstanding approvals.
- Each prominent metric must link directly to its underlying filtered records. Zero invented trend arrows.

### Programmes
- Create/update own or joined programmes, geography (city/zone/ward), work streams, targets, participant organizations, funding/budget metadata where relevant, milestones, documentation, reporting standards.
- Coverage includes eligible estimated dog population, dated sources, unique qualifying vaccination events, duplicates excluded, incomplete or unverified segregated; show uncertainty.
- NGO programmes can be administered without governmental powers.

### Partners
- Organizations directory; invitations, programme roles, agreements, SLAs, assigned wards, submissions due, training readiness, message links and performance history.
- Consent-aware controlled sharing. A programme invitation does not grant blanket tenant access.

### Verification (government-authorized only)
- Table of new submissions by organization, ward, programme, event type, identity evidence, status, eligibility, duplicate flags, reviewer and age.
- Split review: submitter record/evidence on left; standards/precedent, exceptions and reviewer decision on right; approve/reject/request correction (signed and audited).
- Claims & audit shown as tabs within Verification where appropriate rather than needless extra navigation.
- Kaju: deterministic evidence checklist, review summaries, suspicious duplicates; never silently approve/reject.

### Surveillance
- Incident categories from animal, human, and validated lab pathways; geography/time filters; cross-sector investigations, authorized notifications, facility readiness, response progress.
- Synchronized map + timeline + incident table; link to permitted underlying records; deny identifying patient details to unauthorized parties.
- Incident detection/alerts need documented thresholds, confidence and accountable human review; uncertain signals are not declared outbreaks.

### Reports
- Export verified ABC/ARV program reports, operator performance, surveillance summaries, evidence packs, training/community outreach and impact evaluation; branded organization/programme report settings.
- Versioned/signed outputs with record-linked sources, recipient access and authorizer; no report creation from unsourced AI guesses.

## HEALTHCARE — VETERINARY

### Today & Appointments
- Appointments, procedures scheduled, cases requiring review, referrals, recoveries due, vaccine stock status, authorized channel messages.
- Calendar/time, appointment/patient links, reminders and intake checks; independent clinic self-service.

### Animals / Patients
- Shared permitted animal identity, clinical longitudinal history, allergies/conditions as documented, responsible clinician, related NGO/case, attachments and privacy flags. Distinguish a canonical animal registry from clinic visit records.

### Clinical Care & Procedures
- Encounter notes and exam findings with **clinician approval**, diagnoses/treatments, vaccinations with batch and administering professional, ABC surgeries, post-op recovery, complications, follow-up, signed certificates.
- Referrals from NGO field cases, structured handoff, status acknowledgement; expose to NGO only what is necessary.
- Kaju suggests drafts and administrative next steps; never independent diagnosis/treatment decisions.

### Follow-ups
- Recovery, vaccine booster when applicable, observation, incomplete charts, referral status, missed visit dashboard; clinician-authorized messaging.

## HEALTHCARE — HUMAN

### Today & Bite Cases
- Triage of human bite/exposure reports, patient-limited encounter record, incident date/location, clinical assessment by staff, linkage to relevant animal investigation via minimal necessary data.
- Public reporting entry may create restricted intake; hospital records remain clinically protected.

### PEP
- Clinician-prescribed schedule, administered doses and dates, RIG where applicable, reminders, due/completed/missed statuses, attempts and follow-up outcome.
- Deterministic schedule engine from clinician orders; never LLM-invented dates or doses. SMS/WhatsApp/email consent, approved templates and privacy-safe content.

### Referrals & Facilities
- Appropriate facility directory, services (bite treatment, wound washing, PEP/RIG), opening/contact, verified/last-updated times, stock/service availability with freshness. No unverified 'open now' or guaranteed stock.
- Referral acceptance, rejection/reassignment, transport/arrival metadata if sourced, communication and escalation. Clinical staff approve referrals and sensitive disclosures.

### Surveillance
- Approved aggregate exposure trends, incidents by geography/time and linked animal investigation status for authorized users; no full patient data on non-clinical dashboards.

## HEALTHCARE — LABORATORY

### Work Queue/Samples
- Requester, sample type, collection time/location, identifier, label completeness, transport, chain of custody, receipt and priority; permissions and validation.

### Testing/Results
- Applicable protocols and instruments, assay status, supervisor validation, digitally signed released result, recipient notification and follow-up evidence; never Kaju-generated test conclusions.

### Quality
- TAT metrics, rejected samples reasons, SOP/training competency and audit, data integrity. Optional LIMS integration avoids a duplicative end-to-end LIMS when existing.

## RESEARCH

### Overview/Datasets
- Current studies, approval requests, datasets with record counts, time/geographic coverage, last refresh, provenance, completeness, de-identification level and restrictions.
- Ingest independent research data and request access to programme data without joining programme first.

### Explore/Maps & Analysis
- Query builder with clear variables/filters, linked summary stats, time-series, disease/ABC/ARV layers, map+table synchronization, distributions and missingness indicators.
- Guarded aggregation thresholds where relevant; no identifying map pins for private patient locations.
- Kaju-generated analyses are reviewable with exact queries, assumptions and caveats; do not claim causal findings from descriptive trends.

### Studies/Reports
- Study workspace with approved collaborators, design/eligibility, cohort versions, notes, reproducible query history, approvals, export history and report drafting; outcomes feed to programme coordination under sharing policy.

## CROSS-WORKSPACE MECHANICS
- Every record links to a timeline, source, owner, scope, linked messages/tasks, activity, evidence and permissions; one click to preview in context.
- Tasks created from a message, Kaju suggestion, record or due-date rule stay the same canonical task and show on Today/inbox.
- Maps, reports, training, global search and notifications are shared infrastructure with appropriately scoped entry points.
- Empty states give a genuine next action. Errors explain corrective action, preserve entered data and allow retries. Avoid celebratory motion for distressed clinical cases.
