-- ════════════════════════════════════════════════════════════════
-- StrayPaw, ONE-TIME un-merge of existing data.
--
-- Splits every dog that has several live sightings into one dog PER sighting,
-- so "dogs tracked" reflects each captured moment (undoes the old ≤200 m
-- auto-merge on historical data). Run ONCE in the Supabase SQL editor.
--
-- Safe to re-run (idempotent): after the first run every dog has a single
-- sighting, so nothing further splits.
--
-- Notes / caveats:
--   • The EARLIEST sighting stays on the original dog; each later sighting spins
--     off into a new dog carrying that sighting's photo/location/mood.
--   • Care history (feed events, vaccinations, sterilisations, comments, cases)
--     stays attached to the original dog. It can't be attributed to a specific
--     sighting. New split-off dogs start fresh (unvaccinated/unsterilised).
--   • Consider taking a snapshot/backup first if you want an easy rollback.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  s            record;
  v_status     dog_status;
  v_needs_help boolean;
  v_friendly   boolean;
  v_new        uuid;
begin
  for s in
    select sg.*,
           row_number() over (partition by sg.dog_id order by sg.created_at, sg.id) as rn
    from sightings sg
    where sg.status = 'live' and sg.dog_id is not null
  loop
    if s.rn = 1 then
      continue; -- keep the first sighting on the existing dog
    end if;

    v_status := 'seen'; v_needs_help := false;
    if 'injured' = any(s.mood_tags) then
      v_status := 'injured'; v_needs_help := true;
    elsif 'hungry' = any(s.mood_tags) then
      v_status := 'hungry'; v_needs_help := true;
    end if;
    v_friendly := 'friendly' = any(s.mood_tags) or not ('shy' = any(s.mood_tags));

    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                      needs_help, trust_score, sightings_count, first_seen, last_seen)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
    returning id into v_new;

    update sightings set dog_id = v_new where id = s.id;
  end loop;

  -- Recompute aggregates so each kept dog reflects its single remaining sighting.
  update dogs d set
    sightings_count = (select count(*) from sightings
                       where dog_id = d.id and status = 'live'),
    last_seen = coalesce((select max(created_at) from sightings
                          where dog_id = d.id and status = 'live'), d.last_seen);
end $$;

-- How many dogs / sightings now (should match).
select
  (select count(*) from dogs)                                  as dogs,
  (select count(*) from sightings where status = 'live')       as live_sightings;
