# StrayPaw rebuild ledger

Persistent record of the product rebuild. Update at every milestone. Latest first.

## State on 11 Nov 2026 (session 3)

| Thing | State | Evidence |
|---|---|---|
| straypaw.org | Serves `main` @ `03cbba68` (PR #62, Batch 2; #61 and #60 before it) | `/api/health` → `sha 03cbba68…, environment production`; landing contains the switchboard and Kaju scene; `/for-hospitals` 200 |
| demo.straypaw.org | Serves the same commit (`03cbba68`, checked); guided demo walked there end to end, 12 of 12 steps; demo env vars set for the `demo` branch (`DEMO_ONEHEALTH_PASSWORD`, `NEXT_PUBLIC_OH_DEMO`, `NEXT_PUBLIC_OH_PUBLIC_PROGRAMME`, bite-help flag) | `/api/health`, Vercel env list |
| Staging database | One Health v2.1–v2.5 applied; illustrative demo seeded; 11 demo accounts | 19/19 permission checks, 14/14 journey |
| **Production database** | **No programme or AnimalID tables.** | `oh_tables = 0` |

### Blocked on the owner (one click each)
1. **Production migrations.** GitHub → Actions → "Apply Supabase migration" → Run workflow → `one-health`. The session's GitHub token cannot dispatch workflows (403) and direct production SQL is ruled out. Until this runs, programme pages on straypaw.org say "Programmes are not set up on this database yet"; NGO and municipal work is unaffected.
2. **AnimalID worker secrets**: `ANIMALID_SUPABASE_URL`, `ANIMALID_SUPABASE_SERVICE_KEY` (repository secrets), then add `animal_id` to `SP_FLAGS`.
3. **Production role accounts** (after 1): created by invitation from Programme setup; sign-in is by emailed code, so each needs a real mailbox the owner controls (for example plus-addresses).

## Batch 1: website, experience, design system (merged as PR #60; production verified)

Design system "StrayPaw 6" (`src/site6/`): one stylesheet, the thread motif, motion primitives (`data-reveal`, `data-progress`, word rise), content visible without script.

| Item | Status |
|---|---|
| Tokens, type, buttons, chips, motion primitives (`site6.css`, `Motion.tsx`) | Done |
| Navigation: 4 menus + Pricing, hover intent, keyboard, phone sheet (`Nav.tsx`, `nav.ts`); all 32 links verified 200 | Done |
| Footer (`Footer.tsx`) | Done |
| Landing: new positioning, relay hero, roles, the loop (scroll-linked), capabilities, Kaju, trust + honest status table, results, questions, close | Done |
| Kept by request: animated product demo window, Use cases (pinned five steps), recurring work with Kaju | Done |
| Sign-in: split layout, thread panel (`enter6.css`) | Done |
| Rewritten on the new kit (`src/site6/kit.tsx`): Platform, Pricing, For governments, For NGOs | Done |
| Hero art: city plan behind the words; the thread sits between the copy and the relay, one node over each lane | Done |
| Demo request page and form: One Health programme and research request types | Done |
| Other linked pages (earlier kit) share column, buttons, type | Harmonised; rewrite page by page continues in Batch 2 |
| Tests updated, full suite (232 passed), quality gate green, merged, production verified | Done |

Decisions: positioning moved from "AI agent for animal welfare" to "one record for animal health and One Health programmes"; status table on the homepage states what is live, in rollout and not connected; no invented metrics.

## Site visual pass (merged as PR #61; production verified)

Owner feedback after Batch 1: fewer words, visuals do the talking.

Benchmarks read: Linear and GovDash landings use about 20 words of body copy per section, one product visual per section, a lifecycle order, a short "meet the assistant" section and questions last. The landing now follows that.

| Item | Status |
|---|---|
| Landing cut from 11 sections to 9 scenes; hero lede is one line; loop, capability list and trust prose removed | Done |
| What we offer: the module switchboard (`Switchboard.tsx`). Six switches, each plays a product scene; switching one off removes it from the mock workspace, as Programme setup does | Done |
| Meet Kaju: a playing scene (`KajuScene.tsx`): question, records read, cited answer, prepared action, a person approves. Kaju's character reacts to each step. Also the hero of `/ai` ("Meet Kaju") | Done |
| Hero: the node of the institution holding the record lights up in step with the relay | Done |
| Proof: partner register figures (count up) beside the live / in rollout / not connected board | Done |
| Navigation: 36 links down to 22, no destination listed twice (tested); each panel has a drawing instead of a paragraph | Done |
| New page `/for-hospitals` (hospitals and laboratories), stating what StrayPaw never does clinically and that none is connected yet | Done |
| Kept by request: animated product demo, use cases, recurring work | Done |
| Tests: switchboard, Kaju scene, unique menu destinations, no-script; full suite 238 passed | Done |

## Batch 2: application and intelligence

Done earlier (PR #59): one shell with places, one sidebar pattern, the programme layer (clinic desk, register, PEP tracking, laboratory, requests between partners, care-network map, alerts, coverage, report, research extract, setup, invites, start a programme), AnimalID worker.

This session (merged as PR #62; production and demo verified):

| Item | Status | Evidence |
|---|---|---|
| Inner NGO pages audited on staging (work queue, register, verification, report packages, intake, map, team) | Consistent with the shell; no rewrite needed. The blank small portrait plate is a documented decision (no stand-in for an animal) | Screens in the session scratchpad |
| Kaju in a programme: `partner_requests` tool. Says which partners are waiting and what is overdue, from the request only (title, place, due date) | Done | Asked on staging as the NGO coordinator: "9 requests from programme partners are open, 1 overdue", cites the Requests page. Contract check 27 in `test:kaju-polish` fails if a clinical column or count is read |
| Kaju suggestions: the partner question is offered on an NGO's Today when a partner is waiting, and in programme places | Done | |
| Guided walkthrough on the existing demo (`/try`): six connected-programme steps before the ABC chain, existing demo sign-in, fallback to the ABC chain where programme accounts are absent | Done | Steps 1 to 6 walked on staging with the right control highlighted; ABC steps unchanged (their sample password is not available outside the demo deployment) |
| Guide card no longer overflows with long role names | Done | |
| Guided demo on demo.straypaw.org after deploy | Verified | All 12 steps: each sample role signs in, the right screen opens, the right control is highlighted, no page errors, closing card shown |
| Follow-up polish (next PR): several confirmed samples from one area show as one cluster alert with each sample inside; the guide's start button works before the page is interactive | Done | Staging: "Rabies confirmed in HSR Layout · 7 samples"; staging journey test passes |

Not done, and why: production role accounts and programme data on straypaw.org wait for the owner to run the migration workflow (see "Blocked on the owner"). Other linked public pages on the earlier kit are harmonised, not rewritten.

## Next steps after an interruption
1. `git log --oneline -5` on the branch; run `npm run build && E2E_BASE_URL=… npx playwright test`.
2. If a Batch 2 PR is open: wait for the quality gate, merge, verify `/api/health` sha on both sites, then walk `/try` on demo.straypaw.org.
3. After the owner runs the production migration: create role accounts by invitation from Programme setup and record them here.
