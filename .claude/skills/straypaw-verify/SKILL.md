---
name: straypaw-verify
description: Verify a StrayPaw change end to end before committing or merging — run the real app signed in against staging, walk the changed flows, check numbers against their source, screenshot desktop and phone, then run the fast checks. Use before every commit that changes product code and before opening or merging a PR.
---

# Verifying a StrayPaw change

Running the app end to end matters more than the test suite. Tests catch regressions; walking the real flow catches the
thing that was built wrong. Do both, in this order, and say exactly what was run.

## 1. Run the real app against staging

- Staging only. Never write to production, never sign in to production with a real organisation's account, and never
  open pages for an account the owner has marked read-only.
- Start one dev server with the staging settings from a local env file (never print, copy or commit it):
  `set -a; . <path to the staging env file>; set +a; npx next dev -p <port>`.
  Behind the cloud proxy also set `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Sign in through `/try`: it has a button per sample role (NGO coordinator, field worker, veterinarian, municipal
  reviewer, clinician, laboratory, programme lead, analyst …), all on the staging sample organisations.
- One dev server per machine is plenty (about 5 GB each). Stop it when done.

## 2. Walk the changed flows like a person

- Do the actual task the change is for (record, confirm, approve, ask Kaju), not just load the page.
- After every save, read the record back where a person would see it (the list, the record page, Today).
- Numbers: every count on a card or tile must equal the list it links to. Write the pair down.
- Undo every staging write you made (cancel tasks, `removeRecord`, rolled-back SQL) and list anything that remains.
- Kaju: nothing is saved without Confirm; a pre-filled prompt is never sent on its own; check one question it should
  not understand and that the reply is helpful, not an error.

## 3. Screenshots and traces

- Desktop 1440×900 and phone (Playwright `devices["Pixel 7"]`), before and after, light and dark where colours changed.
- App pages scroll inside `#nx-main`, so a full-page screenshot stops at the viewport: scroll `#nx-main` or expand it
  before capturing.
- A failure report names the step, what happened, and the screenshot. "Place order stayed disabled because the payment
  form never loaded" is a good report; "it failed" is not.

## 4. Fast checks (before every commit)

- `npx tsc --noEmit -p .` and `npx eslint <changed files>`.
- New CSS: `python3 scripts/grid8.py <file>` reports nothing off the 8-point scale.
- Database changes: `npm run test:db` (PGlite, every rebuild migration, acting as different people through RLS). New
  behaviour gets a check that fails without the change.
- Kaju: `npm run test:kaju-planner`, `test:kaju-polish`, `test:kaju-reliability`, `test:kaju-workspace`,
  `test:kaju-voice`, and `NODE_PATH=scripts/shims/node_modules node --import tsx scripts/test-kaju-understand.ts`.
  When replies change, run the old engine (main) and the new one on the same inputs and review every difference.
- Routes: `npm run test:routes`.

## 5. Browser suite (before a PR)

- Build and serve production locally: `npx next build && npx next start -p 3100`. Make sure no older server still
  holds the port (`ps -eo pid,cmd | grep next-server`), or the tests run against stale chunks.
- `E2E_BASE_URL=http://localhost:3100 npx playwright test --trace off` (the full suite takes about 8–9 minutes).
- Accessibility: `e2e/accessibility.spec.ts` (axe, light and dark): no serious or critical findings.
- Slow phones: the throttled script measures largest paint, layout shift and blocking time (Pixel 7, CPU 4×, slow 4G);
  record before and after when a change touches the shell or first load.

## 6. Flaky checks and escalation

- Never rerun until green, add sleeps, or skip a test. Find the cause (a race, a timezone, a stale server).
- If a check still fails after three honest attempts, stop and tell the owner what fails and what was tried.

## 7. Say how it was verified

- End each commit body with a `Verified:` line listing what was run and the result, for example
  `Verified: tsc, eslint, test:db 242/0, signed-in staging walk (task added, read back, cancelled), e2e 615/0` —
  or `Verified: none`.
- In the PR, list the checks with their numbers and what could not be verified.

## 8. After a merge

- Wait until `https://www.straypaw.org/api/health` reports the merged commit (the bare domain redirects to `www`).
- Load the changed pages signed out (no sign-in, no writes, a handful of requests) and check for page errors and the
  expected content.
- Vercel builds only `main` and `demo` on their own; a preview of a branch is started by hand in Vercel.
