-- Automations follow up (automation matrix rows 4, 7, 14, 15, 18 and 19; docs/rebuild/AUTOMATIONS-AUDIT.md, gap 5).
-- Additive: seven nullable columns on nx_automation_runs and one function; nx_automation_run and nx_automations_tick
-- replaced. No existing row changes.
--   A run that tells people opens a follow-up. A member acknowledges it, saying what is being done, or closes it with
--   the reason (nx_automation_ack). If nobody acknowledges it within the rule's escalate_hours (default 24, 0 turns
--   escalation off), the hourly schedule tells the organisation's admins and leads, once. A later run that finds
--   nothing closes it; a later run that still finds something carries the open clock forward.
-- Rollback: run nx_automation_run from 20261116170000 and nx_automations_tick from 20261116140000; the columns can stay.

alter table public.nx_automation_runs add column if not exists open_since timestamptz;
alter table public.nx_automation_runs add column if not exists acknowledged_by uuid;
alter table public.nx_automation_runs add column if not exists acknowledged_at timestamptz;
alter table public.nx_automation_runs add column if not exists outcome text check (outcome is null or length(outcome) <= 500);
alter table public.nx_automation_runs add column if not exists escalated_at timestamptz;
alter table public.nx_automation_runs add column if not exists resolved_at timestamptz;
alter table public.nx_automation_runs add column if not exists resolved_note text check (resolved_note is null or length(resolved_note) <= 300);
create index if not exists nx_automation_runs_open on public.nx_automation_runs (automation_id) where status = 'succeeded' and resolved_at is null;

create or replace function public.nx_automation_run(p_id uuid, p_now boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a nx_automations; k text; n int := 0; said text := ''; href text; sent int := 0; who uuid[]; v_run uuid; days int; hours int; td date := (now() at time zone 'Asia/Kolkata')::date;
  roles text[]; extra int := 0; u uuid; v_claims text := current_setting('request.jwt.claims', true); v_pat int := 0;
  v_since timestamptz; v_esc timestamptz;
begin
  select * into a from nx_automations where id = p_id for update;
  if a.id is null then raise exception 'Automation not found'; end if;
  if auth.uid() is not null and not nx_automation_manager(a.org_id) then raise exception 'Only a lead or coordinator runs automations.' using errcode = '42501'; end if;
  if a.status <> 'active' and not p_now then return jsonb_build_object('status', 'skipped', 'summary', 'Paused'); end if;
  k := case a.every when 'hour' then to_char(now(), 'YYYY-MM-DD"T"HH24') when 'week' then to_char(td, 'IYYY"-W"IW') else td::text end || case when p_now then ':now:' || floor(extract(epoch from clock_timestamp()))::text else '' end;
  if exists (select 1 from nx_automation_runs where automation_id = a.id and dedupe_key = k and status <> 'failed') then return jsonb_build_object('status', 'skipped', 'summary', 'Already ran for this period'); end if;
  days := greatest(1, least(90, coalesce((a.params->>'days')::int, 3)));
  hours := greatest(1, least(240, coalesce((a.params->>'hours')::int, 24)));
  roles := case a.audience when 'everyone' then null when 'clinical' then array['lead', 'clinician', 'nurse', 'records'] when 'lab' then array['lead', 'lab_scientist'] else array['admin', 'lead', 'coordinator'] end;
  begin
    if a.rule = 'overdue_tasks' then
      select count(*) into n from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td;
      -- Each person hears about their own overdue tasks; leads hear about those overdue for more than the escalation days.
      for u in select distinct assignee_id from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td and assignee_id is not null loop
        insert into nx_notifications (user_id, org_id, kind, title, href) select u, a.org_id, 'reminder', left(count(*) || ' of your tasks ' || case when count(*) = 1 then 'is' else 'are' end || ' overdue', 200), '/ngo/today'
          from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td and assignee_id = u;
        sent := sent + 1;
      end loop;
      select count(*) into extra from nx_tasks where org_id = a.org_id and state = 'open' and due_on < td - days;
      said := n || ' open ' || case when n = 1 then 'task is' else 'tasks are' end || ' overdue' || case when extra > 0 then '; ' || extra || ' for more than ' || days || ' days' else '' end;
      href := '/ngo/today';
      if extra = 0 then roles := array['__nobody__']; end if;
    elsif a.rule = 'followups_due' then
      select count(*) into n from animal_followups f where f.ngo_id = a.org_id and f.status in ('upcoming', 'postponed') and f.due_at < now() + interval '1 day';
      said := n || ' follow-up' || case when n = 1 then ' is' else 's are' end || ' due by tomorrow or overdue'; href := '/ngo/operations';
    elsif a.rule = 'possible_duplicates' then
      select count(*) into n from dogs where ngo_id = a.org_id and identity_state = 'possible_duplicate';
      said := n || ' animal record' || case when n = 1 then ' may be a duplicate' else 's may be duplicates' end || '. A person decides; nothing is merged.'; href := '/ngo/animals';
    elsif a.rule = 'training_due' then
      if to_regclass('public.training_assignments') is not null then
        -- A course is finished when every lesson in it is passed; finished courses are not due.
        execute 'select count(*) from training_assignments ta where ta.ngo_id = $1 and ta.due_on is not null and ta.due_on <= $2
                   and exists (select 1 from training_lessons l where l.course_id = ta.course_id
                                and not exists (select 1 from training_progress p where p.lesson_id = l.id and p.user_id = ta.user_id and p.passed))' into n using a.org_id, td + days;
        -- Each person is told about their own training; leads get the count.
        for u in execute 'select distinct ta.user_id from training_assignments ta where ta.ngo_id = $1 and ta.due_on is not null and ta.due_on <= $2
                   and exists (select 1 from training_lessons l where l.course_id = ta.course_id
                                and not exists (select 1 from training_progress p where p.lesson_id = l.id and p.user_id = ta.user_id and p.passed))' using a.org_id, td + days loop
          insert into nx_notifications (user_id, org_id, kind, title, href) values (u, a.org_id, 'reminder', 'Training is due for you', '/ngo/training');
          sent := sent + 1;
        end loop;
      end if;
      said := n || ' training assignment' || case when n = 1 then ' is' else 's are' end || ' due within ' || days || ' days'; href := '/ngo/training';
    elsif a.rule = 'weekly_summary' then
      select count(*) into n from cases where ngo_id = a.org_id and resolved_at is null;
      select count(*) into extra from nx_tasks where org_id = a.org_id and state = 'open';
      said := n || ' open cases, ' || extra || ' open tasks, ' || (select count(*) from animal_followups where ngo_id = a.org_id and status = 'upcoming' and due_at < now()) || ' overdue follow-ups, '
        || (select count(*) from nx_missions where org_id = a.org_id and state = 'waiting_person') || ' Kaju missions waiting';
      n := n + extra; href := '/ngo/today';
    elsif a.rule = 'pep_doses_due' then
      select count(*) into n from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on between td and td + 1;
      said := n || ' PEP dose' || case when n = 1 then ' is' else 's are' end || ' due today or tomorrow, as prescribed'; href := '/health/pep';
    elsif a.rule = 'pep_missed' then
      select count(*) into n from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on < td;
      said := n || ' prescribed PEP dose' || case when n = 1 then ' is' else 's are' end || ' past the due date. A clinician decides what happens next.'; href := '/health/pep';
    elsif a.rule = 'pep_reminders' then
      insert into health.reminder_outbox (facility_id, dose_id, for_day, phone, body, vars)
      select a.org_id, d.id, td, e.contact_phone,
             left('Reminder from ' || coalesce(o.short_name, o.name) || ': your anti-rabies dose ' || d.dose_no || ' is due on ' || to_char(d.due_on, 'DD Mon') || '. Please visit the clinic.', 320),
             jsonb_build_array(left(coalesce(o.short_name, o.name), 30), d.dose_no::text, to_char(d.due_on, 'DD Mon'))
        from health.pep_doses d join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id join oh_organisations o on o.id = e.facility_id
       where e.facility_id = a.org_id and c.status = 'active' and d.status = 'due' and d.due_on between td and td + 1 and e.reminder_consent and e.contact_phone is not null
      on conflict (dose_id, for_day) do nothing;
      get diagnostics n = row_count;
      said := n || ' consented reminder' || case when n = 1 then '' else 's' end || ' queued from the clinicians'' schedule. Sent only through a connected SMS or WhatsApp account; until then each is recorded as not connected.'; href := '/health/pep';
    elsif a.rule = 'referrals_waiting' then
      select count(*) into n from oh_handoffs where to_org = a.org_id and status = 'open' and created_at < now() - make_interval(hours => hours);
      -- Patients referred here and not yet marked arrived. Counted only: no patient detail leaves the clinical schema.
      select count(*) into v_pat from health.transfers where to_org = a.org_id and status = 'sent' and sent_at < now() - make_interval(hours => hours);
      n := n + v_pat;
      said := n || ' referral' || case when n = 1 then ' or handoff has' else 's or handoffs have' end || ' waited more than ' || hours || ' hours for your answer'
        || case when v_pat > 0 then ', including ' || v_pat || ' patient referral' || case when v_pat = 1 then '' else 's' end || ' not yet marked arrived' else '' end; href := '/health/referrals';
    elsif a.rule = 'services_stale' then
      -- Every confirmation is kept as a new row; only each service's latest one says whether it is stale.
      select count(*) into n from (select distinct on (service) verified_at, valid_until from oh_service_status
                                    where organisation_id = a.org_id order by service, verified_at desc) s
       where s.verified_at < now() - make_interval(days => days) or s.valid_until < now();
      said := n || ' service' || case when n = 1 then ' was' else 's were' end || ' last confirmed more than ' || days || ' days ago. Confirm or update them so nobody is sent on stale information.'; href := '/health/facilities';
    elsif a.rule = 'samples_overdue' then
      select count(*) into n from oh_samples where laboratory_id = a.org_id and status in ('received', 'testing') and created_at < now() - make_interval(days => days);
      said := n || ' sample' || case when n = 1 then ' has' else 's have' end || ' been in the laboratory more than ' || days || ' days without a result'; href := '/health/samples';
    elsif a.rule = 'results_released' then
      select count(*) into n from oh_samples where submitted_by = a.org_id and status = 'resulted' and resulted_at > coalesce(a.last_run_at, now() - interval '1 day');
      said := n || ' laboratory result' || case when n = 1 then ' was' else 's were' end || ' released for samples you sent'; href := '/health/samples';
    elsif a.rule = 'packages_waiting' then
      if to_regclass('public.report_packages') is not null then
        execute 'select count(*) from report_packages where office_id = $1 and status = ''submitted'' and submitted_at < now() - make_interval(days => $2)' into n using a.org_id, days;
      end if;
      said := n || ' report package' || case when n = 1 then ' has' else 's have' end || ' waited more than ' || days || ' days for a decision. A named reviewer decides.'; href := '/gov/verification';
    elsif a.rule = 'alerts_open' then
      -- oh_alerts reads with the signed-in person's access. Scheduled runs have nobody signed in, so they read with the
      -- access of the person who turned this automation on; if that person has left the programme, the run fails.
      if auth.uid() is null then perform set_config('request.jwt.claims', jsonb_build_object('sub', a.created_by, 'role', 'authenticated')::text, true); end if;
      begin
        select count(*) into n from oh_participations pp, lateral jsonb_array_elements(coalesce(oh_alerts(pp.programme_id), '[]'::jsonb)) x
         where pp.organisation_id = a.org_id and x->'ack' = 'null'::jsonb;
      exception when others then
        perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
        raise;
      end;
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      said := n || ' signal' || case when n = 1 then ' is' else 's are' end || ' waiting for review. A signal is not an outbreak declaration.'; href := '/gov/surveillance';
    elsif a.rule = 'data_requests_waiting' then
      select count(*) into n from nx_data_requests r join oh_participations pp on pp.programme_id = r.programme_id where pp.organisation_id = a.org_id and r.status = 'requested' and r.created_at < now() - make_interval(days => days);
      said := n || ' data request' || case when n = 1 then ' has' else 's have' end || ' waited more than ' || days || ' days for your decision'; href := '/gov/data-requests';
    end if;
    if n = 0 then
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, summary, finished_at) values (a.id, a.org_id, k, 'skipped', 0, 'Nothing found', now())
      on conflict (automation_id, dedupe_key) do update set status = 'skipped', found = 0, summary = 'Nothing found', error = null, finished_at = now();
      -- Nothing left: whatever was still open is closed by the rule itself.
      update nx_automation_runs set resolved_at = now(), resolved_note = 'Nothing left when it ran again'
       where automation_id = a.id and status = 'succeeded' and resolved_at is null;
    else
      insert into nx_notifications (user_id, org_id, kind, title, body, href)
      select m, a.org_id, case when a.rule = 'weekly_summary' then 'digest' else 'reminder' end, left(a.name, 200), left(said, 500), href from nx_org_members(a.org_id, roles) m;
      get diagnostics extra = row_count;
      sent := sent + extra;
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, delivered, summary, finished_at) values (a.id, a.org_id, k, 'succeeded', n, sent, left(said, 500), now())
      on conflict (automation_id, dedupe_key) do update set status = 'succeeded', found = excluded.found, delivered = excluded.delivered, summary = excluded.summary, error = null, finished_at = now()
      returning id into v_run;
      -- The notice opens a follow-up. While the earlier one is still open and nobody has acknowledged it, this one keeps
      -- its clock and its escalation, so a daily rule cannot keep restarting the wait.
      select min(coalesce(open_since, finished_at)), max(escalated_at) into v_since, v_esc from nx_automation_runs
       where automation_id = a.id and id <> v_run and status = 'succeeded' and resolved_at is null and acknowledged_at is null;
      update nx_automation_runs set resolved_at = now(), resolved_note = 'Carried into a later run'
       where automation_id = a.id and id <> v_run and status = 'succeeded' and resolved_at is null;
      update nx_automation_runs set open_since = coalesce(v_since, open_since, now()), escalated_at = coalesce(escalated_at, v_esc) where id = v_run;
    end if;
    update nx_automations set last_run_at = now() where id = a.id;
    return jsonb_build_object('status', case when n = 0 then 'skipped' else 'succeeded' end, 'found', n, 'delivered', sent, 'summary', said);
  exception when others then
    insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, summary, error, finished_at) values (a.id, a.org_id, k, 'failed', 'Could not finish', left(sqlerrm, 300), now())
    on conflict (automation_id, dedupe_key) do update set status = 'failed', error = excluded.error, finished_at = now();
    return jsonb_build_object('status', 'failed', 'error', left(sqlerrm, 300));
  end;
end $$;
revoke all on function public.nx_automation_run(uuid, boolean) from public, anon;
grant execute on function public.nx_automation_run(uuid, boolean) to authenticated;

-- A member says what is being done about a run's finding, or closes it with the reason. Kept with their name and time.
create or replace function public.nx_automation_ack(p_run uuid, p_outcome text, p_close boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare r nx_automation_runs;
begin
  select * into r from nx_automation_runs where id = p_run for update;
  if r.id is null or not nx_is_member(r.org_id) then raise exception 'That run is not your organisation''s.' using errcode = '42501'; end if;
  if r.status <> 'succeeded' or r.resolved_at is not null then raise exception 'This is already closed.' using errcode = 'P0001'; end if;
  if length(btrim(coalesce(p_outcome, ''))) < 3 then raise exception 'Say what is being done, or why it is closed.' using errcode = '22023'; end if;
  update nx_automation_runs set acknowledged_by = coalesce(acknowledged_by, auth.uid()), acknowledged_at = coalesce(acknowledged_at, now()),
    outcome = left(btrim(p_outcome), 500),
    resolved_at = case when p_close then now() end, resolved_note = case when p_close then left('Closed by ' || coalesce(nx_person_name(auth.uid()), 'a member'), 300) end
   where id = r.id;
end $$;
revoke all on function public.nx_automation_ack(uuid, text, boolean) from public, anon;
grant execute on function public.nx_automation_ack(uuid, text, boolean) to authenticated;

-- The hourly schedule: due rules run, then follow-ups nobody has acknowledged in time are raised with the leads, once.
create or replace function public.nx_automations_tick() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0; r record;
begin
  for v in select id from nx_automations where status = 'active' and (last_run_at is null
             or (every = 'hour' and last_run_at < date_trunc('hour', now()))
             or (every = 'day' and (last_run_at at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date and extract(hour from now() at time zone 'Asia/Kolkata') >= 7)
             or (every = 'week' and to_char(last_run_at at time zone 'Asia/Kolkata', 'IYYY-IW') < to_char(now() at time zone 'Asia/Kolkata', 'IYYY-IW') and extract(isodow from now() at time zone 'Asia/Kolkata') = 1 and extract(hour from now() at time zone 'Asia/Kolkata') >= 7))
           limit 500 loop
    perform nx_automation_run(v, false); n := n + 1;
  end loop;
  -- escalate_hours: a whole number of hours (0 = never); anything else counts as the default, so one malformed rule
  -- cannot stop the schedule for everyone.
  for r in select x.id, x.org_id, x.summary, x.name, greatest(1, least(240, x.esc)) as hrs from (
             select ru.id, ru.org_id, ru.summary, ru.open_since, ru.finished_at, a.name,
                    case when a.params->>'escalate_hours' ~ '^[0-9]{1,3}$' then (a.params->>'escalate_hours')::int else 24 end as esc
               from nx_automation_runs ru join nx_automations a on a.id = ru.automation_id
              where ru.status = 'succeeded' and coalesce(ru.found, 0) > 0 and ru.resolved_at is null and ru.acknowledged_at is null and ru.escalated_at is null
                and a.status = 'active') x
            where x.esc > 0 and coalesce(x.open_since, x.finished_at) < now() - make_interval(hours => greatest(1, least(240, x.esc)))
            limit 500 loop
    insert into nx_notifications (user_id, org_id, kind, title, body, href)
    select m, r.org_id, 'reminder', left('Not picked up: ' || r.name, 200), left('Nobody has acknowledged this for ' || r.hrs || ' hours. ' || r.summary, 500), '/kaju/automations'
      from nx_org_members(r.org_id, array['admin', 'lead']) m;
    update nx_automation_runs set escalated_at = now() where id = r.id;
  end loop;
  return n;
end $$;
revoke all on function public.nx_automations_tick() from public, anon, authenticated;
notify pgrst, 'reload schema';
