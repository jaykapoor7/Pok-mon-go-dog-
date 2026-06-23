-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — add sighting deletion (token ownership)
--
-- Run this in the Supabase SQL editor on an existing project. It is also
-- folded into schema.sql for fresh installs.
--
-- Model: when a sighting is created the browser generates a secret token,
-- keeps it in localStorage, and the server stores only a SHA-256 HASH of it
-- here. Deleting requires presenting the token (server re-hashes and compares)
-- so the database never holds the secret and only the original reporter can
-- delete their sighting.
-- ════════════════════════════════════════════════════════════════

alter table sightings add column if not exists owner_hash text;

-- report_sighting now also stores the owner hash and returns the new sighting
-- id alongside the dog. Return type changes, so drop + recreate.
drop function if exists report_sighting(text,float,float,text,text,text[],text,text);

create or replace function report_sighting(
  p_photo_url     text,
  p_lat           float,
  p_lng           float,
  p_zone          text,
  p_nickname      text default null,
  p_mood_tags     text[] default '{}',
  p_notes         text default null,
  p_reporter_name text default null,
  p_owner_hash    text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dog        dogs;
  v_status     dog_status := 'seen';
  v_needs_help boolean := false;
  v_friendly   boolean := true;
  v_trust      int;
  v_sighting   uuid;
begin
  if 'injured' = any(p_mood_tags) then
    v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(p_mood_tags) then
    v_status := 'hungry'; v_needs_help := true;
  end if;
  v_friendly := 'friendly' = any(p_mood_tags) or not ('shy' = any(p_mood_tags));

  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  select * into v_dog
  from dogs
  where haversine_m(p_lat, p_lng, lat, lng) <= 200
  order by haversine_m(p_lat, p_lng, lat, lng)
  limit 1;

  if found then
    update dogs set
      last_seen       = now(),
      sightings_count = sightings_count + 1,
      status          = case when v_needs_help then v_status else status end,
      needs_help      = needs_help or v_needs_help,
      name            = coalesce(name, p_nickname),
      cover_photo     = coalesce(cover_photo, p_photo_url),
      trust_score     = least(99, (trust_score + v_trust) / 2 + 2)
    where id = v_dog.id
    returning * into v_dog;
  else
    insert into dogs (name, zone, lat, lng, status, cover_photo,
                      is_friendly, needs_help, trust_score,
                      sightings_count, first_seen, last_seen)
    values (p_nickname, p_zone, p_lat, p_lng, v_status, p_photo_url,
            v_friendly, v_needs_help, v_trust, 1, now(), now())
    returning * into v_dog;
  end if;

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash)
  values (v_dog.id, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash)
  returning id into v_sighting;

  return json_build_object(
    'dog_id', v_dog.id,
    'sighting_id', v_sighting,
    'trust_score', v_dog.trust_score
  );
end;
$$;

-- delete_sighting — verifies the token hash, deletes the sighting, and keeps
-- the dog aggregates correct (removing the dog if it was its last sighting).
create or replace function delete_sighting(p_sighting_id uuid, p_owner_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dog   uuid;
  v_count int;
begin
  select dog_id into v_dog
  from sightings
  where id = p_sighting_id
    and owner_hash is not null
    and owner_hash = p_owner_hash;

  if v_dog is null then
    return false; -- not found, or token doesn't match
  end if;

  delete from sightings where id = p_sighting_id;

  select count(*) into v_count from sightings where dog_id = v_dog;
  if v_count = 0 then
    delete from dogs where id = v_dog;
  else
    update dogs set
      sightings_count = v_count,
      last_seen = (select max(created_at) from sightings where dog_id = v_dog)
    where id = v_dog;
  end if;

  return true;
end;
$$;

grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text)
  to anon, authenticated, service_role;
grant execute on function delete_sighting(uuid,text)
  to anon, authenticated, service_role;
