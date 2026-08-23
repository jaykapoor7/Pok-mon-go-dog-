-- ════════════════════════════════════════════════════════════════
-- Feeding zones ← organisations. Lets partner NGOs create and manage feeding
-- zones from their dashboard, attributed to their org, while still appearing on
-- the public feeding board for volunteers to sign up. Depends on:
-- feeding-zones.sql, partner-onboarding.sql (my_ngo). Idempotent.
-- ════════════════════════════════════════════════════════════════
alter table feeding_zones add column if not exists ngo_id uuid;

-- Re-declare the public view with ngo_id appended (kept last so CREATE OR
-- REPLACE accepts it).
create or replace view feeding_zone_public as
select
  fz.id, fz.name, fz.description, fz.zone, fz.lat, fz.lng, fz.photo_url,
  fz.created_by_id, fz.created_by_name, fz.created_at, fz.last_fed_at,
  (select count(*) from feeding_zone_volunteers v where v.feeding_zone_id = fz.id) as volunteer_count,
  fz.ngo_id
from feeding_zones fz;

grant select on feeding_zone_public to anon, authenticated, service_role;

-- Create a feeding zone owned by the caller's organisation.
create or replace function create_org_feeding_zone(
  p_name text, p_description text default null, p_zone text default null,
  p_lat double precision default null, p_lng double precision default null, p_photo_url text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Only partner organisations can add org feeding zones.'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required.'; end if;
  if p_lat is null or p_lng is null then raise exception 'A location is required.'; end if;
  insert into feeding_zones (name, description, zone, lat, lng, photo_url, created_by_id, ngo_id)
  values (btrim(p_name), nullif(btrim(coalesce(p_description,'')), ''), nullif(btrim(coalesce(p_zone,'')), ''),
          p_lat, p_lng, p_photo_url, auth.uid(), v_ngo)
  returning id into v_id;
  return v_id;
end;
$$;

-- This org's feeding zones (for the dashboard).
create or replace function my_org_feeding_zones()
returns table(id uuid, name text, description text, zone text, lat double precision, lng double precision,
              photo_url text, last_fed_at timestamptz, created_at timestamptz, volunteer_count bigint)
language sql security definer set search_path = public stable as $$
  select fz.id, fz.name, fz.description, fz.zone, fz.lat, fz.lng, fz.photo_url, fz.last_fed_at, fz.created_at,
         (select count(*) from feeding_zone_volunteers v where v.feeding_zone_id = fz.id)
  from feeding_zones fz
  where fz.ngo_id = my_ngo()
  order by fz.created_at desc;
$$;

grant execute on function create_org_feeding_zone(text,text,text,double precision,double precision,text) to authenticated;
grant execute on function my_org_feeding_zones() to authenticated;
