-- ════════════════════════════════════════════════════════════════
-- SUPERSEDED by observation-identity.sql. Do not run this on a new database.
--
-- This removed the wrong merge by removing linking altogether: every approved
-- sighting became its own animal, so two people reporting the same dog could
-- never produce one record. observation-identity.sql keeps the merge off by
-- default but lets a person link an observation deliberately, which is what
-- makes a timeline possible at all. Kept for history.
--
-- StrayPaw — disable the ≤200 m auto-merge (each sighting = its own dog).
--
-- Run ONCE in the Supabase SQL editor (idempotent). The old approve_sighting
-- folded any new sighting within 200 m of an existing dog into that dog, which
-- wrongly merged distinct dogs sharing a lane/colony. This version always
-- creates a fresh dog profile, so "dogs tracked" matches sightings 1:1.
--
-- Reversible: re-run auth-accounts.sql to restore the matching behaviour.
-- ════════════════════════════════════════════════════════════════

create or replace function approve_sighting(p_sighting_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  s            sightings;
  v_dog        dogs;
  v_status     dog_status := 'seen';
  v_needs_help boolean := false;
  v_friendly   boolean := true;
begin
  select * into s from sightings where id = p_sighting_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;
  if s.status = 'live' then
    return json_build_object('ok', true, 'already', true, 'dog_id', s.dog_id);
  end if;

  if 'injured' = any(s.mood_tags) then v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(s.mood_tags) then v_status := 'hungry'; v_needs_help := true; end if;
  v_friendly := 'friendly' = any(s.mood_tags) or not ('shy' = any(s.mood_tags));

  -- Auto-merge removed: every approved sighting becomes its own dog profile.
  insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                    needs_help, trust_score, sightings_count, first_seen, last_seen)
  values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
          v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
  returning * into v_dog;

  update sightings set status = 'live', dog_id = v_dog.id where id = p_sighting_id;
  return json_build_object('ok', true, 'dog_id', v_dog.id, 'sighting_id', p_sighting_id);
end;
$$;

grant execute on function approve_sighting(uuid) to service_role;
