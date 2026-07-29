-- ════════════════════════════════════════════════════════════════
-- StrayPaw — feeding zones + volunteer feeding rotations.
--
-- Run ONCE in the Supabase SQL editor (idempotent). Lets the community mark
-- an existing feeding spot (a corner, a colony, a market backside) on the map,
-- sign up to cover it on specific days, and check in when they've fed it —
-- independent of individual dog profiles (a zone usually feeds several dogs).
-- ════════════════════════════════════════════════════════════════

-- 1. Feeding zones (map points). Reporting one is open like sightings — actor
--    is optional so a guest can add one; signing in just lets you manage it
--    later from another device (same convention as sightings/report).
create table if not exists feeding_zones (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  zone            text,                     -- locality/city label
  lat             double precision not null,
  lng             double precision not null,
  photo_url       text,
  created_by_id   uuid,
  created_by_name text,
  created_at      timestamptz not null default now(),
  last_fed_at     timestamptz
);
create index if not exists feeding_zones_geo_idx on feeding_zones (lat, lng);
create index if not exists feeding_zones_created_idx on feeding_zones (created_at desc);

-- 2. Volunteers covering a zone — a day-of-week rotation. One row per person
--    per zone (re-signing up updates their days/contact instead of duplicating).
create table if not exists feeding_zone_volunteers (
  id              uuid primary key default gen_random_uuid(),
  feeding_zone_id uuid not null references feeding_zones(id) on delete cascade,
  user_id         uuid not null,
  user_name       text not null,
  contact         text,                     -- phone/email; kept out of public reads
  days            text[] not null default '{}', -- subset of mon,tue,wed,thu,fri,sat,sun
  created_at      timestamptz not null default now(),
  unique (feeding_zone_id, user_id)
);
create index if not exists feeding_zone_volunteers_zone_idx on feeding_zone_volunteers (feeding_zone_id);

-- 3. Check-ins — a lightweight "fed today" log + activity trail.
create table if not exists feeding_zone_checkins (
  id              uuid primary key default gen_random_uuid(),
  feeding_zone_id uuid not null references feeding_zones(id) on delete cascade,
  actor_id        uuid,
  actor_name      text,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists feeding_zone_checkins_zone_idx on feeding_zone_checkins (feeding_zone_id, created_at desc);

-- 4. Public read views. `contact` (phone/email) is deliberately never exposed
--    to anon/authenticated — only service_role (the moderation panel) can read
--    the base table's contact column; everyone else gets the safe view below.
create or replace view feeding_zone_public as
select
  fz.id, fz.name, fz.description, fz.zone, fz.lat, fz.lng, fz.photo_url,
  fz.created_by_id, fz.created_by_name, fz.created_at, fz.last_fed_at,
  (select count(*) from feeding_zone_volunteers v where v.feeding_zone_id = fz.id) as volunteer_count
from feeding_zones fz;

create or replace view feeding_zone_volunteer_public as
select id, feeding_zone_id, user_id, user_name, days, created_at
from feeding_zone_volunteers;

-- ════════════════════════════════════════════════════════════════
-- Functions (SECURITY DEFINER; writes are validated server-side)
-- ════════════════════════════════════════════════════════════════

create or replace function create_feeding_zone(
  p_name        text,
  p_description text default null,
  p_zone        text default null,
  p_lat         double precision default null,
  p_lng         double precision default null,
  p_photo_url   text default null,
  p_actor_id    uuid default null,
  p_actor_name  text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A name is required.';
  end if;
  if p_lat is null or p_lng is null then
    raise exception 'A location is required.';
  end if;
  insert into feeding_zones (name, description, zone, lat, lng, photo_url,
                            created_by_id, created_by_name)
  values (btrim(p_name), nullif(btrim(coalesce(p_description,'')), ''),
          nullif(btrim(coalesce(p_zone,'')), ''), p_lat, p_lng, p_photo_url,
          p_actor_id, p_actor_name)
  returning id into v_id;
  return v_id;
end;
$$;

-- Sign up (or update your existing sign-up) to feed a zone on given days.
-- Requires being signed in (auth.uid() must match the actor) so you can manage
-- or withdraw your slot later from any device.
create or replace function volunteer_for_feeding_zone(
  p_zone_id  uuid,
  p_actor_id uuid,
  p_actor_name text,
  p_contact  text default null,
  p_days     text[] default '{}'
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    return false;
  end if;
  insert into feeding_zone_volunteers (feeding_zone_id, user_id, user_name, contact, days)
  values (p_zone_id, p_actor_id, p_actor_name, nullif(btrim(coalesce(p_contact,'')), ''), p_days)
  on conflict (feeding_zone_id, user_id) do update
    set user_name = excluded.user_name,
        contact   = coalesce(excluded.contact, feeding_zone_volunteers.contact),
        days      = excluded.days;
  return true;
end;
$$;

-- Withdraw your own feeding slot.
create or replace function withdraw_feeding_volunteer(p_zone_id uuid, p_actor_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    return false;
  end if;
  delete from feeding_zone_volunteers
  where feeding_zone_id = p_zone_id and user_id = p_actor_id;
  return found;
end;
$$;

-- "Fed it today" check-in — any signed-in volunteer, bumps last_fed_at.
create or replace function checkin_feeding_zone(
  p_zone_id uuid, p_actor_id uuid, p_actor_name text, p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into feeding_zone_checkins (feeding_zone_id, actor_id, actor_name, note)
  values (p_zone_id, p_actor_id, p_actor_name, nullif(btrim(coalesce(p_note,'')), ''));
  update feeding_zones set last_fed_at = now() where id = p_zone_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security.
--   • feeding_zones / feeding_zone_checkins: public read (no sensitive data).
--   • feeding_zone_volunteers: RLS locked with NO select policy for
--     anon/authenticated — combined with revoking table-level SELECT below,
--     this keeps `contact` (phone/email) unreadable by anyone but the service
--     role. The public app reads volunteers only via the safe view.
-- ════════════════════════════════════════════════════════════════
alter table feeding_zones           enable row level security;
alter table feeding_zone_volunteers enable row level security;
alter table feeding_zone_checkins   enable row level security;

drop policy if exists feeding_zones_read on feeding_zones;
create policy feeding_zones_read on feeding_zones for select using (true);

drop policy if exists feeding_zone_checkins_read on feeding_zone_checkins;
create policy feeding_zone_checkins_read on feeding_zone_checkins for select using (true);

-- No select policy on feeding_zone_volunteers for anon/authenticated on
-- purpose; also revoke any default table grant so a direct client query can't
-- read `contact` even if a future policy is added carelessly.
revoke select on feeding_zone_volunteers from anon, authenticated;

grant select on feeding_zone_public, feeding_zone_volunteer_public to anon, authenticated, service_role;
grant execute on function create_feeding_zone(text,text,text,double precision,double precision,text,uuid,text)
  to anon, authenticated, service_role;
grant execute on function volunteer_for_feeding_zone(uuid,uuid,text,text,text[]) to authenticated;
grant execute on function withdraw_feeding_volunteer(uuid,uuid) to authenticated;
grant execute on function checkin_feeding_zone(uuid,uuid,text,text) to anon, authenticated, service_role;
