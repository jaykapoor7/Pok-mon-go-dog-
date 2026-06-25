-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — accounts: let signed-in users own, edit and manage
-- their sightings and a dog's care status from any device.
--
-- Run this ONCE in the Supabase SQL editor on an existing project (it is
-- idempotent). Anonymous posting is preserved: sightings reported without a
-- signed-in account simply have user_id = NULL and keep using the per-device
-- ownership token (delete_sighting) exactly as before.
--
-- Sign-in uses Supabase Auth (email magic link) — no extra provider setup
-- needed; the built-in email provider works out of the box.
-- ════════════════════════════════════════════════════════════════

-- 1. Link a sighting to the account that reported it (NULL for anonymous).
alter table sightings
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists sightings_user_id_idx on sightings (user_id);

-- 2. report_sighting → also store the reporter's account id (when signed in).
--    Return type/signature changes, so drop the old one and recreate.
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
  p_owner_hash    text default null,
  p_user_id       uuid default null
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
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status, user_id)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash,
          'pending', p_user_id)
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null, 'sighting_id', v_sighting,
    'status', 'pending', 'trust_score', v_trust);
end;
$$;

-- 3. update_my_sighting → a signed-in user edits the details of their own
--    sighting. auth.uid() is taken from the caller's JWT, so it can only ever
--    touch rows they own.
create or replace function update_my_sighting(
  p_sighting_id uuid,
  p_nickname    text,
  p_mood_tags   text[],
  p_notes       text
)
returns boolean language plpgsql security definer set search_path = public as $$
declare s sightings;
begin
  if auth.uid() is null then return false; end if;

  update sightings set
    nickname  = nullif(btrim(coalesce(p_nickname, '')), ''),
    mood_tags = coalesce(p_mood_tags, mood_tags),
    notes     = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_sighting_id and user_id = auth.uid()
  returning * into s;

  if not found then return false; end if;

  -- If this sighting is already attached to a dog, keep the nickname in sync
  -- when the dog has no name of its own yet.
  if s.dog_id is not null and s.nickname is not null then
    update dogs set name = coalesce(name, s.nickname) where id = s.dog_id;
  end if;
  return true;
end;
$$;

-- 4. delete_my_sighting → account-owned delete (mirrors delete_sighting's
--    dog-aggregate cleanup, but authorises by auth.uid() instead of a token).
create or replace function delete_my_sighting(p_sighting_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare s sightings; v_count int;
begin
  if auth.uid() is null then return false; end if;

  select * into s from sightings where id = p_sighting_id and user_id = auth.uid();
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

-- 5. update_dog_status → a signed-in contributor (someone who has reported a
--    sighting attached to this dog) can update its care status.
create or replace function update_dog_status(
  p_dog_id     uuid,
  p_status     dog_status,
  p_needs_help boolean,
  p_vaccinated boolean,
  p_sterilised boolean,
  p_is_friendly boolean
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;

  -- must have contributed at least one sighting for this dog
  if not exists (
    select 1 from sightings where dog_id = p_dog_id and user_id = auth.uid()
  ) then
    return false;
  end if;

  update dogs set
    status      = coalesce(p_status, status),
    needs_help  = coalesce(p_needs_help, needs_help),
    vaccinated  = coalesce(p_vaccinated, vaccinated),
    sterilised  = coalesce(p_sterilised, sterilised),
    is_friendly = coalesce(p_is_friendly, is_friendly)
  where id = p_dog_id;
  return found;
end;
$$;

-- 6. A signed-in user can read their OWN sightings even while pending
--    (so "My sightings" and their own pin show up before approval). Public
--    visibility is otherwise unchanged: only live rows.
drop policy if exists sightings_read on sightings;
create policy sightings_read on sightings
  for select using (status = 'live' or user_id = auth.uid());

-- 7. Grants.
grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text,uuid)
  to anon, authenticated, service_role;
grant execute on function update_my_sighting(uuid,text,text[],text) to authenticated;
grant execute on function delete_my_sighting(uuid) to authenticated;
grant execute on function update_dog_status(uuid,dog_status,boolean,boolean,boolean,boolean)
  to authenticated;
