# BESt PROPOSAL -> STRAYPAW REUSABLE REQUIREMENTS

## Source and distinction
**Primary source reviewed:** `06_Source/BeST_original_proposal_internal_reference.docx`, titled *City-Wide Integrated Rabies Elimination Program – A Bengaluru Model for One Health Action*.

Its explicit strategic objectives: (1) integrated surveillance across human, animal, lab and field data; (2) workforce training/competency; (3) community participation; (4) digital decision support and analytics; (5) demonstrate and evaluate integrated interventions in a selected municipal zone. It also references >=70% dog vaccination coverage, multi-species surveillance, geospatial hotspots, vaccination, diagnostic capacity, community outreach and partner roles.

**Separate BeST follow-up feedback, reported in earlier project correspondence:** human bite case reporting/management; vaccination coverage tracking; PEP dose due reminders and completion notifications; nearest referral hospital; facility vaccine/RIG availability; wound-washing unit mapping; PEP preparedness/response alerts. These are not incorrectly attributed to the seven-page proposal's detailed language, but must be treated as product requirements to support its planned workflow.

**Additional StrayPaw commercial scope:** municipal animal-level verification/claims, NGO rescue/ABC workflows, user self-onboarding, independent clinics/researchers, native channels, Kaju and connected apps. These are platform requirements, not claims that BeST expressly demanded all features.

## Partner mapping from proposal
- **BeST Cluster (IISc)**: programme coordination, data integration, monitoring/evaluation -> Government & Programmes (programme-coordinator role) + authorized Research views.
- **KVAFSU WOAH Reference Laboratory**: technical leadership, laboratory validation, capacity-building -> Healthcare (laboratory role) + shared training.
- **GBA Animal Husbandry & Health Divisions**: on-ground vaccination, field surveillance, operational management -> NGO-style field operations for field staff; Government & Programmes for officers.
- **KIMS**: human-health surveillance, PEP and public-health coordination -> Healthcare (human role).
- **Mission Rabies / Care Foundation**: capture, vaccination, public engagement -> NGO.
- **IISc/NIMHANS and scientific partners**: studies and evaluation -> Research.
- **RWAs, feeders, schools, communities**: outreach and reporting -> small public portal + NGO/community campaign records; no professional workspace required.

## Feature acceptance matrix
| Origin | Requirement | Canonical records | Primary UI | Kaju support | Release check |
|---|---|---|---|---|---|
| Original | Cross-sector surveillance | Incident, animal event, exposure, lab result, investigation, provenance | Government surveillance, Research analysis, Healthcare | Correlate allowed events, flag anomaly with sources, prepare human review | Test permitted joins and patient masking |
| Original | Real-time geospatial insight | Geography, campaign, incident, coverage estimate | Government coverage + Research maps | Analyze ward trends, source confidence, suggest field review | Distinguish near-real-time from stale imports |
| Original | >=70% dog vaccination coverage goal | Eligible pop estimate, vaccination event, species, ward, campaign, verification | Programme coverage, field campaign | Check unique eligible vaccinations, flag missing denominator/duplicates | Show numerator/denominator/date/source/uncertainty, never fabricate |
| Original | Mass vaccination/field operations | Animal, encounter, team, campaign, task, evidence | NGO Operations & Programmes | Schedule, follow up, prepare evidence | Offline-safe capture, audit and duplicate guard |
| Original | Diagnostics/lab validation | Specimen, custody, testing, validated result | Healthcare Lab | Remind overdue status, notify after validation | Human/lab validation required |
| Original | Workforce training | Module, enrollment, competency, assignment | Shared training surfaces | Remind incomplete, compile gaps | Verified completion/provenance |
| Original | Community engagement/awareness | Outreach campaign, event, attendance, public report | NGO Programmes; public portal | Draft approved multilingual content, triage reports | Consent, moderated publishing, meaningful engagement tracking |
| Original | Multi-species surveillance | Animal species, incident, lab report, observation | NGO/Healthcare/Research | Adapt summaries/filters; flag out-of-scope reports | Don't hardcode dog-only IDs; stage advanced workflows |
| Original | Selected-zone pilot/scale evaluation | Zone, programme, baseline, outcome, study | Programmes + Research | Assemble impact report with caveats | Baseline and post measures valid |
| Follow-up | Human bite case management | Bite incident, restricted patient exposure | Healthcare Human | Intake draft, request necessary missing details | Clinician sign-off + restricted patient data |
| Follow-up | PEP course tracking | Prescribed regimen, dose events, reminder logs | Healthcare PEP | Due/late/completion reminders under protocol | No model-derived medical schedule |
| Follow-up | Referral hospitals | Facility service directory, referral | Healthcare Facilities, citizen portal | Search verified services; prepare/recheck referral | Last verified time + acknowledgement |
| Follow-up | Vaccine/RIG facility availability | Facility stock/services, freshness | Healthcare Facilities; coordinator aggregates | Prompt refresh, flag gaps | No guaranteed real-time claims if stale |
| Follow-up | Wound-washing unit mapping | Facility service geo point | Citizen portal, Healthcare | Guide to verified options and urgent care | Public safety content clinically reviewed |
| Follow-up | PEP response/alert readiness | Event, escalation, task, notification rule | Healthcare/Programmes | Trigger approved alerts, track ack/escalation | Auth, delivery logging, no panic/false claims |
| StrayPaw | ABC evidence and municipal verification | Procedure, evidence, verification, claim | NGO Submissions, Govt Verification | Check completeness, prepare packet and corrections | Government reviewer decides |
| StrayPaw | Cross-org real-time collaboration | Channel, message, linked record, programme membership | All workspaces | Summarize thread, produce authorized actions | Membership-aware every read/tool |
| StrayPaw | Self-serve organizations and research | Org, membership, invitation, dataset permission | Onboarding + all workspaces | Guide setup, import fields, invite staff | No self-granted privileged access |

## Important boundaries
BeST proposal doesn't require branding StrayPaw as One Health. The cross-sector workflows are a generic reusable product capability. Likewise, the original document's references to lab capacity, shelters, healthcare resourcing or a 70% target are wider public-health interventions: don't represent them all as functions already completed in software. Build software coordination/support where appropriate. The 2026 proposal is not authorization for patient or research data sharing; deployment needs explicit partners' agreements and approvals.
