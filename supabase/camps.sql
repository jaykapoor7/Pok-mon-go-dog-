-- ════════════════════════════════════════════════════════════════
-- Veterinary camps (Phase 2 — field) — DDS plans camps across villages.
-- A lightweight planning entity: where, when, status.
-- Depends on: partner-onboarding.sql (my_ngo). Idempotent.
-- ════════════════════════════════════════════════════════════════

create table if not exists vet_camps (
  id            uuid primary key default gen_random_uuid(),
  ngo_id        uuid,
  name          text not null,
  village       text,
  district      text,
  lat           double precision,
  lng           double precision,
  camp_date     date,
  status        text not null default 'planned', -- planned | done | cancelled
  notes         text,
  created_by_id uuid,
  created_at    timestamptz not null default now()
);
create index if not exists vet_camps_ngo_idx on vet_camps (ngo_id);

alter table vet_camps enable row level security;
drop policy if exists vet_camps_read on vet_camps;
create policy vet_camps_read on vet_camps for select using (true);

create or replace function create_vet_camp(
  p_name text, p_village text default null, p_district text default null,
  p_lat double precision default null, p_lng double precision default null,
  p_camp_date date default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a partner organization'; end if;
  insert into vet_camps (ngo_id, name, village, district, lat, lng, camp_date, notes, created_by_id)
  values (v_ngo, p_name, p_village, p_district, p_lat, p_lng, p_camp_date, p_notes, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function set_vet_camp_status(p_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update vet_camps set status = p_status where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function create_vet_camp(text,text,text,double precision,double precision,date,text) to authenticated;
grant execute on function set_vet_camp_status(uuid,text) to authenticated;
