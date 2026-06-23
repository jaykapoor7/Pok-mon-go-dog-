-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — Supabase schema
--
-- Run in the Supabase SQL editor (or via `supabase db push`). Enables the
-- PostGIS extension for spatial queries and sets up Row Level Security so the
-- viral upload loop is safe to expose publicly.
-- ════════════════════════════════════════════════════════════════

create extension if not exists postgis;
create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────
do $$ begin
  create type dog_status as enum ('seen','hungry','injured','sterilised','vaccinated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sterilisation_status as enum ('scheduled','completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('suggested','merged','rejected');
exception when duplicate_object then null; end $$;

-- ── NGOs ────────────────────────────────────────────────────────
create table if not exists ngos (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  area        text,
  logo_url    text,
  dogs_helped int default 0,
  verified    boolean default false,
  created_at  timestamptz default now()
);

-- ── Users (extends auth.users) ──────────────────────────────────
create table if not exists users (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  avatar_url      text,
  is_ngo          boolean default false,
  ngo_id          uuid references ngos(id),
  sightings_count int default 0,
  trust_level     int default 50 check (trust_level between 0 and 100),
  created_at      timestamptz default now()
);

-- ── Dogs (aggregated profiles) ──────────────────────────────────
create table if not exists dogs (
  id              uuid primary key default uuid_generate_v4(),
  name            text,
  zone            text,
  location        geography(point, 4326),
  status          dog_status default 'seen',
  cover_photo     text,
  size            text,
  color           text,
  is_friendly     boolean default true,
  needs_help      boolean default false,
  sterilised      boolean default false,
  vaccinated      boolean default false,
  trust_score     int default 50,
  sightings_count int default 0,
  feed_count      int default 0,
  first_seen      timestamptz default now(),
  last_seen       timestamptz default now(),
  created_at      timestamptz default now()
);
create index if not exists dogs_location_idx on dogs using gist (location);
create index if not exists dogs_status_idx on dogs (status);

-- ── Sightings (raw uploads — the viral layer) ───────────────────
create table if not exists sightings (
  id          uuid primary key default uuid_generate_v4(),
  dog_id      uuid references dogs(id) on delete set null,
  user_id     uuid references users(id) on delete set null,
  photo_url   text not null,
  location    geography(point, 4326) not null,
  zone        text,
  nickname    text,
  mood_tags   text[] default '{}',
  notes       text,
  trust_score int default 50,
  likes       int default 0,
  created_at  timestamptz default now()
);
create index if not exists sightings_location_idx on sightings using gist (location);
create index if not exists sightings_dog_idx on sightings (dog_id);
create index if not exists sightings_created_idx on sightings (created_at desc);

-- ── Feed events ─────────────────────────────────────────────────
create table if not exists feed_events (
  id         uuid primary key default uuid_generate_v4(),
  dog_id     uuid references dogs(id) on delete cascade,
  user_id    uuid references users(id) on delete set null,
  food_type  text,
  created_at timestamptz default now()
);

-- ── Vaccinations ────────────────────────────────────────────────
create table if not exists vaccinations (
  id              uuid primary key default uuid_generate_v4(),
  dog_id          uuid references dogs(id) on delete cascade,
  vaccine         text not null,
  administered_by text,
  ngo_id          uuid references ngos(id),
  date            date default current_date
);

-- ── Sterilisations ──────────────────────────────────────────────
create table if not exists sterilisations (
  id           uuid primary key default uuid_generate_v4(),
  dog_id       uuid references dogs(id) on delete cascade,
  status       sterilisation_status default 'scheduled',
  performed_by text,
  ngo_id       uuid references ngos(id),
  date         date default current_date
);

-- ── Comments ────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default uuid_generate_v4(),
  dog_id     uuid references dogs(id) on delete cascade,
  user_id    uuid references users(id) on delete set null,
  body       text not null,
  created_at timestamptz default now()
);

-- ── Dog matches (duplicate detection / merge suggestions) ───────
create table if not exists dog_matches (
  id         uuid primary key default uuid_generate_v4(),
  dog_id_a   uuid references dogs(id) on delete cascade,
  dog_id_b   uuid references dogs(id) on delete cascade,
  confidence real check (confidence between 0 and 1),
  reason     text,
  status     match_status default 'suggested',
  created_at timestamptz default now()
);

-- ── Nearby dogs RPC (used by the map / "explore nearby") ────────
create or replace function dogs_near(lat float, lng float, radius_m float default 1500)
returns setof dogs language sql stable as $$
  select * from dogs
  where st_dwithin(location, st_point(lng, lat)::geography, radius_m)
  order by location <-> st_point(lng, lat)::geography;
$$;

-- ── Row Level Security ──────────────────────────────────────────
alter table dogs           enable row level security;
alter table sightings      enable row level security;
alter table feed_events    enable row level security;
alter table vaccinations   enable row level security;
alter table sterilisations enable row level security;
alter table comments       enable row level security;
alter table users          enable row level security;
alter table ngos           enable row level security;
alter table dog_matches    enable row level security;

-- Everything is publicly readable (it's a community map).
do $$
declare t text;
begin
  foreach t in array array['dogs','sightings','feed_events','vaccinations',
                           'sterilisations','comments','ngos','dog_matches']
  loop
    execute format('drop policy if exists %I_public_read on %I;', t, t);
    execute format('create policy %I_public_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- Authenticated users can contribute sightings, feeds and comments.
drop policy if exists sightings_insert on sightings;
create policy sightings_insert on sightings
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists feed_insert on feed_events;
create policy feed_insert on feed_events
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists comments_insert on comments;
create policy comments_insert on comments
  for insert to authenticated with check (auth.uid() = user_id);

-- Users manage their own profile row.
drop policy if exists users_self on users;
create policy users_self on users
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ── Storage bucket for sighting photos ──────────────────────────
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', true)
on conflict (id) do nothing;
