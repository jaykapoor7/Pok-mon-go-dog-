# StrayPaw rebuild ledger

Persistent record of the product rebuild. Update at every milestone. Latest first.

## State on 11 Nov 2026 (session 2)

| Thing | State | Evidence |
|---|---|---|
| straypaw.org | Serves `main` @ `45fd85ae` (PR #59) | `/api/health` sha |
| demo.straypaw.org | Serves the same commit; demo env vars set for the `demo` branch (`DEMO_ONEHEALTH_PASSWORD`, `NEXT_PUBLIC_OH_DEMO`, `NEXT_PUBLIC_OH_PUBLIC_PROGRAMME`, bite-help flag) | `/api/health`, Vercel env list |
| Staging database | One Health v2.1–v2.5 applied; illustrative demo seeded; 11 demo accounts | 19/19 permission checks, 14/14 journey |
| **Production database** | **No programme or AnimalID tables.** | `oh_tables = 0` |

### Blocked on the owner (one click each)
1. **Production migrations.** GitHub → Actions → "Apply Supabase migration" → Run workflow → `one-health`. The session's GitHub token cannot dispatch workflows (403) and direct production SQL is ruled out. Until this runs, programme pages on straypaw.org say "Programmes are not set up on this database yet"; NGO and municipal work is unaffected.
2. **AnimalID worker secrets**: `ANIMALID_SUPABASE_URL`, `ANIMALID_SUPABASE_SERVICE_KEY` (repository secrets), then add `animal_id` to `SP_FLAGS`.
3. **Production role accounts** (after 1): created by invitation from Programme setup; sign-in is by emailed code, so each needs a real mailbox the owner controls (for example plus-addresses).

## Batch 1: website, experience, design system (in progress, branch `claude/brave-hawking-0ohpo5`)

Design system "StrayPaw 6" (`src/site6/`): one stylesheet, the thread motif, motion primitives (`data-reveal`, `data-progress`, word rise), content visible without script.

| Item | Status |
|---|---|
| Tokens, type, buttons, chips, motion primitives (`site6.css`, `Motion.tsx`) | Done |
| Navigation: 4 menus + Pricing, hover intent, keyboard, phone sheet (`Nav.tsx`, `nav.ts`); all 32 links verified 200 | Done |
| Footer (`Footer.tsx`) | Done |
| Landing: new positioning, relay hero, roles, the loop (scroll-linked), capabilities, Kaju, trust + honest status table, results, questions, close | Done |
| Kept by request: animated product demo window, Use cases (pinned five steps), recurring work with Kaju | Done |
| Sign-in: split layout, thread panel (`enter6.css`) | Done |
| Linked pages (21 on the earlier kit) share column, buttons, type | Harmonised; page-by-page rewrite pending |
| Tests updated, full suite, CI, merge, production verified | Pending |

Decisions: positioning moved from "AI agent for animal welfare" to "one record for animal health and One Health programmes"; status table on the homepage states what is live, in rollout and not connected; no invented metrics.

## Batch 2: application and intelligence (not started this session)
Done earlier (PR #59): one shell with places, one sidebar pattern, programme layer (clinic, register, PEP tracking, lab, requests, care-network map, alerts, coverage, report, research extract, setup, invites, start a programme), AnimalID scheduled worker.
Next: redesign inner NGO/municipal pages (cases, verification, animals, reports) on the same system; Kaju programme tools (never human-health); demo walkthrough update at `/try`; production role accounts.

## Next steps after an interruption
1. `git log --oneline -5` on the branch; run `npm run build && E2E_BASE_URL=… npx playwright test`.
2. Fix landing tests that assert the old page; open PR; merge when the quality gate is green; verify `/api/health` sha on both sites.
3. Start Batch 2 with `/ngo` inner pages and `/try`.
