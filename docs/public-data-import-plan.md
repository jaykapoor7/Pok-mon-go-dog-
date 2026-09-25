# StrayPaw public-data import master plan

This document is the persistent source of truth for the India public-data atlas project. Update it after every production-verified batch. Never turn aggregate estimates into dog profiles, invent coordinates, overwrite partner records, or re-import a completed source.

## Current production baseline

- Git baseline before the replayed public-atlas work: `2c2f14c8aa36486ef496e43d43fb0adaad0d7095` on `main`.
- Supabase project: `toujthlzjmhmoyykmayx`.
- Current database size at checkpoint: 151,309,459 bytes.
- Current Supabase Storage: approximately 248,591,499 bytes; public-source photos remain externally hosted.
- Current totals: 8,832 dog rows, 963 aggregate atlas rows, 34,146 staged import rows.
- Ranchi is complete in production and must not be rerun.
- Migrations applied: `public_atlas_provenance_and_area_metrics` and `public_atlas_profile_fields`.

## Batch ledger

| Batch | Sources / cities | Type | Status | Records staged | Records published | Commit |
|---|---|---|---|---:|---:|---|
| 1 | Ranchi — Mission Rabies / Ranchi Municipal Corporation | Individual vaccination observations + ward coverage | **COMPLETE** | 7,671 | 6,462 profiles + 18 ward rows | `4bd571e` |
| 2 | Jamshedpur — Humane World / HSI CNVR | Individual clinical records + street-survey aggregates | **COMPLETE — STAGED / PUBLICATION BLOCKED** | 21,079 (20,915 clinical + 164 route surveys) | 0 profiles + 0 atlas rows | `7757cfc` |
| 3 | West Bengal — IISER Kolkata Mendeley/Dryad datasets | Individual/research + group/census aggregates | **PARTIAL (do not duplicate)** | 445 source-identifier summaries from 6,047 observations | 180 aggregate rows | Pending repository checkpoint |
| 4 | Wikimedia Commons + iNaturalist + GBIF | Photographed GPS observations | **IN PROGRESS** | 318 Commons + 242 iNaturalist in latest batches | 7 profiles currently live; 11 additional Commons profiles normalized but not yet published | — |
| 5 | Mumbai + Bengaluru | Ward/zone census | **PARTIAL (do not duplicate)** | 10 normalized rows | 1 Mumbai city row + 9 Bengaluru city/zone rows | Pending repository checkpoint |
| 6A | Chennai | Census, ABC activity, infrastructure | **PARTIAL (do not duplicate)** | 11 | 11 aggregate rows | Pending repository checkpoint |
| 6B | Coimbatore + Mangaluru | Census, feeding sites, ABC/vaccination, infrastructure | **TODO** | 0 | 0 | — |
| 7A | Ahmedabad + Bhubaneswar | Census/operations | **TODO** | 0 | 0 | — |
| 7B | Thiruvananthapuram | Census/operations | **TODO** | 0 | 0 | — |
| 8A | Delhi + Chandigarh | Census/ABC/facilities | **TODO** | 0 | 0 | — |
| 8B | Mysuru + Pune/PCMC | Census/ABC/facilities | **TODO** | 0 | 0 | — |
| 9 | Government of India DAHD 20th Livestock Census | District/state baseline | **COMPLETE** | 708 official district rows | 744 country/state/district rows total | Pending repository checkpoint |
| 10 | Final discovery sweep: OGD, research repositories, Movebank, GBIF, municipal portals | Remaining sources | **TODO** | 0 | 0 | — |

## Batch execution contract

For every batch:

1. Mark only that batch **IN PROGRESS**.
2. Research only its named sources and save concise source notes in the repository.
3. Verify reuse status independently for data and images.
4. Download or API-fetch into ignored cache paths; never commit giant raw datasets.
5. Normalize through a repeatable importer and register provenance.
6. Deduplicate by source, record ID, original observation ID, photo ID, date and coordinates.
7. Stage through `import_batches` / `import_rows`.
8. Validate counts, dates, GPS, profile eligibility and aggregate semantics.
9. Publish only qualifying individual observations and legitimate aggregate facts.
10. Test profile, Reported by, map/coverage, filters, external images, mobile and RLS.
11. Record database/storage impact and production counts here.
12. Commit the completed batch and record its SHA in this ledger.

## Existing architecture to reuse

- Source registry: `data-sources/registry.json` and production `data_sources`.
- Staging: `import_batches` and `import_rows`.
- Individual profiles: `dogs` plus `public_animal_profiles`; source uniqueness is `(data_source_id, source_record_id)`.
- Public attribution: existing `ngos` row and `ngo_id`; profile UI renders `Reported by <organisation>`.
- Aggregate facts: `atlas_area_metrics` and security-invoker `public_atlas_area_metrics`.
- Contributor pages: security-invoker `public_contributor_organisations`; only operational partners and organizations with published verified data appear.
- External photos: `dogs.external_image_url` and provenance in `source_metadata`; no bulk Supabase Storage copies.
- Map: zoom-aware `/api/spatial` individual aggregation plus opt-in census mode.

## Completed-source invariants

### Ranchi

- Source rows discovered/staged: 7,671.
- Published profiles: 6,462 only where ownership is `Free Roaming`, original GPS is valid and the source has a stable DogId/date.
- Skipped: 1,209; no aggregate estimate was converted into profiles.
- Published ward coverage rows: 18.
- Source observation range: 2014-12-05 through 2015-04-15.
- Duplicate source IDs in published Ranchi profiles: 0.

### National baseline

- Official workbook: DAHD `FinalDistrictWiseStrayCattleDog.xlsx`.
- Valid district rows: 708; derived state/UT sums: 35; existing national row: 1.
- Official district-row sum: 15,304,345 stray dogs.
- These are aggregate facts only and have no fabricated point geometry.

### Jamshedpur

- Source repository: `https://github.com/lauren-smith-r/HSI_DPM`, pinned at `bbeb64269235680e4823a415318ecf3a860e0014`; paper DOI: `10.1371/journal.pone.0317636`.
- Reuse: the PLOS article is CC BY 4.0, but the linked raw GitHub repository has no explicit raw-data licence. Publication remains blocked.
- Clinical records: 20,915 rows and 20,915 unique IDs; 20,913 valid intake dates; date range 2013-07-04 through 2016-12-13; zero animal coordinates; zero duplicates.
- Clinical field coverage: sex/age, ownership, pregnancy, capture method, distemper, mange, suspected rabies, and TVT. There are 1,132 rows with at least one released health flag.
- The released row-level data does not expose weight, wounds, individual sterilisation/vaccination outcomes, ivermectin/treatment outcomes, images, or animal locations. Cohort protocol statements were not converted into per-dog statuses.
- Street layer: 24,123 unidentifiable observations reduced to 164 unique route-survey aggregates across 10 routes; all 164 have route reference coordinates and none is an animal location.
- Street aggregates preserve sex, age, sterilised/ever-vaccinated, lactation, visible skin-condition, and body-condition counts. Zero street observations were converted into profiles.
- Production: 21,079 rows staged in two idempotent batches; 0 dogs and 0 atlas rows published; 0 duplicate source IDs/fingerprints.

## Known blockers and publication decisions

- Jamshedpur is complete as a staging-only batch: stable dog IDs and health fields exist, but there is no animal-level GPS and the raw repository has no explicit data licence. Keep all 21,079 records private until reuse and location eligibility are resolved.
- IISER resting-site data has stable source identifiers, sex, life stage and dates but no source GPS. The 445 identifier summaries remain staged; no fake coordinates or profiles.
- Movebank Masinagudi/Moyar tracking remains staged-only until the dataset's own access/reuse terms are verified. If publishable, create one profile per tracked animal, never one per fix.
- GBIF must exclude iNaturalist-origin occurrences already reviewed through the iNaturalist API.
