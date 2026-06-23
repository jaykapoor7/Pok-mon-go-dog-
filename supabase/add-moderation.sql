-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — add a moderation layer to sightings
--
-- Run this once in the Supabase SQL editor on an existing project. It is also
-- folded into schema.sql for fresh installs.
--
-- Model: new sightings are created as `pending` and are invisible everywhere
-- public. An admin marks them `live` (approve_sighting), which is when the dog
-- profile is created/matched and the sighting appears on the map and feed.
-- ALL EXISTING sightings are migrated to `live` so nothing currently visible
-- disappears.
-- ════════════════════════════════════════════════════════════════

-- 1. Column (existing rows become 'live'; new rows default to 'pending').
alter table sightings add column if not exists status text;
update sightings set status = 'live' where status is null;
alter table sightings alter column status set default 'pending';
alter table sightings alter column status set not null;
do $$ begin
  alter table sightings add constraint sightings_status_chk
    check (status in ('pending','live'));
exception when duplicate_object then null; end $$;
create index if not exists sightings_status_idx on sightings (status);

-- 2. report_sighting → insert as pending, do NOT create/update a dog.
drop function if exists report_sighting(text,float,float,text,text,text[],text,text,text);
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
returns json language plpgsql security definer set search_path = public as $$
declare
  v_trust    int;
  v_sighting uuid;
begin
  v_trust := least(100, 40 + 20
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash, status)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash, 'pending')
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust);
end;
$$;

-- 3. approve_sighting → mark live + create/match the dog (admin only).
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

  select * into v_dog from dogs
  where haversine_m(s.lat, s.lng, lat, lng) <= 200
  order by haversine_m(s.lat, s.lng, lat, lng) limit 1;

  if found then
    update dogs set
      last_seen       = greatest(last_seen, s.created_at),
      sightings_count = sightings_count + 1,
      status          = case when v_needs_help then v_status else status end,
      needs_help      = needs_help or v_needs_help,
      name            = coalesce(name, s.nickname),
      cover_photo     = coalesce(cover_photo, s.photo_url),
      trust_score     = least(99, (trust_score + s.trust_score) / 2 + 2)
    where id = v_dog.id returning * into v_dog;
  else
    insert into dogs (name, zone, lat, lng, status, cover_photo, is_friendly,
                      needs_help, trust_score, sightings_count, first_seen, last_seen)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url, v_friendly,
            v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
    returning * into v_dog;
  end if;

  update sightings set status = 'live', dog_id = v_dog.id where id = p_sighting_id;
  return json_build_object('ok', true, 'dog_id', v_dog.id, 'sighting_id', p_sighting_id);
end;
$$;

create or replace function reject_sighting(p_sighting_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from sightings where id = p_sighting_id and status = 'pending';
  return found;
end;
$$;

-- 4. delete_sighting → handle pending (no dog) and live sightings.
create or replace function delete_sighting(p_sighting_id uuid, p_owner_hash text)
returns boolean language plpgsql security definer set search_path = public as $$
declare s sightings; v_count int;
begin
  select * into s from sightings
  where id = p_sighting_id and owner_hash is not null and owner_hash = p_owner_hash;
  if not found then return false; end if;

  delete from sightings where id = p_sighting_id;

  if s.dog_id is not null then
    select count(*) into v_count from sightings where dog_id = s.dog_id and status = 'live';
    if v_count = 0 then
      delete from dogs where id = s.dog_id;
    else
      update dogs set sightings_count = v_count,
        last_seen = (select max(created_at) from sightings
                     where dog_id = s.dog_id and status = 'live')
      where id = s.dog_id;
    end if;
  end if;
  return true;
end;
$$;

-- 5. Only LIVE sightings are publicly readable.
drop policy if exists sightings_read on sightings;
create policy sightings_read on sightings for select using (status = 'live');

-- 6. Grants.
grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text)
  to anon, authenticated, service_role;
grant execute on function delete_sighting(uuid,text) to anon, authenticated, service_role;
grant execute on function approve_sighting(uuid) to service_role;
grant execute on function reject_sighting(uuid)  to service_role;
