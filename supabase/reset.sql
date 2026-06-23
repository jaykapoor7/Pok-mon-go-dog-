-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — RESET TO FRESH
--
-- Run this in the Supabase SQL editor to wipe ALL data (dogs, sightings,
-- feeding/health records, comments, NGOs) and start completely empty.
-- The schema, functions, policies and storage bucket are kept intact.
--
-- ⚠️  This permanently deletes every row. There is no undo.
-- ════════════════════════════════════════════════════════════════

truncate table
  sightings,
  feed_events,
  vaccinations,
  sterilisations,
  comments,
  dogs,
  ngos
restart identity cascade;

-- Also remove uploaded sighting photos from storage (optional but recommended
-- so the storage bucket matches the now-empty database).
delete from storage.objects where bucket_id = 'sightings';
