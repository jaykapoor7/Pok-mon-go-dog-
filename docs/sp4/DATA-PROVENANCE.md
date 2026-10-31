# StrayPaw: historical-data provenance audit and cleanup plan

Audit date: 2026-10-31. Production project `toujthlzjmhmoyykmayx`. Every query
behind this document was **read-only**. Nothing in production was changed,
archived or deleted.

## 1. How records were classified

Not by `ngo_id` alone. Each animal (`dogs`) was classified by, in order:

1. `data_source_id` → `data_sources` (slug, `source_type`, organisation, licence);
2. `provenance` (`imported_historical_record`, `public_dataset`, `community_report`);
3. `import_batch_id` → `import_batches` (filename, kind, source);
4. `source_metadata` and `ngo_id` (organisational ownership);
5. for cases: `cases.dog_id` → the animal's source (cases have no `data_source_id`),
   then `cases.provenance`, `import_batch_id`, `intake_channel`, `created_by_id` and
   whether the creator is a member of the owning organisation (`ngo_members`).

## 2. Record-level manifest (production, animals)

| Source (slug) | Kind | Owner shown | Provenance | Animals | Decision |
|---|---|---|---|---:|---|
| `hsi-jamshedpur-cnvr-clinical-2013-2016` | research dataset | Humane World for Animals / HSI | imported_historical_record | 20,915 | **Exclude from operational and public metrics**: keep as research archive |
| `mission-rabies-ranchi-2014-2015` | public dataset | — | public_dataset | 6,462 | **Exclude**: research archive |
| IISER Kolkata (9 sources) | public dataset | — | public_dataset | 424 | **Exclude**: research archive |
| iNaturalist (2 sources) | public dataset | — | public_dataset | 55 | **Exclude**: research archive |
| Wikimedia (1 source) | public dataset | — | public_dataset | 1 | **Exclude**: research archive |
| *(no data source)*: The Pawsome People Project | organisation import, 6 batches | Pawsome | imported_historical_record | 2,275 | **Keep**, labelled *Historical imported record* |
| `kind-hour-rescue-register-2024-2026` | organisation register | The Kind Hour Foundation | imported_historical_record | 89 | **Keep**, labelled *Historical imported record* |
| *(no data source)*: community reports | public reports, Jun–Aug 2026 | none / Pawsome | community_report | 67 | **Keep**, labelled *Community report* |
| **Total** | | | | **30,288** | keep 2,431 · exclude 27,857 |

The excluded set is exactly *every animal whose `data_source_id` points at a
source other than the Kind Hour register*. It is reproducible from the database
at any time with:

```sql
select d.id from dogs d join data_sources ds on ds.id = d.data_source_id
where ds.slug <> 'kind-hour-rescue-register-2024-2026';
```

**Delhi.** The only Delhi records are the 58 community reports (no Delhi
organisation import exists among the animals). They are kept as community reports.

## 3. Related records (FK map and counts)

Foreign keys into the affected tables (`confdeltype`: c = cascade, n = no action, r = restrict):

| Child table | Column | → | On delete |
|---|---|---|---|
| cases, sightings (×2), documents, evidence_items, case_stories, import_rows (×2) | dog_id … | dogs | no action |
| medical_events, animal_followups, animal_timeline_events, vaccinations, sterilisations, comments, feed_events, adoption_listings | dog_id | dogs | **cascade** |
| case_updates, animal_followups | case_id | cases | **cascade** |
| medical_events, documents, animal_timeline_events, import_rows, evidence_items, case_stories | case_id … | cases | no action |
| dogs, cases, medical_events, animal_followups | import_batch_id | import_batches | no action |
| dogs, import_batches | data_source_id | data_sources | no action |
| atlas_area_metrics | data_source_id | data_sources | restrict |

Because several children **cascade**, a physical delete of an excluded animal
would silently destroy its timeline and care history. That is one reason the
plan below never deletes.

Rows linked to the excluded animals vs the kept ones:

| Table | Linked to excluded | Linked to kept |
|---|---:|---:|
| dogs | 27,857 | 2,431 |
| cases | 20,915 | 2,285 |
| medical_events | 20,915 | 1,613 |
| animal_timeline_events | 83,660 | 5,295 |
| import_rows | 6,546 | 2,368 |
| animal_followups | 0 | 1,630 |
| sightings | 0 | 65 |
| vaccinations, sterilisations, evidence, documents, stories, comments, feed, adoption | 0 | 0 |

Cases by source: HSI 20,915 · Pawsome 2,190 · Kind Hour 90 · community 5 (total 23,200).

## 4. Public numbers before and after (dry run, read-only)

| Public metric | Today | After exclusion |
|---|---:|---:|
| Animals on the public register | 30,288 | 2,431 |
| Cities with animals | 30 | 12 |
| Animals recorded sterilised | 24,531 | 102 |
| Animals recorded vaccinated | 27,444 | 67 |
| `public_spatial_animals_cache` rows | 30,288 | 2,431 |

The 30,288 figure, and the sterilisation and vaccination totals built on it, are
inflated public claims: about 92% of those animals come from research and
public datasets, not from operational work on StrayPaw. The new website (StrayPaw 4)
does not show them. It quotes only the Pawsome and Kind Hour registers, labelled
as imported historical records.

## 5. Provenance faults found

1. **Organisation-created cases tagged `community_report`.** `cases.provenance` and
   `dogs.provenance` default to `'community_report'`, and `create_case_with_location`
   / `create_case` never set it. Every case an organisation member opens is
   therefore labelled a community report. In production this affects 2 of the 5
   native cases (`SPC-47A86E67…`, `SPC-97F1E190…`): both were created by a member
   of the owning organisation (Pawsome). The other 3 have no organisation and a
   creator who is not a member; they are genuine community reports.
   *Fix:* the operator path sets `provenance = 'operator_created'` (see
   `supabase/proposed/2026-10-31-provenance-and-scope.sql`). It was applied and
   tested in **staging only**.
2. **Imported cases shown as `verified`.** 2,280 Pawsome and Kind Hour imported cases carry
   `verification_state = 'verified'` (`src/lib/master-import/commit*.ts` sets it on
   import). An import is not a verification. These should read `source_record`
   (as the HSI rows and `src/lib/ngo-import/write.ts` already do) until someone
   validates them through the review workflow. This is a production data change
   and is planned only; it has not been made.

## 6. Provenance vocabulary (StrayPaw 4)

Origin (`provenance`) and assurance (`verification_state`) are kept separate:

| Label shown | Column | Value |
|---|---|---|
| Historical imported record | provenance | `imported_historical_record` |
| Community report | provenance | `community_report` |
| Operator-created record | provenance | `operator_created` *(new)* |
| Research archive (not shown in operations) | provenance | `public_dataset`, or source scope `research_archive` |
| Source record (unreviewed) | verification_state | `source_record` / `submitted` |
| Veterinarian-authorised record | verification_state | `vet_authorised` *(new)* |
| Evidence reviewed | verification_state | `evidence_reviewed` *(new)* |
| Government accepted | verification_state | `government_accepted` *(new)* |

A historical imported record keeps its origin label forever. Its assurance can rise only
through a recorded review (who, when, what evidence). The label never changes on its own.

## 7. Reversible production plan (NOT executed; needs separate approval)

1. **Backup (outside the repo).** `pg_dump --data-only -t dogs -t cases -t medical_events
   -t animal_timeline_events -t import_rows -t data_sources -t import_batches`
   to encrypted storage that the owner controls. Record the checksum in the change ticket.
2. **Scope, not delete.** Add `data_sources.record_scope text not null default
   'operational' check (record_scope in ('operational','research_archive'))` and set
   `research_archive` on the 14 excluded sources. No animal, case or event row is
   updated or deleted. The excluded set stays reproducible from section 2.
3. **Public projections.** Add the predicate
   `and not exists (select 1 from data_sources s where s.id = d.data_source_id and s.record_scope = 'research_archive')`
   to the public views that read `dogs`: `public_spatial_animals`,
   `public_spatial_animals_cache` (then `refresh materialized view`),
   `public_programme_cards`, `public_animal_profiles`, `public_case_facts`,
   `public_case_stories`, `public_care_facts`, `public_field_activity`,
   `public_contributor_organisations`, `public_sterilisations`,
   `public_vaccinations`, `analytics_overview`, `adoptable_animals`. Each rewritten
   view is generated from `pg_get_viewdef`, diffed and reviewed one at a time.
4. **Research access.** A separate `research_archive_animals` view, readable only by
   staff, keeps the excluded datasets available for research with their licences.
5. **Provenance fixes.** Deploy the `operator_created` change to the case-create path.
   Relabel the 2 mis-tagged cases (with a `case_updates` audit line each), and move
   the 2,280 imported `verified` cases to `source_record` (with a recorded batch note).
   Prior values are saved in a `provenance_corrections` table first, so the change
   can be reversed exactly.
6. **Verify.** Re-run section 4's counts. Expect 2,431 animals and 12 cities.
7. **Reverse.** `update data_sources set record_scope='operational'`, restore the
   previous view definitions (kept in the change file), refresh the cache, and
   restore provenance values from `provenance_corrections`.

## 8. Why the cleanup was not run in staging

Staging (`ucxfxiddufwqithtdtix`) has none of the provenance schema: no
`data_sources` or `import_batches` table, and almost no data (2 cases, 0 animals). There is nothing
to archive there, and copying 30k production records into it via the available
tools is neither practical nor desirable. The exclusion was therefore dry-run
against production with read-only counts (section 4). The parts that *can* run in
staging, the case-create provenance fix and the review workflow, were applied
there. Running step 2–3 for real needs a staging copy of the production schema
(a Supabase branch, or `pg_dump --schema-only` restored into staging) and is listed
as a release blocker.
