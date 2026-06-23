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
  created_at    timestamptz default now()
);
create index if not exists sightings_dog_idx on sightings (dog_id);
create index if not exists sightings_created_idx on sightings (created_at desc);

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
-- Matches the new sighting to a nearby dog (within ~200 m) or creates a new
-- dog profile, inserts the sighting, and updates the dog's aggregates.
-- Returns the affected dog row.
-- ════════════════════════════════════════════════════════════════
create or replace function report_sighting(
  p_photo_url     text,
  p_lat           float,
  p_lng           float,
  p_zone          text,
  p_nickname      text default null,
  p_mood_tags     text[] default '{}',
  p_notes         text default null,
  p_reporter_name text default null
)
returns dogs
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
begin
  -- Derive status / flags from mood tags.
  if 'injured' = any(p_mood_tags) then
    v_status := 'injured'; v_needs_help := true;
  elsif 'hungry' = any(p_mood_tags) then
    v_status := 'hungry'; v_needs_help := true;
  end if;
  v_friendly := 'friendly' = any(p_mood_tags) or not ('shy' = any(p_mood_tags));

  -- Trust score for this sighting (0–100).
  v_trust := least(100, 40
    + 20                                              -- has photo (always)
    + case when coalesce(p_notes,'') <> '' then 10 else 0 end
    + case when coalesce(p_nickname,'') <> '' then 8 else 0 end
    + 12);

  -- Try to match an existing dog within 200 m.
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
                         nickname, mood_tags, notes, trust_score)
  values (v_dog.id, p_reporter_name, p_photo_url, p_lat, p_lng, p_zone,
          p_nickname, p_mood_tags, p_notes, v_trust);

  return v_dog;
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
  update dogs set feed_count = feed_count + 1, last_seen = now() where id = p_dog_id;
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
                          from sightings where reporter_name is not null)
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

-- Public read everywhere.
do $$
declare t text;
begin
  foreach t in array array['dogs','sightings','feed_events','vaccinations',
                           'sterilisations','comments','ngos']
  loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- Direct writes are blocked; all writes flow through the functions above.
-- Grant execution of those functions to the anonymous (and authed) roles.
grant execute on function report_sighting(text,float,float,text,text,text[],text,text) to anon, authenticated;
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
