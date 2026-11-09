# Data infrastructure audit (9 November 2026)

Scope: what StrayPaw records today, how it maps to the target model (animal, encounter, observation,
intervention, outcome, survey, location, evidence, environment, provenance), what is missing, and what to build
first. Sources: `supabase/` SQL, migrations, staging schema (`ucxfxiddufwqithtdtix`, row counts below are the
sample workspace, not production) and the app code. Branch: `data-infra`. Builds on AnimalID (branch `animalid`).

## 1. What exists and how it maps

| Target entity | Today | Notes |
|---|---|---|
| Animal | `dogs` (species-agnostic in practice; `species`, `straypaw_id`, `code`, `zone`, `h3_r8`, `sterilisation_status`, `vaccination_status`, `provenance`, `identity_state`) | Stable UUID and StrayPaw ID. Status columns are *current state*, derived from events by triggers. |
| External identifiers | `animal_identifiers` (microchip, RFID, QR, ear/collar tag; one active holder; audited) | Good. Cross-organisation lookups reveal only "registered elsewhere". |
| Encounter | Spread across `cases` (welfare requests), `sightings` (community, photo + point), `animal_operation_events` (capture/release/operations), `survey_responses` | No single encounter table. Each has its own time/place/actor columns. |
| Observation | `survey_responses` (count, `attributes` jsonb), `sightings` | Observed condition, age and behaviour live in free `attributes`/notes, not structured fields. |
| Intervention | `medical_events` (kind, event_date, notes, performed_by), `animal_operation_events`, `field_vaccination_receipts` (batch, dose, route) | Clinical verification via `abc_attestations` (vet authorised, evidence reviewed). |
| Outcome | `cases.status_class`, `outcome_note`, `resolution`, `animal_followups` | Outcomes are text on cases; follow-up results are statuses, not structured findings. |
| Survey | `surveys`, `survey_areas`, `survey_responses`, `operations_survey_assessments`/`_reviews` | **No method, effort, start/end time, observers, protocol version or zero-sighting records.** |
| Location | `lat/lng`, `zone`, `city`, `h3_r8`, `location_precision`; public views round to H3 cells | **No GPS accuracy or location source** on most rows; manual pick vs GPS is not distinguishable. |
| Evidence | `evidence_items` (kind, url, captured_at, `verification_state`), `abc-evidence` private bucket | Good for ABC; photos for identity now in AnimalID (`animalid_embeddings`). |
| Environment | none structured | Waste sites, food sources, habitat appear only in notes. |
| Provenance | `provenance` columns (`imported_historical_record`, `ngo_record`, …), `import_rows`/`import_batches`, `provenance_corrections`, `operational_audit_log`, receipts tables | Strong audit trail. Value-level status (reported vs verified vs AI-suggested) is implicit. |

## 2. Gaps, ranked by impact

1. **Surveys cannot support population or coverage work.** Without effort (time, distance, observers), method
   and zero-sighting records, a survey count cannot be compared across walks, areas or months, and an empty area
   cannot be told apart from an unvisited one. → **P1, built on this branch** (survey sessions).
2. **Location quality is unknown.** No accuracy or source on points. → P1, built: `location_accuracy_m`,
   `location_source` on survey observations; extend to field capture next.
3. **No unified encounter timeline.** Repeat-encounter and duplicate analysis must read five tables. → P2: a
   read-only `animal_encounters` view (cases, sightings, operations, surveys, AnimalID decisions) keyed by animal,
   no new storage.
4. **Value status is implicit.** Unknown vs not observed vs estimated vs reported vs AI-suggested vs verified is
   carried by provenance columns and conventions. → Data dictionary (below) now; a `value_status` vocabulary on new
   structured fields.
5. **Structured observations.** Condition, age class, body condition and behaviour in free text. → P1 next:
   structured observation fields with "not recorded" as a first-class value, behind progressive disclosure.
6. **Environment.** → P3: `survey_environment` observations on sessions (food source, waste site, shelter), never
   used to infer causation.
7. **Training and research permissions** exist only for AnimalID (`animalid_training_consent`). → P3: generalise to
   purpose-specific data-use grants per organisation.

## 3. Value-status vocabulary (data dictionary)

| Status | Meaning | Where it shows today |
|---|---|---|
| `not_recorded` | Nobody recorded it. Never counted as no. | blank fields; UI "Not recorded" |
| `not_observed` | Looked for and not seen (requires effort). | **new:** zero-sighting observations |
| `reported` | Stated by a person, unchecked. | `sightings`, WhatsApp intake, imported rows |
| `imported` | From a historical register, unverified. | `provenance = imported_historical_record` |
| `estimated` | Derived by a stated method. | none yet; must carry method and denominator |
| `ai_suggested` | Proposed by a model. | `animalid_candidates`, Kaju proposals |
| `human_reviewed` | A person confirmed it in the app. | `animalid_decisions`, reviewed imports |
| `verified` | Independently attested (vet, office, microchip). | `abc_attestations`, package decisions, identifiers |

## 4. Permissions

Row-level security on every base table; organisation scope via `my_ngo()`; public reads only through `public_*`
views with rounded locations. Advisor note: `public.spatial_ref_sys` (PostGIS reference table) has RLS disabled on
staging; it holds no customer data, but grants on it should be reviewed by the owner before any change.

## 5. Built on this branch

* `supabase/migrations/20261110110000_survey_sessions.sql` (additive): `survey_sessions` (method, protocol
  version, team, start/end, distance, coverage), new nullable columns on `survey_responses`
  (`session_id`, `observation_kind` animal/zero_sighting/environment, `location_accuracy_m`, `location_source`,
  `observed_at`), RPCs to start/close a session and record a zero sighting, and `survey_session_effort` with
  animals counted per observer-hour, labelled as an encounter rate, not a population.
* Behaviour tests on local PostgreSQL (`supabase/tests/survey_sessions`).

## 6. Next, in order

P1 field capture: accuracy and source on field capture; structured observation fields; guided photo angles
(face, side, full body, markings) feeding AnimalID. P2: encounter view and repeat-encounter analysis. P3: survey
completeness and coverage dashboards; dataset curation with permissions. P4: interop exports (GeoJSON done;
Darwin Core-style observation export after testing with a partner), forecasting feature pipelines.
