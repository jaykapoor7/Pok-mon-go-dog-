# StrayPaw rebuild — Stage 0 audit

Audited 15 November 2026 against the handoff in `docs/rebuild/handoff/` (start with `README_START_HERE.md`).
Scope: what exists in this repository and its two databases today, what the handoff asks for, and what happens to each part.

Status words: **Live** (on www.straypaw.org, used with real data) · **Staging** (works on demo.straypaw.org against the staging database only) · **Partial** · **Planned** (not built) · **Broken**.

## 1. Summary

- The stack the handoff assumes is the stack we have: Next.js 15 (App Router), React 19, Supabase/Postgres/PostGIS, MapLibre + H3, Vercel. Nothing needs replacing at that level.
- The data, security and workflow layers are the valuable part and are kept: NGO animal/case records, ABC evidence and municipal review, the programme tables (bite care, samples, hand-offs, referrals), row-level security, audit tables, imports, the map.
- The page architecture is what the handoff replaces. Today there are three shells' worth of history (`src/sp`, `src/sp3`, `src/sp4`, `src/ws`, `src/oh`) and a Notion-style frame. The handoff locks Attio as the dominant look and explicitly says not to ship a Notion clone.
- Three large capabilities in the handoff do not exist at all: native channels and messaging, a durable mission runner for Kaju, and the Research and Veterinary workspaces as products.
- The biggest structural gap is tenancy. There are two parallel organisation models (`ngos` + `ngo_members`, and `oh_organisations` + `oh_members`) plus a third for municipal offices. The handoff needs one.

## 2. Inventory

### 2.1 App routes (signed-in)

| Area | Routes | Status | Notes |
|---|---|---|---|
| NGO | `/ngo`, `/ngo/rescues`, `/ngo/pipeline`, `/ngo/work`, `/ngo/inbox`, `/ngo/cases/*`, `/ngo/animals/*`, `/ngo/sterilisation`, `/ngo/verification/*`, `/ngo/packages/*`, `/ngo/programmes/*`, `/ngo/field`, `/ngo/team`, `/ngo/training`, `/ngo/automations`, `/ngo/settings/*`, `/ngo/import`, `/ngo/map` | Live | Real partner data. Core of the commercial product. |
| NGO, hidden or legacy | `/ngo/feeding`, `/ngo/fundraising/*`, `/ngo/surveys`, `/ngo/volunteers`, `/ngo/stories`, `/ngo/projects`, `/ngo/proof`, `/ngo/quality`, `/ngo/readiness`, `/ngo/evidence`, `/ngo/care`, `/ngo/contracts`, `/ngo/review`, `/ngo/add`, `/ngo/offline` | Partial | Reachable by URL, not all in the sidebar. Several duplicate each other. |
| Municipal | `/city` (map), `/city/review/*`, `/city/contracts`, `/city/insights`, `/city/programmes/*`, `/city/report`, `/city/connections` | Live | Review and contracts work end to end; no real municipal customer yet. |
| Programme (One Health) | `/programme/[slug]` + `/coverage`, `/network`, `/work`, `/report`, `/data`, `/setup` | Staging | Only illustrative and QA programmes exist. Named and framed as a One Health product, which the handoff removes. |
| Hospital / laboratory | `/workspace/[id]` + `/register`, `/new`, `/record/[rid]`, `/sample`, `/services` | Staging | Bite records, PEP doses, samples and results work with illustrative data. No clinical partner. |
| Shared | `/today`, `/search`, `/assistant`, `/animal/[id]`, `/learn/*`, `/offline` | Live | |
| Community / fundraising | `/community/*`, `/fundraisers/*`, `/surveys/*` | Partial | Owner has not decided whether to keep these. |
| Operator | `/trust`, `/trust/console` | Live | Password-protected moderation console. |
| Research | `/research/*` (public pages only) | Planned | No signed-in research workspace. |
| Veterinary | none | Planned | Vet role exists only as an NGO member role. |
| Channels / messages | none | Planned | No tables, no realtime use anywhere in `src`. |

### 2.2 Public routes

About 70 marketing and policy pages (`/`, `/product`, `/kaju`, `/pricing`, `/for-*`, `/solutions/*`, `/security`, `/docs`, `/blog`, …), the citizen bite chat (`/bite-help`), the guided demo entry (`/try`, `/demo`) and sign-in (`/sign-in`, `/join`, `/access`). **Live.** Out of scope for the rebuild except sign-in and onboarding.

### 2.3 API routes

86 route handlers under `src/app/api`. Groups: `admin/*` (operator, bearer secret), `ai`, `ai/act`, `ai/intake`, `ai/prepared`, `ai/log` (Kaju), `connections/*` (OAuth scaffolding), `partner/*` (imports, exports, government report), `spatial/*` and `livingmap` (map), `files/*`, `access/*` and `join` (sign-in), `team/invite`, `careos/webhook`, `demo/session`, `health`.

### 2.4 Database

- 36 migrations in `supabase/migrations/`. Core NGO tables (`ngos`, `ngo_members`, `dogs`, `cases`, `medical_events`, `events`, …) predate that folder and exist in both databases.
- Created by migrations in the folder: animal identity (`animal_identifiers`, `animalid_*`), operations and claims (`operations_*`, `animal_operation_*`), programmes (`oh_*`, `programme_*`), restricted health schema (`health.exposures`, `health.pep_courses`, `health.pep_doses`, `health.transfers`, `health.citizen_notices`, `health.reminder_log`, `health.audit`), training (`training_*`), Kaju receipts (`kaju_*`), automations (`automations`, `automation_runs`, `automation_notices`).
- **Not applied anywhere:** `20261113120000_automations.sql`. The automations page reports "awaiting database".
- Production project `toujthlzjmhmoyykmayx`; staging `ucxfxiddufwqithtdtix` (also backs the demo).
- Missing for the handoff: channels, messages, threads, reads, attachments ACL; a general task table; a notification table with delivery log; access grants; mission runs; research datasets, studies and extracts; veterinary appointments and encounters; a unified organisation and membership model.

### 2.5 Kaju

| Part | Where | Status |
|---|---|---|
| Chat panel and full page | `src/sp3/ai/AiPanel.tsx`, `/assistant` | Live |
| Model calls | `src/lib/ai/inference.ts`, `/api/ai` | Partial — works without a paid model in a rules mode; paid-model settings not confirmed by the owner |
| Write actions with receipts | `/api/ai/act`, `kaju_action_receipts` | Live for a small set of NGO actions |
| Scheduled checks | `/api/admin/kaju/checks`, `kaju_check_*` | Partial |
| Pre-submit intent underlines | `src/kaju/feedforward.ts`, `Feedforward.tsx` | Live — recognises entities while typing, nothing sent until submit. Matches the handoff's composer in principle; needs editable menus and an action preview |
| Automations library | `/ngo/automations`, `/api/admin/automations/run` | Planned in effect — migration not applied |
| Durable missions, retries, approvals queue | none | Planned |
| Connected apps (Gmail, Calendar, WhatsApp Business) | `/api/connections/*`, `/api/careos/webhook` | Partial — scaffolding only; no provider approval or end-to-end test. Must not be labelled connected |
| Kaju in health data | — | Deliberately absent. Kaju does not read the `health` schema; the citizen chat is scripted |

### 2.6 Tests and delivery

- 23 Playwright specs in `e2e/`; one "quality" gate in CI (typecheck, lint, build, e2e) on every pull request.
- `demo-sync.yml` copies `main` to the `demo` branch after the gate passes; `production-health-probe.yml` checks production.
- Known defect: `e2e/one-health.spec.ts` writes into the illustrative demo programme on every run, which polluted the demo. Reseeded on 15 November; the tests still need their own programme.
- No tests for cross-tenant isolation written as such; RLS is exercised only indirectly.

### 2.7 Phone and offline

- PWA manifest and `public/sw.js` exist. Field capture has an offline outbox (`e2e/field-outbox.spec.ts`). **Live** for field notes and vaccinations.
- Phone layout uses a dock (`.ws-dock`) rather than the handoff's five-tab bottom bar (Today / Work / Messages / Kaju / More).

## 3. Discrepancies between the code and the handoff

| # | Handoff says | Code today | Consequence |
|---|---|---|---|
| 1 | Four workspaces: NGO, Government & Programmes, Healthcare, Research | NGO, Municipal, Programme coordinator, Hospital, Laboratory as separate "places"; no Research or Vet | Regroup; build Research and Vet |
| 2 | No One Health workspace or BeST fork | `/programme/*`, `src/oh/*`, "Sample programme" banner, tour built around one bite across five teams | Fold programme pages into Government & Programmes; keep the data |
| 3 | Attio look; "do not produce a Notion clone" | Notion-style frame and page kit (`src/ws/kit.*`), shipped over the last two weeks at the owner's request | Kit is replaced, not restyled |
| 4 | One account, one organisation model, multiple memberships | Three membership models | Needs a unifying migration — the riskiest piece |
| 5 | Native channels, DMs, threads | Nothing | New build, new tables, realtime |
| 6 | Durable Kaju missions with approvals and retries | Single-shot actions with receipts | New engine; needs a job runner decision |
| 7 | Dark and light of equal quality | Light only is maintained | New tokens cover both |
| 8 | Five-colour functional palette, no gradients | Per-section icon tones (blue, violet, teal, amber, green, flame, slate) | Collapse to the palette |
| 9 | Sidebar labels locked (NGO: Today, Inbox, Cases, Animals, Operations, Programmes, Submissions & Reports) | Rescues, Sterilisation, Animals, Reports, Team, Automations, Settings | Rename and regroup; redirects for old URLs |
| 10 | Self-serve sign-up for any organisation type | Self-serve for NGOs only; programme partners join by invite code | Extend onboarding |
| 11 | Records distinguish imported / recorded / reviewed / verified | Present for ABC operations; uneven elsewhere | Make it a shared field |
| 12 | Public demo posted on LinkedIn must keep working | Tour depends on the current pages | Tour is rebuilt last, old one kept until then |

## 4. Old → new route map

Old URLs keep working through redirects until the replacement is verified.

### NGO
| New | Built from | Decision |
|---|---|---|
| `/ngo/today` | `/ngo`, `/today` | Rebuild |
| `/ngo/inbox` | `/ngo/inbox` | Rebuild on same data |
| `/ngo/cases`, `/ngo/cases/[id]` | `/ngo/rescues`, `/ngo/pipeline`, `/ngo/work`, `/ngo/cases/*` | Merge three lists into one table with views |
| `/ngo/animals`, `/ngo/animals/[id]` | `/ngo/animals/*`, `/animal/[id]` | Rebuild; identity review kept |
| `/ngo/operations` | `/ngo/field`, `/ngo/map`, `/ngo/offline`, programme zones | Rebuild; reuse outbox |
| `/ngo/programmes` | `/ngo/programmes/*` | Rebuild |
| `/ngo/submissions` | `/ngo/sterilisation`, `/ngo/verification/*`, `/ngo/packages/*`, `/ngo/review`, `/ngo/evidence` | Merge |
| Secondary: team, training, templates, settings, integrations | `/ngo/team`, `/ngo/training`, `/ngo/settings/*`, `/ngo/import`, `/ngo/automations` | Keep, restyle; automations move under Kaju |
| — | `/ngo/feeding`, `/ngo/fundraising`, `/ngo/surveys`, `/ngo/volunteers`, `/ngo/stories`, `/ngo/projects`, `/ngo/proof`, `/ngo/quality`, `/ngo/readiness`, `/ngo/care`, `/ngo/contracts` | Remove from the product after owner confirms; data untouched |

### Government & Programmes
| New | Built from | Decision |
|---|---|---|
| `/gov/overview` | `/city/insights`, `/programme/[slug]` | Rebuild, two presets |
| `/gov/programmes` | `/city/programmes/*`, `/programme/[slug]/coverage`, `/setup` | Merge |
| `/gov/partners` | `/programme/[slug]/network`, `/setup` (partners, people) | Rebuild |
| `/gov/verification` | `/city/review/*`, `/city/contracts` | Rebuild; government-authorised only, enforced on the server |
| `/gov/surveillance` | `/city` (map), `/programme/[slug]/work`, alerts | Rebuild |
| `/gov/reports` | `/city/report`, `/programme/[slug]/report`, `/data` | Merge |

### Healthcare
| New | Built from | Decision |
|---|---|---|
| Human: Today, Bite cases, PEP, Referrals, Facilities, Surveillance | `/workspace/[id]`, `/register`, `/new`, `/record/[rid]`, `/services`, programme network | Rebuild on the `health` schema |
| Laboratory: Work queue, Samples, Testing, Results, Quality | `/workspace/[id]`, `/sample`, `/services` | Rebuild on `oh_samples` |
| Veterinary: Today, Patients, Appointments, Clinical care, Procedures, Follow-ups | `medical_events`, ABC operations | New build; new tables for appointments and encounters |

### Research
| New | Built from | Decision |
|---|---|---|
| Overview, Datasets, Explore, Maps & Analysis, Studies, Reports | `/programme/[slug]/data`, spatial APIs | New build |

### Cross-app
| New | Built from | Decision |
|---|---|---|
| Channels | — | New |
| Kaju compact + full page with Missions, Automations, Approvals, Insights, History | `AiPanel`, `/assistant`, `/ngo/automations` | Rebuild |
| Search / command bar | `/search`, quick actions | Rebuild |
| Onboarding | `/sign-in`, `/join`, `src/sp/onboard` | Extend |

## 5. Keep / migrate / rebuild / remove

- **Keep as is:** Supabase auth, RLS policies, `health` schema isolation, audit tables, imports pipeline, animal identity jobs, map and spatial APIs, offline outbox, CI gate, operator console, public site.
- **Migrate:** organisation and membership models into one; programme tables renamed away from `oh_` only if worth the risk (views first); role names to the handoff's roles.
- **Rebuild:** shell, page kit, every signed-in page, Kaju surfaces, phone navigation, guided demo.
- **Remove after replacement is verified:** `src/sp3`, `src/sp4`, old skins in `src/sp/ui/skin.css`, duplicate NGO pages, One Health naming in the interface.
- **Never removed:** production rows. No destructive migration is part of this plan.

## 6. External dependencies and their real state

| Dependency | State |
|---|---|
| Anthropic API key and paid model | Key present; model and budget not confirmed by the owner |
| WhatsApp Business (Meta) | Not approved, no number, no templates. Planned |
| Gmail / Google Calendar OAuth | Scaffolding only. Planned |
| Hospital, laboratory, municipal data agreements | None. All clinical and municipal records are illustrative |
| Durable job runner for missions | Not chosen. Options: Postgres queue with a Vercel cron worker (no new vendor) or a hosted workflow service |
| Realtime for channels | Supabase Realtime is available; not yet used |

## 7. Risks

1. Unifying tenancy touches every RLS policy. It needs staging rehearsal and owner approval before production.
2. The LinkedIn demo link is public. Replacing pages under it without a working tour would break a live promise.
3. One real partner NGO uses the current NGO pages. Their daily screens change; they should be told before the switch.
4. Channels carry a privacy risk: patient facts must not reach general channels, search or Kaju context.
5. The scope is several months of work for one builder. It ships in stages behind a flag, not as one release.

## 8. Fixture dataset

Screenshots and tests use the illustrative Bengaluru programme (`supabase/seed/one_health_demo.sql`) and the sample NGO on staging. Both are marked illustrative in the data. The rebuild adds synthetic fixtures for channels, missions, vet and research; none are written to production.

## 9. Proposed order

Follows the handoff's priorities, each stage behind a `rebuild` flag and reachable at `/next/*` until it replaces the old page:

1. Tokens, shell (rail, sidebar, tabs, drawer, command bar, phone bottom bar), table, record page, status chip, activity timeline — proven on NGO Today, Animals and Animal record at 1440 / 768 / 390, light and dark.
2. NGO and Government evidence loop on the new components.
3. Channels, DMs, threads, record threads, tasks, notifications.
4. Kaju compact and full page, composer, missions with approvals.
5. Healthcare (human, laboratory, veterinary).
6. Research.
7. Onboarding for all organisation types, tenancy unification, guided demo, removal of old pages.
