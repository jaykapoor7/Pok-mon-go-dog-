-- Read-only catalog snapshot of the existing case classifier, 2026-10-27.
CREATE OR REPLACE FUNCTION public.sp_cases_facts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    if new.status_reviewed_at is null and new.closure_reason is null and (
         lower(coalesce(n ->> 'status', '')) ~ '(no action|not attended|other ngo|taken by)') then
      new.closure_reason := coalesce(
        public.sp_closure_reason(concat_ws(' ', n ->> 'status', n ->> 'treatment_update', n ->> 'case_detail', new.outcome_note)),
        case when lower(coalesce(n ->> 'status', '')) ~ 'other ngo|taken by' then 'other_ngo'
             when lower(coalesce(n ->> 'status', '')) ~ 'not attended' then 'not_attended'
             else 'unspecified' end);
    end if;
    new.status_class := public.sp_status_class(
      new.status::text,
      case when new.status_reviewed_at is null then n ->> 'status' end,
      new.closure_reason);

    if new.first_action_at is null and n ? 'rescue_plan' then
      new.first_action_at := public.sp_first_action_at(n ->> 'rescue_plan', coalesce(new.source_event_at, new.created_at));
    end if;

    if new.resolved_at is null then
      new.resolved_at_source := null;
    elsif new.provenance = 'imported_historical_record' and nullif(btrim(coalesce(new.after_url, '')), '') is null then
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
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_closure_reason(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_condition_class(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_first_action_at(p_plan text, p_event timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
end $function$
;

CREATE OR REPLACE FUNCTION public.sp_status_class(p_status text, p_register_status text, p_closure_reason text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
end $function$
;

create trigger careos_fixture_case_facts before insert or update on public.cases for each row execute function public.sp_cases_facts();


grant select on public.dogs,public.animal_followups to authenticated;
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
  f.next_due,
  c.status_reviewed_at as reviewed_at
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

