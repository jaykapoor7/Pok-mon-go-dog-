# StrayPaw 5 handover (10 November 2026)

For whoever continues this work. Branch: `claude/straypaw-product-redesign-eyszyc`
(based on `main` at `6bb02c1`). Nothing was deployed, no migration was run and
no real database was read or written. No pull request has been opened.

Read first: `DESIGN.md` section 0 (the rules this work added) and
`docs/sp5/REDESIGN-2026-11-09.md` (audit, what changed, screenshots in
`docs/sp5/renders/`).

## What the owner asked for, across all requests

1. Transform the whole experience: public site, every workspace, one design
   system, effortless workflows, real testing, before/after evidence.
2. Make it far more creative and cohesive on the same blueprint: better
   hero and landing, smoother motion, no loose cards, a much simpler phone
   product.
3. "Do it all": finish every screen left over.
4. First-time onboarding, a redesigned sign-in and the idea behind it, a
   cohesive dashboard, landing transitions, a transformed phone layout.
5. Make Kaju genuinely useful with no model attached; add things it can
   generate and automate across the connected tools, for every party.

## Done and pushed

| Area | State |
|---|---|
| Landing page | New story order, hero choreography, record line (reading bar + chapter rail), partners band, operator/office package frame, Kaju console, integrations status board, pilot section, scroll-tied motion, pointer tilt |
| App shell | One 32px page edge, one name per place, line-icon sidebar, Back only on records, glow removed, Kaju panel no longer covers the top bar |
| NGO Today, government overview | One sheet each; Today has the pipeline line |
| Verification, government review, intake, report packages, reports & proof | Sheet language (stage strip joined to list) |
| Phone shell | Top bar: workspace name, search, account. Thumb bar: up to three places, one action, Kaju, More |
| Sign-in, join, access | One column, six-cell code, three doors, record line with four roles. Auth logic unchanged |
| First-run welcome | `src/sp5/app/FirstRun.tsx`: per-role sheet, once per person/workspace/device, reopen from account menu |
| Kaju without a model | See next section |

## Kaju (tools-only engine): what was added last

Files: `src/sp3/ai/understand.ts` (pure), `src/sp3/ai/caseQuery.ts`,
`src/sp3/ai/compose.ts`, wiring in `src/sp3/ai/engine.ts` and
`src/sp3/ai/tools.ts`, checks in `scripts/test-kaju-understand.ts`
(`npm run test:kaju-understand`, 19 checks).

- **Normalising**: spelling slips, Hinglish and field shorthand are rewritten
  before the router's rules run.
- **Case questions**: count, list, breakdown and "most/least" over the
  organisation's cases with filters (state, unassigned, mine, critical,
  overdue, older/quiet for N days, a date window) and rough words matched
  against zones, people and conditions present in the records. New tool
  `query_cases` (one bounded read of up to 1,000 rows; the model path can use
  it later too).
- **Follow-ups**: a short reply ("only unassigned", "by zone", "and last
  month?") changes the previous case question. The engine replays the last
  four user turns to rebuild that context.
- **Glossary and small talk**: the programme's own terms; thanks, okay, who
  am I, are you an AI.
- **Writing**: morning brief, missing-evidence reminder, vet sign-off list
  (all from tool results), and three standard notices (dog-bite first aid,
  ABC drive notice for residents, finding an injured animal). If an email
  address or `#channel` is named and that account is connected, the text is
  prepared as an email or Slack post to confirm.
- **Recovery**: an unmatched request gets the closest things Kaju can do.

Verified: typecheck, lint, build, the eight existing Kaju unit suites and the
new one. **Not verified**: the full Playwright suite after the Kaju change,
and Kaju's new answers in a real browser session against real records. The
last full Playwright run (233 passed, 15 skipped) was before the Kaju work.

Known gaps in the Kaju work:
- Case questions cover cases only, not animals, care records or ABC
  procedures ("how many sterilised this month" still goes to the older
  programme branch).
- "Compare this month with last month" is not implemented (the parser
  ignores "compare").
- The morning brief shows the overdue count from the work summary only;
  it deliberately does not call `overdue_followups` because that tool also
  prepares reschedules.
- No new scheduled automations were added. The existing six in the Kaju hub
  are unchanged. Scheduling new ones needs database work the owner has not
  approved.
- The Kaju panel's tool-progress labels (`AiPanel.tsx`, around line 195) have
  no entry for `query_cases`; it shows the raw name while running.
- The panel's page-based suggestion chips were not updated to advertise the
  new abilities (brief, reminder, breakdowns, notices).
- Municipal reviewers and community users got the glossary, small talk and
  notices only; no new record analysis for them.
- It is still rules, not conversation. Free-form questions outside these
  patterns fall to search and the "closest things I can do" list.

## Not done

Design and product:
- Work queue and programmes: frame and naming only, no sheet treatment.
- Animal and case detail pages: not redesigned (they do not load with data
  in the local demo mode; see "How to run").
- Community and Education workspaces: not reviewed.
- Public pages `/platform`, `/for-ngos`, `/for-governments`, `/pricing`,
  `/customers`, `/demo`: not redesigned to match the new landing.
- `/app` (the Open app chooser): old design.
- Landing results row (dark partner accordion): unchanged.
- Kaju full-screen page `/assistant` and the docked panel: not restyled in
  the sheet language.
- Dialogs, toasts, tables and forms across secondary pages: not audited.
- Dark mode: not considered.

Engineering:
- The app stylesheets are still a stack of override layers ending in a long
  "StrayPaw 5" section in `src/sp/shell/app4.css`. Collapsing them into one
  token file is the right next step and is a large change.
- `src/sp4/home/v7/Welcome.tsx` and `src/sp3/entry/WhatsNew.tsx` are no
  longer used by the pages changed here; check for other users, then remove.
- `scripts/qa/hero-check.mjs` asserts a headline two versions old.
- One lint warning in `src/sp/city/OfficeStrip.tsx` predates this work.

Verification still owed:
- Animations (hero tilt, scroll-tied settling, package token, welcome sheet)
  were checked through screenshots, never watched live or on a real phone.
- No real signed-in session, no staging role scripts
  (`scripts/staging/*`), no contrast audit script run.
- The first-run welcome is skipped for any browser that already has
  `straypaw.tour.v2` set, so existing users only see it from the account
  menu. Decide whether that is wanted.

Open questions for the owner:
- "Change our log in details" was read as redesigning sign-in. If it meant
  changing credentials or how accounts work, that is not done.
- The owner offered demo logins. None were created; everything was reviewed
  in the built-in illustrative mode.
- Removing the app's background glow and leading the landing with the
  platform instead of Kaju both reverse earlier documented decisions.

## How to run and check

Dependencies: `npm ci` fails here because `cdn.sheetjs.com` is blocked. The
workaround used: remove `xlsx` from `package.json` and the lock file, run
`npm ci`, then `npm install --no-save --no-package-lock xlsx@0.18.5`, then
`git checkout package.json package-lock.json`.

Signed-in screens without a database: create `.env.local` with
`NEXT_PUBLIC_DEMO_RECORDING=true` and no Supabase URL, then `npm run dev`.
`/ngo/...` opens as a coordinator of "Coastal Paws Trust", `/city/...` as a
reviewer. Sign-in redirects in this mode; remove the variable to see it.
Delete `.env.local` before building for the tests.

Checks: `npm run typecheck`, `npm run lint`, `npm run build`, then start
`npx next start -p 3100` and run
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off`.
Stop any old `next-server` process before rebuilding, and do not run other
heavy jobs alongside the suite (it causes timeouts). Kaju unit suites:
`npm run test:kaju-understand`, `test:kaju-polish`, `test:kaju-automations`,
`test:kaju-reliability`, `test:inference-off`, `test:kaju-intake`,
`test:kaju-prepare`.

Rules that tests enforce and are easy to break: exactly one "Book a demo"
link on the homepage; a button named "Workspace sections" opens the phone
sheet; the Kaju button lives inside the phone navigation; the sign-in fields
keep ids `si-email` and `si-code` with a readable background.

## Suggested order for the next agent

1. Run the full Playwright suite on the current head; open Kaju in the demo
   mode and try the new questions and drafts by hand.
2. Finish Kaju: `query_cases` label and suggestion chips in the panel,
   compare-two-periods, the same analysis for animals and ABC procedures,
   and reviewer-side questions.
3. Sheet treatment for work queue and programmes; restyle `/assistant`.
4. Public pages in the landing's language, then `/app`.
5. Animal and case detail pages (extend the demo mode or the local harness
   so they load with data first).
6. Watch every animation live on a phone and a laptop; fix what stutters.
7. Collapse the app stylesheet layers.
