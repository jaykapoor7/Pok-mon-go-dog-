-- ════════════════════════════════════════════════════════════════
-- Surveys / census (Phase 3) — a reusable field-survey capability.
-- An organization defines a survey, divides it into areas (wards/villages),
-- and field workers collect geo-tagged observations against those areas.
--
-- Generic on purpose: supports the CUPA Bengaluru ward census and any future
-- census/survey, not hardcoded to one org.
-- Depends on: partner-onboarding.sql (my_ngo, is_ngo_member).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

create table if not exists surveys (
  id            uuid primary key default gen_random_uuid(),
  ngo_id        uuid,
  title         text not null,
  species       text not null default 'dog',
  description   text,
  status        text not null default 'active', -- active | closed
  created_by_id uuid,
  created_at    timestamptz not null default now()
);

create table if not exists survey_areas (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references surveys(id) on delete cascade,
  name         text not null,       -- "Ward 12 — Jayanagar"
  code         text,                -- ward/village code
  target_count int,                 -- optional expected animals/observations
  status       text not null default 'pending', -- pending | active | done
  created_at   timestamptz not null default now()
);
create index if not exists survey_areas_survey_idx on survey_areas (survey_id);

create table if not exists survey_responses (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  area_id     uuid references survey_areas(id) on delete set null,
  lat         double precision,
  lng         double precision,
  photo_url   text,
  species     text,
  count       int not null default 1,
  attributes  jsonb not null default '{}'::jsonb, -- sex, age, sterilised, notch …
  notes       text,
  recorded_by uuid,
  created_at  timestamptz not null default now()
);
create index if not exists survey_responses_survey_idx on survey_responses (survey_id);
create index if not exists survey_responses_area_idx on survey_responses (area_id);

alter table surveys          enable row level security;
alter table survey_areas     enable row level security;
alter table survey_responses enable row level security;

-- Census data is meant to be shared/analysed → public read; writes via RPC only.
drop policy if exists surveys_read on surveys;
create policy surveys_read on surveys for select using (true);
drop policy if exists survey_areas_read on survey_areas;
create policy survey_areas_read on survey_areas for select using (true);
drop policy if exists survey_responses_read on survey_responses;
create policy survey_responses_read on survey_responses for select using (true);

-- Create a survey (verified org member; stamped to their org).
create or replace function create_survey(p_title text, p_species text default 'dog', p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a partner organization'; end if;
  insert into surveys (ngo_id, title, species, description, created_by_id)
  values (v_ngo, p_title, coalesce(p_species,'dog'), p_description, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Add an area to a survey the caller's org owns.
create or replace function add_survey_area(p_survey_id uuid, p_name text, p_code text default null, p_target int default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not exists (select 1 from surveys where id = p_survey_id and ngo_id = my_ngo()) then
    raise exception 'Not your survey';
  end if;
  insert into survey_areas (survey_id, name, code, target_count)
  values (p_survey_id, p_name, p_code, p_target)
  returning id into v_id;
  return v_id;
end $$;

-- Submit a field observation. Field workers are org members (any role).
create or replace function submit_survey_response(
  p_survey_id uuid,
  p_area_id   uuid default null,
  p_lat       double precision default null,
  p_lng       double precision default null,
  p_photo_url text default null,
  p_species   text default null,
  p_count     int default 1,
  p_attributes jsonb default '{}'::jsonb,
  p_notes     text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_ngo_member() then raise exception 'Not a field worker'; end if;
  insert into survey_responses (survey_id, area_id, lat, lng, photo_url, species, count, attributes, notes, recorded_by)
  values (p_survey_id, p_area_id, p_lat, p_lng, p_photo_url, p_species, greatest(1, coalesce(p_count,1)), coalesce(p_attributes,'{}'::jsonb), p_notes, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

grant execute on function create_survey(text,text,text) to authenticated;
grant execute on function add_survey_area(uuid,text,text,int) to authenticated;
grant execute on function submit_survey_response(uuid,uuid,double precision,double precision,text,text,int,jsonb,text) to authenticated;
