-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — delete ONE dog (and its sightings) from live data
--
-- Demo Mode dogs are NOT in the database, so every row in `dogs` here is a
-- real submission. Run step 1 to find the dog, then step 2 with its id.
-- ════════════════════════════════════════════════════════════════

-- 1) List real dogs (newest first) and copy the id you want to remove.
select id, name, zone, status, created_at
from dogs
order by created_at desc;

-- 2) Remove that one dog and everything attached to it.
--    Replace the UUID below, then run.
begin;
  delete from sightings      where dog_id = 'PASTE-DOG-UUID-HERE';
  delete from feed_events    where dog_id = 'PASTE-DOG-UUID-HERE';
  delete from vaccinations   where dog_id = 'PASTE-DOG-UUID-HERE';
  delete from sterilisations where dog_id = 'PASTE-DOG-UUID-HERE';
  delete from comments       where dog_id = 'PASTE-DOG-UUID-HERE';
  delete from dogs           where id     = 'PASTE-DOG-UUID-HERE';
commit;

-- (Optional) If you'd rather wipe ALL real dogs and keep only Demo Mode,
-- run supabase/reset.sql instead.
