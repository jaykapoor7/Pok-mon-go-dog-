# Kaju live-readiness pass — 2 November 2026

Base: main `b164cd4bbf5c63dbc27a0d6e2cbc43ad19559877` (PR #45).
Safe release: [PR #47](https://github.com/jaykapoor7/Pok-mon-go-dog-/pull/47).
Reviewer hardening: [draft PR #46](https://github.com/jaykapoor7/Pok-mon-go-dog-/pull/46).

## Scope and activation

- Existing Kaju artwork, rig, 23 states and placements preserved. The AI page adds a native disclosure with real movement selection, a complete tour and pause/resume. Reduced motion and the existing animation preference take precedence. The homepage uses the existing arrival sequence, with responsive travel distance.
- Preview server clients are bound to staging `ucxfxiddufwqithtdtix`; production endpoints, mismatched service JWTs and anonymous/publishable keys are refused. No secret was copied or exposed. Preview's staging server key is still absent, so server-side import/reviewer setup remains blocked there.
- [Private-AI assessment](PRIVATE-AI-ASSESSMENT-2026-11-02.md) records the existing Gateway model, possible data flow, retention/training controls and route-specific unknowns. Customer conversations remain in record-tool mode. No model or provider changed; no purchase or private-data processing approval inferred.
- City-report copy no longer claims that research records are already excluded. Historical cleanup remains unexecuted; its proposal now stops explicitly before changes, and rollback checks for conflicting later edits. A current allowlist, backups, view diffs and isolated rehearsal are still required before a separate production approval.

## Demonstrated in this pass

| Check | Actual result |
|---|---|
| Production build, TypeScript, lint | Passed; staging endpoint and anonymous credential only, server keys explicitly blank |
| Preview project isolation | 11 checks passed, including wrong endpoint/key/ref, anonymous JWT and opaque-key cases |
| Kaju privacy / model-tool reliability | 14 privacy contracts + 21 reliability checks passed; includes unapproved-route denial, malformed output, failures, cancellation and bounded tool use |
| Report isolation / Connections contracts | 4 isolation + 33 contract checks passed; external-account delivery is not established by these tests |
| Authenticated ABC browser journey | 30 checks passed across desktop and phone: NGO case, five evidence items, veterinarian authorisation, coordinator review, submission, municipal query, answer, acceptance, actual PDF/XLSX downloads, source/audit readback and cross-organisation export denial |
| Authenticated Kaju browser journey | 9 checks passed: real selected case, forged scope denial, cross-organisation denial, proposal without write, confirmed write, double-click suppression, independent source/audit verification and restored receipt without replay |
| Native documents | 16 authenticated HTTP checks passed: PDF/DOCX/XLSX/CSV/PPTX round trips, GeoJSON/KML actual coordinates, guest denial and oversize rejection |
| Security / recurring intelligence | 15 security + 10 recurring-check tests passed on staging: denied anonymous RPC/projection writes, preserved public reads, actor-spoof denial, secret isolation, explained findings and scoped immutable snapshots |
| Actual Chromium motion / controls | Desktop 1440×1000, phone 390×844, tablet 834×1100 passed: animation clocks advance, all 23 real selector states, tour, pause/resume, reduced motion, launcher, panel and full workspace |
| WebKit engine compatibility | Same three viewport journeys passed using Linux Playwright WebKit. This is not native Safari or an iPhone-device test |
| Automated accessibility / layout | 15 homepage/AI/assistant/NGO/municipal × desktop/tablet/phone checks passed, no WCAG A/AA findings, horizontal overflow or uncaught page errors |
| Dependencies | High/critical production audit gate passed; six moderate advisories remain in optional canvas/unpdf installation dependencies. No force upgrade or runtime change made |

The first broad local browser run had 229 passes, 11 skips and four failures under parallel load. Its failed focus, autofill and map checks were isolated for rerun; final rerun and CI counts are recorded in PR #47. Do not convert this initial run into a clean pass. Hosted Preview, final CI, deployed SHA and post-deployment recordings are also recorded there after they actually complete. A queued Vercel deployment is not a release.

## Genuine remaining dependencies

1. Set the staging project's own `SUPABASE_SERVICE_ROLE_KEY` in Vercel **Preview only**. Existing public stage credentials and user-session workflows work; server imports cannot be certified without this key.
2. Supabase's migration connector twice returned expired confirmation for the reviewer safety migration, and subsequently returned repeated authentication-retry responses. No migration was installed. Draft #46 must be installed/tested on staging before its dependent API is deployed. Its nine isolated receipt tests pass, but that is not a database onboarding pass.
3. Private AI requires the exact processing route/terms described in the assessment to be approved. The current model name does not establish serving region or retention terms. Paid ZDR configuration was not enabled.
4. Real reviewing offices and officials require their authorisation. Only existing isolated staging identities were used; no real official was invented or assigned.
5. Historical cleanup needs a fresh execution manifest and separate production approval. It is not part of this deployment.

The production schedule remains `0 4 * * *` for permission-protected daily Kaju checks. The UTC-day scheduler correction shipped in PR #45. This pass confirms the configured schedule, anonymous HTTP denial and real staged refresh/snapshot behavior. The 04:00 production invocation is outside the Hobby plan's one-hour runtime-log retention at the time of this check; do not claim its specific invocation was observed today. No notification or report is silently sent.

No native Safari host is available in this Linux environment. WhatsApp/CareOS remains disconnected and untouched. No real customer's text was submitted to a model, no real municipal role was assigned, and no production historical cleanup was executed.
