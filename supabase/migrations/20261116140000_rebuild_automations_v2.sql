-- Automations for every workspace (Stage 3 of the rebuild), and consented PEP reminders. Additive: new tables and
-- functions in public and health. The earlier NGO-only automations stay as they are.
--
-- Each rule is a fixed, explainable query. A run counts what it finds and tells the right people inside StrayPaw with a
-- notification that carries a count and a link, never a patient's details. Nothing is decided for anyone: a rule that
-- touches clinical, laboratory, verification or data-access work only says that something is waiting. A run is not
-- repeated for the same period; a failed run is recorded and tried again on the next tick.

-- People of an organisation by role, across the three membership models. Internal only.
create or replace function public.nx_org_members(p_org uuid, p_roles text[] default null) returns setof uuid
language sql stable security definer set search_path = public as $$
  select user_id from ngo_members where ngo_id = p_org and (p_roles is null or role = any (p_roles))
  union select user_id from oh_members where organisation_id = p_org and (p_roles is null or role = any (p_roles))
  union select user_id from review_office_members where office_id = p_org and (p_roles is null or role = any (p_roles) or p_roles && array['lead', 'reviewer']);
$$;
revoke all on function public.nx_org_members(uuid, text[]) from public, anon, authenticated;

create table if not exists public.nx_automations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  rule text not null check (rule in ('overdue_tasks', 'followups_due', 'possible_duplicates', 'training_due', 'weekly_summary',
    'pep_doses_due', 'pep_missed', 'pep_reminders', 'referrals_waiting', 'services_stale', 'samples_overdue', 'results_released',
    'packages_waiting', 'alerts_open', 'data_requests_waiting')),
  name text not null check (length(name) between 1 and 120),
  every text not null default 'day' check (every in ('hour', 'day', 'week')),
  params jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object'),
  audience text not null default 'leads' check (audience in ('leads', 'everyone', 'clinical', 'lab')),
  status text not null default 'active' check (status in ('active', 'paused')),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  unique (org_id, rule)
);
create table if not exists public.nx_automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.nx_automations on delete cascade,
  org_id uuid not null,
  dedupe_key text not null,
  status text not null check (status in ('succeeded', 'skipped', 'failed')),
  found int, delivered int not null default 0,
  summary text not null default '',
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (automation_id, dedupe_key)
);
create index if not exists nx_automation_runs_org on public.nx_automation_runs (org_id, started_at desc);
alter table public.nx_automations enable row level security;
alter table public.nx_automation_runs enable row level security;
drop policy if exists nx_automations_read on public.nx_automations;
create policy nx_automations_read on public.nx_automations for select to authenticated using (public.nx_is_member(org_id));
drop policy if exists nx_automation_runs_read on public.nx_automation_runs;
create policy nx_automation_runs_read on public.nx_automation_runs for select to authenticated using (public.nx_is_member(org_id));
grant select on public.nx_automations, public.nx_automation_runs to authenticated;
revoke all on public.nx_automations, public.nx_automation_runs from anon;

create or replace function public.nx_automation_manager(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$ select coalesce(nx_org_role(p_org), '') in ('admin', 'lead', 'coordinator') $$;
revoke all on function public.nx_automation_manager(uuid) from public, anon;
grant execute on function public.nx_automation_manager(uuid) to authenticated;

create or replace function public.nx_automation_save(p_org uuid, p_rule text, p_name text, p_every text default 'day', p_params jsonb default '{}', p_audience text default 'leads')
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if not nx_automation_manager(p_org) then raise exception 'Only a lead or coordinator turns automations on.' using errcode = '42501'; end if;
  insert into nx_automations (org_id, rule, name, every, params, audience, created_by)
  values (p_org, p_rule, left(btrim(p_name), 120), coalesce(p_every, 'day'), coalesce(p_params, '{}'), coalesce(p_audience, 'leads'), auth.uid())
  on conflict (org_id, rule) do update set name = excluded.name, every = excluded.every, params = excluded.params, audience = excluded.audience, status = 'active', updated_at = now()
  returning id into v;
  return v;
end $$;
create or replace function public.nx_automation_set(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare org uuid;
begin
  select org_id into org from nx_automations where id = p_id;
  if org is null or not nx_automation_manager(org) then raise exception 'Only a lead or coordinator changes automations.' using errcode = '42501'; end if;
  if p_status = 'removed' then delete from nx_automations where id = p_id;
  elsif p_status in ('active', 'paused') then update nx_automations set status = p_status, updated_at = now() where id = p_id;
  else raise exception 'active, paused or removed' using errcode = '22023'; end if;
end $$;
revoke all on function public.nx_automation_save(uuid, text, text, text, jsonb, text), public.nx_automation_set(uuid, text) from public, anon;
grant execute on function public.nx_automation_save(uuid, text, text, text, jsonb, text), public.nx_automation_set(uuid, text) to authenticated;

-- Consented PEP reminders: one row per dose and day, for patients who agreed to reminders, from the clinician's own
-- schedule. Kept in the clinical schema, never readable through the API; a provider sends them once one is connected,
-- and until then each is recorded as not connected. Staff see a masked log through nx_pep_reminders().
create table if not exists health.reminder_outbox (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null,
  dose_id uuid not null references health.pep_doses on delete cascade,
  for_day date not null,
  channel text not null default 'sms' check (channel in ('sms', 'whatsapp')),
  phone text not null,
  body text not null check (length(body) <= 320),
  vars jsonb not null default '[]'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'not_connected', 'cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dose_id, for_day)
);
alter table health.reminder_outbox enable row level security;
revoke all on health.reminder_outbox from public, anon, authenticated;

create or replace function public.nx_pep_reminders(p_facility uuid)
returns table (id uuid, for_day date, dose_no int, code text, phone_masked text, status text, attempts int, last_error text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.for_day, d.dose_no, e.code, '•••• ' || right(r.phone, 3), r.status, r.attempts, r.last_error, r.updated_at
    from health.reminder_outbox r join health.pep_doses d on d.id = r.dose_id join health.pep_courses c on c.id = d.course_id join health.exposures e on e.id = c.exposure_id
   where r.facility_id = p_facility and oh_can(p_facility, 'view_register') order by r.created_at desc limit 100;
$$;
revoke all on function public.nx_pep_reminders(uuid) from public, anon;
grant execute on function public.nx_pep_reminders(uuid) to authenticated;

-- For the delivery worker (service role only): reminders due now, and their outcome.
create or replace function public.nx_pep_outbox_due(p_limit int default 50)
returns table (id uuid, channel text, phone text, body text, vars jsonb, attempts int)
language sql security definer set search_path = public as $$
  select id, channel, phone, body, vars, attempts from health.reminder_outbox where status = 'queued' and next_attempt_at <= now() order by next_attempt_at limit least(p_limit, 200);
$$;
create or replace function public.nx_pep_outbox_mark(p_id uuid, p_status text, p_error text default null, p_ref text default null)
returns void language sql security definer set search_path = public as $$
  update health.reminder_outbox set status = case when p_status = 'retry' then 'queued' else p_status end, attempts = attempts + case when p_status in ('sent', 'failed', 'retry') then 1 else 0 end,
         next_attempt_at = case when p_status = 'retry' then now() + make_interval(mins => least(60, power(2, attempts + 1)::int)) else next_attempt_at end,
         last_error = left(p_error, 300), provider_ref = left(p_ref, 200), updated_at = now() where id = p_id;
$$;
revoke all on function public.nx_pep_outbox_due(int), public.nx_pep_outbox_mark(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.nx_pep_outbox_due(int), public.nx_pep_outbox_mark(uuid, text, text, text) to service_role;

-- Run one automation. Returns what happened, in words.
create or replace function public.nx_automation_run(p_id uuid, p_now boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a nx_automations; k text; n int := 0; said text := ''; href text; sent int := 0; who uuid[]; v_run uuid; days int; hours int; td date := (now() at time zone 'Asia/Kolkata')::date;
  roles text[]; extra int := 0; u uuid;
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
        execute 'select count(*) from training_assignments where ngo_id = $1 and due_on is not null and due_on <= $2' into n using a.org_id, td + days;
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
      said := n || ' referral' || case when n = 1 then ' or handoff has' else 's or handoffs have' end || ' waited more than ' || hours || ' hours for your answer'; href := '/health/referrals';
    elsif a.rule = 'services_stale' then
      select count(*) into n from oh_service_status where organisation_id = a.org_id and (verified_at < now() - make_interval(days => days) or valid_until < now());
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
      select count(*) into n from oh_participations pp, lateral jsonb_array_elements(coalesce(oh_alerts(pp.programme_id), '[]'::jsonb)) x
       where pp.organisation_id = a.org_id and x->'ack' = 'null'::jsonb;
      said := n || ' signal' || case when n = 1 then ' is' else 's are' end || ' waiting for review. A signal is not an outbreak declaration.'; href := '/gov/surveillance';
    elsif a.rule = 'data_requests_waiting' then
      select count(*) into n from nx_data_requests r join oh_participations pp on pp.programme_id = r.programme_id where pp.organisation_id = a.org_id and r.status = 'requested' and r.created_at < now() - make_interval(days => days);
      said := n || ' data request' || case when n = 1 then ' has' else 's have' end || ' waited more than ' || days || ' days for your decision'; href := '/gov/data-requests';
    end if;
    if n = 0 then
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, summary, finished_at) values (a.id, a.org_id, k, 'skipped', 0, 'Nothing found', now())
      on conflict (automation_id, dedupe_key) do update set status = 'skipped', found = 0, summary = 'Nothing found', error = null, finished_at = now();
    else
      insert into nx_notifications (user_id, org_id, kind, title, body, href)
      select m, a.org_id, case when a.rule = 'weekly_summary' then 'digest' else 'reminder' end, left(a.name, 200), left(said, 500), href from nx_org_members(a.org_id, roles) m;
      get diagnostics extra = row_count;
      sent := sent + extra;
      insert into nx_automation_runs (automation_id, org_id, dedupe_key, status, found, delivered, summary, finished_at) values (a.id, a.org_id, k, 'succeeded', n, sent, left(said, 500), now())
      on conflict (automation_id, dedupe_key) do update set status = 'succeeded', found = excluded.found, delivered = excluded.delivered, summary = excluded.summary, error = null, finished_at = now();
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

-- Every active automation that is due, run by the database's own scheduler.
create or replace function public.nx_automations_tick() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0;
begin
  for v in select id from nx_automations where status = 'active' and (last_run_at is null
             or (every = 'hour' and last_run_at < date_trunc('hour', now()))
             or (every = 'day' and (last_run_at at time zone 'Asia/Kolkata')::date < (now() at time zone 'Asia/Kolkata')::date and extract(hour from now() at time zone 'Asia/Kolkata') >= 7)
             or (every = 'week' and to_char(last_run_at at time zone 'Asia/Kolkata', 'IYYY-IW') < to_char(now() at time zone 'Asia/Kolkata', 'IYYY-IW') and extract(isodow from now() at time zone 'Asia/Kolkata') = 1 and extract(hour from now() at time zone 'Asia/Kolkata') >= 7))
           limit 500 loop
    perform nx_automation_run(v, false); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nx_automations_tick() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'nx-automations-tick';
    perform cron.schedule('nx-automations-tick', '7 * * * *', 'select public.nx_automations_tick()');
  end if;
end $$;
