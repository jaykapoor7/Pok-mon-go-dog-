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

## 11 Nov, late: the operating path (owner: "all pages, sidebar options, workflows within, screens after clicking, all need to be rethought"; "one cohesive operational system with intentional clicks, placement, transitions, animations; following clicks leading to other pages also intentional")

PR #67 (dashboard pass 2) merged as `be4b57a1` after GitHub Actions recovered from an outage (their incident, 20:48 to about 21:10 UTC; no run of ours failed). Production verified in a browser on that sha: dock shell, menu Today / Pipeline / Animals, Pipeline views, place in the bar, no page errors.

This pass makes the workspace one path instead of a set of pages:

| Item | Status | Evidence |
|---|---|---|
| `src/sp/ngo/pipeline.ts`: the five stages defined once (names, order, reads). Today's strip, the board and the record rail all use it, so a stage has one name and one count everywhere | Done | |
| Today's strip is the same five stages and opens the board at that stage (`?stage=`); the old strip had different names (Intake, Identity, Treatment, Release, Billing) and opened five different pages | Done | `e2e/operating-path.spec.ts` |
| Board: the stage a click pointed at is scrolled into view and marked | Done | same test |
| Stage rail on the case record and the sign-off record: where the record is in the line; each stage opens the board at that stage. A case with no procedure has the shorter line New, In care, Closed | Done | same test |
| Sign-off record: one "Next step" callout with one action, "Take me there", that scrolls to the control that does the step, focuses it and marks it. When done: "Open reports". When someone else must act: "Back to the board" at that stage | Done | same test; staging screenshots |
| A returned record's note no longer ends in a double full stop | Done | |
| Animals whose identity needs a person are named under the strip (not a stage of the line) | Done | |
| Keyboard focus is visible on the dark menu (white ring) | Done | |
| Stage names stay available to screen readers on a phone, where only the current stage is written out | Done | found by the phone run of the test |
| Page titles: one format, "Page, StrayPaw" (45 pages used a middle dot) | Done | |
| `e2e/operating-path.spec.ts`: the whole path, read-only, phone and desktop, against staging | 2 passed | runs with `OH_E2E=1` |

Looked at and left as they are, with the reason: `/report-content` has no site header because it is a Community page inside the app; `/mission` has no footer by design ("one wall, nothing else on the page").

Still to rethink in the same way (next passes): the municipal review flow, the hospital desk (bite register to course), the laboratory bench, the programme cell's decisions, Animals (register to an animal's life), Reports (blocking reasons to the records that cause them), Intake (report to case).

## 11 Nov, late: the rail on every record that moves (after #68)

PR #68 (the operating path) merged as `187b433b`. The deployed demo was walked as six sample roles on `be4b57a1` (field worker, vet, coordinator, NGO coordinator, laboratory scientist, municipal reviewer): each signs in, gets the menu for its role, the board marks its own step, no page errors.

| Item | Status | Evidence |
|---|---|---|
| `src/sp/ui/Rail.tsx` + `rail.css`: one rail component for any record that moves through stages; `StageRail` is the line-of-work rail built on it | Done | |
| Report package (operator and reviewing office see the same): Prepared, With the reviewing office, Accepted; "Returned to prepare" and "Queried by the office" when that is the state | Done | Staging: an accepted package |
| Laboratory sample: Collected, On its way, Received, Testing, then the result in its own tone (positive in flame), or Rejected | Done | Staging as the laboratory scientist |
| Bite record: Recorded, Category, Course, then how the course ended. It states what is recorded and gives no clinical advice | Done | Staging as the hospital clinician |

Noticed, not changed: the staging bite register still holds records named `E2E-…` from earlier end-to-end runs. They show in the demo. Removing them is a delete on staging and needs the owner's word (the earlier approval covered the duplicate sample and notice records).

## 12 Nov: the console (owner: "empty space around side bar and weirdness around edges... classy premium cohesive dashboard with cool side bar nav and top, all weaved in with each other"; "footer header sides smoothly integrated"; "not cluttered home page"; "features according to the Bengaluru proposal"; "inner pages reworked, don't reuse old ones"; "onboarding better and self sufficient")

PR #69 (the rail on package, sample and bite record) merged as `f650b8f2`.

The floating menu from #67 left a mostly empty gutter and a sheet with margins on three sides. It is replaced.

| Item | Status | Evidence |
|---|---|---|
| `dock.css` deleted, `console.css` in its place: sidebar, top bar and a new status footer are one ink frame around one sheet; the sheet keeps four rounded corners while the page scrolls | Done | Staging at 1440×900, scrolled; e2e asserts the sidebar is full height and the sheet meets it |
| Sidebar, top to bottom: place (chooser), menu with the gliding white pill, All sections, Kaju's card, the person and the tuck button | Done | |
| Status footer: Online/Offline, place and programme, ⌘K, ⌘J, Help, time | Done | e2e |
| Tuck: the sidebar slides out, a handle stays; hover or focus brings it back over the page; press keeps it | Done | e2e (unchanged test passes) |
| Kaju: one place in the sidebar (was also a top-bar button and, in Community, a menu row) | Done | launcher tests updated; focus still returns to the launcher |
| Signed out: one Sign in, in the sidebar | Done | |
| Home rebuilt: date, greeting, one sentence; **First** (one dark card, one action); **The line today**; **Also waiting** (at most three); **From Kaju** as one closed fold. The ask bar, chips, recent activity and the two-card grid are gone from the page | Done | Staging as the NGO coordinator |
| NGO programme menu from the proposal, ordered by use: Requests, Vaccination coverage (70% target), Care network, Overview | Done | Coverage page opens for the NGO coordinator on staging |
| Guided demo: the Kaju step points at Kaju's card | Done | |

Next in this brief, not yet done: inner pages rebuilt (Queue, Intake, Sign-off list, Animals, Reports), onboarding.

## 12 Nov: inner pages rebuilt on one page pattern (after #70)

PR #70 (the console and Home) merged as `21f16b75`.

Owner: "the inner pages once you click on side bar need to be reworked... all workflows and how a page works and what's on it needs to be rethought too, don't reuse old ones".

`src/sp/ui/Page.tsx` + `page.css` is one pattern for every screen behind the menu: a head (what the page is, what is on it now, its actions), lanes whose marker glides to the chosen one, rows that state what each record needs next, and an evidence meter.

| Page | How it works now | Status |
|---|---|---|
| Sign-off & evidence | Three lanes by who a record is waiting on: **Waiting on you**, **With others**, **Reported** (it opens on yours). Each row says the next step and who does it ("Next: add release place · Field team"). A stage in the address still narrows the list, with one "Show everything" | Done, staging |
| Animals | Lenses the programme asks about first (All, Needs help, Not sterilised, Not vaccinated); three-state marks that never blur (done, recorded as not done, not recorded); the animal under the pointer or keyboard is shown beside the list before it is opened | Done, staging |
| Reports | Left: the month in hand (what can be claimed, what blocks the rest, the one button). Right: every package with its three steps (prepared, with the reviewing office, accepted) | Done, staging |
| Intake | Channels as lanes with counts; a report is ticked, not opened; the panel names the two things a report can become (a case for the team, an entry in a drive) and enables the one that fits | Done, staging |

Found while building: three of my new class names collided with existing ones (`.sr` earlier, then `.pg-*` with the programmes pages and `.rp` with the route line, which made Reports invisible). Renamed to `.vw-*` and `.rpt-*`; every new class name is now checked against the codebase before use.

Still to rebuild: the Queue (list, map and inspector), Decisions, Field mode's capture flow, the programme places, onboarding.

## 12 Nov: the first day (owner: "onboarding needs to be better and self sufficient too and creatively well")

PR #71 (Sign-off, Animals, Reports, Intake rebuilt) merged as `a75f1d40`. Production and the demo were verified in a browser on `21f16b75` (#70): console frame, status footer, Kaju's card, full-height sidebar meeting the sheet, no page errors.

What existed: a pre-sign-in scene at `/app` (meet Kaju and the crew) and the guided demo at `/try`. Nothing inside the workspace taught the frame or the path, so a new member depended on someone showing them.

| Item | Status | Evidence |
|---|---|---|
| `FirstDay`: six steps that light the real control while the rest dims (place, menu, one thing first, the line, Kaju, status line); the light glides from one to the next | Done | Staging screenshots at each step |
| Opens once by itself on the place's home for a new member; **Guide** in the status line opens it again | Done | |
| A control that is not on the screen is passed over at the moment the guide moves; a step can name a fallback, so a page still loading does not lose its step | Done | found by the test (Home's data had not arrived); fixed |
| Ends on real actions by role: lead (bring register, add team, board), coordinator (board, this month's report, partner requests), vet (sign-off, own stage), field (field mode, board), reviewer (decision queue, contracts), programme places (the place, its primary action) | Done | |
| Keyboard: Esc closes, arrows move, focus goes to the primary button; reduced motion: no glide | Done | |
| A sample session keeps its own guided demo: this guide does not open by itself there | Done | test asserts it |
| `e2e/operating-path.spec.ts`: second test walks the guide on staging and checks the lit control is the one described | 3 passed, 1 skipped (phone has no status line) | runs with `OH_E2E=1` |

## 12 Nov: the Queue, as a view of the Pipeline (after #72)

PR #72 (the first day) merged as `cc0924de`. Production and the demo were verified on `a75f1d40` (#71): Home and the four rebuilt pages checked on the deployed demo as the coordinator, new layouts present, no overflow, no page errors.

| Item | Status |
|---|---|
| Queue head: a title and what is in it (live, critical, follow-ups overdue, held by nobody). The priority ribbon is gone: it repeated the filters under it | Done |
| Cohorts are three lanes with a gliding marker: Live, Needs a decision, Imported | Done |
| Rows match the board's cards (quiet border, one accent for critical or overdue); search and filter chips in the page pattern's language | Done |
| The lanes carry their own colours, so they work on a page that is not built on the pattern's container (the count on the chosen lane was invisible on the Queue until then) | Done |
| Unchanged: the map, the inspector, keyboard moves, every read and action | |

## 12 Nov: Decisions on the page pattern; where the dashboard rebuild stands

PR #73 (the Queue) merged as `4334cfcb`. Production verified on `cc0924de` (#72, the first day).

Decisions (`/ngo/review`) now uses the page pattern: a head that says how many records need a person, three lanes with counts (Waiting on a decision, Imported never confirmed, Closed without a reason), and the same decision cards. Every decision goes through the same call as before.

**Rebuilt since the owner's brief of 11 Nov (all live or in the gate):** the frame (sidebar, bar, status footer, one sheet), Home, the Pipeline board, Queue, Intake, Sign-off & evidence, Decisions, Animals, Reports, the rail on case, sign-off, package, sample and bite records, the next-step callout, the first-day guide, the NGO's programme menu from the proposal.

**Not rebuilt yet (still their earlier layouts inside the new frame):** the animal record and the case record bodies below their rails; the programme places (hospital desk and bite register, laboratory bench, programme cell overview, coverage, care network, requests); the municipal workspace (Today, review queue, contracts, wards map); Community and the Academy; the All sections index.

## 12 Nov: Field mode as a round

PR #74 (Decisions) merged as `22ff2e5f`.

Field mode (`/ngo/field`) is rebuilt as the person's round for the day. The head gives the date and the number of stops (late ones counted in red) and a connection chip: online, offline or no signal, with how many records wait on the phone. Opening the chip explains where a record goes and holds the one switch; with no signal it offers "Keep working offline". One large control records an animal in front of you (the same intake form, the same checks). Follow-ups due come first, then the cases in the person's hands; each stop has its thumb action (Done / Missed, or Start) and "Record", which opens four tools (note, evidence, vaccination, care or movement) and one form at a time. "This phone" lists what is waiting with "Send all", each waiting record with send, download and remove, and what was sent with its receipt. The offline PIN opens inside the same page. Sync, encryption, scopes and every save call are unchanged; the outbox test still covers them.

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
