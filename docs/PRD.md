# Product requirements

## Mission

StrayPaw is shared data infrastructure for street-animal care. It lets residents and field teams record animals and observations, lets organisations turn those records into cases/programmes and longitudinal care history, and makes field coverage and outcomes legible without pretending recorded data is a complete population census.

## Primary users

- Residents/community reporters recording animals and changes they observe.
- Feeders, volunteers and educators using personal field/community spaces.
- NGO and rescue field teams managing cases, records, programmes and evidence.
- Organisation leads reviewing coverage, workload and outcomes.
- Public/institutional audiences viewing deliberately safe public records, partner profiles and aggregate evidence.
- Administrators operating onboarding, moderation/import and platform controls.

## Core product requirements

### Shared animal register
Maintain durable animal profiles linked to observations, care history and operational records. Support species beyond the project's original dog-only prototype while preserving legacy schema compatibility.

### Field reporting
Make reporting usable on a phone, outdoors and on weak connections. Collect only the information required for a useful record and preserve provenance.

### Organisation operations
Give partner organisations a private scoped workspace for cases, tasks, programmes, medical/follow-up records, imports and evidence. An organisation must never see another organisation's private records through ordinary product paths.

### Public map and evidence
Show what has been recorded and where field work has occurred. Clearly distinguish recorded coverage from population estimates and unknown/unexamined areas from zero.

### Public partner surfaces
Allow organisations to publish credible, limited public summaries and embeddable widgets without exposing reporter contact details, private notes or exact sensitive operational locations.

### Data import/export
Support migration of existing NGO records into StrayPaw without rewriting history as newly observed data. Preserve import/provenance signals and allow useful reports/exports.

### Trust and moderation
Provide bounded public writes, moderation/takedown paths, abuse controls, transparent provenance and security boundaries suitable for organisations and institutional users.

## Product principles

- Real records over illustrative abundance.
- Sparse data is normal and must remain useful.
- Unknown is not zero.
- Field utility before dashboard ornament.
- Public usefulness must not compromise private operations.
- One shared register, not parallel incompatible systems for each feature.
- Organisation attribution should be factual and proportionate, not promotional.
- The product should remain understandable to a stranger without requiring internal jargon.

## Non-goals

- Claiming a complete street-animal census from opportunistic reports.
- Replacing veterinary clinical systems or government statutory systems where those are legally required.
- Turning public animal records into a source of private reporter/contact information.
- Gamification that distorts field priorities or encourages low-quality records.
- A generic CRM/SaaS dashboard aesthetic detached from place, evidence and field work.

## Success signals

Success is measured through actual use and record quality: organisations importing/maintaining records, field observations turning into traceable care/case histories, useful coverage visibility, reliable exports/evidence, low-friction reporting, and safe separation of public/private data.

Do not invent KPI values or partner outcomes in code or docs. When numeric goals are needed, source them from an explicit current product/partner plan and label them as goals rather than achieved results.
