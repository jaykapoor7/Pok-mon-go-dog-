-- ════════════════════════════════════════════════════════════════
-- What is actually in the feed, and why.
--
-- Read-only. Paste into the Supabase SQL editor when the sightings feed
-- ("Recent activity") does not show what you expect. It answers three
-- separate questions that look identical from the outside:
--
--   1. Did the twenty Delhi animals get in at all?
--   2. Did they get sightings, or only dog records? The map reads `dogs`,
--      the feed reads `sightings`. A dog with no sighting is on the map and
--      nowhere else.
--   3. Is anything sitting unpublished? A newly reported sighting is saved
--      as 'pending' and only joins the feed once it is approved, so a
--      growing pending count means reports are arriving and waiting, not
--      that reporting is broken.
-- ════════════════════════════════════════════════════════════════

select 'dogs, all'                    as what, count(*)::text as how_many from dogs
union all
select 'dogs, the Delhi twenty',      count(*)::text from dogs
  where id::text like 'd0910000-0000-4000-8000-%'
union all
select 'sightings, live (the feed)',  count(*)::text from sightings where status = 'live'
union all
select 'sightings, pending review',   count(*)::text from sightings where status = 'pending'
union all
select 'sightings, the Delhi twenty', count(*)::text from sightings
  where id::text like 'd0910001-0000-4000-8000-%'
union all
select 'Delhi dogs with NO sighting', count(*)::text from dogs d
  where d.id::text like 'd0910000-0000-4000-8000-%'
    and not exists (select 1 from sightings s where s.dog_id = d.id)
union all
select '→ verdict', case
  when (select count(*) from dogs where id::text like 'd0910000-0000-4000-8000-%') = 0
    then 'Seed has not run at all. Run seed-delhi-photographs.sql.'
  when (select count(*) from sightings where id::text like 'd0910001-0000-4000-8000-%') = 0
    then 'Dogs are in, sightings are not: this is the older version of the seed, from before it wrote to the sightings table. Re-run the current seed-delhi-photographs.sql.'
  when (select count(*) from sightings where id::text like 'd0910001-0000-4000-8000-%') < 20
    then 'Partly in. Re-run seed-delhi-photographs.sql; it updates rather than duplicating.'
  else 'All twenty are in the feed. If the page still looks stale it is cached, not missing: reload it.'
  end;
