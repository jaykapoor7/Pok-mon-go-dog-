# Build brief for the new StrayPaw app

Read before writing code: `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `docs/rebuild/handoff/02_Experience/03_PAGE_BY_PAGE_REQUIREMENTS.md`,
`docs/rebuild/handoff/02_Experience/06_DESIGN_SYSTEM_MOTION.md`, `docs/rebuild/MIGRATION-MAP.md`.

## Where things go

- App code: `src/nx/`. Route files: `src/app/next/**/page.tsx` (thin: import a component from `@/nx/...`, set `metadata`,
  read `params`/`searchParams`). Links inside the app use `/next/...` paths for now; they lose the prefix later in one step.
- Shared parts: `src/nx/kit.tsx` (Modal, Confirm, Field, GeoField, FilePick, useAct + toast receipts with Undo, Empty,
  Skeleton, Denied, Failed, RecordHead, TabBar, Section, Props, Timeline, formatting helpers), `src/nx/ListPage.tsx`
  (views + search + table + preview drawer), `src/nx/ui.tsx` (Chip, TrustChip, Check, Sample), `src/nx/live.tsx`
  (`useLive()`: signed-in state, `orgFor(workspace)`, user id/name), `@/oh/data` (`call(fn,args)`, `select`, `useRead`).
- Wrap every page in `<Shell crumb={[section, title?]} ws="ngo|gov|health|research|kaju">`. The frame (sidebar, tabs,
  toasts, offline bar) is mounted once in `src/app/next/layout.tsx`; `Shell` only tells it where the page is.
- Do not edit these shared files: `src/nx/nav.ts`, `src/nx/Shell.tsx`, `src/nx/kit.tsx`, `src/nx/live.tsx`,
  `src/nx/fixtures.ts`, `src/nx/nx.css`, `src/app/next/layout.tsx`. Put new styles in your own `src/nx/css/<area>.css`
  (import it from your component) using the existing tokens (`--ink`, `--ink-2`, `--ink-3`, `--line`, `--line-2`,
  `--hover`, `--sel`, `--accent`, `--accent-soft`, `--ok`, `--warn`, `--bad` and their `-soft`, `--side`, `--bg`,
  `--navy`, `--on-navy`, `--shadow`) so light and dark both work. Put data access in `src/nx/data/<area>.ts`. If you
  need a nav item or a shared change, say so in your report; the integrator adds it.

## How it must behave

- Every action is real: it calls the existing RPC or API route named in the migration map, with the same arguments the
  classic code used (read the classic component to copy the exact call, then rebuild the interface). No placeholder
  buttons. If an action cannot be built, say why in your report instead of leaving a dead control.
- Server decides. Hide what a role cannot do, but never rely on hiding: the RPC refuses. Show the refusal in plain words
  (`useAct` does this through `errText`).
- Consequential actions (submitting, deleting, decisions, bulk changes, anything sent outside) ask first with `Confirm`
  and a one-line summary of what will happen. Reversible ones give a receipt with Undo.
- Keep entered data when something fails. Never claim success before the server confirms it.
- Honest states: loading (`Skeleton`), empty with a real next action (`Empty`), error with retry (`Failed`), permission
  denied (`Denied`), offline (frame shows it). Imported, recorded, reviewed and verified are different claims; say which.
- Signed out, pages show sample data from fixtures with the "Sample data" chip, or a short explanation. In sample mode an
  action is a link to `/try` titled "Opens the live demo, where this works", never a button that does nothing.
- No link to any classic route (`/ngo/...` without `/next`, `/city/...`, `/workspace/...`, `/programme/...`, `/today`,
  `/animal/...` inside the app, `/assistant`). Public pages are the exception for the public site agent.
- Never invent figures, clinical guidance, partner approvals or integrations. Kaju never decides clinical, laboratory,
  verification or payment questions.

## How it must look

- Attio-dense: tables and lists with a preview drawer and a full record page, not card walls. Rows 40-48px on desktop.
  Record pages: `RecordHead`, `TabBar`, then the `.nx-rec` three-column layout (properties, main, side) where it helps.
- Linear precision for insights; Slack for messages; Inngest-style steps for Kaju's work (one card where it was asked, no separate pages). No gradients, no hero banners,
  no KPI-card grids, no generic outlined cards.
- Phone (390px): one column, 44px touch targets, no horizontal page scroll, tables become row lists (ListPage already
  does), primary action reachable. Tablet 768px works. Dark mode works (tokens only, no hard-coded colours).
- Motion: short (120-260ms), purposeful, and `useReducedMotion()` respected. Keyboard: every control reachable,
  visible focus, dialogs trap focus (Modal does).
- Copy: plain words for people with little time. Say what happened and what to do next. No jargon, no exclamation marks.

## How to check your work

- `npx tsc --noEmit -p .` and `npx eslint <your files>` must pass.
- A dev server is heavy. Only one may run on this machine at a time: take the lock with `mkdir /tmp/nx-dev.lock`
  (if it fails, someone else has it: do other work and try again later, at most every few minutes), start
  `set -a; . /tmp/claude-0/-home-user-Pok-mon-go-dog-/8befcd8d-96f1-5352-a7ce-ee29d2208da2/scratchpad/run.env; set +a; NODE_OPTIONS=--max-old-space-size=4096 npx next dev -p <your port>`
  in the background from your worktree, check your pages at 1440, 768 and 390 with Playwright screenshots (light and
  dark), then stop the server and `rmdir /tmp/nx-dev.lock`. Never hold the lock more than 25 minutes.
- Signing in locally: open `/try` and press "NGO coordinator" (or another role) — it signs into a staging sample account.
  Writes go to staging, which is shared with the public demo: create as little as possible, undo or close what you
  created with the app's own actions, and list anything you created in your report.
- Add a spec file of your own, `e2e/nx-<area>.spec.ts`, with signed-out tests that every new page renders, has no link
  to a classic route, and has no horizontal scroll at 390px. Do not edit other spec files.
- Commit on your branch with clear messages ending with the session trailer you were given. Do not push.
