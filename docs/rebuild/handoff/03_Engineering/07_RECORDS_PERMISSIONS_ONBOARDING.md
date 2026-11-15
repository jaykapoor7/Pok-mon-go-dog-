# SHARED RECORDS, SELF-SERVICE ONBOARDING AND SECURITY

## Key architecture principle
**The canonical source record is written once and is referenced everywhere else, but access is explicitly scoped.** One animal identity may have many events; each organization may contribute permitted events without receiving every private clinical detail. Programme membership never grants unrestricted tenant access.

## Core multi-tenant concepts
- `user`: personal auth account, optionally multiple organization memberships and role sets.
- `organization`: NGO, public agency, vet clinic, human hospital/clinic, lab, university/research org, programme coordinator or mixed. Verified/legal identity where required.
- `membership`: org, user, role, status, joined/removed, invited-by.
- `programme`: owner org, optional sponsor/public authority, boundaries, targets, dates, participating orgs and governance.
- `programme_membership`: org/role/scope/collaboration status and information-sharing grant.
- `access_grant`: scoped actor/subject, record or dataset, fields/purposes, expiry, consent/legal basis, revocation.
- `audit_event`: immutable actor/time/action/record/before-after hash or safe diff/source and correlation ID.
- `source_provenance`: manual, field capture, user import, external connector, synthetic demo, clinically validated, independently verified; original imported timestamps; confidence/limitations.

## Canonical operational objects
1. **Animal:** cross-organization identity candidates, species/breed if known, photo identifiers, name/ID, geo, encounter history, alias tags, possible duplicates requiring explicit review; don't merge automatically.
2. **Animal encounter:** date/place, actors, observation, condition, field evidence, associated campaign/case.
3. **Case/incident:** rescue/animal investigation/human bite observation; reporter, location, severity/triage by human/protocol, status, assignee, channel, link to animals or authorized patient incident.
4. **Animal procedure/medical event:** care encounter, treatment, vaccination, ABC surgery, medication/lot if applicable, clinician, recovery, signed supporting evidence. Distinguish field observation vs clinical attestation.
5. **Human exposure & PEP course:** separate restricted patient identity, clinical event, prescribed schedule, administered dose events, missed/overdue, consent for reminders, referral; share minimal incident link only.
6. **Laboratory specimen/test/result:** requested-by, custody chain, specimen, protocol, lab test status, validated result and recipient access; clinical/lab authority applies.
7. **Facility/service/availability:** coordinates, contacts, service types, wound wash, PEP/RIG, accessibility, claimed vs independently verified status, last-update and stock expiry.
8. **Programme/campaign/geography:** target/species/ward/zone/site, operator groups, work streams, tasks, outcomes, denominator provenance, participants and reporting period.
9. **Verification/claim:** linked submitted events/evidence and municipal checks, reviewer decision, dates, eligibility by applicable procedure/period policy, dispute/correction history. No money movement claimed.
10. **Task/assignment/referral/handoff:** origin, owner/responsible org/user, assigned to, due/SLA, state, next acknowledgement, linked records, visibility and escalation.
11. **Channel/message/thread/file:** organization/programme scoped, membership, replies, content provenance, reactions, attachment ACL, linked records, mentions, read receipts and retention policy.
12. **Research study/dataset/extract:** steward org, approved access, cohort/query version, de-identification treatment, provenance/limitations, download audit and retention.
13. **Training/activity:** module, assignments, competency validation, participation and outreach reports.
14. **Kaju mission/automation/approval:** owner, actor & scope, versioned plan, tools, artifacts, status, action history, approvals, retries, time/dependency, completion criteria.
15. **Notification:** trigger, recipient, type, channel, consent/template, delivery attempt, acknowledgement, priority, retry, supersession and audit.

## Record state rules
- Animal identity: potential match -> reviewed candidate -> linked/confirmed/declined; no destructive merge of ambiguous identities.
- Vaccination/procedure: drafted -> submitted by authorized staff -> documented/clinically signed (when applicable) -> independently verified (where programme rules demand) -> correction/withdrawal. Clinical signature != municipal payment verification.
- Human PEP: prescribed by clinician -> due events -> administered / missed / rescheduled -> clinician-confirmed completion; no 'complete' solely because reminder delivered.
- Lab result: pending -> collected -> received -> testing -> validated by authorized lab staff -> released to permitted recipients.
- Referral: created -> sent -> acknowledged/accepted/rejected -> service provided or closed with reason; every handoff traceable.
- Claim: draft -> submitted -> needs correction / under review -> government-approved/rejected -> payment status external if available; don't imply payments processed.
- Programme: planned -> active -> evaluated/closed/paused; org membership independent.

## Self-service onboarding state machine
1. Individual sign in with supported provider(s), email verification and consent.
2. Ask **what they do** (NGO/field, Government/Programme, Healthcare [vet/human/lab], Research), explain that it customizes navigation, not grants privilege.
3. Find an existing org and request membership / accept invitation, or create organization. Duplicate name warning, pending verification where necessary.
4. Guided setup: organization profile, location/service area, team invite, goals and optional sample/template data; display a real first task and sample guide.
5. Role-based dashboard generated from permissions; first-use tour short and skippable.
6. Ask whether they want to create/join a Programme, link partner organizations, connect Gmail/WhatsApp/Calendar or import data; optional and reversible.
7. Government reviewer powers, restricted medical access, lab validation and research dataset access require approved org/authority verification — not a self-picked dropdown.

## Roles and access strategy
Use organization membership + scoped role permissions + per-record and per-field access grants; server-side RLS and service-layer checks. Examples:
- NGO field worker can edit assigned field events but not approve government claims.
- NGO admin can manage their own records, staff and programmes, but not hospital patient records.
- Government verifier can read submitted animal evidence, decide verification and see audit, but not edit clinical attestation.
- Programme coordinator sees authorized aggregates, shared tasks, programme commitments, not all clinical details or government claim approval.
- Veterinary clinician sees authorized animals and clinical records; independent clinic keeps private notes private unless explicitly shared.
- Human clinician sees relevant patients/exposures; lab technician sees assigned samples/results, not unnecessary patient identities.
- Researcher can access own or approved de-identified/versioned datasets, not arbitrary live patient rows.
- Public users can submit reports and view safe limited status/verified locations, not organizational internal operations.

## Data protection and reliability
RLS tested for SELECT/INSERT/UPDATE/DELETE, invite-token security, signed URLs for uploads, patient encryption where needed, source consent/retention, audit logging, backups, rollback migrations, regional and applicable legal safeguards, least-privilege connectors. Kaju never elevates beyond acting user's permitted access; org automation service uses separate constrained grants and policy. Do not log secrets or private raw prompts in public analytics. All data search, notification previews and channel text obey the same access policy.

## Operational integration notes
Existing stack: Next.js/React/TypeScript, Supabase/Postgres/PostGIS, MapLibre/H3 and Vercel, subject to codebase audit. Reuse well-tested capabilities. Use durable job orchestration for Kaju and scheduled reminders, idempotent commands, event/outbox with delivery retries, explicit feature flags and end-to-end observability. Cache and realtime should never bypass RLS.
