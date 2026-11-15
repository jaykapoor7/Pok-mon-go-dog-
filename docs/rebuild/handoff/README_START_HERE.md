# STRAYPAW — FINAL PRODUCT REBUILD HANDOFF
**Decision-locked working specification | 14 November 2026**

> **This is a PRODUCT REBUILD, not a design polish, reskin, or an isolated BeST app.**
> The new StrayPaw should be one daily operating workspace for animal welfare, government and programmes, healthcare, and research, with integrated communication and an outcome-driven Kaju agent.

## Read in this order
1. `CLAUDE_MASTER_PROMPT.md` — paste into Claude Code with this whole ZIP/repo available.
2. `01_Product/01_PRODUCT_CONSTITUTION.md` — the non-negotiable product decisions.
3. `04_References/REFERENCE_LOCK.md` — **exact design-reference mapping** (Attio, Linear, Raycast, Slack, Inngest).
4. `02_Experience/02_NAVIGATION_AND_WORKSPACES.md` and `02_Experience/03_PAGE_BY_PAGE_REQUIREMENTS.md` — roles, sidebars and real page content.
5. `02_Experience/04_COLLABORATION_AND_CHANNELS.md` — native Slack-quality channels, threads, mentions, DMs.
6. `02_Experience/05_KAJU_PRODUCT_AND_INTERACTIONS.md` — agent, full-page + compact UI, predictive pre-submit composer.
7. `03_Engineering/07_RECORDS_PERMISSIONS_ONBOARDING.md` — canonical data model, tenancy, consent, sharing.
8. `03_Engineering/08_AUTOMATION_MATRIX.md` — actual triggers, actions, follow-up rules and approval levels.
9. `03_Engineering/09_DELIVERY_TEST_AND_MIGRATION.md` — auditing, migration, acceptance and rollout.
10. `01_Product/BESt_REQUIREMENTS_TRACEABILITY.md` — BeST source vs reusable StrayPaw requirements.

## Design-reference priority — DON'T CHANGE THE MAPPING
- **ATTIO = THE OVERALL APPLICATION LOOK**: home, records, table density, inbox, record drawer, activity, page composition, typography, white space, interactions. Dominant aesthetic reference.
- **LINEAR = INSIGHTS, ANALYTICS, WORKFLOW NAVIGATION AND TRANSITIONS**: charts, analytical breakdowns, filtering, clean keyboard navigation, restrained motion.
- **RAYCAST = KAJU LOOK AND FEEL**: compact command/chat and expandable full-screen assistant, contextual prompt UI, quick commands, gorgeous tool result rendering.
- **SLACK = COMMUNICATION**: organization channels, programme collaboration, DMs, threads, mentions, file sharing, record links, light-hearted team space.
- **INNGEST = KAJU MISSION EXECUTION**: durable multi-step runs, timeline, retries, approvals, history; borrow the clear visual grammar, not a technical backend console.
- **MOTION + ANIMATE UI = INTERACTION IMPLEMENTATION**: purposeful transitions, hover/tap/focus feedback, satisfying task completion, no confetti or unrelated spectacle.

## What the old system means
Existing Next.js, Supabase/Postgres/PostGIS, MapLibre/H3, security, data, auth, working workflows and infrastructure are **valuable assets**. Audit and reuse or migrate them. Old **page architecture, generic cards, old One Health page identity, siloed workflows and design constraints are NOT requirements**. Do not erase production data or dismantle working functions without a verified replacement. The product architecture is new; safe migration is mandatory.

## Locked product decisions
- **Four top-level workspaces:** NGO (also municipal field workers); Government & Programmes (including consortium coordinators); Healthcare (veterinary, human health, lab as role-specific experiences); Research.
- No dedicated One Health workspace. BeST is **an example of a collaborating programme**, not a separate StrayPaw product.
- One account; self-serve organization setup; organization/role-based navigation; multiple memberships and programme invitations.
- Canonical shared records with organization ownership, explicit sharing/consent, field-level protection and audit trails.
- Native messaging channels and record-linked threads; not a Slack integration as the primary product.
- Kaju = conversational AI + connected apps + autonomous missions + automations + insights + proactive follow-through; Claude API may provide reasoning, **not** the durable execution engine.
- Browser-first responsive product and installable PWA. Desktop/mobile native apps only when requirements justify.
- Creative, premium, exacting interface motion is an acceptance criterion, not a nice-to-have. Mobile is a dedicated experience, not squeezed desktop.

## Files and authenticity
- `05_Visuals/*.png`: **original StrayPaw concept mockups** made for this handoff. These are not screenshots of Attio, Linear, Slack or Raycast. They communicate proposed layouts and information density.
- `04_References/REFERENCE_LOCK.md`: **official live website references**, with specific pages explaining exactly what to reproduce as a pattern. Claude should inspect these pages and any screenshots available to it.
- `06_Source/BeST_original_proposal_internal_reference.docx`: an original proposal used as an **ecosystem requirements input**, not the product scope or marketing identity. Contains contact details; internal reference only.
- `01_Product/BESt_REQUIREMENTS_TRACEABILITY.md`: distinguishes the original document's demands from later feedback and added StrayPaw product decisions.

## Definition of done
Not a set of pretty static mockups. Done means a production-integrated, secure, responsive StrayPaw where a new user can onboard, join their organization, operate their workspace, communicate in channels, create and share proper records, and rely on Kaju for meaningful approved work; all across desktop and phone; visual quality and motion tested against the references.
