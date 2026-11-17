# Resume point (saved 2026-11-17, before a usage-limit pause)

Temporary folder on the working branch `claude/brave-hawking-0ohpo5` only. **Delete `wip/` before opening the PR.**

## Already on main and live

- #126 NGO feedback + Kaju workspace, #128 automation rule tests + Kaju layout shift + lighter pages,
  #129 Vercel builds only `main` and `demo`.
- Database (staging and production): realtime for missions, automation rule counts (`20261118100000`),
  Kaju action log `public.ai_action_log` (`20261118110000`, append-only, update/delete/truncate revoked).

## On the working branch, pushed, not yet merged to main

- Kaju understanding (agent U, finished and verified): add_task, natural chat and capability answers, one-line
  capture, clinicians' health reads and `register_exposure`; `test:kaju-capture` 32 checks; differential and
  staging walk in the agent's report.
- The action log migration + 10 `test:db` checks (252 total).
- Composer: one task typed in the Kaju panel or on /kaju → `/api/ai` add_task card, not a mission.
- Vercel: a preview started by hand on any branch is not skipped.
- `.claude/skills/straypaw-verify` (the verification checklist).

## In progress when paused (snapshots in this folder)

| Work | Snapshot | Agent branch (local only) |
| --- | --- | --- |
| Home screens: @Kaju box on every role's home, visual data cards, no long side columns, Kaju page column | `agent-homes.patch` (full diff vs main `c180a7ff`, committed + uncommitted), `agent-homes.commits.txt` | `worktree-agent-ad38cb1719719a131` |
| Forms → "Tell Kaju" (New case, Inbox, case and animal records, field "Say it", healthcare bite form) | `agent-forms.patch`, `agent-forms.commits.txt` | `worktree-agent-a33bf3151f84ea25e` |

Each patch applies cleanly to `c180a7ff` (`git apply --check`). If the agent worktrees still exist, prefer their
branches (newer); otherwise apply the patch on a branch from `c180a7ff`, commit it, and merge it in.

## Remaining steps, in order

1. Finish/collect the homes and forms work (relaunch agents from the branches or patches if they stopped; brief: the
   original scope, the owner's rule that Kaju may read health data with the person's own access, and the
   verification standard in `.claude/skills/straypaw-verify`).
2. Merge both into `claude/brave-hawking-0ohpo5`; resolve conflicts (`src/nx/data/ngo.ts` `RECORD_PROPOSALS` must
   include `register_exposure`).
3. Replace on-screen notes that say "Kaju does not read these records" for patient records
   (`src/nx/pages/Health.tsx`, `health/Exposure.tsx`, `health/Referrals.tsx`, `KajuInsights.tsx`, `Vet.tsx`) with
   "Kaju reads these only for people allowed to open them. Clinical decisions stay with clinicians." Lab note stays
   (Kaju does not read samples or results).
4. Verify per `straypaw-verify`: signed-in staging walk (@Kaju on each home: "what can I do with you?", add a task →
   Confirm → read back → cancel; Tell Kaju on New case and a case record; field "Say it" offline; clinician "PEP
   doses due today" and a bite note → proposal), card numbers vs their lists, desktop + phone screenshots; tsc,
   eslint, test:db, all Kaju tests, test:routes, production build, full e2e (`next start`, check no stale server).
5. Delete `wip/`, update `docs/rebuild/ACCEPTANCE.md`, open one PR (body ends with the session link), CI, merge with
   the full head SHA, level the branch (`git merge -s ours origin/main`), confirm
   `https://www.straypaw.org/api/health` reports the merge, signed-out check of the changed pages.

## Staging leftovers to report

Two cancelled tasks "Call the vet" (`oh-ngo` sample account); test missions from earlier Kaju checks; channel
`#thread-qa` (older test, untouched).
