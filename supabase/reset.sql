-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — RESET TO FRESH
--
-- Run this in the Supabase SQL editor to wipe ALL data (dogs, sightings,
-- feeding/health records, comments, NGOs) and start completely empty.
-- The schema, functions, policies and storage bucket are kept intact.
--
-- ⚠️  This permanently deletes every row. There is no undo.
-- ════════════════════════════════════════════════════════════════

-- Truncate everything that exists. Wrapped per-table so it still works if you
-- haven't run the cases migration yet.
truncate table sightings, feed_events, vaccinations, sterilisations,
               comments, dogs, ngos restart identity cascade;

do $$ begin
  truncate table case_updates, cases, volunteers restart identity cascade;
exception when undefined_table then null; end $$;

-- Also remove uploaded sighting photos from storage (optional but recommended
-- so the storage bucket matches the now-empty database).
delete from storage.objects where bucket_id = 'sightings';
