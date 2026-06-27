-- ════════════════════════════════════════════════════════════════
-- StrayPaw — RUN-ALL migrations (idempotent).
--
-- Paste this WHOLE file into the Supabase SQL editor and run it ONCE.
-- It is safe to re-run: every statement uses create-or-replace / if-not-exists,
-- and it never deletes your data (the only deletes are inside RPC bodies).
--
-- After running, also make yourself a partner NGO (exact pins + merge powers):
--   insert into ngo_members (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL_HERE'
--   on conflict do nothing;
-- ════════════════════════════════════════════════════════════════


-- ┌──────────────────────────────────────────────────────────────
-- │ schema.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — production schema (no-login / anonymous model)
--
-- Paste this whole file into the Supabase SQL editor and Run.
-- It is idempotent — safe to run again after edits.
--
-- Design:
--   • Anyone can post a sighting with NO login (the public `anon` key).
--   • Writes go through SECURITY DEFINER functions so the rules stay safe
--     while the multi-table "create-or-match dog + insert sighting" stays
--     atomic.
--   • Reads are public (it's a community map).
--   • Stats are computed from real rows — they start at your real numbers
--     and grow as people use the app.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────
do $$ begin
  create type dog_status as enum ('seen','hungry','injured','sterilised','vaccinated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sterilisation_status as enum ('scheduled','completed');
exception when duplicate_object then null; end $$;

-- ── NGOs (partner list) ─────────────────────────────────────────
create table if not exists ngos (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  area        text,
  logo_url    text,
  dogs_helped int default 0,
  verified    boolean default false,
  created_at  timestamptz default now()
);

-- ── Dogs (aggregated profiles) ──────────────────────────────────
create table if not exists dogs (
  id              uuid primary key default uuid_generate_v4(),
  name            text,
  zone            text,
  lat             double precision not null,
  lng             double precision not null,
  status          dog_status default 'seen',
  cover_photo     text,
  size            text default 'medium',
  color           text default 'Brown',
  is_friendly     boolean default true,
  needs_help      boolean default false,
  sterilised      boolean default false,
  vaccinated      boolean default false,
  trust_score     int default 50,
  sightings_count int default 1,
  feed_count      int default 0,
  first_seen      timestamptz default now(),
  last_seen       timestamptz default now(),
  last_fed_at     timestamptz,
  created_at      timestamptz default now()
);
create index if not exists dogs_geo_idx on dogs (lat, lng);
create index if not exists dogs_status_idx on dogs (status);
create index if not exists dogs_last_seen_idx on dogs (last_seen desc);

-- ── Sightings (raw uploads — the viral layer) ───────────────────
create table if not exists sightings (
  id            uuid primary key default uuid_generate_v4(),
  dog_id        uuid references dogs(id) on delete set null,
  reporter_name text,
  photo_url     text not null,
  lat           double precision not null,
  lng           double precision not null,
  zone          text,
  nickname      text,
  mood_tags     text[] default '{}',
  notes         text,
  trust_score   int default 50,
  likes         int default 0,
  owner_hash    text,            -- SHA-256 of the reporter's local delete token
  status        text not null default 'pending' check (status in ('pending','live')),
  created_at    timestamptz default now()
);
create index if not exists sightings_dog_idx on sightings (dog_id);
create index if not exists sightings_created_idx on sightings (created_at desc);
create index if not exists sightings_status_idx on sightings (status);

-- ── Feed events ─────────────────────────────────────────────────
create table if not exists feed_events (
  id            uuid primary key default uuid_generate_v4(),
  dog_id        uuid references dogs(id) on delete cascade,
  reporter_name text,
  food_type     text,
  created_at    timestamptz default now()
);

-- ── Vaccinations / Sterilisations ───────────────────────────────
create table if not exists vaccinations (
  id              uuid primary key default uuid_generate_v4(),
  dog_id          uuid references dogs(id) on delete cascade,
  vaccine         text not null,
  administered_by text,
  date            date default current_date
);

create table if not exists sterilisations (
  id           uuid primary key default uuid_generate_v4(),
  dog_id       uuid references dogs(id) on delete cascade,
  status       sterilisation_status default 'scheduled',
  performed_by text,
  date         date default current_date
);

-- ── Comments ────────────────────────────────────────────────────
create table if not exists comments (
  id            uuid primary key default uuid_generate_v4(),
  dog_id        uuid references dogs(id) on delete cascade,
  reporter_name text,
  body          text not null,
  created_at    timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
-- Helpers
-- ════════════════════════════════════════════════════════════════

-- Great-circle distance in metres (no PostGIS dependency).
create or replace function haversine_m(lat1 float, lng1 float, lat2 float, lng2 float)
returns float language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Nearby dogs (used by "explore nearby" / future map RPC).
create or replace function dogs_near(p_lat float, p_lng float, radius_m float default 1500)
returns setof dogs language sql stable as $$
  select * from dogs
  where haversine_m(p_lat, p_lng, lat, lng) <= radius_m
  order by haversine_m(p_lat, p_lng, lat, lng);
$$;

-- ════════════════════════════════════════════════════════════════
-- report_sighting — the core write.
-- Inserts the sighting as PENDING and does NOT touch the public `dogs`
-- table. Dog creation / matching happens only when the sighting is approved
-- (see approve_sighting). This keeps unmoderated content fully invisible.
-- ════════════════════════════════════════════════════════════════
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
  v_trust    int;
  v_sighting uuid;
begin
  v_trust := least(100, 40
    + 20                                              -- has photo (always)
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  insert into sightings (dog_id, reporter_name, photo_url, lat, lng, zone,
                         nickname, mood_tags, notes, trust_score, owner_hash,
                         status)
  values (null, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust, p_owner_hash, 'pending')
  returning id into v_sighting;

  return json_build_object(
    'dog_id', null,
    'sighting_id', v_sighting,
    'status', 'pending',
    'trust_score', v_trust
  );
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- approve_sighting — admin action. Marks a pending sighting LIVE and only
-- THEN matches it to a nearby dog (≤200 m) or creates a new dog profile,
-- updating aggregates. Idempotent. Admin-only (granted to service_role).
-- ════════════════════════════════════════════════════════════════
create or replace function approve_sighting(p_sighting_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  s            sightings;
  v_dog        dogs;
  v_status     dog_status := 'seen';
  v_needs_help boolean := false;
  v_friendly   boolean := true;
begin
  select * into s from sightings where id = p_sighting_id;
  if not found then
    return json_build_object('ok', false, 'error', 'not found');
  end if;
  if s.status = 'live' then
    return json_build_object('ok', true, 'already', true, 'dog_id', s.dog_id);
  end if;

  if 'injured' = any(s.mood_tags) then
    v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(s.mood_tags) then
    v_status := 'hungry'; v_needs_help := true;
  end if;
  v_friendly := 'friendly' = any(s.mood_tags) or not ('shy' = any(s.mood_tags));

  select * into v_dog
  from dogs
  where haversine_m(s.lat, s.lng, lat, lng) <= 200
  order by haversine_m(s.lat, s.lng, lat, lng)
  limit 1;

  if found then
    update dogs set
      last_seen       = greatest(last_seen, s.created_at),
      sightings_count = sightings_count + 1,
      status          = case when v_needs_help then v_status else status end,
      needs_help      = needs_help or v_needs_help,
      name            = coalesce(name, s.nickname),
      cover_photo     = coalesce(cover_photo, s.photo_url),
      trust_score     = least(99, (trust_score + s.trust_score) / 2 + 2)
    where id = v_dog.id
    returning * into v_dog;
  else
    insert into dogs (name, zone, lat, lng, status, cover_photo,
                      is_friendly, needs_help, trust_score,
                      sightings_count, first_seen, last_seen)
    values (s.nickname, s.zone, s.lat, s.lng, v_status, s.photo_url,
            v_friendly, v_needs_help, s.trust_score, 1, s.created_at, s.created_at)
    returning * into v_dog;
  end if;

  update sightings set status = 'live', dog_id = v_dog.id where id = p_sighting_id;

  return json_build_object('ok', true, 'dog_id', v_dog.id, 'sighting_id', p_sighting_id);
end;
$$;

-- reject_sighting — admin action. Permanently removes a pending sighting.
create or replace function reject_sighting(p_sighting_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from sightings where id = p_sighting_id and status = 'pending';
  return found;
end;
$$;

-- delete_sighting — token-gated deletion. Verifies the SHA-256 owner hash,
-- deletes the sighting, and keeps the dog's aggregates correct (removing the
-- dog if that was its last sighting).
create or replace function delete_sighting(p_sighting_id uuid, p_owner_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  s       sightings;
  v_count int;
begin
  -- Verify ownership (works for both pending and live sightings).
  select * into s
  from sightings
  where id = p_sighting_id
    and owner_hash is not null
    and owner_hash = p_owner_hash;

  if not found then
    return false;
  end if;

  delete from sightings where id = p_sighting_id;

  -- Only live sightings are linked to a dog; fix that dog's aggregates.
  if s.dog_id is not null then
    select count(*) into v_count
    from sightings where dog_id = s.dog_id and status = 'live';
    if v_count = 0 then
      delete from dogs where id = s.dog_id;
    else
      update dogs set
        sightings_count = v_count,
        last_seen = (select max(created_at) from sightings
                     where dog_id = s.dog_id and status = 'live')
      where id = s.dog_id;
    end if;
  end if;

  return true;
end;
$$;

-- log_feed — "I fed this dog".
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

-- log_seen — "I saw this dog" (bumps last_seen + a sightings tally).
create or replace function log_seen(p_dog_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update dogs set last_seen = now(), sightings_count = sightings_count + 1
  where id = p_dog_id;
end;
$$;

-- add_comment — community note.
create or replace function add_comment(
  p_dog_id uuid, p_body text, p_reporter_name text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into comments (dog_id, reporter_name, body)
  values (p_dog_id, p_body, p_reporter_name);
end;
$$;

-- like_sighting — feed hearts.
create or replace function like_sighting(p_sighting_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update sightings set likes = likes + 1 where id = p_sighting_id;
end;
$$;

-- get_city_stats — honest, real-time counts.
create or replace function get_city_stats()
returns json language sql stable as $$
  select json_build_object(
    'dogsSpotted',     (select count(*) from dogs),
    'dogsFed',         (select count(*) from feed_events),
    'dogsSterilised',  (select count(*) from dogs where sterilised),
    'dogsVaccinated',  (select count(*) from dogs where vaccinated),
    'needsHelp',       (select count(*) from dogs where needs_help),
    'volunteers',      (select count(distinct reporter_name)
                          from sightings
                          where reporter_name is not null and status = 'live')
  );
$$;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table dogs           enable row level security;
alter table sightings      enable row level security;
alter table feed_events    enable row level security;
alter table vaccinations   enable row level security;
alter table sterilisations enable row level security;
alter table comments       enable row level security;
alter table ngos           enable row level security;

-- Public read everywhere (except sightings, handled below).
do $$
declare t text;
begin
  foreach t in array array['dogs','feed_events','vaccinations',
                           'sterilisations','comments','ngos']
  loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- Sightings: only LIVE (moderated) ones are publicly readable. Pending
-- sightings stay invisible until approved. (Owner deletion still works because
-- delete_sighting is SECURITY DEFINER and bypasses this policy.)
drop policy if exists sightings_read on sightings;
create policy sightings_read on sightings for select using (status = 'live');

-- Direct writes are blocked; all writes flow through the functions above.
-- Grant execution of those functions to the anonymous (and authed) roles.
grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text) to anon, authenticated, service_role;
grant execute on function delete_sighting(uuid,text) to anon, authenticated, service_role;
-- Moderation actions are admin-only (called via the protected /api/admin route
-- using the service role). Not granted to anon/authenticated.
grant execute on function approve_sighting(uuid) to service_role;
grant execute on function reject_sighting(uuid)  to service_role;
grant execute on function log_feed(uuid,text,text)   to anon, authenticated;
grant execute on function log_seen(uuid)             to anon, authenticated;
grant execute on function add_comment(uuid,text,text) to anon, authenticated;
grant execute on function like_sighting(uuid)        to anon, authenticated;
grant execute on function get_city_stats()           to anon, authenticated;
grant execute on function dogs_near(float,float,float) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- Storage — public bucket for sighting photos, anon upload allowed.
-- ════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;

drop policy if exists "sightings public read" on storage.objects;
create policy "sightings public read" on storage.objects
  for select using (bucket_id = 'sightings');

drop policy if exists "sightings anon upload" on storage.objects;
create policy "sightings anon upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'sightings');


-- ┌──────────────────────────────────────────────────────────────
-- │ secure-writes.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — lock down sighting creation (defence in depth)
--
-- Run this AFTER you have:
--   1. set SUPABASE_SERVICE_ROLE_KEY in Vercel, and
--   2. set TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY, and
--   3. redeployed.
--
-- It revokes the public (anon) ability to call report_sighting directly, so the
-- ONLY way to create a sighting is through the Turnstile-protected /api/report
-- route (which runs as the service role). Until you run this, the form is still
-- spam-checked by Turnstile — this just closes the "call the RPC directly with
-- the anon key" bypass.
--
-- Safe to skip if you're comfortable with the Turnstile-only protection.
-- ════════════════════════════════════════════════════════════════

revoke execute on function report_sighting(text,float,float,text,text,text[],text,text,text)
  from anon, authenticated;

grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text)
  to service_role;


-- ┌──────────────────────────────────────────────────────────────
-- │ add-moderation.sql
-- └──────────────────────────────────────────────────────────────
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


-- ┌──────────────────────────────────────────────────────────────
-- │ add-deletion.sql
-- └──────────────────────────────────────────────────────────────
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


-- ┌──────────────────────────────────────────────────────────────
-- │ auth-accounts.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — accounts + moderation, consolidated & idempotent.
--
-- Run this ONCE in the Supabase SQL editor. It is safe to run on ANY state of
-- the database (fresh, pre-moderation, or already-migrated): every step guards
-- itself. It sets up:
--   • the `status` (moderation), `owner_hash` (token delete) and `user_id`
--     (accounts) columns on `sightings`
--   • report_sighting / approve_sighting / reject_sighting / delete_sighting
--   • update_my_sighting / delete_my_sighting / update_dog_status (accounts)
--   • the read policy + grants
--
-- Anonymous posting is preserved (those rows simply have user_id = NULL).
-- Sign-in uses Supabase Auth email magic link — no extra provider setup.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────
alter table sightings add column if not exists owner_hash text;
alter table sightings add column if not exists user_id uuid
  references auth.users(id) on delete set null;
alter table sightings add column if not exists status text;

-- Existing rows become 'live' so nothing currently visible disappears.
update sightings set status = 'live' where status is null;
alter table sightings alter column status set default 'pending';
do $$ begin
  alter table sightings add constraint sightings_status_chk
    check (status in ('pending','live'));
exception when duplicate_object then null; end $$;

create index if not exists sightings_status_idx  on sightings (status);
create index if not exists sightings_user_id_idx on sightings (user_id);

-- ── 2. report_sighting → insert as pending, attach account (if signed in) ──
-- Drop any older overloads so we don't end up with an ambiguous function.
drop function if exists report_sighting(text,float,float,text,text,text[],text,text);
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

-- ── 3. approve_sighting → mark live + create/match the dog (admin only) ──
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

-- ── 4. delete_sighting → token-gated (anonymous owners) ──
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

-- ── 5. update_my_sighting → signed-in user edits their own sighting ──
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

  if s.dog_id is not null and s.nickname is not null then
    update dogs set name = coalesce(name, s.nickname) where id = s.dog_id;
  end if;
  return true;
end;
$$;

-- ── 6. delete_my_sighting → account-owned delete (by auth.uid()) ──
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

-- ── 7. update_dog_status → signed-in contributor updates a dog's care status ──
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

-- ── 8. Read policy: public sees LIVE; a signed-in user also sees their own ──
alter table sightings enable row level security;
drop policy if exists sightings_read on sightings;
create policy sightings_read on sightings
  for select using (status = 'live' or user_id = auth.uid());

-- ── 9. Grants ───────────────────────────────────────────────────
grant execute on function report_sighting(text,float,float,text,text,text[],text,text,text,uuid)
  to anon, authenticated, service_role;
grant execute on function delete_sighting(uuid,text) to anon, authenticated, service_role;
grant execute on function approve_sighting(uuid) to service_role;
grant execute on function reject_sighting(uuid)  to service_role;
grant execute on function update_my_sighting(uuid,text,text[],text) to authenticated;
grant execute on function delete_my_sighting(uuid) to authenticated;
grant execute on function update_dog_status(uuid,dog_status,boolean,boolean,boolean,boolean)
  to authenticated;


-- ┌──────────────────────────────────────────────────────────────
-- │ cases.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — NGO operations layer (Phase 1: cases + ownership)
--
-- Additive. Does not touch sightings / dogs / moderation. Run once in the
-- Supabase SQL editor.
--
-- Model:  Dog (continuity, already exists) 1──* Case (operational lifecycle)
--         Case 1──* case_updates (audit trail)
--         Volunteer (lightweight identity; reuses the app's local id)
--
-- Identity is the existing local {id,name}; writes flow through SECURITY
-- DEFINER functions that record who-did-what. "Only the assignee can update"
-- is enforced inside update_case_status.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────
do $$ begin
  create type case_status as enum
    ('unverified','assigned','in_progress','resolved','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_severity as enum ('low','normal','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_category as enum
    ('injury','sterilisation','rescue','vaccination','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_resolution as enum ('sterilized','rescued','treated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_update_type as enum
    ('created','claimed','assigned','status_changed','note','reopened');
exception when duplicate_object then null; end $$;

-- ── Volunteers (lightweight — id generated client-side) ─────────
create table if not exists volunteers (
  id         uuid primary key,
  name       text not null,
  phone      text,
  ngo_id     uuid references ngos(id),
  created_at timestamptz default now()
);

-- ── Cases ───────────────────────────────────────────────────────
create table if not exists cases (
  id               uuid primary key default uuid_generate_v4(),
  dog_id           uuid references dogs(id) on delete set null,
  title            text not null,
  description      text,
  zone             text,
  lat              double precision,
  lng              double precision,
  severity         case_severity default 'normal',
  category         case_category default 'other',
  tags             text[] default '{}',
  status           case_status default 'unverified',
  resolution       case_resolution,
  assignee_id      uuid references volunteers(id),
  assignee_name    text,
  ngo_id           uuid references ngos(id),
  created_by_id    uuid,
  created_by_name  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_activity_at timestamptz default now(),
  due_at           timestamptz
);
create index if not exists cases_status_idx       on cases (status);
create index if not exists cases_assignee_idx      on cases (assignee_id);
create index if not exists cases_activity_idx      on cases (last_activity_at desc);
create index if not exists cases_severity_idx      on cases (severity);
create index if not exists cases_geo_idx           on cases (lat, lng);

-- ── Case updates (audit trail) ─────────────────────────────────
create table if not exists case_updates (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid references cases(id) on delete cascade,
  actor_id    uuid,
  actor_name  text,
  type        case_update_type not null,
  from_status case_status,
  to_status   case_status,
  note        text,
  created_at  timestamptz default now()
);
create index if not exists case_updates_case_idx on case_updates (case_id, created_at);

-- ════════════════════════════════════════════════════════════════
-- Functions (all SECURITY DEFINER; writes are audited)
-- ════════════════════════════════════════════════════════════════

-- Register/refresh a volunteer (called on first operational action).
create or replace function upsert_volunteer(p_id uuid, p_name text, p_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into volunteers (id, name, phone) values (p_id, p_name, p_phone)
  on conflict (id) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, volunteers.phone);
end;
$$;

-- Create a case (status starts 'unverified'); writes the 'created' audit row.
create or replace function create_case(
  p_title       text,
  p_description text default null,
  p_dog_id      uuid default null,
  p_zone        text default null,
  p_lat         float default null,
  p_lng         float default null,
  p_severity    case_severity default 'normal',
  p_category    case_category default 'other',
  p_tags        text[] default '{}',
  p_actor_id    uuid default null,
  p_actor_name  text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into cases (dog_id, title, description, zone, lat, lng, severity,
                     category, tags, status, created_by_id, created_by_name)
  values (p_dog_id, p_title, p_description, p_zone, p_lat, p_lng, p_severity,
          p_category, p_tags, 'unverified', p_actor_id, p_actor_name)
  returning id into v_id;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (v_id, p_actor_id, p_actor_name, 'created', 'unverified', 'Case opened');
  return v_id;
end;
$$;

-- Claim an UNASSIGNED case → becomes the assignee, status → assigned.
create or replace function claim_case(p_case_id uuid, p_actor_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  update cases set
    assignee_id      = p_actor_id,
    assignee_name    = p_actor_name,
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id and assignee_id is null
  returning * into c;

  if not found then return false; end if;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, 'claimed', c.status,
          p_actor_name || ' claimed this case');
  return true;
end;
$$;

-- Reassign a case to another volunteer.
create or replace function assign_case(
  p_case_id uuid, p_assignee_id uuid, p_assignee_name text,
  p_actor_id uuid, p_actor_name text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update cases set
    assignee_id      = p_assignee_id,
    assignee_name    = p_assignee_name,
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, p_actor_id, p_actor_name, 'assigned',
          'Assigned to ' || p_assignee_name);
end;
$$;

-- Update status. Enforces: a case must be claimed, and ONLY the assignee may
-- change its status. Records from/to + an optional note. Handles reopen.
create or replace function update_case_status(
  p_case_id    uuid,
  p_to_status  case_status,
  p_actor_id   uuid,
  p_actor_name text,
  p_resolution case_resolution default null,
  p_note       text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       cases;
  v_type  case_update_type := 'status_changed';
begin
  select * into c from cases where id = p_case_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  if c.assignee_id is null then
    return json_build_object('ok', false, 'error', 'Claim the case before updating it.');
  end if;
  if c.assignee_id <> p_actor_id then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status then
    return json_build_object('ok', false, 'error', 'Case is already in that status.');
  end if;
  if p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'Cannot move a case back to unverified.');
  end if;
  if p_to_status = 'resolved' and p_resolution is null then
    return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- Free-text note on a case (any volunteer; bumps activity so it's not "overdue").
create or replace function add_case_note(
  p_case_id uuid, p_actor_id uuid, p_actor_name text, p_note text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, p_actor_id, p_actor_name, 'note', p_note);
  update cases set last_activity_at = now() where id = p_case_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security — public read (NGO-internal but no auth yet);
-- all writes go through the functions above.
-- ════════════════════════════════════════════════════════════════
alter table volunteers   enable row level security;
alter table cases        enable row level security;
alter table case_updates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['volunteers','cases','case_updates'] loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

grant execute on function upsert_volunteer(uuid,text,text) to anon, authenticated, service_role;
grant execute on function create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text) to anon, authenticated, service_role;
grant execute on function claim_case(uuid,uuid,text) to anon, authenticated, service_role;
grant execute on function assign_case(uuid,uuid,text,uuid,text) to anon, authenticated, service_role;
grant execute on function update_case_status(uuid,case_status,uuid,text,case_resolution,text) to anon, authenticated, service_role;
grant execute on function add_case_note(uuid,uuid,text,text) to anon, authenticated, service_role;


-- ┌──────────────────────────────────────────────────────────────
-- │ colonies-and-proof.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — colonies + before/after proof + response-time timestamps.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Adds the persistence the
-- NGO dashboard's Impact view needs for REAL data:
--   • dogs.colony / dogs.city   → group strays into named colonies (the unit
--     grants and municipal ABC contracts measure).
--   • cases.resolved_at         → flagged → resolved response time (median).
--   • cases.before_url / after_url / outcome_note → before/after outcome proof.
--
-- The app already treats all of these as optional, so nothing breaks before or
-- after running this; it just lets real NGO data populate the same widgets the
-- demo seed does today.
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────
alter table dogs  add column if not exists colony text;
alter table dogs  add column if not exists city   text;
create index if not exists dogs_colony_idx on dogs (colony);

alter table cases add column if not exists resolved_at   timestamptz;
alter table cases add column if not exists before_url     text;
alter table cases add column if not exists after_url      text;
alter table cases add column if not exists outcome_note   text;

-- ── 2. Backfill resolved_at for existing resolved/closed cases ──
-- Prefer the timestamp of the audit row that moved the case to 'resolved';
-- fall back to its last activity.
update cases c
set resolved_at = sub.ts
from (
  select case_id, max(created_at) as ts
  from case_updates
  where to_status = 'resolved'
  group by case_id
) sub
where c.id = sub.case_id and c.resolved_at is null;

update cases
set resolved_at = last_activity_at
where status in ('resolved', 'closed') and resolved_at is null;

-- ── 3. update_case_status → also stamp resolved_at + store proof ──
-- Signature changes (3 new optional params), so drop the old one first to
-- avoid an ambiguous overload, then recreate with the original logic intact.
drop function if exists update_case_status(uuid, case_status, uuid, text, case_resolution, text);

create or replace function update_case_status(
  p_case_id     uuid,
  p_to_status   case_status,
  p_actor_id    uuid,
  p_actor_name  text,
  p_resolution  case_resolution default null,
  p_note        text default null,
  p_before_url  text default null,
  p_after_url   text default null,
  p_outcome_note text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       cases;
  v_type  case_update_type := 'status_changed';
begin
  select * into c from cases where id = p_case_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  if c.assignee_id is null then
    return json_build_object('ok', false, 'error', 'Claim the case before updating it.');
  end if;
  if c.assignee_id <> p_actor_id then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status then
    return json_build_object('ok', false, 'error', 'Case is already in that status.');
  end if;
  if p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'Cannot move a case back to unverified.');
  end if;
  if p_to_status = 'resolved' and p_resolution is null then
    return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    -- Stamp the resolution time on resolve; clear it on reopen so response
    -- time reflects the latest cycle.
    resolved_at      = case when p_to_status = 'resolved' then now()
                            when v_type = 'reopened' then null
                            else resolved_at end,
    -- Persist before/after proof + outcome when supplied (kept if not).
    before_url       = coalesce(p_before_url, before_url),
    after_url        = coalesce(p_after_url, after_url),
    outcome_note     = coalesce(p_outcome_note, outcome_note),
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- ── 4. Grant the new signature ──────────────────────────────────
grant execute on function update_case_status(
  uuid, case_status, uuid, text, case_resolution, text, text, text, text
) to anon, authenticated, service_role;


-- ┌──────────────────────────────────────────────────────────────
-- │ feeding-recency.sql
-- └──────────────────────────────────────────────────────────────
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


-- ┌──────────────────────────────────────────────────────────────
-- │ location-privacy.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — location privacy: exact coordinates for partner NGOs only.
--
-- Run ONCE in the Supabase SQL editor (idempotent).
--
-- Model: the public app already shows only a GENERAL area (coordinates are
-- rounded to ~1km in the read layer — see src/lib/data.ts), so regular users
-- never receive exact pins through the app. This migration adds the privileged
-- path for VERIFIED PARTNER NGOs to read exact coordinates.
--
-- To grant a partner NGO exact access, add their auth user id:
--     insert into ngo_members (user_id) values ('<auth-user-uuid>');
-- (find the id in Supabase → Authentication → Users, or auth.users).
-- ════════════════════════════════════════════════════════════════

-- 1. Who is a partnered-NGO member.
create table if not exists ngo_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  ngo_id     uuid,
  created_at timestamptz not null default now()
);

alter table ngo_members enable row level security;
-- A member may read only their own membership row.
drop policy if exists ngo_members_self on ngo_members;
create policy ngo_members_self on ngo_members
  for select using (user_id = auth.uid());

-- 2. Is the caller a verified partner NGO?
create or replace function is_ngo_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from ngo_members where user_id = auth.uid());
$$;

-- 3. Exact coordinates for a set of dogs — ONLY for NGO members.
--    Returns nothing for everyone else, so it's safe to grant broadly.
create or replace function get_precise_locations(p_ids uuid[])
returns table (id uuid, lat double precision, lng double precision)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_ngo_member() then
    return; -- non-members get an empty set
  end if;
  return query
    select d.id, d.lat, d.lng from dogs d where d.id = any(p_ids);
end;
$$;

-- 4. Grants.
grant execute on function is_ngo_member() to anon, authenticated;
grant execute on function get_precise_locations(uuid[]) to anon, authenticated;


-- ┌──────────────────────────────────────────────────────────────
-- │ merge-dogs.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — merge duplicate dog profiles into one.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Requires the
-- ngo_members table + is_ngo_member() from location-privacy.sql.
--
-- When the SAME dog has been logged as two separate profiles (e.g. sighted far
-- apart on different days), a verified partner NGO can merge them: every
-- sighting / case / record moves onto the kept profile's timeline and the
-- duplicate is removed. Aggregates are recomputed so counts stay correct.
-- ════════════════════════════════════════════════════════════════

create or replace function merge_dogs(p_keep uuid, p_remove uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not is_ngo_member() then return false; end if;
  if p_keep = p_remove or p_keep is null or p_remove is null then return false; end if;
  if not exists (select 1 from dogs where id = p_keep) then return false; end if;
  if not exists (select 1 from dogs where id = p_remove) then return false; end if;

  -- Re-point every child record from the duplicate onto the kept profile.
  update sightings     set dog_id = p_keep where dog_id = p_remove;
  update feed_events   set dog_id = p_keep where dog_id = p_remove;
  update vaccinations  set dog_id = p_keep where dog_id = p_remove;
  update sterilisations set dog_id = p_keep where dog_id = p_remove;
  update comments      set dog_id = p_keep where dog_id = p_remove;
  -- Cases reference a dog too (NGO continuity).
  begin
    update cases set dog_id = p_keep where dog_id = p_remove;
  exception when undefined_table then null; end;

  -- Recompute the kept dog's aggregates from its (now combined) sightings.
  select count(*) into v_count from sightings where dog_id = p_keep and status = 'live';
  update dogs set
    sightings_count = greatest(v_count, 1),
    last_seen = (select max(created_at) from sightings where dog_id = p_keep and status = 'live'),
    feed_count = (select count(*) from feed_events where dog_id = p_keep),
    -- Keep the strongest care status across both.
    needs_help  = needs_help  or (select coalesce(bool_or(needs_help),  false) from dogs where id = p_remove),
    vaccinated  = vaccinated  or (select coalesce(bool_or(vaccinated),  false) from dogs where id = p_remove),
    sterilised  = sterilised  or (select coalesce(bool_or(sterilised),  false) from dogs where id = p_remove),
    name = coalesce(name, (select name from dogs where id = p_remove))
  where id = p_keep;

  delete from dogs where id = p_remove;
  return true;
end;
$$;

grant execute on function merge_dogs(uuid, uuid) to authenticated;


-- ┌──────────────────────────────────────────────────────────────
-- │ helpers.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — "Can you help?" volunteer + NGO sign-ups.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Stores people who offer to
-- help a dog or volunteer, and NGOs registering interest. Submissions are
-- write-only for the public (insert via the RPC); only the service role / your
-- own dashboard reads them.
-- ════════════════════════════════════════════════════════════════

create table if not exists helpers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text not null,           -- phone or email
  message    text,
  is_ngo     boolean not null default false,
  ngo_name   text,
  dog_id     uuid,                     -- set when offering to help a specific dog
  zone       text,
  created_at timestamptz not null default now()
);
create index if not exists helpers_created_idx on helpers (created_at desc);

alter table helpers enable row level security;
-- No public SELECT. (Service role bypasses RLS for your own review/export.)

-- Public submit through a SECURITY DEFINER function (so direct table writes can
-- stay locked down).
create or replace function submit_helper(
  p_name     text,
  p_contact  text,
  p_message  text default null,
  p_is_ngo   boolean default false,
  p_ngo_name text default null,
  p_dog_id   uuid default null,
  p_zone     text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' or coalesce(btrim(p_contact), '') = '' then
    raise exception 'name and contact are required';
  end if;
  insert into helpers (name, contact, message, is_ngo, ngo_name, dog_id, zone)
  values (btrim(p_name), btrim(p_contact), nullif(btrim(coalesce(p_message,'')), ''),
          coalesce(p_is_ngo, false), nullif(btrim(coalesce(p_ngo_name,'')), ''),
          p_dog_id, nullif(btrim(coalesce(p_zone,'')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function submit_helper(text,text,text,boolean,text,uuid,text)
  to anon, authenticated, service_role;


-- ┌──────────────────────────────────────────────────────────────
-- │ case-proofing.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — case proofing & verification.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Depends on:
--   • location-privacy.sql  → is_ngo_member()
--   • colonies-and-proof.sql → cases.before_url/after_url/outcome_note + 9-arg
--     update_case_status
--
-- What this enforces:
--   1. Only VERIFIED partner NGOs (ngo_members) can claim or change a case.
--   2. Resolving a case REQUIRES an after photo + outcome note (proof).
--   3. A fresh resolution is "pending verification" until a StrayPaw admin
--      signs it off (verify_case). Reopening clears verification.
-- ════════════════════════════════════════════════════════════════

-- 1. Verification columns.
alter table cases add column if not exists proof_verified boolean not null default false;
alter table cases add column if not exists verified_at    timestamptz;
create index if not exists cases_verified_idx on cases (proof_verified);

-- 2. Claim — verified partner NGOs only.
create or replace function claim_case(p_case_id uuid, p_actor_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  if not is_ngo_member() then
    raise exception 'Only verified partner NGOs can claim cases.';
  end if;

  update cases set
    assignee_id      = p_actor_id,
    assignee_name    = p_actor_name,
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id and assignee_id is null
  returning * into c;

  if not found then return false; end if;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, 'claimed', c.status,
          p_actor_name || ' claimed this case');
  return true;
end;
$$;

-- 3. Status changes — NGO-only; proof required to resolve; resets verification.
drop function if exists update_case_status(uuid, case_status, uuid, text, case_resolution, text, text, text, text);

create or replace function update_case_status(
  p_case_id     uuid,
  p_to_status   case_status,
  p_actor_id    uuid,
  p_actor_name  text,
  p_resolution  case_resolution default null,
  p_note        text default null,
  p_before_url  text default null,
  p_after_url   text default null,
  p_outcome_note text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       cases;
  v_type  case_update_type := 'status_changed';
begin
  if not is_ngo_member() then
    return json_build_object('ok', false, 'error', 'Only verified partner NGOs can update cases.');
  end if;

  select * into c from cases where id = p_case_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  if c.assignee_id is null then
    return json_build_object('ok', false, 'error', 'Claim the case before updating it.');
  end if;
  if c.assignee_id <> p_actor_id then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status then
    return json_build_object('ok', false, 'error', 'Case is already in that status.');
  end if;
  if p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'Cannot move a case back to unverified.');
  end if;

  -- Proof gate for resolution.
  if p_to_status = 'resolved' then
    if p_resolution is null then
      return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
    end if;
    if coalesce(btrim(coalesce(p_after_url, c.after_url, '')), '') = '' then
      return json_build_object('ok', false, 'error', 'An after photo is required to resolve a case.');
    end if;
    if coalesce(btrim(coalesce(p_outcome_note, c.outcome_note, '')), '') = '' then
      return json_build_object('ok', false, 'error', 'An outcome note is required to resolve a case.');
    end if;
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    resolved_at      = case when p_to_status = 'resolved' then now()
                            when v_type = 'reopened' then null
                            else resolved_at end,
    before_url       = coalesce(p_before_url, before_url),
    after_url        = coalesce(p_after_url, after_url),
    outcome_note     = coalesce(p_outcome_note, outcome_note),
    -- A new resolution is unverified until an admin signs off; reopening clears it.
    proof_verified   = case when p_to_status = 'resolved' then false
                            when v_type = 'reopened' then false
                            else proof_verified end,
    verified_at      = case when p_to_status = 'resolved' or v_type = 'reopened' then null
                            else verified_at end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- 4. Admin verification of a resolved case's outcome proof (service role only).
create or replace function verify_case(p_case_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  select * into c from cases where id = p_case_id;
  if not found then return false; end if;

  update cases set
    proof_verified   = true,
    verified_at      = now(),
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, null, 'StrayPaw admin', 'note', 'Outcome proof verified by StrayPaw.');
  return true;
end;
$$;

-- 5. Grants.
grant execute on function claim_case(uuid,uuid,text) to anon, authenticated, service_role;
grant execute on function update_case_status(
  uuid, case_status, uuid, text, case_resolution, text, text, text, text
) to anon, authenticated, service_role;
grant execute on function verify_case(uuid) to service_role;


-- ┌──────────────────────────────────────────────────────────────
-- │ helpers-acknowledge.sql
-- └──────────────────────────────────────────────────────────────
-- ════════════════════════════════════════════════════════════════
-- StrayPaw — "reached out / acknowledged" flag on Help-form sign-ups.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Lets the moderation panel
-- tick a volunteer/NGO once you've contacted them, without removing the row.
-- Toggled via the service role from /api/admin/helpers (no public access).
-- ════════════════════════════════════════════════════════════════

alter table helpers add column if not exists acknowledged    boolean not null default false;
alter table helpers add column if not exists acknowledged_at timestamptz;

