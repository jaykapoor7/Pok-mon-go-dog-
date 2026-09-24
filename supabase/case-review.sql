-- ════════════════════════════════════════════════════════════════
-- CASE REVIEW: a person decides, never a timer.
--
-- A case left open for months is usually finished work nobody closed —
-- 128 imported cases have been "in progress" for more than ninety days.
-- The organisation reviews them at /partner/review and records one of:
--
--   still_active      the work is real and ongoing: noted, clock reset
--   closed_done       the work was completed
--   closed_no_action  it closed without field action, and why
--   other_ngo         another organisation took it
--   set_reason        (already closed without action) record why
--
-- Nothing is ever closed automatically. Each decision is written to the
-- case's own history with who made it and when.
--
-- The original record is untouched. The imported register status stays in
-- source_metadata; once a person has reviewed a case, status_reviewed_at
-- makes the LIVE status the one its facts are derived from — otherwise
-- the trigger would re-read the workbook's "in progress" and undo the
-- review on the next update.
--
-- A reviewed closure does not invent a resolution date. resolved_at stays
-- as it was (usually empty), so time-to-resolution never counts it; the
-- register shows the case open until the day it was reviewed.
--
-- Additive, and safe to re-run.
-- Depends on: register-intelligence.sql.
-- ════════════════════════════════════════════════════════════════

alter table public.cases add column if not exists status_reviewed_at timestamptz;

-- ── 1. The facts trigger honours a review ───────────────────────────
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

    if new.status_reviewed_at is null and new.closure_reason is null and (
         lower(coalesce(n ->> 'status', '')) ~ '(no action|not attended|other ngo|taken by)') then
      new.closure_reason := coalesce(
        public.sp_closure_reason(concat_ws(' ', n ->> 'status', n ->> 'treatment_update', n ->> 'case_detail', new.outcome_note)),
        case when lower(coalesce(n ->> 'status', '')) ~ 'other ngo|taken by' then 'other_ngo'
             when lower(coalesce(n ->> 'status', '')) ~ 'not attended' then 'not_attended'
             else 'unspecified' end);
    end if;
    -- A person's review outranks the workbook it was imported from.
    new.status_class := public.sp_status_class(
      new.status::text,
      case when new.status_reviewed_at is null then n ->> 'status' end,
      new.closure_reason);

    if new.first_action_at is null and n ? 'rescue_plan' then
      new.first_action_at := public.sp_first_action_at(n ->> 'rescue_plan', coalesce(new.source_event_at, new.created_at));
    end if;

    if new.resolved_at is null then
      new.resolved_at_source := null;
    -- An imported date stays an imported date. A person who later closes an
    -- imported case through the proof flow (which requires an after photo,
    -- which no import carries) records a real date.
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
end $$;

revoke all on function public.sp_cases_facts() from public, anon, authenticated;

-- ── 2. The views carry the review date (appended, so the replace is safe) ──
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
  coalesce(f.upcoming, 0) as followups_upcoming,
  c.status_reviewed_at as reviewed_at
from public.cases c
left join public.dogs d on d.id = c.dog_id
left join lateral (
  select count(*) filter (where status = 'done') as done,
         count(*) filter (where status = 'missed') as missed,
         count(*) filter (where status = 'upcoming') as upcoming
  from public.animal_followups a where a.case_id = c.id
) f on true
where not coalesce(c.is_demo, false);

grant select on public.public_case_facts to anon, authenticated;

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

-- ── 3. The review itself ─────────────────────────────────────────────
create or replace function public.review_case(
  p_case_id uuid,
  p_decision text,
  p_actor_name text,
  p_closure_reason text default null,
  p_note text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c cases;
  v_reason text;
  v_label text;
  v_class text;
begin
  if auth.uid() is null or my_ngo() is null then
    return json_build_object('ok', false, 'error', 'Organisation access required.');
  end if;
  select * into c from cases where id = p_case_id and ngo_id = my_ngo();
  if not found then
    return json_build_object('ok', false, 'error', 'Case not found in your organisation.');
  end if;
  if p_decision not in ('still_active', 'closed_done', 'closed_no_action', 'other_ngo', 'set_reason') then
    return json_build_object('ok', false, 'error', 'Unknown decision.');
  end if;

  if p_decision in ('still_active', 'closed_done', 'closed_no_action', 'other_ngo')
     and coalesce(c.status_class, '') not in ('open', 'in_progress') then
    return json_build_object('ok', false, 'error', 'This case is not open.');
  end if;

  if p_decision in ('closed_no_action', 'set_reason') then
    v_reason := nullif(btrim(coalesce(p_closure_reason, '')), '');
    if v_reason is null or v_reason not in ('could_not_locate', 'died', 'recovered', 'caller_unreachable', 'duplicate', 'not_attended', 'other') then
      return json_build_object('ok', false, 'error', 'Choose why it closed without field action.');
    end if;
    if v_reason = 'other' and nullif(btrim(coalesce(p_note, '')), '') is null then
      return json_build_object('ok', false, 'error', 'Say what happened when the reason is "other".');
    end if;
  end if;

  if p_decision = 'set_reason' and coalesce(c.status_class, '') not in ('no_action', 'not_attended') then
    return json_build_object('ok', false, 'error', 'Only a case closed without field action takes a reason.');
  end if;

  v_label := case p_decision
    when 'still_active' then 'Reviewed: still active'
    when 'closed_done' then 'Reviewed: closed, the work was completed'
    when 'closed_no_action' then 'Reviewed: closed without field action (' || replace(v_reason, '_', ' ') || ')'
    when 'other_ngo' then 'Reviewed: closed, another organisation took it'
    else 'Reviewed: reason recorded (' || replace(v_reason, '_', ' ') || ')' end
    || coalesce('. ' || nullif(btrim(coalesce(p_note, '')), ''), '');

  if p_decision = 'still_active' then
    update cases set last_activity_at = now(), updated_at = now() where id = c.id;
    insert into case_updates (case_id, actor_id, actor_name, type, note)
      values (c.id, auth.uid(), nullif(btrim(p_actor_name), ''), 'note', v_label);
  elsif p_decision = 'set_reason' then
    -- Only the reason changes: the case closed when it closed, so this does
    -- not count as the review that closed it.
    update cases set closure_reason = v_reason, last_activity_at = now(), updated_at = now()
      where id = c.id;
    insert into case_updates (case_id, actor_id, actor_name, type, note)
      values (c.id, auth.uid(), nullif(btrim(p_actor_name), ''), 'note', v_label);
  else
    update cases set
        status = 'closed',
        closure_reason = case p_decision when 'closed_done' then null when 'other_ngo' then 'other_ngo' else v_reason end,
        status_reviewed_at = now(),
        last_activity_at = now(), updated_at = now()
      where id = c.id;
    insert into case_updates (case_id, actor_id, actor_name, type, from_status, to_status, note)
      values (c.id, auth.uid(), nullif(btrim(p_actor_name), ''), 'status_changed', c.status, 'closed', v_label);
  end if;

  select status_class into v_class from cases where id = c.id;
  return json_build_object('ok', true, 'status_class', v_class);
end $$;

revoke all on function public.review_case(uuid, text, text, text, text) from public, anon;
grant execute on function public.review_case(uuid, text, text, text, text) to authenticated;
