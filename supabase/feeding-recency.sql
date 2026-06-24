-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — time-aware feeding
--
-- A dog needs feeding multiple times a day, so "Fed" must decay. We track the
-- last feed time on the dog and the UI only shows "Fed" within a recency
-- window (see FED_WINDOW_HOURS in the app). Run once in the SQL editor; also
-- folded into schema.sql for fresh installs.
-- ════════════════════════════════════════════════════════════════

alter table dogs add column if not exists last_fed_at timestamptz;

-- Backfill from the most recent feed event per dog.
update dogs d
set last_fed_at = sub.last_fed
from (
  select dog_id, max(created_at) as last_fed
  from feed_events group by dog_id
) sub
where sub.dog_id = d.id;

-- log_feed now stamps last_fed_at so "Fed" reflects the latest feeding.
create or replace function log_feed(
  p_dog_id uuid,
  p_reporter_name text default null,
  p_food_type text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into feed_events (dog_id, reporter_name, food_type)
  values (p_dog_id, p_reporter_name, p_food_type);
  update dogs
  set feed_count = feed_count + 1,
      last_fed_at = now(),
      last_seen = now()
  where id = p_dog_id;
end;
$$;
