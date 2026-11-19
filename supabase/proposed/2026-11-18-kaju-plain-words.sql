-- PROPOSED, NOT APPLIED. Kaju's work in plain words (2026-11-18).
--
-- The app no longer shows the word "mission" (or "workroom"): Kaju's work is one card where it was asked, on its
-- record, in Needs you and Today, and finished work is in Kaju's History. The tables keep their names. A few
-- person-facing strings are still composed inside database functions, so they can only change with a migration.
-- Until this is applied, the app shows them through src/lib/kaju/jobs.ts (plainWords), and old links in
-- notifications (/kaju/missions?m=, /kaju/approvals?m=) redirect to /kaju?job=<id>, so nothing breaks either way.
--
-- What changes (only words and the stored link; no logic, no grants, no data):
--   'Mission completed.'
--     -> 'Every step is done.'
--   '/kaju/missions?m=' || m.id
--     -> '/kaju?job=' || m.id
--   '/kaju/approvals?m=' || m.id
--     -> '/kaju?job=' || m.id
--   '/kaju/missions?m=' || d.id
--     -> '/kaju?job=' || d.id
--   'A step failed. Nothing after it ran. Open the mission to retry or cancel.'
--     -> 'A step failed. Nothing after it ran. Open it to try again or stop it.'
--   'Too many missions started in the last minute. Try again shortly.'
--     -> 'Kaju was asked to start too much in the last minute. Try again shortly.'
--   'a mission has 1 to 20 steps'
--     -> 'a plan has 1 to 20 steps'
--   'a mission needs a title'
--     -> 'a plan needs a title'
--   'Only the person who started this mission decides its steps.'
--     -> 'Only the person who asked Kaju for this decides its steps.'
--   'Only the person who started this mission can retry it.'
--     -> 'Only the person who asked Kaju for this can retry it.'
--   'This mission cannot be cancelled.'
--     -> 'This can no longer be stopped.'
--   'The deadline passed before the mission finished.'
--     -> 'The finish-by date passed before every step was done.'
--   ' Kaju missions waiting'
--     -> ' waiting for approval in Kaju'
--
-- The functions below are copied from their latest definitions (20261116110000_rebuild_kaju_engine.sql and
-- 20261118100000_rebuild_automation_rule_counts.sql) with only those strings changed. Check that no later migration
-- has replaced them before applying. Existing notification rows keep their old text and links; the redirects and
-- plainWords cover them, and no data is changed here.
--
-- Not changed: nx_mission_event messages written per step ("Waiting for your approval: ...", "Approved by ..."),
-- which do not use the word; table, column and function names.

begin;

create or replace function public.nx_mission_advance(p_mission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m nx_missions; s nx_mission_steps; v_out jsonb; v_err text; v_claims text := current_setting('request.jwt.claims', true);
begin
  select * into m from nx_missions where id = p_mission for update skip locked;
  if m.id is null then return 'busy'; end if;
  if m.state in ('completed', 'cancelled', 'draft') then return m.state; end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', m.owner_id, 'role', 'authenticated')::text, true);
  loop
    select * into s from nx_mission_steps where mission_id = m.id and state not in ('done', 'skipped', 'cancelled') order by position limit 1 for update;
    if s.id is null then
      update nx_missions set state = 'completed', error = null, updated_at = now() where id = m.id;
      perform nx_mission_event(m.id, null, 'completed', 'Every step is done.');
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return 'completed';
    end if;
    if s.state in ('waiting_approval', 'waiting_person', 'failed') then
      update nx_missions set state = case when s.state = 'failed' then 'blocked' else 'waiting_person' end, updated_at = now() where id = m.id and state <> case when s.state = 'failed' then 'blocked' else 'waiting_person' end;
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return s.state;
    end if;
    if s.next_attempt_at is not null and s.next_attempt_at > now() then
      update nx_missions set state = 'retrying', updated_at = now() where id = m.id and state <> 'retrying';
      perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
      return 'retrying';
    end if;
    -- Policy, decided when the step is about to run, against the rules as they are now.
    s.level := coalesce(nx_tool_level(m.org_id, s.tool, m.owner_id), 9);
    if s.level >= 9 then
      update nx_mission_steps set state = 'failed', level = s.level, error = 'This tool is switched off in the organisation.', finished_at = now() where id = s.id;
      perform nx_mission_event(m.id, s.id, 'blocked', 'Stopped: ' || s.label || ' is switched off in the organisation.');
      continue;
    elsif s.level = 4 then
      update nx_mission_steps set state = 'waiting_person', level = 4, why = (select description from nx_kaju_tools where name = s.tool) where id = s.id;
      perform nx_mission_event(m.id, s.id, 'waiting_person', 'Waiting for a person: ' || s.label);
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('A person is needed: ' || s.label, 200), '/kaju?job=' || m.id);
      continue;
    elsif s.level = 3 and s.approved_at is null then
      update nx_mission_steps set state = 'waiting_approval', needs_approval = true, level = 3,
             why = coalesce(s.why, case when (select external from nx_kaju_tools where name = s.tool) then 'It reaches someone outside StrayPaw.' else 'It changes several records at once.' end) where id = s.id;
      perform nx_mission_event(m.id, s.id, 'waiting_approval', 'Waiting for your approval: ' || s.label);
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('Approve: ' || s.label, 200), '/kaju?job=' || m.id);
      continue;
    end if;
    update nx_missions set state = 'running', updated_at = now() where id = m.id and state <> 'running';
    update nx_mission_steps set state = 'running', level = s.level, started_at = coalesce(started_at, now()), attempts = attempts + 1 where id = s.id;
    begin
      v_out := nx_tool_exec(m.owner_id, m.org_id, s.tool, s.input, coalesce(s.idempotency_key, m.id::text || ':' || s.position), m.id, s.id);
      update nx_mission_steps set state = 'done', result = v_out, error = null, next_attempt_at = null, finished_at = now() where id = s.id;
      perform nx_mission_event(m.id, s.id, case when v_out ? 'deduplicated' then 'deduplicated' else 'succeeded' end,
                               case when v_out ? 'deduplicated' then 'Already done earlier, not repeated: ' else 'Done: ' end || s.label, v_out - 'cases');
    exception when others then
      get stacked diagnostics v_err = message_text;
      if s.attempts + 1 >= s.max_attempts then
        update nx_mission_steps set state = 'failed', error = left(v_err, 500), finished_at = now() where id = s.id;
        update nx_missions set error = left(v_err, 500) where id = m.id;
        perform nx_mission_event(m.id, s.id, 'failed', 'Failed after ' || (s.attempts + 1) || ' tries: ' || left(v_err, 200));
        insert into nx_notifications (user_id, org_id, kind, title, body, href) values (m.owner_id, m.org_id, 'system', left('Kaju stopped: ' || m.title, 200), 'A step failed. Nothing after it ran. Open it to try again or stop it.', '/kaju?job=' || m.id);
      else
        update nx_mission_steps set state = 'retrying', error = left(v_err, 500), next_attempt_at = now() + make_interval(mins => least(60, power(2, s.attempts + 1)::int)) where id = s.id;
        perform nx_mission_event(m.id, s.id, 'retry_scheduled', 'Will try again in ' || least(60, power(2, s.attempts + 1)::int) || ' min: ' || left(v_err, 200));
      end if;
    end;
  end loop;
end $$;

create or replace function public.nx_mission_start(p_org uuid, p_title text, p_request jsonb, p_steps jsonb, p_key text default null, p_channel uuid default null, p_deadline timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; e jsonb; i int := 0; v_recent int;
begin
  if auth.uid() is null or not nx_is_member(p_org) then raise exception 'You are not a member of this organisation.' using errcode = '42501'; end if;
  if p_key is not null then select id into v_id from nx_missions where owner_id = auth.uid() and start_key = p_key; if v_id is not null then return v_id; end if; end if;
  select count(*) into v_recent from nx_missions where owner_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 10 then raise exception 'Kaju was asked to start too much in the last minute. Try again shortly.' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) not between 1 and 20 then raise exception 'a plan has 1 to 20 steps' using errcode = '22023'; end if;
  if length(coalesce(btrim(p_title), '')) = 0 then raise exception 'a plan needs a title' using errcode = '22023'; end if;
  if p_channel is not null and not nx_can_read_channel(p_channel) then raise exception 'you cannot read that channel' using errcode = '42501'; end if;
  insert into nx_missions (org_id, owner_id, title, request, state, start_key, channel_id, deadline, source)
  values (p_org, auth.uid(), left(btrim(p_title), 240), coalesce(p_request, '{}'::jsonb), 'ready', p_key, p_channel, p_deadline, case when p_channel is null then 'kaju' else 'channel' end)
  returning id into v_id;
  for e in select * from jsonb_array_elements(p_steps) loop
    i := i + 1;
    if not exists (select 1 from nx_kaju_tools where name = e->>'tool') then raise exception 'Kaju has no tool called %', e->>'tool' using errcode = '22023'; end if;
    if jsonb_typeof(coalesce(e->'input', '{}'::jsonb)) <> 'object' then raise exception 'a step''s input is an object' using errcode = '22023'; end if;
    insert into nx_mission_steps (mission_id, position, label, tool, input, idempotency_key, state)
    values (v_id, i, left(coalesce(nullif(btrim(e->>'label'), ''), (select label from nx_kaju_tools where name = e->>'tool')), 240), e->>'tool', coalesce(e->'input', '{}'::jsonb), v_id::text || ':' || i, 'todo');
  end loop;
  perform nx_mission_event(v_id, null, 'created', 'Started with ' || i || case when i = 1 then ' step.' else ' steps.' end);
  perform nx_mission_advance(v_id);
  return v_id;
end $$;

create or replace function public.nx_mission_decide(p_step uuid, p_decision text, p_input jsonb default null, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare s nx_mission_steps; m nx_missions;
begin
  select * into s from nx_mission_steps where id = p_step for update;
  select * into m from nx_missions where id = s.mission_id;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who asked Kaju for this decides its steps.' using errcode = '42501'; end if;
  if not nx_is_member(m.org_id) then raise exception 'You are no longer a member of this organisation.' using errcode = '42501'; end if;
  if p_decision = 'approve' and s.state = 'waiting_approval' then
    if p_input is not null then
      if jsonb_typeof(p_input) <> 'object' then raise exception 'a step''s input is an object' using errcode = '22023'; end if;
      update nx_mission_steps set input = p_input where id = s.id;
      perform nx_mission_event(m.id, s.id, 'edited', 'You edited the step before approving it.');
    end if;
    update nx_mission_steps set state = 'todo', approved_by = auth.uid(), approved_at = now() where id = s.id;
    perform nx_mission_event(m.id, s.id, 'approved', 'Approved by ' || nx_person_name(auth.uid()) || ': ' || s.label);
  elsif p_decision = 'reject' and s.state in ('waiting_approval', 'waiting_person') then
    update nx_mission_steps set state = 'skipped', note = left(p_note, 500), finished_at = now() where id = s.id;
    update nx_mission_steps set state = 'cancelled' where mission_id = m.id and state in ('todo', 'retrying', 'waiting_approval', 'waiting_person');
    update nx_missions set state = 'cancelled', updated_at = now() where id = m.id;
    perform nx_mission_event(m.id, s.id, 'rejected', 'Rejected by ' || nx_person_name(auth.uid()) || coalesce(': ' || left(p_note, 200), '') || '. Nothing after it ran.');
    return 'cancelled';
  elsif p_decision = 'done' and s.state = 'waiting_person' then
    update nx_mission_steps set state = 'done', note = left(p_note, 500), approved_by = auth.uid(), approved_at = now(), finished_at = now() where id = s.id;
    perform nx_mission_event(m.id, s.id, 'person_done', nx_person_name(auth.uid()) || ' did it: ' || s.label || coalesce(' (' || left(p_note, 200) || ')', ''));
  else
    raise exception 'That step is not waiting for this decision.' using errcode = 'P0001';
  end if;
  update nx_missions set state = 'running', updated_at = now() where id = m.id;
  return nx_mission_advance(m.id);
end $$;

create or replace function public.nx_mission_retry(p_mission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m nx_missions; s nx_mission_steps;
begin
  select * into m from nx_missions where id = p_mission for update;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who asked Kaju for this can retry it.' using errcode = '42501'; end if;
  select * into s from nx_mission_steps where mission_id = m.id and state in ('failed', 'retrying') order by position limit 1;
  if s.id is null then raise exception 'Nothing to retry.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'todo', attempts = 0, next_attempt_at = null, error = null, finished_at = null where id = s.id;
  update nx_missions set state = 'running', error = null, updated_at = now() where id = m.id;
  perform nx_mission_event(m.id, s.id, 'recovered', 'Retried by ' || nx_person_name(auth.uid()) || ': ' || s.label);
  return nx_mission_advance(m.id);
end $$;

create or replace function public.nx_mission_cancel(p_mission uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update nx_missions set state = 'cancelled', updated_at = now() where id = p_mission and owner_id = auth.uid() and state not in ('completed', 'cancelled');
  if not found then raise exception 'This can no longer be stopped.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'cancelled'
   where mission_id = p_mission and state in ('todo', 'retrying', 'waiting_approval', 'waiting_person', 'failed');
  update nx_outbox set status = 'cancelled', updated_at = now() where mission_id = p_mission and status in ('queued', 'failed');
  perform nx_mission_event(p_mission, null, 'cancelled', 'Cancelled by ' || nx_person_name(auth.uid()) || '.');
end $$;

create or replace function public.nx_mission_tick() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0; d record;
begin
  for v in select distinct m.id from nx_missions m join nx_mission_steps s on s.mission_id = m.id
            where m.state in ('ready', 'running', 'retrying') and s.state in ('todo', 'retrying') and coalesce(s.next_attempt_at, now()) <= now() limit 200 loop
    perform nx_mission_advance(v); n := n + 1;
  end loop;
  -- A deadline passed while the mission still waits: the owner hears about it once.
  for d in select id, org_id, owner_id, title from nx_missions where deadline < now() and not deadline_noted and state not in ('completed', 'cancelled') limit 200 loop
    update nx_missions set deadline_noted = true where id = d.id;
    perform nx_mission_event(d.id, null, 'deadline', 'The finish-by date passed before every step was done.');
    insert into nx_notifications (user_id, org_id, kind, title, href) values (d.owner_id, d.org_id, 'system', left('Past its deadline: ' || d.title, 200), '/kaju?job=' || d.id);
  end loop;
  return n;
end $$;

create or replace function public.nx_automation_run(p_id uuid, p_now boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a nx_automations; k text; n int := 0; said text := ''; href text; sent int := 0; who uuid[]; v_run uuid; days int; hours int; td date := (now() at time zone 'Asia/Kolkata')::date;
  roles text[]; extra int := 0; u uuid; v_claims text := current_setting('request.jwt.claims', true); v_pat int := 0;
  v_since timestamptz; v_esc timestamptz;
  v_ack_by uuid; v_ack_at timestamptz; v_outcome text;
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
      said := n || ' open cases, ' || extra || ' open tasks, ' || (select count(*) from animal_followups where ngo_id = a.org_id and status in ('upcoming', 'postponed') and due_at < now()) || ' overdue follow-ups, '
        || (select count(*) from nx_missions where org_id = a.org_id and state = 'waiting_person') || ' waiting for approval in Kaju';
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
      -- The laboratory's wait starts when it received the sample (its 'received' event), not when the sample was registered
      -- at collection, which can be days earlier while it travels. Samples recorded before events existed use created_at.
      select count(*) into n from oh_samples s where s.laboratory_id = a.org_id and s.status in ('received', 'testing')
         and coalesce((select min(e.at) from oh_sample_events e where e.sample_id = s.id and e.action = 'received'), s.created_at) < now() - make_interval(days => days);
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
      -- Only the programme's coordinating organisations decide on its data (oh_can_manage: a coordinator or state
      -- organisation in the programme or a programme above it). Other partners are not asked to decide what they cannot.
      select count(*) into n from nx_data_requests r
       where r.status = 'requested' and r.created_at < now() - make_interval(days => days)
         and exists (select 1 from oh_participations pp join oh_organisations o on o.id = pp.organisation_id
                      where pp.organisation_id = a.org_id and o.kind in ('coordinator', 'state')
                        and pp.programme_id in (select l.id from oh_programme_line(r.programme_id) l));
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
      -- The notice opens a follow-up, or continues the one still open. It keeps the earliest open time, any escalation and
      -- the latest acknowledgement, so a daily rule neither restarts the wait nor forgets who said they are handling it
      -- (which would show it as not picked up and raise it with the leads again).
      select min(coalesce(open_since, finished_at)), max(escalated_at) into v_since, v_esc from nx_automation_runs
       where automation_id = a.id and id <> v_run and status = 'succeeded' and resolved_at is null;
      select acknowledged_by, acknowledged_at, outcome into v_ack_by, v_ack_at, v_outcome from nx_automation_runs
       where automation_id = a.id and id <> v_run and status = 'succeeded' and resolved_at is null and acknowledged_at is not null
       order by acknowledged_at desc limit 1;
      update nx_automation_runs set resolved_at = now(), resolved_note = 'Carried into a later run'
       where automation_id = a.id and id <> v_run and status = 'succeeded' and resolved_at is null;
      update nx_automation_runs set open_since = coalesce(v_since, open_since, now()), escalated_at = coalesce(escalated_at, v_esc),
        acknowledged_by = coalesce(acknowledged_by, v_ack_by), acknowledged_at = coalesce(acknowledged_at, v_ack_at), outcome = coalesce(outcome, v_outcome)
       where id = v_run;
    end if;
    update nx_automations set last_run_at = now() where id = a.id;
    return jsonb_build_object('status', case when n = 0 then 'skipped' else 'succeeded' end, 'found', n, 'delivered', sent, 'summary', said);
  exception when others then
    insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, summary, error, finished_at) values (a.id, a.org_id, k, 'failed', 'Could not finish', left(sqlerrm, 300), now())
    on conflict (automation_id, dedupe_key) do update set status = 'failed', error = excluded.error, finished_at = now();
    return jsonb_build_object('status', 'failed', 'error', left(sqlerrm, 300));
  end;
end $$;

commit;
