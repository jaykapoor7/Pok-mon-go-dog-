# Jamshedpur HSI / Humane World CNVR source note

## Source

- Paper: Smith et al. (2025), “Changes in free-roaming dog population demographics and health associated with a catch-neuter-vaccinate-release program in Jamshedpur, India,” PLOS ONE, DOI `10.1371/journal.pone.0317636`.
- Data/code repository: `https://github.com/lauren-smith-r/HSI_DPM`
- Pinned repository commit: `bbeb64269235680e4823a415318ecf3a860e0014`
- The paper says all data and code are available from the GitHub repository.

## Reuse decision

- The PLOS article is CC BY 4.0.
- The linked GitHub repository has no `LICENSE`, `COPYING`, README licence statement, release licence, or file-level raw-data licence at the pinned commit.
- GitHub publication alone does not establish permission to republish the raw tables.
- Decision: **stage only**. Do not publish profiles, route aggregates, or source-derived coordinates until the repository owner or data owner confirms reuse terms.

## Individual clinical table

- Canonical file: `data/clinical.csv`.
- 20,915 rows, 20,915 unique non-empty `IDno` values.
- Clinic/intake range: 2013-07-04 through 2016-12-13; release-date range: 2013-07-04 through 2016-12-15. Two intake dates and 36 release dates are missing/invalid.
- Sex: 10,459 female; 10,218 male; 238 unknown. Age: 13,087 adult; 2,186 juvenile; 5,404 puppy; 238 unknown.
- Ownership flag: 17,961 unowned/free-roaming and 2,954 owned. Pregnancy is present on 1,121 rows.
- Clinical flags: 7 distemper, 565 mange, 22 suspected rabies, and 561 transmissible venereal tumour (TVT) rows; 1,132 dogs have at least one of these flags.
- Other released fields: intake/release dates, capture method, raw sex/age code, and female/adult/owned/pregnant indicators.
- `mange` is present only in `data/clinical_data.csv`; the staging adapter verifies row-for-row alignment across six shared flags and intake date before joining it.
- No animal-level GPS, locality, photograph, weight, wound field, in-season status, individual sterilisation/vaccination outcome, ivermectin administration, or other treatment result is exposed in the released row-level files.
- The paper describes neutering, rabies vaccination, and treatment as the clinic protocol, but those outcomes are not present per record in the repository. They are not inferred onto profiles.
- All 20,915 rows remain private staging records. Zero profiles are published because the source license is unresolved and the native StrayPaw profile model requires real animal coordinates.

## Street survey table

- Canonical file: `data/total_count 2.csv`.
- 164 unique route-survey aggregate rows across 10 routes, dated 2014-05-06 through 2018-12-25.
- All 164 have a route reference point; it is not an animal location. Four surveys recorded zero dogs.
- The 160 non-empty surveys align exactly to 24,123 rows in each of `dog_types.csv`, `bcs.csv`, and `skin_conditions.csv`; these files have no stable dog IDs and cannot create profiles.
- Staged route aggregates retain observed count, sex, adult/juvenile, sterilised/ever-vaccinated, lactating, visible skin-condition, and body-condition counts.
- Across all survey observations: 9,506 male, 8,794 female, 1,368 juvenile, 9,118 sterilised/ever-vaccinated, 737 lactating female, and 203 visible skin-condition observations.
- These are aggregate observations, never dog profiles.
- All 164 route aggregates remain private staging records while reuse rights are unresolved; zero public atlas rows are published.

## Publication condition

If raw-data reuse is confirmed, clinical profiles still require either real animal-level coordinates or a product change that truthfully supports no-point profiles. Route surveys may become aggregate atlas rows with explicit route-reference precision; they must never be expanded into synthetic dogs.
