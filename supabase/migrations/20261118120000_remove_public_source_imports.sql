-- Remove the public-source imports (owner's decision, 2026-11-17).
--
-- StrayPaw no longer tracks the ~28,000 animals imported from published datasets as a metric. They were loaded under
-- six placeholder organisations that stand for the publishers and have no members and no work of their own:
--   Humane World for Animals / HSI (20,915 dogs, each with one imported case and care row), Mission Rabies (6,462),
--   IISER Kolkata (424), iNaturalist contributors (49), iNaturalist (6), Wikimedia Commons (1).
-- This removes those organisations, their animals, cases, care rows, timeline rows, import batches and rows, their 15
-- data sources and the 198 atlas figures computed from them.
--
-- Kept, untouched: every organisation with members (The Pawsome People Project, including its own 2,275 imported
-- records), The Kind Hour Foundation, community reports and everything people recorded in StrayPaw. Their photos
-- were linked from the publishers' sites, not stored, so no stored file is removed.
--
-- Guarded: it stops, changing nothing, if a target organisation has a member, owns an animal that is not an import,
-- or if anything outside the set points at the rows being removed.
-- Map caches rebuild on their own (spatial queue every minute, animal cache and snapshots within 15 minutes).
-- On production (2026-11-17) the same steps ran in guarded batches (the single transaction is too long for the SQL
-- tool's time limit), then this migration was recorded there as a no-op. Staging has none of these organisations.
-- Not reversible from the database; the publishers' datasets remain the source if they are ever wanted again.

do $$
declare
  orgs uuid[] := array[
    '5b57a357-3c1c-5b83-a6c3-9e3c8f205901',  -- Humane World for Animals / HSI
    'a77d2cf8-f422-4a9d-95c7-df47aa75b435',  -- Mission Rabies
    '07a37fbb-2bec-49b4-aa8c-928d6c68d474',  -- IISER Kolkata
    'c683aa60-7340-5bd0-bc1f-b349fee19201',  -- iNaturalist contributors
    'cf91e175-6632-4350-8f79-9d56432621f1',  -- iNaturalist
    'b3331ef0-f693-48f9-a738-b45cc801f29b'   -- Wikimedia Commons
  ]::uuid[];
  n bigint;
begin
  -- Only where these organisations exist (production). Elsewhere this does nothing.
  orgs := array(select id from public.ngos where id = any(orgs));
  if cardinality(orgs) = 0 then raise notice 'No public-source organisations here; nothing to remove.'; return; end if;

  if exists (select 1 from public.ngo_members where ngo_id = any(orgs)) then
    raise exception 'A public-source organisation has a member; nothing was removed.';
  end if;
  if exists (select 1 from public.dogs where ngo_id = any(orgs) and coalesce(provenance, '') not in ('public_dataset', 'imported_historical_record')) then
    raise exception 'A public-source organisation owns an animal that is not an import; nothing was removed.';
  end if;

  create temp table rm_dogs on commit drop as select id from public.dogs where ngo_id = any(orgs);
  create temp table rm_cases on commit drop as select id from public.cases where ngo_id = any(orgs) or dog_id in (select id from rm_dogs);
  create temp table rm_sources on commit drop as
    select id from public.data_sources where reporting_org_id = any(orgs)
    union select data_source_id from public.dogs where id in (select id from rm_dogs) and data_source_id is not null;

  -- Nothing outside the set may point at what is removed.
  if exists (select 1 from public.cases where dog_id in (select id from rm_dogs) and id not in (select id from rm_cases))
     or exists (select 1 from public.dogs where data_source_id in (select id from rm_sources) and id not in (select id from rm_dogs))
     or exists (select 1 from public.sightings where dog_id in (select id from rm_dogs) or claimed_dog_id in (select id from rm_dogs))
     or exists (select 1 from public.documents where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases))
     or exists (select 1 from public.evidence_items where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases))
     or exists (select 1 from public.oh_handoffs where animal_id in (select id from rm_dogs))
     or exists (select 1 from public.oh_samples where animal_id in (select id from rm_dogs))
     or exists (select 1 from public.nx_appointments where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases))
     or exists (select 1 from public.nx_vet_patients where dog_id in (select id from rm_dogs))
     or exists (select 1 from public.abc_attestations where case_id in (select id from rm_cases))
     or exists (select 1 from public.animal_operation_events where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases))
     or exists (select 1 from public.case_stories where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases))
  then
    raise exception 'Something outside the public-source set refers to these records; nothing was removed.';
  end if;

  delete from public.atlas_area_metrics where data_source_id in (select id from rm_sources) or reporting_org_id = any(orgs);
  get diagnostics n = row_count; raise notice 'atlas figures: %', n;
  delete from public.import_rows where imported_dog_id in (select id from rm_dogs) or matched_dog_id in (select id from rm_dogs) or imported_case_id in (select id from rm_cases);
  get diagnostics n = row_count; raise notice 'import rows: %', n;
  delete from public.import_batches where ngo_id = any(orgs) or data_source_id in (select id from rm_sources);
  get diagnostics n = row_count; raise notice 'import batches: %', n;
  delete from public.animal_timeline_events where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases) or ngo_id = any(orgs);
  get diagnostics n = row_count; raise notice 'timeline rows: %', n;
  delete from public.medical_events where dog_id in (select id from rm_dogs) or case_id in (select id from rm_cases);
  get diagnostics n = row_count; raise notice 'care rows: %', n;
  delete from public.cases where id in (select id from rm_cases);
  get diagnostics n = row_count; raise notice 'cases: %', n;
  delete from public.dogs where id in (select id from rm_dogs);
  get diagnostics n = row_count; raise notice 'animals: %', n;
  delete from public.data_sources where id in (select id from rm_sources);
  get diagnostics n = row_count; raise notice 'data sources: %', n;
  delete from public.ngos where id = any(orgs);
  get diagnostics n = row_count; raise notice 'organisations: %', n;
end $$;
