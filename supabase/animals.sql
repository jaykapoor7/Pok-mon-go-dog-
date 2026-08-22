-- ════════════════════════════════════════════════════════════════
-- Animals registry (Phase 1) — make `dogs` a real org-owned, longitudinal
-- animal record (not just community map dogs). An Animal is the long-term
-- entity; Cases are episodes attached to it.
--
-- Depends on: schema.sql (dogs), partner-onboarding.sql (my_ngo, is_ngo_member),
-- platform-foundation.sql (dogs.species). Additive + idempotent.
-- ════════════════════════════════════════════════════════════════

alter table dogs add column if not exists ngo_id        uuid;   -- owning org (null = community dog)
alter table dogs add column if not exists code          text;   -- org's animal id, e.g. DDS-00421
alter table dogs add column if not exists assignee_id   uuid;   -- responsible field worker
alter table dogs add column if not exists assignee_name text;
alter table dogs add column if not exists intake_notes  text;

create index if not exists dogs_ngo_idx on dogs (ngo_id) where ngo_id is not null;

-- Create an org-owned animal record (verified member).
create or replace function create_animal(
  p_name         text default null,
  p_species      text default 'dog',
  p_code         text default null,
  p_zone         text default null,
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_cover_photo  text default null,
  p_intake_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a partner organization'; end if;
  insert into dogs (name, species, zone, lat, lng, status, cover_photo,
                    ngo_id, code, intake_notes)
  values (p_name, coalesce(p_species,'dog'), coalesce(p_zone,''),
          coalesce(p_lat, 0), coalesce(p_lng, 0), 'seen', coalesce(p_cover_photo,''),
          v_ngo, p_code, p_intake_notes)
  returning id into v_id;
  return v_id;
end $$;

-- Update an animal your org owns (details, code, location, assignee, status).
create or replace function update_animal(
  p_id            uuid,
  p_name          text default null,
  p_code          text default null,
  p_zone          text default null,
  p_intake_notes  text default null,
  p_assignee_id   uuid default null,
  p_assignee_name text default null,
  p_status        dog_status default null,
  p_cover_photo   text default null
) returns boolean language plpgsql security definer set search_path = public as $$
begin
  update dogs set
    name         = coalesce(p_name, name),
    code         = coalesce(p_code, code),
    zone         = coalesce(p_zone, zone),
    intake_notes = coalesce(p_intake_notes, intake_notes),
    assignee_id  = coalesce(p_assignee_id, assignee_id),
    assignee_name= coalesce(p_assignee_name, assignee_name),
    status       = coalesce(p_status, status),
    cover_photo  = coalesce(p_cover_photo, cover_photo),
    last_seen    = now()
  where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function create_animal(text,text,text,text,double precision,double precision,text,text) to authenticated;
grant execute on function update_animal(uuid,text,text,text,text,uuid,text,dog_status,text) to authenticated;
