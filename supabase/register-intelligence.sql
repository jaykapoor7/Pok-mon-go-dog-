-- ════════════════════════════════════════════════════════════════
-- StrayPaw, register intelligence: place and facts.
--
-- WHAT THIS IS FOR
--
-- The map, the analytics and the dashboards all ask the same questions of
-- the register: where is this, what kind of problem was it, what happened
-- to it, how fast did work start, and how reliable is each of those
-- answers. Until now each screen worked those out for itself, in the
-- browser, from free text, after downloading every row. This file answers
-- them once, in the database, as plain columns — so a screen can ask for
-- the answer instead of the text.
--
-- WHAT IT ADDS (nothing is removed, renamed or overwritten)
--
--   place   dogs/cases:  district, state, city (from the Census 2011
--           district boundaries already loaded into `wards`), and h3_r8,
--           the H3 cell every screen uses as its unit of place. H3 has
--           no Postgres extension on this project, so the cell is written
--           by the application; here it is only cleared when a position
--           changes, so a stale cell can never survive a move.
--
--   facts   cases: condition_class, status_class, closure_reason,
--           intake_channel, first_action_at, resolved_at_source.
--
--   views   public_spatial_animals, public_case_facts, public_care_facts,
--           public_sighting_facts (anon; no free text, no names, no
--           contact details, positions no finer than the existing 0.01°)
--           and org_case_facts (security invoker; an organisation's own
--           cases under its own RLS).
--
-- THE TWO RULES THE FACTS KEEP
--
-- 1. The original record is never edited. Every fact is derived from text
--    that stays exactly where it was; a fact nobody can derive is null,
--    and null is shown as "not recorded", never as zero.
--
-- 2. A date the import had to assume is labelled as assumed. 1,463
--    imported cases were marked resolved on the day they were opened
--    because the workbook has no resolution date. resolved_at_source
--    says so, and time-to-resolution analytics leave those rows out.
--
-- Safe to run any number of times. Triggers never block a write: any
-- failure inside them is swallowed and the row is saved without the
-- derived value.
-- Depends on: RUN-ALL-MIGRATIONS.sql, RUN-PILOT-MIGRATIONS.sql, the
-- district boundary files (for the place backfill).
-- ════════════════════════════════════════════════════════════════

-- ── 1. Columns ──────────────────────────────────────────────────────

alter table public.dogs      add column if not exists h3_r8    text;
alter table public.dogs      add column if not exists district text;
alter table public.dogs      add column if not exists state    text;

alter table public.cases     add column if not exists h3_r8    text;
alter table public.cases     add column if not exists city     text;
alter table public.cases     add column if not exists district text;
alter table public.cases     add column if not exists state    text;
alter table public.cases     add column if not exists location_precision text;

alter table public.sightings add column if not exists h3_r8    text;

alter table public.cases add column if not exists condition_class    text;
alter table public.cases add column if not exists status_class       text;
alter table public.cases add column if not exists closure_reason     text;
alter table public.cases add column if not exists intake_channel     text;
alter table public.cases add column if not exists first_action_at    timestamptz;
alter table public.cases add column if not exists resolved_at_source text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cases_status_class_check') then
    alter table public.cases add constraint cases_status_class_check
      check (status_class is null or status_class in ('open','in_progress','closed','no_action','other_ngo','not_attended'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cases_closure_reason_check') then
    alter table public.cases add constraint cases_closure_reason_check
      check (closure_reason is null or closure_reason in ('could_not_locate','died','recovered','caller_unreachable','other_ngo','duplicate','not_attended','other','unspecified'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cases_intake_channel_check') then
    alter table public.cases add constraint cases_intake_channel_check
      check (intake_channel is null or intake_channel in ('own_line','partner_org','individual','team_found','resident_report','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cases_resolved_at_source_check') then
    alter table public.cases add constraint cases_resolved_at_source_check
      check (resolved_at_source is null or resolved_at_source in ('recorded','import_derived','import_assumed'));
  end if;
end $$;

create index if not exists dogs_h3_r8_idx      on public.dogs (h3_r8);
create index if not exists cases_h3_r8_idx     on public.cases (h3_r8);
create index if not exists sightings_h3_r8_idx on public.sightings (h3_r8);
create index if not exists dogs_city_idx       on public.dogs (city);
create index if not exists cases_city_idx      on public.cases (city);

-- ── 2. Place ────────────────────────────────────────────────────────
--
-- The district a point falls in, from the Census 2011 boundaries. The
-- city is the district, except where one city spans several districts
-- (Delhi's eleven) or the census name is not the one people use.

create or replace function public.sp_place_of(p_lat double precision, p_lng double precision)
returns table (city text, district text, state text)
language sql stable
set search_path = public
as $$
  select
    case
      when w.state = 'NCT of Delhi' then 'Delhi'
      when w.ward_name in ('Bangalore', 'Bangalore Urban', 'Bengaluru Urban') then 'Bengaluru'
      else w.ward_name
    end,
    w.ward_name,
    case when w.state = 'NCT of Delhi' then 'Delhi' else w.state end
  from wards w
  where w.level = 'district'
    and p_lat between -90 and 90 and p_lng between -180 and 180
    and not (p_lat = 0 and p_lng = 0)
    and ST_Contains(w.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))
  limit 1
$$;

-- ── 3. Facts ────────────────────────────────────────────────────────
--
-- Condition. A port of rescueCategory() in src/lib/rescue-taxonomy.ts,
-- which remains the reading the product uses in the browser; the two are
-- kept in step by scripts/test-register-facts.ts. Order matters: the
-- first match wins, exactly as it does there.

create or replace function public.sp_condition_class(p text)
returns text
language plpgsql immutable
as $$
declare t text := lower(coalesce(p, ''));
begin
  if btrim(t) = '' then return null; end if;
  if t ~ '\y(rta|road traffic|road accident|vehicle hit|accident)\y' or t ~ 'hit by (a )?(car|bike|vehicle)' then return 'Road accident'; end if;
  if t ~ '\ymaggot' then return 'Maggot wound'; end if;
  if t ~ '\ytvt\y' then return 'TVT'; end if;
  if t ~ '\y(skin|mange|dermat|itch|hair loss)\y' then return 'Skin & mange'; end if;
  if t ~ '\y(dog bite|bite wound|bitten by|animal bite)\y' then return 'Dog bite'; end if;
  if t ~ '\y(tumou?r|cancer|growth)\y' then return 'Tumour'; end if;
  if t ~ '\y(cd|distemper)\y' then return 'Distemper (CD)'; end if;
  if t ~ '\y(plastic|bottle|rim|wire trap|metal wire|wire|trap|stuck|entangle)' then return 'Entrapment'; end if;
  if t ~ '\y(human abuse|abuse|cruel|beaten|attack by people)\y' then return 'Human abuse'; end if;
  if t ~ '\y(rabies|rabid)\y' and t !~ '\y(arv|vaccin)' then return 'Suspected rabies'; end if;
  if t ~ '\y(eye|blind|vision)' then return 'Eye condition'; end if;
  if t ~ '\y(ear infection|aural|ear issue|hematoma|haematoma)' then return 'Ear condition'; end if;
  if t ~ '\y(minor injury|minor wound)\y' then return 'Minor injury'; end if;
  if t ~ '\y(abc|sterili[sz]|spay|neuter)' then return 'Sterilisation (ABC)'; end if;
  if t ~ '\y(arv|vaccin)' then return 'Vaccination (ARV)'; end if;
  if t ~ '\yparvo' then return 'Parvo'; end if;
  if t ~ '\yprolapse' then return 'Prolapse'; end if;
  if t ~ '\y(tick fever|ticks?)\y' then return 'Tick-borne'; end if;
  if t ~ '\y(abandon|pet abandoned)' then return 'Abandonment'; end if;
  if t ~ '\y(fracture|broken bone|paraly[sz]|mobility)' then return 'Fracture & mobility'; end if;
  if t ~ '\y(wound|injury|injured|cut|bleed|lacerat)' then return 'Other wound or injury'; end if;
  if t ~ '\y(unknown|uknown|unkown)\y' then return 'Not recorded'; end if;
  return 'Other';
end $$;

-- Status, in the register's own vocabulary. The imported workbook's
-- Status column is richer than the case enum (it distinguishes "closed"
-- from "closed with no action"), so where it exists it wins.
create or replace function public.sp_status_class(p_status text, p_register_status text, p_closure_reason text)
returns text
language plpgsql immutable
as $$
declare r text := lower(regexp_replace(coalesce(p_register_status, ''), '[\s_-]+', ' ', 'g'));
declare s text := lower(coalesce(p_status, ''));
begin
  if r ~ 'no action' then return 'no_action'; end if;
  if r ~ 'not attended' then return 'not_attended'; end if;
  if r ~ '(other ngo|another ngo|taken by|transferred)' then return 'other_ngo'; end if;
  if r ~ '^(in ?progress|assigned)$' then return 'in_progress'; end if;
  if r ~ '^(open|new|unverified)$' then return 'open'; end if;
  if r ~ '^(closed|completed|resolved|released|adoption|adopted|foster|fostered)$' then return 'closed'; end if;
  if s in ('resolved', 'closed') then
    if p_closure_reason = 'other_ngo' then return 'other_ngo'; end if;
    if p_closure_reason = 'not_attended' then return 'not_attended'; end if;
    if p_closure_reason is not null then return 'no_action'; end if;
    return 'closed';
  end if;
  if s in ('in_progress', 'assigned') then return 'in_progress'; end if;
  if s = 'unverified' then return 'open'; end if;
  return null;
end $$;

-- Why a request closed without field action, read from the progress notes.
create or replace function public.sp_closure_reason(p text)
returns text
language plpgsql immutable
as $$
declare t text := lower(coalesce(p, ''));
begin
  if btrim(t) = '' then return null; end if;
  if t ~ '(could ?n.?o?t|unable to|cannot|can.?t) (locate|find|trace|catch|capture)' or t ~ '(not found|not located|missing|escaped|ran away|run away)' then return 'could_not_locate'; end if;
  if t ~ '\y(died|dead|death|passed away|expired|no more)\y' then return 'died'; end if;
  if t ~ '\y(recovered|healed|fine now|doing (well|fine|good)|better now|self.?healed)' then return 'recovered'; end if;
  if t ~ '(not reachable|unreachable|no response|not respond|switched off|not picking|didn.?t pick|no answer)' then return 'caller_unreachable'; end if;
  if t ~ '(other ngo|another ngo|blue cross|spca|pfa|taken by|transferred)' then return 'other_ngo'; end if;
  if t ~ '\yduplicate' then return 'duplicate'; end if;
  return null;
end $$;

-- Who brought the request in. The workbook's "Call via" column names a
-- person or an organisation; only the kind of channel is kept here, and
-- the name stays in the private import row it came from.
create or replace function public.sp_intake_channel(p_call_via text, p_org_name text)
returns text
language plpgsql immutable
as $$
declare t text := lower(btrim(coalesce(p_call_via, '')));
declare first_token text;
declare org text := lower(coalesce(p_org_name, ''));
begin
  if t = '' then return null; end if;
  if t ~ '\y(found by team|team found|^team$)' or t = 'team' then return 'team_found'; end if;
  first_token := (regexp_match(t, '([a-z]{2,})'))[1];
  if first_token is null then return 'other'; end if;
  if length(first_token) >= 5 and org <> '' and position(left(first_token, 6) in org) > 0 then return 'own_line'; end if;
  if first_token in ('has', 'spca', 'pfa', 'bluecross', 'blue', 'hsi', 'ngo') then return 'partner_org'; end if;
  return 'individual';
end $$;

-- First action: the first date written in the workbook's Rescue Plan
-- column ("12-Jan-", "12-Jan", "Jan 12", "12/01"), in the year of the
-- request, rolled into the next year when the plan falls in January for a
-- December request. Anything earlier than the request, or more than a
-- year after it, is not a first action and stays null.
create or replace function public.sp_first_action_at(p_plan text, p_event timestamptz)
returns timestamptz
language plpgsql immutable
as $$
declare m text[];
declare d int; declare mo int; declare y int;
declare months text[] := array['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
declare candidate date;
begin
  if p_plan is null or p_event is null then return null; end if;
  m := regexp_match(p_plan, '(\d{1,2})\s*[-/. ]\s*([A-Za-z]{3,9})');
  if m is not null then
    d := m[1]::int; mo := array_position(months, lower(left(m[2], 3)));
  else
    m := regexp_match(p_plan, '([A-Za-z]{3,9})\s+(\d{1,2})');
    if m is not null then
      d := m[2]::int; mo := array_position(months, lower(left(m[1], 3)));
    else
      m := regexp_match(p_plan, '(\d{1,2})\s*[-/.]\s*(\d{1,2})');
      if m is null then return null; end if;
      d := m[1]::int; mo := m[2]::int;
    end if;
  end if;
  if mo is null or mo < 1 or mo > 12 or d < 1 or d > 31 then return null; end if;
  y := extract(year from p_event)::int;
  begin
    candidate := make_date(y, mo, d);
  exception when others then return null;
  end;
  if candidate < p_event::date - 60 then
    begin candidate := make_date(y + 1, mo, d); exception when others then return null; end;
  end if;
  if candidate < p_event::date or candidate > p_event::date + 365 then return null; end if;
  return candidate::timestamptz;
end $$;

-- ── 4. Triggers: keep place and facts current on every write ───────

create or replace function public.sp_dogs_place()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p record;
begin
  begin
    if tg_op = 'UPDATE' and (new.lat is distinct from old.lat or new.lng is distinct from old.lng)
       and new.h3_r8 is not distinct from old.h3_r8 then
      new.h3_r8 := null;
    end if;
    if new.lat is not null and new.lng is not null and (
         tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng or new.district is null) then
      select * into p from public.sp_place_of(new.lat, new.lng);
      if found then
        new.district := p.district; new.state := p.state;
        if new.city is null or btrim(new.city) = ''
           or (tg_op = 'UPDATE' and (new.lat is distinct from old.lat or new.lng is distinct from old.lng)) then
          new.city := p.city;
        end if;
      end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists dogs_sp_place on public.dogs;
create trigger dogs_sp_place before insert or update of lat, lng, city, district on public.dogs
  for each row execute function public.sp_dogs_place();

create or replace function public.sp_cases_facts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p record;
declare n jsonb := coalesce(new.source_metadata -> 'normalized', '{}'::jsonb);
declare text_for_condition text;
begin
  begin
    if tg_op = 'UPDATE' and (new.lat is distinct from old.lat or new.lng is distinct from old.lng)
       and new.h3_r8 is not distinct from old.h3_r8 then
      new.h3_r8 := null;
    end if;
    if new.lat is not null and new.lng is not null and (
         tg_op = 'INSERT' or new.lat is distinct from old.lat or new.lng is distinct from old.lng or new.district is null) then
      select * into p from public.sp_place_of(new.lat, new.lng);
      if found then new.city := p.city; new.district := p.district; new.state := p.state; end if;
    end if;
    if new.location_precision is null then
      new.location_precision := case when new.provenance = 'imported_historical_record' then 'approximate' else 'exact' end;
    end if;

    text_for_condition := coalesce(nullif(btrim(new.condition_text), ''), nullif(btrim(n ->> 'condition'), ''),
                                   nullif(btrim(concat_ws(' ', new.title, new.description)), ''), new.category::text);
    new.condition_class := public.sp_condition_class(text_for_condition);

    if new.closure_reason is null and (
         lower(coalesce(n ->> 'status', '')) ~ '(no action|not attended|other ngo|taken by)') then
      new.closure_reason := coalesce(
        public.sp_closure_reason(concat_ws(' ', n ->> 'status', n ->> 'treatment_update', n ->> 'case_detail', new.outcome_note)),
        case when lower(coalesce(n ->> 'status', '')) ~ 'other ngo|taken by' then 'other_ngo'
             when lower(coalesce(n ->> 'status', '')) ~ 'not attended' then 'not_attended'
             else 'unspecified' end);
    end if;
    new.status_class := public.sp_status_class(new.status::text, n ->> 'status', new.closure_reason);

    if new.first_action_at is null and n ? 'rescue_plan' then
      new.first_action_at := public.sp_first_action_at(n ->> 'rescue_plan', coalesce(new.source_event_at, new.created_at));
    end if;

    if new.resolved_at is null then
      new.resolved_at_source := null;
    elsif new.provenance = 'imported_historical_record' then
      new.resolved_at_source := case
        when new.resolved_at::date = coalesce(new.source_event_at, new.created_at)::date then 'import_assumed'
        else 'import_derived' end;
    elsif new.resolved_at_source is null or new.resolved_at_source <> 'recorded' then
      new.resolved_at_source := 'recorded';
    end if;

    if new.intake_channel is null and new.provenance is distinct from 'imported_historical_record' then
      new.intake_channel := case when new.created_by_id is null then 'resident_report' else 'own_line' end;
    end if;
  exception when others then null;
  end;
  return new;
end $$;

drop trigger if exists cases_sp_facts on public.cases;
create trigger cases_sp_facts before insert or update on public.cases
  for each row execute function public.sp_cases_facts();

create or replace function public.sp_sightings_place()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and (new.lat is distinct from old.lat or new.lng is distinct from old.lng)
     and new.h3_r8 is not distinct from old.h3_r8 then
    new.h3_r8 := null;
  end if;
  return new;
end $$;

drop trigger if exists sightings_sp_place on public.sightings;
create trigger sightings_sp_place before update of lat, lng on public.sightings
  for each row execute function public.sp_sightings_place();

-- ── 5. Backfill ─────────────────────────────────────────────────────
--
-- Touching a row fires its trigger, which derives everything above. The
-- intake channel needs the private import row, so it is joined here once.

update public.dogs d set district = p.district, state = p.state, city = coalesce(nullif(btrim(d.city), ''), p.city)
from (
  select d2.id, pl.city, pl.district, pl.state
  from public.dogs d2
  cross join lateral public.sp_place_of(d2.lat, d2.lng) pl
  where d2.district is null and d2.lat is not null and d2.lng is not null
) p
where p.id = d.id;

update public.cases c set updated_at = c.updated_at where c.status_class is null or c.district is null;

update public.cases c set intake_channel = public.sp_intake_channel(r.raw_row ->> 'Call via', n.name)
from public.import_rows r, public.ngos n
where r.imported_case_id = c.id and n.id = c.ngo_id and c.intake_channel is null;

-- ── 6. Public views ─────────────────────────────────────────────────
--
-- The same projection rules as public_animal_profiles: positions at 0.01°
-- (about 1.1 km), no free text, no names of reporters or callers, no
-- contact details. h3_r8 is a 0.74 km² cell, no finer than the rounding.

create or replace view public.public_spatial_animals as
select
  d.id,
  d.h3_r8,
  case when d.lat between -90 and 90 and d.lng between -180 and 180 and not (d.lat = 0 and d.lng = 0)
       then round(d.lat::numeric, 2)::double precision end as lat,
  case when d.lat between -90 and 90 and d.lng between -180 and 180 and not (d.lat = 0 and d.lng = 0)
       then round(d.lng::numeric, 2)::double precision end as lng,
  d.city, d.district, d.state, d.zone,
  coalesce(d.location_precision, 'approximate') as location_precision,
  case when d.provenance = 'community_report' then 'resident' else 'field' end as source,
  d.name, d.code, d.straypaw_id, d.species, d.cover_photo,
  d.status::text as status, d.needs_help,
  d.sterilisation_status, d.vaccination_status, d.ear_notch,
  d.first_seen, d.last_seen, d.sightings_count, d.ngo_id
from public.dogs d
where not coalesce(d.is_demo, false);

create or replace view public.public_case_facts as
select
  c.id, c.dog_id, c.ngo_id,
  coalesce(c.h3_r8, d.h3_r8) as h3_r8,
  coalesce(c.city, d.city) as city, coalesce(c.district, d.district) as district, c.zone,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.condition_class, c.status_class, c.closure_reason, c.intake_channel,
  c.severity::text as severity,
  case when c.first_action_at is not null
       then greatest(0, (c.first_action_at::date - coalesce(c.source_event_at, c.created_at)::date)) end as first_action_days,
  case when c.resolved_at_source in ('recorded') and c.resolved_at is not null
       then greatest(0, (c.resolved_at::date - coalesce(c.source_event_at, c.created_at)::date)) end as resolved_days,
  c.resolved_at_source,
  c.resolved_at,
  case when c.provenance = 'imported_historical_record' then 'field' else 'resident' end as source,
  coalesce(f.done, 0) as followups_done,
  coalesce(f.missed, 0) as followups_missed,
  coalesce(f.upcoming, 0) as followups_upcoming
from public.cases c
left join public.dogs d on d.id = c.dog_id
left join lateral (
  select count(*) filter (where status = 'done') as done,
         count(*) filter (where status = 'missed') as missed,
         count(*) filter (where status = 'upcoming') as upcoming
  from public.animal_followups a where a.case_id = c.id
) f on true
where not coalesce(c.is_demo, false);

create or replace view public.public_care_facts as
select
  m.id, m.dog_id, m.case_id, m.kind, m.event_date,
  d.h3_r8, d.city, d.district
from public.medical_events m
join public.dogs d on d.id = m.dog_id
where not coalesce(m.is_demo, false) and not coalesce(d.is_demo, false);

create or replace view public.public_sighting_facts as
select
  s.id, s.dog_id, s.created_at,
  s.h3_r8,
  round(s.lat::numeric, 2)::double precision as lat,
  round(s.lng::numeric, 2)::double precision as lng,
  coalesce(d.city, null) as city,
  s.sterilisation_status, s.vaccination_status,
  (s.photo_url is not null and s.photo_url <> '') as has_photo
from public.sightings s
left join public.dogs d on d.id = s.dog_id
where not coalesce(s.is_demo, false)
  and s.status = 'live';

revoke all on public.public_spatial_animals, public.public_case_facts, public.public_care_facts, public.public_sighting_facts from anon, authenticated;
grant select on public.public_spatial_animals, public.public_case_facts, public.public_care_facts, public.public_sighting_facts to anon, authenticated, service_role;

-- ── 7. The organisation's own cases, under its own RLS ─────────────

create or replace view public.org_case_facts with (security_invoker = true) as
select
  c.id, c.dog_id, c.ngo_id, c.case_code, c.title, c.zone,
  coalesce(c.h3_r8, d.h3_r8) as h3_r8,
  coalesce(c.city, d.city) as city, coalesce(c.district, d.district) as district,
  c.lat, c.lng, c.location_precision,
  coalesce(c.source_event_at, c.created_at) as occurred_at,
  c.status::text as status, c.stage, c.severity::text as severity,
  c.condition_class, c.status_class, c.closure_reason, c.intake_channel,
  c.first_action_at, c.resolved_at, c.resolved_at_source,
  c.assignee_id, c.assignee_name, c.last_activity_at, c.follow_up_at, c.next_action,
  c.provenance, c.species,
  d.name as animal_name, d.straypaw_id, d.cover_photo,
  coalesce(f.done, 0) as followups_done,
  coalesce(f.missed, 0) as followups_missed,
  coalesce(f.upcoming, 0) as followups_upcoming,
  f.next_due
from public.cases c
left join public.dogs d on d.id = c.dog_id
left join lateral (
  select count(*) filter (where status = 'done') as done,
         count(*) filter (where status = 'missed') as missed,
         count(*) filter (where status = 'upcoming') as upcoming,
         min(due_at) filter (where status = 'upcoming') as next_due
  from public.animal_followups a where a.case_id = c.id
) f on true;

revoke all on public.org_case_facts from anon, authenticated;
grant select on public.org_case_facts to authenticated, service_role;

-- ── 8. Writing the H3 cell (service role only) ─────────────────────
--
-- The application computes cells with h3-js from exact coordinates and
-- writes them through this function. It is not callable by anon or by
-- signed-in users: only the server, with the service role.

create or replace function public.sp_set_cells(p_table text, p_ids uuid[], p_cells text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n integer := 0;
begin
  if p_table = 'dogs' then
    update public.dogs d set h3_r8 = x.cell from unnest(p_ids, p_cells) as x(id, cell) where d.id = x.id;
  elsif p_table = 'cases' then
    update public.cases c set h3_r8 = x.cell from unnest(p_ids, p_cells) as x(id, cell) where c.id = x.id;
  elsif p_table = 'sightings' then
    update public.sightings s set h3_r8 = x.cell from unnest(p_ids, p_cells) as x(id, cell) where s.id = x.id;
  else
    raise exception 'unknown table %', p_table;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.sp_set_cells(text, uuid[], text[]) from public, anon, authenticated;
grant execute on function public.sp_set_cells(text, uuid[], text[]) to service_role;

-- Rows still waiting for a cell, with exact coordinates: service role only.
create or replace function public.sp_rows_without_cells(p_limit integer default 2000)
returns table (tbl text, id uuid, lat double precision, lng double precision)
language sql
security definer
set search_path = public
as $$
  (select 'dogs', d.id, d.lat, d.lng from public.dogs d
    where d.h3_r8 is null and d.lat is not null and d.lng is not null and not (d.lat = 0 and d.lng = 0) limit p_limit)
  union all
  (select 'cases', c.id, c.lat, c.lng from public.cases c
    where c.h3_r8 is null and c.lat is not null and c.lng is not null and not (c.lat = 0 and c.lng = 0) limit p_limit)
  union all
  (select 'sightings', s.id, s.lat, s.lng from public.sightings s
    where s.h3_r8 is null and s.lat is not null and s.lng is not null and not (s.lat = 0 and s.lng = 0) limit p_limit)
$$;

revoke all on function public.sp_rows_without_cells(integer) from public, anon, authenticated;
grant execute on function public.sp_rows_without_cells(integer) to service_role;

-- Every helper here is internal. The facts functions are pure and harmless,
-- but nothing outside the database has a reason to call them.
revoke all on function public.sp_place_of(double precision, double precision) from public, anon, authenticated;
revoke all on function public.sp_condition_class(text) from public, anon, authenticated;
revoke all on function public.sp_status_class(text, text, text) from public, anon, authenticated;
revoke all on function public.sp_closure_reason(text) from public, anon, authenticated;
revoke all on function public.sp_intake_channel(text, text) from public, anon, authenticated;
revoke all on function public.sp_first_action_at(text, timestamptz) from public, anon, authenticated;
revoke all on function public.sp_dogs_place() from public, anon, authenticated;
revoke all on function public.sp_cases_facts() from public, anon, authenticated;
revoke all on function public.sp_sightings_place() from public, anon, authenticated;

select
  (select count(*) from public.dogs where district is not null) as dogs_placed,
  (select count(*) from public.cases where status_class is not null) as cases_with_facts,
  (select count(*) from public.cases where first_action_at is not null) as cases_with_first_action,
  (select count(*) from public.cases where intake_channel is not null) as cases_with_intake;
