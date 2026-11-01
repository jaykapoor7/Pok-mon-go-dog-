# Continuation verification — 1 November 2026

Starting main: `c7a627ffac3ea06f7398fb8dbb8f934dade2bbf1`.
Production inspected: `https://www.straypaw.org` (the apex redirects here).
Vercel project: `pok-mon-go-dog`, team `team_qRMlvTFfcxrezBvNVj8C02iF`.
Baseline production deployment: `dpl_BgrDurBKMYhWfo5VKLYiJ4WDrmvt`, READY, c7a627ff.

This is a partial readiness report. A real organisation's complete ABC journey has **not** been demonstrated in this session. Prior handoff check counts are historical evidence, not new passes.

## Gap matrix

| Area | Existing and verified in this session | Implemented but not demonstrated end to end | Incomplete | External dependency |
|---|---|---|---|---|
| A. Release | Baseline deployment metadata; 11 routes at desktop/phone sizes, HTTP 200, no observed overflow or uncaught page errors | Authenticated role navigation and deep links | Exhaustive button/form QA and performance measurements | Staging test sessions |
| B. Kaju | Isolated reliability, bounded model transport, read-failure and follow-up tests | Real-model reasoning, confirmed writes → audit rows, connected tool loop | Broad conversational follow-ups and independent post-write verification | Model key; live provider/model compatibility test |
| C. Character | One reference-based atlas and face crop used by all existing Kaju imports; original controller and rig retained | Lifecycle placements with new art | Full articulated motion, blink/ear/tail and walk/trot frames; exact reference fidelity review | None |
| D. Operations | Public entry gates inspected | Field → evidence upload → vet → review → submit → query → answer → accept | Fresh complete role-based proof; onboarding QA | Staging credentials; no production reviewing office |
| E. Documents | Five format round trips; GeoJSON/KML coordinate validation; CSV protection; isolated export-scope tests | Reviewer PDF/XLSX buttons and authenticated export; live connection reads/writes/revocation | Real-account cross-tool proof | OAuth registrations, encryption key, provider consent, MSG91 DLT |
| F. Proactive intelligence | Existing requested summaries; added ABC read tools | Existing dashboard findings | Recurring checks, notification/report review workflows, reporting-deadline model | Scheduling and notification rollout still needed |
| G. Integrity | Production/staging security advisors; selected RLS metadata; cleanup proposal reviewed only | Full RLS matrix, map totals and spatial drift remediation | Definer function/view review, staging drift, security remediation | Cleanup requires separate owner approval |
| H. Customer readiness | Honesty corrections; bounded exports; public route checks | Commercial workflows and delivery forms | Every advertised feature/button/form verified; defensible full operational metrics | Real role sessions and provider setup |

## Changes

- Kaju: ABC queue and package reads run with the caller's session. At most 100 queue rows and 50 packages; links use returned IDs. No approval or attestation tool was added.
- Knowledge: lexical retrieval over the repository's published Academy lessons, with direct lesson citations. Educational guidance, not live legal research or clinical advice. Interactive exercises are excluded.
- Conversation: deterministic city follow-up for an immediately preceding incomplete field draft; all changes remain proposals.
- Reliability: validate request shapes; per-authenticated-user rate-limit bucket in addition to IP; role context from ABC RPC, not editable user metadata; bounded Supabase fetch; six model rounds, twelve tool calls, model request deadline and no SDK retry. A tool fan-out exceeding the remaining budget is refused before execution. Database failures remain unknown, never zero.
- The rate limiter uses the existing database helper, which fails open on database/configuration failures. This is not a strict distributed abuse-prevention guarantee. Tool I/O has its own timeout; the model deadline is not hard cancellation of every provider operation.
- Exhausted investigations say incomplete; failed tools do not trigger Kaju's success pose.
- Animal report exports now require membership and explicitly filter `ngo_id`. Publicly readable animals cannot silently enter another organisation's export. Unreviewed historical imports are excluded from the open-case export. Export caps are disclosed.
- Package PDF/XLSX exports use session-scoped package lookup and `abc_package_cases`; inaccessible packages fail before reading cases. Exports include provenance/time/status and no signed evidence URLs. New API requires authentication.
- CSV formula-like cells are prefixed as text; XLSX already writes cell strings as text.
- Malformed OAuth nonce-cookie encoding returns a state error instead of throwing.
- Homepage no longer says Kaju verifies every sterilisation or handles veterinary sign-off. Copy describes human workflow and prepared changes.
- Explorer artwork is an AI-generated derivative of the owner-supplied canonical sheet, not the original or a pixel-exact reproduction. Six poses share one optimised atlas and one face crop. Original vector rig is preserved in `src/kaju/Rig.tsx`. The blue-and-white design and WhatsApp status remain intact.

## Checks and evidence

- `npm run test:connections`: **33 passed**, isolated local fixtures. Includes PDF/DOCX/XLSX/CSV/PPTX write/read round trips, token encryption/tampering, signed state, capability gating, proposal-only actions, CSV injection and map coordinate/XML checks. No real external account was contacted.
- `npm run test:kaju-reliability`: **18 passed**, mocked model transport and record store. Includes failures, knowledge citations, city follow-up, step exhaustion and oversized tool fan-out. Does not prove live-model availability or deployed RLS.
- `npm run test:report-isolation`: **4 passed**, isolated record-store double. Verifies explicit organisation filter, missing membership, inaccessible package and source provenance. Does not replace real cross-tenant sessions.
- Baseline read-only live probe: **22 route/viewport checks**, [JSON](qa/continuation/live-c7a627f-routes.json). Guest rendering only; authenticated flows are not inferred from HTTP 200.
- Baseline existing Kaju/Connections suite: 12 passed, 2 failed. Both initial failures were an apex-to-www redirect before the callback. A canonical-origin rerun with a malformed cookie exposed the real callback exception now fixed in source.
- Final build/browser results are recorded below after execution.

## Security observations (read-only)

Production Supabase `toujthlzjmhmoyykmayx`: 18 definer-view advisor errors, 19 anon-executable definer function warnings, 146 authenticated-executable definer warnings, leaked-password protection disabled. `connection_secrets` has RLS and no policies intentionally: client roles must not read tokens. `connections` and `report_packages` have RLS. `org_case_facts` is a security-invoker view.

Staging `ucxfxiddufwqithtdtix`: 8 definer views, 20 mutable search paths, 1 exposed extension table without RLS (`spatial_ref_sys`), 1 API-exposed materialized view (`public_spatial_animals_cache`), 98 anon-executable and 167 authenticated-executable definer warnings. These counts show drift; they are not proof that each flagged public projection is exploitable. Review each function's grants, caller checks and projection before changing it.

Advisor references: [definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [anonymous function execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Targeted definition review found that `create_feeding_zone` permits anonymous creation (`auth.uid()` may be null), `sp_current_attention` is a definer helper that reads case existence, and `get_public_platform_totals` still counts all non-demo animals without a research-archive predicate. These are existing behaviours requiring a specific access/provenance review; none was exercised as a write or changed here.

No SQL mutations, migrations, data cleanup, account changes, external sends or provider connections were performed. The production cleanup proposal and rollback were reviewed as documents only. Historical imported/verified labels and research-map totals remain unresolved.

## Owner actions and release exclusions

1. Configure the model credential securely in Vercel and test the configured model and beta API options against staging. Do not market model-backed Kaju as live beforehand.
2. Supply staging test-account access through a secure environment binding. Run `abc-workflow-check.mjs`, `roles-evidence-check.mjs`, `ai-write-check.mjs` and authenticated desktop/phone QA. Do not claim this release passes the full ABC workflow from these isolated tests.
3. Register the production reviewing office and its approved reviewers before municipal acceptance is advertised as usable.
4. Complete provider setup from [Connections](../CONNECTIONS.md); test find/read → proposal → confirm → provider result → audit → revoke. Production environment-name inspection found no model key, connections encryption key or provider credentials. No secret values were retrieved.
5. Review security drift and public figures before readiness sign-off. Approve cleanup separately after backup and scope review; this session did not request or execute it.
6. Finish recurring insights and notification/report review workflows. These are incomplete engineering, not merely missing credentials.
7. Finish Explorer articulated animation and reference-fidelity review. The key-pose renderer is not a complete natural animation rig.

Do not market connected providers, model-backed conversation, autonomous verification, recurring intelligence, exact-reference full animation, validated production map totals or a newly demonstrated full ABC journey as live. WhatsApp stays disconnected.

## Final local release checks

- `npm run build`: passed on final source, including lint/type validation, route generation and build traces. Next.js 15.5.28.
- `npm run lint`, `npm run typecheck`, `npm run check:fixtures`: passed.
- Desktop/phone production-build suite: **55 passed, 3 skipped** (`kaju`, `connections`, `kaju-api`, `abc-verification`, `sp3`). Skips are device-specific navigation/layout cases. The suite covers 51 public/app routes per viewport plus redirects, guest navigation, sign-in entry, demo labels, ABC guest gates, malformed requests, forged sessions, OAuth state/cookie refusal, WhatsApp guard and reduced motion. It does not authenticate to staging.
- After the final artwork crop adjustment, the focused Kaju suite was rerun: **8 passed**. Final visual inspection shows the six isolated poses without neighbouring atlas fragments.
- Visual evidence: [desktop workspace](qa/continuation/kaju-desktop.png), [phone workspace](qa/continuation/kaju-phone.png), [six poses](qa/continuation/explorer-poses.png). These are local production-build guest screens, not customer sessions.
- Initial visual testing found atlas row overlap and letterbox bleed; corrected with per-pose crop bounds and explicit clipping. The first new mobile asset test selected a hidden duplicate; corrected to inspect the visible placement.

Application release: `949ab452e1a9fe4696632046640a3cff3d520b88`, pushed directly to main. The subsequent documentation-only commit corrects the route inventory to 33 public + 18 app routes (51), without changing app code. Deployment status must be checked against the application commit, not inferred from the successful local build. No full customer-readiness sign-off is given.

## Deployment check (06:42 UTC)

Vercel created production deployment [`dpl_7TbxvUhXZrtW4ih8k71847n2NkzY`](https://vercel.com/jaykapoor700-1687s-projects/pok-mon-go-dog/7TbxvUhXZrtW4ih8k71847n2NkzY) for exact app commit `949ab452`. Repeated metadata checks still returned **QUEUED**; the build-events endpoint returned no events. No build failure or queue reason was provided. The project's domain configuration confirms `www.straypaw.org` belongs to this project, with an apex 308 redirect.

Live probe at 06:42 UTC: `/kaju/explorer-atlas.png` returned **404**, and `/api/ai` returned `{"model":false,"tools":true}`. The new release is therefore **not verified live**. The owner should inspect the linked Vercel queue, let the deployment reach READY, then run the release checks on the canonical production origin. No deployment was cancelled or force-promoted. The documented baseline live checks remain checks of c7a627ff, not of the new release.
