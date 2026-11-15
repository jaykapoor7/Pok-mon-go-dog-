# STRAYPAW — PRODUCT CONSTITUTION

## Product thesis
StrayPaw is an end-to-end collaborative operating system for animal welfare, municipal ABC/ARV programme execution and verification, veterinary and human exposure workflows, surveillance and research. **Kaju is the AI teammate that takes work to completion.**

Do not create a BeST / One Health-specific product. The BeST Bengaluru proposal is a high-quality example of real ecosystem relationships and programme requirements. Any verified organization can use StrayPaw without that programme. One Health is an applicable *programme methodology*, not a top-level app/workspace name.

## Foundational experience
People log in, see the right work immediately, talk to colleagues in native channels, manage rich linked records, move requests between organizations, and ask Kaju to do or monitor administrative work. The application should be where users spend their working day, replacing scattered spreadsheets, personal WhatsApp coordination and status emails for internal work. External WhatsApp Business/email remain important intake and communication paths.

## The FOUR workspaces — locked

| Workspace | Included groups | Core jobs |
|---|---|---|
| **NGO** | NGOs, rescue/field coordinators, volunteers, animal handlers, and **municipal field teams** doing the same work | Intake, casework, animal identity, capture/transport/release, vaccination drives, campaigns, follow-up, submissions |
| **Government & Programmes** | Municipal/state officials, verification officers, government public-health programme staff, **consortium/project coordinators** | Programmes, invitations/partners, targets, municipal review/claims, shared surveillance, outcomes and coordination. Role-specific dashboards and permissions. |
| **Healthcare** | Veterinary clinics/surgeons, ABC centres, human hospitals/clinics, PHCs, diagnostic labs | Veterinary records, procedures/appointments, human bite/PEP, referrals/facilities, sample/test/results; **role-specific experiences inside one workspace**. |
| **Research** | Academic institutions, epidemiologists, data analysts, scientists, evaluators | Independent studies, governed datasets, geospatial/statistical analysis, evaluation and approved dissemination |

Independent veterinary clinics and researchers can create their own organization accounts and work without a government/NGO partnership. Any verified organization can create its own programme (a Programme is a shared **record/service**, not a mandatory workspace). Programme coordinators and officials share the Government & Programmes product area but have distinct permission sets; non-government users must not see government-only actions.

## Shared platform components
- Organizations, identity, invitations, programme memberships, role and action-level permissions.
- Canonical animal and case records, events, evidence, provenance, comments, timeline, related records.
- Native chat (channels/DMs/threads), presence, relevant notifications, communication-linked actions.
- Tasks, assignments, referrals, review queues, handoffs, workflow transitions and deadline engine.
- Kaju assistant, mission orchestration, connected apps, intelligence, organization memory and approvals.
- Search/command palette, calendar/due tasks, map/geospatial analysis, training, reports/exports, file handling.
- Citizen/public portal/WhatsApp intake: small and accessible; not a fifth professional workspace.
- Platform administrators: internal admin with strict audit, not a fifth customer workspace.

## User experience values
**Creative but operational.** Data should be richly presented, deliberately composed and dense. Primary working surfaces must actually perform work. Animations and interaction polish are important. The experience should feel delightful without delaying a rescue, clinic task or municipal decision.

**Record > card.** Tables, list rows, split views, activity timelines, contextual metadata and actions instead of a sea of oversized outlined cards. Cards only where content grouping is genuinely useful.

**No isolated 'AI demo'.** Every permitted AI action is tied to real auth, source records, outcomes, audit and recovery. Kaju's output is actionable; user can inspect and correct it.

**Role-specific, same platform.** A nurse does not navigate surgery queues; a vet does not see confidential human patient data; a field worker sees a phone-native task flow; a government verifier has independent review tools.

**Trust-first.** Imported, submitted, reviewed, verified and clinically validated are different statuses. No payment processing claimed. Disputed duplicate animals require review before merge. Never invent coverage denominators, test validations, referral availability or clinical recommendations.

## Visual direction
Exact assignment in `04_References/REFERENCE_LOCK.md`:
- Attio: dominant whole-app visual DNA, records, homepage, inbox, activity.
- Linear: insights, analytics, workflow refinement, micro-motion.
- Raycast: Kaju chat/full page and prompt mechanics.
- Slack: native messaging and channels.
- Inngest: action/missions trace.

Keep a recognizable StrayPaw mark, naming, domain, copy, and original UI assets. The goal is to reach those products' craft and familiar interaction patterns, not falsely present StrayPaw as another brand.

## First-class mobile product
Phone users often capture field records in difficult conditions. The phone should open to Today, assignments, camera/voice intake, one-tap status, field map and messages. Healthcare users see their clinical queue, researchers see saved analyses; not a reduced desktop sidebar. Offline queue for eligible field records; visible sync status. 390px, 768px, 1440px actively verified.

## Business and product scope
Retain original StrayPaw commercial advantage: animal-level ABC/ARV evidence, government verification and auditability. Support NGO, municipal and partner customers independently. Programmes coordinate multi-organization access; they do not own or automatically expose all underlying organizational data. Research uses approved datasets.

## Explicit exclusions / cautions
- No top-level 'One Health' dashboard, redundant One Health pages or BeST-branded fork.
- No 7+ unrelated professional workspace types.
- No giant 'hero' dashboard as a substitute for real actions.
- No one channel per animal; records have contextual discussion threads.
- No unrestricted exposure of patient records through general channels, AI search or research.
- No independent AI medical treatment decision, diagnosis, test validation, eligibility verification, government approval or financial sign-off.
- No claiming live WhatsApp/email/Claude actions before credentials, approval and end-to-end tests exist.
- No automatic submission of Kaju's pre-send guessed prompt.
- No destruction of production rows or deletion of old workflows before data-safe equivalent and rollback are ready.
