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

## Owner decision, 11 Nov (after #60 to #63): the new landing was wrong; go back to the old blueprint

The owner judged the rebuilt landing, hero, navigation and pages (PRs #60, #61) poor and generic, and the earlier site much better. The earlier site is the blueprint: its hero with the product demo, use cases, teammate, recurring work, integrations and security sections, its three-menu navigation and its page kit (`ProductPage`). Improvements are made to that, in its own visual language.

| Step | Status |
|---|---|
| A. Restore the old landing, navigation, footer, Platform, Pricing, For governments, For NGOs and Meet Kaju pages and their tests; remove the `src/site6` code | Done (this PR) |
| A. Keep what was added since, inside the old structure: `/for-hospitals` rebuilt on the old page kit and linked under Solutions; a programme section on Platform, For governments and For NGOs; clinic, laboratory and programme-cell windows have their own sidebar | Done (this PR) |
| A. Fix found on the way: `/for-hospitals` was rendering inside the app shell on production; it is now registered as a public page | Done (this PR) |
| A. Fix kept from before: the Platform partner strip lists only organisations in the field-partner data (an unverified name is no longer shown) | Done (this PR) |
| B1. Use cases: a second track in the same frame (ABC programme / City rabies programme): record, follow up, test, decide, report, with screens in the old window style; screens arrive from the side you move toward | Done |
| B1. Hero: Kaju wags or tilts his head when the pointer or focus reaches the hero buttons; a soft light follows the pointer across the blueprint; the rotating line includes rabies elimination programmes; the announcement bar carries city programmes | Done |
| B2. Dashboard sidebar rebuilt on the owner's reference recording (`src/sp/shell/rail.css`): a navy glass panel that grows from a rail with concave joins, numbered items, a lit pill that glides and runs to the panel edge; it tucks into a Menu handle, grows back on hover or focus, and pins on press. Kaju keeps his corner | Done |
| B2. No More list. The two programme links that were folded are in the nav under Manage; everything else is one organised index (All sections) grouped by area, in the Finder | Done |
| B3. Header: a pill follows the pointer between items; the Solutions and Resources menus carry a vector drawing that draws itself when the menu opens | Done |
| B3. A route line across the top while the next page is on its way, everywhere (`RouteProgress`) | Done |
| B3. Inner pages (page kit): reading-progress line, a hero that comes into focus and leans to the pointer, product-window rows that arrive as they scroll into view (`PageMotion`) | Done |
| B3. App: the page's ambient light follows the section you are in (today, work, programme, manage) | Done |
| B4. App screens rebuilt one by one (Today, work queue, register, verification, reports, programme pages) | Next |
| Site audit (55 public pages, phone and desktop, 151 links): no broken pages, images or dead links. Fixed from it: `/status`, `/data-processing` and `/try` rendered inside the app shell; three dead anchors on ABC operations; two wrong links on Donate; the status banner stuck on "Checking"; primary buttons unreadable on five pages (1.2:1 and 2.6:1); footer legal links under 20px tall on phones. Left for a decision: 25 pages still on four older page kits with different type sizes; `/report-content` has no site header; title format differs between pages; legacy links that redirect | Done / open |
| CI note: the quality gate failed five times on 11 Nov while installing browsers (the runner could not resolve the Ubuntu mirror); no test ran. Not a code failure; re-run from the Actions page if it persists | Open |
| Not reverted: the sign-in split layout, demo request types, the guided demo, Kaju's partner-requests tool, alert clustering | Kept |

The sections below about "Batch 1" and the "Site visual pass" describe work that this decision supersedes on the public site.

## 11 Nov, evening: live state and the dashboard pass

| Thing | State | Evidence |
|---|---|---|
| PR #65 (landing improvements, header, inner pages, the rail sidebar, All sections, audit fixes, sturdier gate) | Merged as `c26d1d7c`; live on straypaw.org | `/api/health` sha; live `/ngo` has the panel and handle and no More list; `/status` no longer inside the app shell |
| Quality gate | The Install browser step now survives a Ubuntu mirror outage (owner approved): it tries with the extra fonts for five minutes, then installs the browser alone | Run on #65 green after six infrastructure failures |
| Staging test records | Removed with the owner's approval: 6 samples my journey test created (method marked E2E), their custody events and the 24 result notices they generated. Seed records untouched | Programme overview on staging: 1 confirmed case, 2 open decisions |

Owner feedback after #65 went live: the sidebar "looks way too AI", its top has a glitch, the dashboard pages look the same, Field mode's online/offline control is disliked, and every page behind the sidebar should be reworked in concept and workflow.

This PR (dashboard pass 1):

| Item | Status |
|---|---|
| The frame: on desktop the sidebar and top bar are one deep-ink piece and the work sits on a sheet inside it, with a rounded corner where they meet. The corner artefact at the top of the sidebar is gone | Done |
| Restraint: no glows, gradient sheens or neon. Flat ink, one solid pill, hairlines. The mechanism from the recording stays | Done |
| Today: a deck. The frame comes down to hold the greeting and the Ask Kaju bar; the day's pipeline reads as one line of work | Done |
| Programme, clinic and laboratory pages open on the same deck (page name, purpose, range) | Done |
| Field mode: the two Online / Offline tabs are replaced by one status line (where a record goes right now) and one switch, Work offline | Done |
| Sign-in: the earlier page is back (the split layout came from the rejected redesign) | Done |
| Removed: the per-section loading files added in #65. They made the server stream pages in two pieces, which duplicated text for a moment and made one test flaky. The route line remains the loading signal | Done |
| Next: each sidebar page reworked in concept and workflow, after the owner chooses a direction | Open |

## 11 Nov, night: dashboard pass 2 (owner: "nav bar looks way too AI, top has glitches, dashboard still looks the same"; "each sidebar page reworked, I don't like the current concepts and workflows")

PR #66 (the frame, Today's deck, Field mode status line) merged as `8584ca87`; production and demo verified on that sha.

The owner then asked for a proper redesign. My question about direction went unanswered, so I took the option I had recommended and say so here: **one Pipeline instead of three work pages**, and the menu **copied from the recording as a floating tab, not a column**.

| Item | Status | Evidence |
|---|---|---|
| Shell: `rail.css` deleted, `dock.css` in its place. Compact dark menu floating on the left edge, vertically centred; white pill glides between pages; hairlines between groups; no numbers, mono labels, glows or washes | Done | Staging, 1440×900, 1024×700, 1280×620, 1920×1080: pinned, hover, tucked, peek |
| Tucked: a short handle on the edge; hover or focus grows the menu over the page; press keeps it open; the tucked menu is inert | Done | e2e `the sidebar tucks into a Menu handle…` |
| Top bar: place switcher (left), breadcrumb, search, Ask Kaju, the one primary action, account menu (Help, settings, sign out). The navy frame and the concave corner are gone (source of the "glitches at the top") | Done | |
| One white sheet on a quiet canvas; the pointer light and drifting blue washes are off on desktop | Done | |
| Kaju sits on the menu (was a corner of the sidebar) | Done | |
| Concept: **Pipeline** `/ngo/pipeline`, a board of five stages (New, In care, With the vet, Evidence, To report) from the existing reads (`org_incoming`, open cases, verification queue `stageOf`). No new tables, no new writes | Done | Staging as the NGO coordinator: 13 records, 2 need attention first |
| Queue, Intake, Sign-off & evidence, Decisions, Field mode are **views of the Pipeline** (tabs), with one breadcrumb `NGO / Pipeline / view` | Done | e2e `the Pipeline is one board…` |
| Menu by role: coordinator Today, Pipeline, Animals, Reports; vet Today, Pipeline, Animals; field team Today, Field mode, Pipeline, Animals; plus Programme, Care network, Requests | Done | |
| The NGO's menu stays the same on its programme pages (Requests, Care network); All sections stays too | Done | |
| Cross-place Today (clinician with two facilities): the menu lists the places with what is waiting at each | Done | Staging as the hospital clinician |
| Today: on the sheet, lighter greeting, the line of work as one joined strip | Done | |
| One page title size and weight on every screen behind the menu | Done | |
| Guided demo: a Pipeline step for the NGO coordinator | Done | |
| Phone: unchanged bar and thumb tabs; Pipeline replaces Queue in the tabs; the board scrolls a column at a time | Checked at 390×844 | |

Not done in this pass: the Queue's own header and the Reports page keep their earlier layout inside the new shell; the vet and field-worker sample accounts cannot sign in locally (their password is only on the deployed demo), so those two roles are checked after deploy.

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
