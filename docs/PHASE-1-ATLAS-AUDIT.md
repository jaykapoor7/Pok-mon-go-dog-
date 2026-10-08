# Phase 1: Atlas and City Intelligence audit

**Date:** 8 October 2026

**Scope:** Existing map/dashboard architecture; Supabase animal, case and geographic data; available NGO spreadsheet fields; realistic support for the new Atlas and City Intelligence experiences.

**Subsequent product clarification:** This audit's proposed route merges are not
the current implementation mandate. The user explicitly required Community Home,
Insights and professional screens to retain independent purposes. Keep the Atlas
on map routes; improve other screens without substituting maps for their workflows.
The verified source-data limitations below still apply.

**Repository baseline:** `jaykapoor7/Pok-mon-go-dog-` at `1549412`

**Production:** `www.straypaw.org`; Vercel project `pok-mon-go-dog`; Supabase project `toujthlzjmhmoyykmayx`.

This is a read-only product and data audit. It does not audit every post-app page. It makes no application, database or deployment changes.

## Executive finding

StrayPaw already has the right low-cost technical base for a map-first product: Next.js 15, MapLibre, H3 resolution 8, PostGIS, cached city/cell rollups, privacy-rounded public locations, viewport-bounded animal retrieval and mobile bottom-sheet behavior. The redesign should extend this foundation, not replace it.

The primary risk is semantic rather than cartographic. The 30,288 animal rows combine different observation units and methods: a city-centroid clinical register, a GPS vaccination campaign, rescue-request spreadsheets, and small photo-observation datasets. They are not a current national population estimate and cannot safely be rendered as one comparable measure. Provenance, location precision, identity basis and time range must be part of every map reading.

The current product also fragments the geographic journey across `/map`, `/insights`, `/app`, `/municipality`, `/partner`, and `/partner/map`. Atlas and City Intelligence should become one continuous surface, with deep links and role-specific actions rather than separate geographic dashboards.

## 1. Existing map and dashboard architecture

### Current surfaces

| Surface | Current role | Phase 1 classification |
|---|---|---|
| `/map` — `SpatialMap` | National city bubbles, H3 cells, density/coverage/care/case modes, individual records and inspector | **Retain core; redesign composition and data contracts.** |
| `/insights` — `PlaceBrief` | Separate city brief with totals, bounded findings and small cell map | **Merge into City Intelligence.** Keep deep-linkable briefs, not a disconnected dashboard. |
| `/app` — `CommunityPatch` | Location-first “near you” entry and community actions | **Retain utility; redesign Atlas as the primary Open App entry.** |
| `/municipality` | Same `SpatialMap` with municipal modes ordered first | **Redesign/merge.** A wrapper is not yet a decision-support environment. |
| `/partner` | Operations room with queue and open-work map | **Retain for later operations work.** Its spatial context should link into the shared city surface. |
| `/partner/map` | Organisation-scoped wrapper around `SpatialMap` | **Retain scoped access; merge the geographic interaction model.** |
| `BoundedSpatialMap` | Failure/cold-start fallback | **Retain.** It is an important resilience path. |

### What is already strong

- Scale model already exists: **India → city → H3 cells → dogs**.
- Nine map modes exist: Animals, Density, Coverage, ABC, ARV, Medical, Cases, Field work and Change.
- Case sub-lenses exist for open, critical, follow-up, no-action, repeat-animal and resolved records.
- Public and organisation maps reuse the same map engine with different access scope.
- Public views round coordinates to `0.01°` (roughly 1.1 km) or expose H3 cells rather than exact sensitive locations.
- WebGL fallback, reduced-motion behavior, retry handling and mobile bottom-sheet patterns are present.
- The browser audit found no horizontal overflow at 390 px or 1,440 px.

### Structural problems to solve

1. `SpatialMap.tsx` is a 1,361-line orchestration component. Rendering, querying, navigation, lenses and inspector state need separable modules before major expansion.
2. The India overview preloads one selected city's rich dataset even before the visitor enters that city. National and city data lifecycles should be split.
3. Citywide totals come from authoritative rollups, but filter/time findings come from bounded arrays. Current caps are 800 animals, 1,200 cases, 900 care events and 900 sightings per city response. Large-city detailed views are therefore samples.
4. `/map` and `/insights` present the same place as two experiences. The transition breaks the intended geographic journey.
5. Nine top-level modes compete for attention. They should become a smaller adaptive Lens model, with unavailable or statistically unsafe views suppressed.
6. “Coverage”, “no action” and “repeat animals” can imply stronger evidence than the source data supports. They require explicit definitions or temporary removal from authoritative claims.
7. The current visual hierarchy is capable but panel-heavy. Cookie notice, mode strip, reading panel, city register and inspector can compete with the map, especially on mobile.

### Production behavior observed

Compressed production requests, 8 October 2026:

| Request | Cold total | Warm total | Uncompressed body |
|---|---:|---:|---:|
| National cities | 2.87 s | 0.62 s | 6.9 KB |
| Coimbatore cells | 0.87 s | 0.06 s | 62.2 KB |
| Coimbatore rich dataset | 2.57 s | 0.17 s | 189.8 KB |
| Ranchi rich dataset | 0.84 s | — | 49.3 KB |
| Jamshedpur rich dataset | 0.73 s | — | 32.7 KB |

Warm behavior is good. Cold reads and cache revalidation are less reliable: Vercel showed recent revalidation aborts on geographic/story routes and one spatial query statement timeout. Existing fallbacks reduce impact, but the new Atlas should not make first paint depend on a rich city payload.

Verification at the audited commit:

- `npm run typecheck` — passed.
- `npm run test:spatial` — passed.
- `npm run test:public-map-footprint` — passed.
- `npm run test:no-full-register` — passed across 452 source files.

## 2. Supabase animal, case and geographic data

### Record inventory

| Entity | Rows | Important completeness |
|---|---:|---|
| Animals (`dogs`) | 30,288 | All have city/coordinates/H3; 123 have photos; 23,330 have a name; 20,964 have a source identifier. |
| Cases | 23,200 | 23,196 geocoded; all linked to an animal; only 3 assigned; due/follow-up/cost fields effectively empty. |
| Medical events | 22,528 | 22,303 linked to cases; 21,018 are sterilisation events. |
| Follow-ups | 1,630 | 1,381 done, 221 missed, 27 upcoming, 1 cancelled. |
| Sightings | 65 | All have photos and H3; no ABC/ARV observations recorded. |
| Animal timeline events | 88,955 | Strong raw material for individual histories where identity is credible. |
| Data sources | 28 | Source, method, licence and publication metadata available. |
| Current city/H3 rollups | 477 | Exact current totals for animals, cases, active cases and care activity. |
| Atlas area metrics | 985 | Includes official and research estimates; methodologies vary. |
| Geographic boundaries (`wards`) | 841 | 641 India district polygons and 200 Chennai wards. |

Current rollups reconcile with base totals: 30,288 animal rows, 23,200 cases, 179 active cases and 22,528 care events. They do not yet contain time bins, precision/provenance counts, source mix, identity confidence, unknown-vs-no status, or condition/outcome breakdowns.

### The records are not one population

| Place/source | Animal rows | Geographic character | What it can support | What it cannot support |
|---|---:|---|---|---|
| Jamshedpur HSI clinical register | 20,915 | One coordinate/H3 cell; city centroid; no photos; 2013–2016 | City-level clinical programme history and source totals | Street distribution, neighbourhood patterns or a current population map |
| Mission Rabies, Ranchi | 6,462 | 4,815 coordinate pairs across 108 H3 cells; source GPS | Vaccination/campaign geography, sex/neuter breakdown and spatial activity | General case workload or total street-dog population |
| Coimbatore rescue/operations data | 2,242 | 487 coordinate pairs across 254 cells; mostly locality/approximate | Best current City Intelligence exemplar: cases, urgency, care and locality patterns | Exact-household points or complete ABC/ARV coverage |
| Kalyani | 172 | One centroid/cell | Source presence and city total | Neighbourhood geography |
| Kind Hour, Lucknow | 89 | Ten locations/cells; mostly approximate | Rescue ledger and locality context | Stable identity or comprehensive city coverage |
| Delhi community records | 58 | 44 points/31 cells; 58 photos | Small, photo-rich individual exploration | Representative city patterns |
| Hyderabad iNaturalist | 49 | 40 points/24 cells; 49 licensed photos | Authentic photo observations and individual preview | Care/case operations or population inference |

There are 30 city labels, but aliases and source geography are inconsistent. For example, Jamshedpur animal rows use “Jamshedpur” while related cases use “Purbi Singhbhum”. Canonical geography and original source geography must both be retained.

### Status and evidence caveats

- Animal rows: 23,307 `confirmed`, 6,893 `verified`, 88 `provisional`; these states do not prove national unique identity. Many rows are source-row profiles.
- Location precision: 23,754 animal rows are approximate and 6,534 exact. Geographic precision is labelled “city” for 20,918 rows, chiefly Jamshedpur.
- Provenance: 23,328 animal rows are imported historical, 6,893 are public datasets and 67 are community reports.
- Sterilisation is known for 27,476 rows: 24,531 yes, 2,945 explicitly no and 2,812 unknown. Vaccination is recorded yes for 27,444 rows and unknown for 2,844; there is no reliable national “not vaccinated” total.
- Case status classes include 21,335 `no_action`, 1,555 closed and 163 in progress. The `no_action` majority is driven by imported clinical-register semantics. It is **not** evidence of 21,335 verified missed interventions.
- Case assignment and planned work are sparse: 3 assigned cases, no meaningful due dates, no normalized costs and almost no before/after proof. Resource planning and team-load analytics are not yet evidence-backed.
- Only 123 animal rows have photographs, concentrated in Delhi and Hyderabad. Documentary animal profiles can be exceptional but not universally photo-led yet.
- A large group of 2,342 animal rows and related activity lacks a linked `data_source_id`; provenance should be backfilled before a flagship Evidence Lens.

### Geographic infrastructure and municipal limits

- H3 resolution 8 is the only universal neighbourhood unit currently available and is appropriate for the next iteration.
- District boundaries support a national official-data layer.
- Chennai has 200 ward geometries, but no matching ward-level metrics. Eighteen ward metrics exist for Ranchi, but there are no matching Ranchi ward geometries. No current city has both usable ward metrics and matching ward boundaries.
- The 2019 20th Livestock Census is represented as an official source with country/state/district aggregates. It must remain a distinct dated source layer and must never be blended with StrayPaw recorded-animal totals.
- PostGIS is available; H3 is currently computed in the application with `h3-js`. At only 477 current cells, vector-tile infrastructure is unnecessary for the first build.

### Access and privacy

The public map reads deliberately restricted projections (`public_spatial_animals`, `public_animal_profiles`, `public_case_facts`) and does not expose informer contacts or raw case narrative. Organisation access is bearer-token and RLS scoped.

Before adding new aggregate endpoints, review the 18 security-definer public views, executable `SECURITY DEFINER` functions, function search paths and grants reported by Supabase advisors. These may be intentional, but every Atlas aggregate should explicitly exclude contact details, sensitive exact locations and unrestricted narrative.

## 3. Available NGO spreadsheets and fields

Only one original flat file is present in the repository. Other original files are not available in GitHub; their field structures survive in import metadata and staged rows in Supabase. This audit did not infer fields beyond those sources.

### Kind Hour rescue register — original CSV available

`scripts/kind-hour/rescue-register.csv`: 145 rows plus header, including two exact duplicates. Fields:

`line`, `page`, `page_row`, `kh_record_id`, `date`, `date_as_recorded`, `discharge_date`, `discharge_as_recorded`, `address_as_recorded`, `description_as_recorded`, `dog_name`, `species`, `sex`, `colour`, `life_stage`, `condition_as_recorded`, `opd`, `admission`, `medical_expense_recorded`, `payment_marked_done`, `media_label`, `animal_key`, `place_key`, `disposition`, `note`.

There are 142 encounter rows, 90 dog encounters, one recurring named dog and 88 provisional profiles. Fifty-two non-dog/unknown rows were excluded from the animal import. A row is an encounter, not proof of a unique animal. Contact/media links are withheld and financial marks are restricted rather than summed.

### Pawesome rescue workbook — original XLSX unavailable

Supabase import metadata preserves these sheet/header groups:

- Rescue Requests / 2025 / 2026: `Date`, `Month`, `Location`, `Call via`, `Case detail`, `Injury Type`, `Rescue Plan`, `Status`, `Detailed Status`, `Review Date`, `Completed`, plus unlabeled source columns.
- Chiloo Sterilization Drive: `Date`, `Name`, `Gender`, `Colour`, `Location`, `Admit Date`, `Release Date`, `New Appt Date`, plus one unlabeled column.
- TVT: `Date`, `Month`, `Location`, `Call via`, `Case detail`, `Injury Type`, `Status`, `Detailed Status`, `Review Date`.
- Review and Appoint: `Date`, `Location`, `Call via`, `Case detail`, `Details`, `Appointment`, `Status`.
- Adopt/Foster: `Adoptions`, `Foster`, `Location`, `Month`, `No`, with duplicated/foster variants.

The importer normalizes source sheet/row, classification/reason, event date, locality/city, animal name/code/species/sex/colour, condition, status, case detail, treatment update, review, rescue plan, admit/release dates and a fingerprint. Headers resembling informer/contact/phone/mobile/email/WhatsApp are excluded from staged raw rows.

Approximately 2,327 active physical source rows are represented. Batch metadata repeats a workbook total in the per-sheet `rows_imported` field, so that field must not be treated as a sheet total.

### Other imported data files — originals unavailable

| Source | Preserved fields | Product value | Limitation |
|---|---|---|---|
| Mission Rabies Ranchi XLSX | Action, Age, BCS, Comments, Date/Time Created, DogId, FormName, GPS/Manual Ward, Health, Lat, Long, Month, Neuter Status, Ownership, Project/Region, Sex, skin score variants, Syncing Date, UserName, Vaccination round, Ward | Stable source ID and GPS make it the strongest campaign geography | Not an NGO case-workflow workbook |
| Jamshedpur clinical CSV | `IDno`, `date_in`, `date_out`, distemper, rabies, venereal-cancer flags | Longitudinal clinical programme totals | Raw rows are not retained in import staging; only city-level geography |
| Resting-data CSV | first/last seen, group ID, life stage, observation count, sex, source record/row | Repeated-observation research | 445 rows are still staged/reviewing and lack GPS |
| Hyderabad iNaturalist | observation identity, date, approximate coordinates and licensed photo references | Authentic photographed observations | Small observational sample, no care workflow |

### Field-to-product matrix

| Source field | Database representation | User need | Proposed Atlas/City feature | Visualization/action | Limitation |
|---|---|---|---|---|---|
| Source file/row, dataset, method, licence | `data_source_id`, provenance fields, source metadata | Know what a mark means and whether it is reusable | Evidence Lens and persistent source disclosure | Source-conditioned glyph/legend; open methodology | Methods and licences vary; some rows lack source linkage |
| Lat/long, locality, H3, ward | coordinates, `h3_r8`, city/zone/ward, precision fields | Locate activity without exposing sensitive positions | Scale ladder and precision-aware map | H3 cell selection; approximate halos; enter city/cell | Most Jamshedpur rows are one centroid; most Coimbatore points are approximate |
| Dog ID/name/colour/sex/age/photo | animal profile, source record ID, identity state | Recognize an animal and follow its history | Animal preview and full history | Photo/documentary inspector; follow/report action | Only 123 photos; source row does not always equal unique animal |
| Sterilisation/vaccination/neuter status | animal status and medical events | Understand recorded care | Care Lens with yes/no/unknown states | Cell proportions and event timeline; open records | Campaign-biased sources; nationally incomparable without source filter |
| Date, admit/release, event time | source event dates, case/care/timeline events | Understand change and episode history | City timeline and individual chronology | Time scrub/filter; inspect episode | Historic ranges and source refresh dates differ |
| Condition/injury, severity, case detail | structured condition/severity plus restricted narrative | Triage and understand needs | Cases Lens and case inspector | Condition/status aggregation; open case | Free text is sensitive and inconsistent; imported classification dominates |
| Status, detailed status, completed, disposition | raw and normalized status/closure reason | Know what work remains and what happened | Workflow-aware case state | Filter and contextual action | `no_action` is not a verified intervention gap |
| Call via/intake channel | intake channel | Understand how requests arrive | Evidence/operations breakdown | Source/intake filter | Mostly imported history, not a live service metric |
| Review/appointment/new appointment | follow-up record/due semantics | Prevent missed care | Follow-up queue and animal timeline | Schedule/complete/reassign | Only 27 upcoming follow-ups currently |
| Assignee, due date, proof, cost | case operational columns | Plan staff and resources | Future operations layer | Assign, verify, record cost | Present coverage is near zero; do not visualize as city intelligence yet |
| Census/research estimate, confidence, methodology | `atlas_area_metrics` | Compare documented external evidence | Separate Official/Research evidence layer | Dated choropleth with source note | Never combine with recorded-animal totals or imply present population |

## 4. What Atlas and City Intelligence can support

### Safe to build now

1. **India Atlas of recorded evidence:** city/source reach, H3 footprint and clearly named record counts. Say “recorded animal profiles/rows”, not population or unique animals.
2. **Source-aware India exploration:** make clinical register, vaccination campaign, rescue operations and photo observations visually distinguishable.
3. **Continuous geographic navigation:** India → city → H3 cell → individual, with browser history/deep links and one inspector model.
4. **Coimbatore City Intelligence:** case urgency, status, condition, care and approximate locality patterns. This is the best operational prototype city.
5. **Ranchi campaign geography:** exact-source GPS vaccination activity, neuter status and source ward labels, using H3 until ward boundaries are matched.
6. **Jamshedpur clinical register view:** time/source totals at city scale, explicitly avoiding fabricated neighbourhood distribution.
7. **Delhi/Hyderabad individual discovery:** authentic photographs and small-sample observation histories.
8. **Evidence Lens:** source, method, licence, time range, geographic precision, identity basis and unknown-data visibility.
9. **Animal previews:** strong where photos/history exist; honest text-led records where they do not.
10. **Resilient, low-cost delivery:** current Postgres rollups plus cached JSON are sufficient for the first Atlas release.

### Not evidence-backed yet

- A current national street-dog population estimate.
- Nationally comparable ABC/ARV coverage or intervention-gap rankings.
- Ward selection for the main dataset cities.
- “Missing record” presented as verified lack of intervention.
- Exact citywide time/filter analytics derived from the current capped rich payloads.
- Resource-cost planning, staffing performance or SLA comparisons.
- National repeat-animal analysis without a stronger canonical identity model.
- Photo-led browsing for most records.
- Density language that confuses recorded rows with animals physically present.

## 5. Proposed map-first information architecture

1. **Open App → India Atlas.** First paint uses only national/source rollups. It communicates scale, reach, evidence types and limitations within five seconds.
2. **Enter a city without leaving the surface.** Camera, legend, narrative and controls adapt to that city's actual source capabilities.
3. **Lens model:** Animals, Care, Cases and Evidence. Evidence is mandatory; other lenses appear only when the data is meaningful. “Coverage” is not a default claim.
4. **Select an H3 cell/locality.** Show exact rollup totals, source mix, precision and a bounded record list.
5. **Select an animal.** Open a documentary preview over the map, then expand to its full chronology.
6. **Role-aware actions.** Public users follow/report; authenticated NGOs inspect/assign/update; municipality users select supported evidence areas. The map reading remains shared.
7. **Mobile:** map-first canvas, one compact Lens control, one bottom sheet and a persistent primary action. Never stack desktop panels.

## 6. Prioritized engineering sequence for Phase 3

1. Define an explicit observation-unit model: animal profile, encounter, observation, intervention and case. Preserve original source semantics.
2. Build source-aware national/city rollups carrying source, method, licence, date range, identity basis, geographic precision and observed unit.
3. Build an aggregate cube by city/H3/month/source/precision for animal records, ABC/ARV yes-no-unknown, photo/identity counts, case status/condition/severity/intake/closure and care kind. This removes sample-derived city claims.
4. Split national and city API lifecycles so India does not preload a rich city dataset.
5. Normalize canonical city/district aliases while preserving original source geography; correct Jamshedpur/Purbi Singhbhum attribution.
6. Backfill the 2,342 unlinked animal records and related events to authoritative data sources.
7. Add API-level disclosure strings and precision bands; do not make the frontend infer evidence quality.
8. Refactor `SpatialMap` into data/navigation, cartographic layers, Lens controls and inspector modules without changing semantics.
9. Merge City Insights into the geographic surface, retaining accessible deep links and tabular alternatives.
10. Review public projections, RLS, security-definer grants and exact-location policies before exposing new endpoints.
11. Match and validate ward geometries only for cities with compatible source identifiers. Keep H3 as the universal unit.
12. Add performance budgets and cold-cache tests; address current revalidation aborts before preview deployment.

## 7. Requirements for Astra's first prototypes

Astra should explore three genuinely different compositions, not variations of the current panel arrangement. Suggested territories are **cartographic observatory**, **editorial field atlas**, and **operational command cartography**; these are directions to challenge, not prescribed layouts.

Every concept must:

- Preserve the existing landing page, hero, primary navbar and established brand.
- Make the map the dominant information surface, not a background for KPI cards.
- Show the geographic ladder India → city → cell → animal as one continuous interaction.
- Make provenance and location precision visible in the cartography/legend, not hidden in a modal footnote.
- Keep official census/research estimates visually and semantically separate from StrayPaw records.
- Adapt Animals, Care, Cases and Evidence Lenses to data availability.
- Demonstrate four truthful exemplars: India; Coimbatore operations; Ranchi GPS campaign; Jamshedpur city-only clinical register; plus Delhi or Hyderabad for photo-led animal preview.
- Prototype desktop at 1,440 × 900 and mobile at 390 × 844.
- Include default, city selected, cell selected, animal preview, source disclosure, unsupported/empty Lens, loading/error fallback and mobile bottom-sheet states.
- Avoid nationally comparable “coverage”, population-density or intervention-gap claims.
- Preserve accessible labels, keyboard operation, reduced motion and a non-WebGL/tabular fallback.

The key design test is whether a visitor understands, within five seconds, that StrayPaw holds a large but heterogeneous body of recorded evidence, that the map reveals where and how it was collected, and that some marks lead to real individual animal histories.

## Audit boundary and missing material

This phase intentionally did not audit every post-app route. It did not inspect original copies of `_Rescue List.xlsx`, `mission-rabies-ranchi.xlsx`, `clinical.csv` or `resting_data.csv`, because those files are not present in the connected GitHub repository. Their fields were audited only from Supabase import metadata and retained staged schemas. No Google Drive, Dropbox or other document store was included in the user's connected scope. The original workbooks should be sampled under an approved sensitive-data workflow before changing import semantics.
