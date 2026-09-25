# Public-data import checkpoint

- Last completed batch: Batch 2 — Jamshedpur, completed as staging-only/publication-blocked. Ranchi remains complete and was not rerun.
- Current batch: none. Stop after Jamshedpur.
- Last implementation commit SHA: `7757cfcc7955285b2c348d8f0fc44d733a506d20` (`4bd571e` is the atlas-foundation/Ranchi checkpoint).
- Migrations applied: `20260925101031 public_atlas_provenance_and_area_metrics`; `20260925101524 public_atlas_profile_fields`.
- Production totals: 8,832 dogs; 963 atlas rows; 34,146 import rows; database 151,309,459 bytes; Storage 248,591,499 bytes across 62 objects.
- Imported/published: Ranchi 6,462 profiles + 18 wards; Bengaluru 9 aggregates; Mumbai 1; Chennai 11; IISER 180; national 744; iNaturalist 6 profiles; Commons 1 profile currently live.
- Jamshedpur source: `https://github.com/lauren-smith-r/HSI_DPM` at `bbeb64269235680e4823a415318ecf3a860e0014`; paper DOI `10.1371/journal.pone.0317636`; article licence CC BY 4.0; raw repository licence absent/pending.
- Jamshedpur counts: 21,079 discovered and staged; 0 published; 21,079 skipped from publication; 0 duplicates; 0 individual records with coordinates; 164 route aggregates with reference coordinates.
- Jamshedpur clinical: 20,915 unique individual IDs; 20,913 valid dates; 1,132 with health flags; 0 per-record ABC/vaccination outcome fields. The paper's cohort protocol was not inferred onto individuals.
- Jamshedpur street: 164 route aggregates derived from 24,123 observations; 9,118 sterilised/ever-vaccinated observations; 203 visible skin-condition observations; no stable individual IDs.
- Jamshedpur production verification: 20,915 clinical + 164 street staging rows; 0 source-linked `dogs`; 0 source-linked `atlas_area_metrics`; Storage unchanged at 248,591,499 bytes.
- Other staged/partial work remains unchanged: IISER resting 445 identifiers from 6,047 observations; Commons latest 318 rows with 12 eligible profiles (11 not yet live); iNaturalist latest 242 rows with 6 eligible/live.
- Known unrelated issue preserved: Wikimedia source metadata says 12 published while only 1 dog is live. Do not address it in the Jamshedpur batch.
- Exact next recommended batch: Batch 3 — reconcile and finish the already-partial West Bengal IISER sources without duplicating the 445 staged identifiers or 180 published aggregates. Do not start it in the Jamshedpur session.
