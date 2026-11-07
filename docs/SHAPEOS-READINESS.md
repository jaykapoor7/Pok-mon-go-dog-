# ShapeOS readiness

StrayPaw becomes ShapeOS: one record of animals, interventions and programmes, worked by NGOs, veterinarians, government, researchers, trainers and citizens, with Kaju doing the checking and drafting. This file is the plain account of where each part stands. The source of truth for statuses is `src/lib/readiness.ts`, shown to staff at `/ngo/readiness`.

The Bengaluru pilot is under discussion with the BeST Cluster at IISc. It is **not signed or funded**. Nothing here should be presented as a deployment until it is.

## Done on 2026-11-07

- Training live on staging and production after verification as a coordinator and a field member.
- Government: contracts show operator and office names instead of database IDs; the city report's cover art no longer dominates the page.
- Today screen matches the product demo: stacked greeting and a one-sentence "since yesterday".
- Research workbench at `/research/workbench`: monthly series, filters, aggregate downloads, method and limits.
- Security: search_path pinned on 20 functions; organisation-only functions closed to signed-out callers (staging and production). Remaining linter items are accepted and documented: public views are security-definer by design, `spatial_ref_sys` and `postgis` belong to PostGIS.
- Still to switch on in the Supabase dashboard: leaked-password protection (Auth settings).

## Status meanings

| Status | Meaning |
|---|---|
| LIVE | Runs in production for its intended users; end-to-end checks pass. |
| STAGING | Built and under test on staging. |
| BLOCKED | Waits on someone outside StrayPaw (provider approval, data, hardware, clinical review). |
| PLANNED | Not built yet. |

## Feature flags

Unverified modules ship switched off. A flag is on only when its name is listed in the deployment's `SP_FLAGS` (server) and `NEXT_PUBLIC_SP_FLAGS` (navigation), comma separated. Production lists `animal_identifiers,readiness_board,training_lms`.

| Flag | Module |
|---|---|
| `citizen_bite_assist` | Bite or scratch help at `/bite-help` (off: needs clinical review before any public use) |
| `training_lms` | Training at `/ngo/training` (on in production) |
| `animal_identifiers` | RFID, microchip and QR identifiers; scan at `/ngo/animals/scan` (on in production) |
| `readiness_board` | Readiness board in the workspace menu (on in production) |

## Kaju and model use

Kaju runs on record tools in production (`STRAYPAW_AI_MODE` unset = tools only). The language-model path is complete but stays off until all of these are set on the deployment:

- `STRAYPAW_AI_MODE=model`
- `STRAYPAW_AI_AUTHORISED_BY=name:YYYY-MM-DD` (a dated, named approval)
- `STRAYPAW_AI_MONTHLY_CEILING_INR`, `STRAYPAW_AI_USER_DAILY_REQUESTS`, `STRAYPAW_AI_ORG_DAILY_REQUESTS`
- `STRAYPAW_AI_INR_PER_MTOK_IN`, `STRAYPAW_AI_INR_PER_MTOK_OUT` (token prices, so spend is measured)
- a model key (`ANTHROPIC_API_KEY` or the AI Gateway) and `STRAYPAW_AI_APPROVED_DATA_ROUTE`
- the `kaju_model_usage` ledger migration applied to that database

Every model run is written to `kaju_model_usage` with its tokens and rupee cost. If usage cannot be read, the request falls back to record tools; if it cannot be written, the reply says so.

## December pilot checklist

- [x] Kaju answers from authorised records, with citations, under the caller's session
- [x] Consequential changes are proposals a person confirms, with audit receipts
- [x] Model usage ledger and cost limits
- [x] Kaju streams its record checks as it works (application/x-ndjson), so people see what it is reading
- [ ] Model key, authorisation, ceiling and prices for model mode (needs a decision)
- [x] NGO intake, cases, follow-ups, animal register, imports with provenance
- [ ] Veterinary sign-off walked through with a pilot veterinarian
- [ ] Government review configured for a pilot ward (needs the pilot agreement)
- [x] Public map and datasets with method notes
- [x] Research workbench on public data (`/research/workbench`)
- [ ] Record-level researcher exports (needs data-sharing terms)
- [x] Training screens: courses, quizzes, assignments, team progress
- [x] Training migration applied to staging and production and verified
- [x] RFID, microchip and QR identifiers with scanner lookup (staging, flag `animal_identifiers`)
- [x] Identifier and usage-ledger migrations on production
- [x] Bite or scratch help prototype (`/bite-help`, flag off)
- [ ] Bite or scratch help: clinical review and verified vaccine-centre list before any public use
- [ ] WhatsApp Cloud API: Meta business verification and number approval

## External approvals and formalities

| Item | Waiting on |
|---|---|
| Pilot scope and terms | BeST Cluster proposal and agreement |
| Ward and programme data | BBMP / partner operators, under a data-sharing agreement |
| Model inference | A named approval, budget and data-route decision from StrayPaw |
| WhatsApp | Meta business verification, WhatsApp number, message templates |
| Google Workspace | OAuth verification for the scopes requested, or a customer admin's internal approval |
| Microsoft 365 | Customer administrator consent |
| SMS | DLT template registration (MSG91) |
| Bite or scratch guidance | Clinical review by a qualified public-health reviewer; verified anti-rabies centre list from the health department |
| RFID hardware | Choice of scanner; ISO 11784/11785 readers work as keyboard input |

## Releases and rollback

Changes reach production by merging to `main`, which Vercel deploys. The live commit is at `https://www.straypaw.org/api/health`. To roll back, promote the previous production deployment in Vercel, or revert the commit on `main`. Database migrations in this programme are additive; they are applied to staging first and to production only with explicit approval.
