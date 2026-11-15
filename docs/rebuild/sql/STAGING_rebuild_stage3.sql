-- STAGING (project ucxfxiddufwqithtdtix). The three changes staging does not have yet: automations for every workspace,
-- independent veterinary clinics and asking to join an organisation, and a bite keeping the referral it came from.
-- One transaction: either all three apply or nothing changes. Additive; safe to run twice.

begin;

-- ===== 20261116140000_rebuild_automations_v2 =====
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

-- ===== 20261116150000_rebuild_vet_clinics_and_joining =====
-- Independent veterinary clinics, and finding an organisation to ask to join. Additive: new tables and functions, one
-- column on appointments, the organisation kind list widened by one, two appointment policies replaced with the same
-- rules plus the clinic's own patients. No existing row changes.

-- Veterinary clinics as organisations of their own ------------------------------------------------------------------
alter table public.oh_organisations drop constraint if exists oh_organisations_kind_check;
alter table public.oh_organisations add constraint oh_organisations_kind_check
  check (kind in ('coordinator', 'municipal', 'state', 'hospital', 'clinic', 'laboratory', 'ngo', 'research', 'training', 'veterinary'));

create or replace function public.nx_my_workspaces()
returns table (org_id uuid, name text, short_name text, source text, kind text, workspace text, role text, sample boolean)
language sql stable security definer set search_path = public as $$
  select n.id, n.name, null::text, 'ngo', 'ngo', 'ngo', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid()
  union all
  select n.id, n.name, null::text, 'ngo_vet', 'veterinary', 'healthcare', m.role, coalesce(n.demo_mode, false)
    from ngo_members m join ngos n on n.id = m.ngo_id where m.user_id = auth.uid() and m.role = 'veterinarian'
  union all
  select o.id, o.name, o.short_name, case when o.kind = 'veterinary' then 'vet_clinic' else 'programme_partner' end, o.kind,
         case when o.kind in ('hospital', 'clinic', 'laboratory', 'veterinary') then 'healthcare' when o.kind = 'research' then 'research' else 'government' end,
         m.role, coalesce(o.illustrative, false)
    from oh_members m join oh_organisations o on o.id = m.organisation_id
   where m.user_id = auth.uid() and o.kind <> 'ngo'
  union all
  select r.id, r.name, null::text, 'review_office', 'municipal', 'government', m.role, false
    from review_office_members m join review_offices r on r.id = m.office_id where m.user_id = auth.uid();
$$;

-- A veterinary clinic registers itself. Its founder becomes its lead; nothing else is granted.
create or replace function public.nx_register_vet_clinic(p_name text, p_city text default null, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if length(coalesce(btrim(p_name), '')) < 3 then raise exception 'Give the clinic its name.' using errcode = '22023'; end if;
  if (select count(*) from oh_members m join oh_organisations o on o.id = m.organisation_id where m.user_id = auth.uid() and o.kind = 'veterinary' and m.created_at > now() - interval '1 day') >= 3 then
    raise exception 'You registered several clinics today. Try again tomorrow, or ask us.' using errcode = 'P0001'; end if;
  insert into oh_organisations (kind, name, address) values ('veterinary', left(btrim(p_name), 160), nullif(left(btrim(coalesce(p_city, '')), 300), '')) returning id into v;
  insert into oh_members (organisation_id, user_id, role, display_name) values (v, auth.uid(), 'lead', nullif(left(btrim(coalesce(p_display_name, '')), 80), ''));
  return v;
end $$;
revoke all on function public.nx_register_vet_clinic(text, text, text) from public, anon;
grant execute on function public.nx_register_vet_clinic(text, text, text) to authenticated;

create table if not exists public.nx_vet_patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.oh_organisations on delete cascade,
  name text not null check (length(name) between 1 and 120),
  species text not null default 'dog' check (species in ('dog', 'cat', 'other')),
  sex text not null default 'unknown' check (sex in ('female', 'male', 'unknown')),
  age_note text check (length(age_note) <= 60),
  marks text check (length(marks) <= 300),
  brought_by text not null default 'community' check (brought_by in ('community', 'owner', 'ngo', 'unknown')),
  ngo_id uuid references public.ngos on delete set null,
  dog_id uuid references public.dogs on delete set null,
  notes text check (length(notes) <= 2000),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists nx_vet_patients_clinic on public.nx_vet_patients (clinic_id, created_at desc);
create table if not exists public.nx_vet_encounters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.oh_organisations on delete cascade,
  patient_id uuid not null references public.nx_vet_patients on delete cascade,
  kind text not null check (kind in ('exam', 'vaccination', 'sterilisation', 'treatment', 'followup', 'other')),
  occurred_on date not null default current_date,
  findings text check (length(findings) <= 4000),
  diagnosis text check (length(diagnosis) <= 1000),
  treatment text check (length(treatment) <= 2000),
  vaccine text check (length(vaccine) <= 120),
  batch text check (length(batch) <= 60),
  next_due date,
  clinician_name text check (length(clinician_name) <= 120),
  signed_by uuid, signed_at timestamptz,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists nx_vet_encounters_patient on public.nx_vet_encounters (patient_id, occurred_on desc);
alter table public.nx_vet_patients enable row level security;
alter table public.nx_vet_encounters enable row level security;
drop policy if exists nx_vet_patients_rw on public.nx_vet_patients;
create policy nx_vet_patients_rw on public.nx_vet_patients for all to authenticated
  using (public.nx_is_member(clinic_id))
  with check (public.nx_is_member(clinic_id) and (dog_id is null or ngo_id is not null));
drop policy if exists nx_vet_encounters_read on public.nx_vet_encounters;
create policy nx_vet_encounters_read on public.nx_vet_encounters for select to authenticated using (public.nx_is_member(clinic_id));
-- Drafts are written by the clinic's staff; only the signing function marks one signed, and a signed record does not change.
drop policy if exists nx_vet_encounters_add on public.nx_vet_encounters;
create policy nx_vet_encounters_add on public.nx_vet_encounters for insert to authenticated with check (
  public.nx_is_member(clinic_id) and created_by = auth.uid() and signed_at is null and signed_by is null
  and exists (select 1 from public.nx_vet_patients p where p.id = patient_id and p.clinic_id = clinic_id));
drop policy if exists nx_vet_encounters_edit on public.nx_vet_encounters;
create policy nx_vet_encounters_edit on public.nx_vet_encounters for update to authenticated
  using (public.nx_is_member(clinic_id) and signed_at is null) with check (public.nx_is_member(clinic_id) and signed_at is null and signed_by is null);
grant select, insert, update on public.nx_vet_patients, public.nx_vet_encounters to authenticated;
revoke all on public.nx_vet_patients, public.nx_vet_encounters from anon;

-- A clinical record is signed by a veterinarian (clinician role) or the clinic's lead, never by anyone else or by Kaju.
create or replace function public.nx_vet_sign(p_encounter uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare e nx_vet_encounters; r text;
begin
  select * into e from nx_vet_encounters where id = p_encounter for update;
  if e.id is null or not nx_is_member(e.clinic_id) then raise exception 'not found' using errcode = '42501'; end if;
  select role into r from oh_members where organisation_id = e.clinic_id and user_id = auth.uid();
  if coalesce(r, '') not in ('clinician', 'lead') then raise exception 'Only a veterinarian of this clinic signs clinical records.' using errcode = '42501'; end if;
  if e.signed_at is not null then return true; end if;
  update nx_vet_encounters set signed_by = auth.uid(), signed_at = now(), clinician_name = coalesce(clinician_name, (select display_name from oh_members where organisation_id = e.clinic_id and user_id = auth.uid())) where id = e.id;
  return true;
end $$;
revoke all on function public.nx_vet_sign(uuid) from public, anon;
grant execute on function public.nx_vet_sign(uuid) to authenticated;

-- What a partner NGO sees of animals it brought to a clinic: that something was done and when the next visit is due.
-- Never findings, diagnosis or treatment.
create or replace function public.nx_vet_shared_for_ngo(p_ngo uuid)
returns table (patient_id uuid, dog_id uuid, patient_name text, clinic text, last_kind text, last_on date, next_due date)
language sql stable security definer set search_path = public as $$
  select p.id, p.dog_id, p.name, o.name,
         (select e.kind from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null order by e.occurred_on desc limit 1),
         (select e.occurred_on from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null order by e.occurred_on desc limit 1),
         (select min(e.next_due) from nx_vet_encounters e where e.patient_id = p.id and e.signed_at is not null and e.next_due >= current_date)
    from nx_vet_patients p join oh_organisations o on o.id = p.clinic_id
   where p.ngo_id = p_ngo and exists (select 1 from ngo_members m where m.ngo_id = p_ngo and m.user_id = auth.uid());
$$;
revoke all on function public.nx_vet_shared_for_ngo(uuid) from public, anon;
grant execute on function public.nx_vet_shared_for_ngo(uuid) to authenticated;

-- A clinic's appointments can be for its own patients.
alter table public.nx_appointments add column if not exists vet_patient_id uuid references public.nx_vet_patients on delete set null;
drop policy if exists nx_appointments_add on public.nx_appointments;
create policy nx_appointments_add on public.nx_appointments for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid()
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id))
  and (vet_patient_id is null or exists (select 1 from public.nx_vet_patients p where p.id = vet_patient_id and p.clinic_id = org_id)));
drop policy if exists nx_appointments_change on public.nx_appointments;
create policy nx_appointments_change on public.nx_appointments for update to authenticated using (public.nx_is_member(org_id)) with check (
  public.nx_is_member(org_id)
  and (dog_id is null or exists (select 1 from public.dogs d where d.id = dog_id and d.ngo_id = org_id))
  and (case_id is null or exists (select 1 from public.cases c where c.id = case_id and c.ngo_id = org_id))
  and (vet_patient_id is null or exists (select 1 from public.nx_vet_patients p where p.id = vet_patient_id and p.clinic_id = org_id)));

-- Finding an organisation and asking to join ------------------------------------------------------------------------
-- Searchable: NGOs and organisations that chose to be listed. Reviewing offices are never listed or self-joined.
create or replace function public.nx_find_orgs(p_q text)
returns table (id uuid, name text, kind text, place text)
language sql stable security definer set search_path = public as $$
  select * from (
    select n.id, n.name, 'ngo'::text, n.city from ngos n where coalesce(n.demo_mode, false) = false and n.name ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%'
    union all
    select o.id, o.name, o.kind, o.address from oh_organisations o where o.listed_publicly and o.kind not in ('ngo', 'coordinator', 'state', 'municipal') and o.name ilike '%' || replace(replace(btrim(p_q), '%', ''), '_', '') || '%'
  ) x where auth.uid() is not null and length(btrim(p_q)) >= 3 order by 2 limit 20;
$$;
revoke all on function public.nx_find_orgs(text) from public, anon;
grant execute on function public.nx_find_orgs(text) to authenticated;

create table if not exists public.nx_join_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  org_kind text not null check (org_kind in ('ngo', 'oh')),
  user_id uuid not null default auth.uid(),
  display_name text check (length(display_name) <= 80),
  note text check (length(note) <= 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'withdrawn')),
  role text,
  decided_by uuid, decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists nx_join_requests_open on public.nx_join_requests (org_id, user_id) where status = 'requested';
alter table public.nx_join_requests enable row level security;
drop policy if exists nx_join_requests_read on public.nx_join_requests;
create policy nx_join_requests_read on public.nx_join_requests for select to authenticated using (
  user_id = auth.uid() or coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead', 'coordinator'));
grant select on public.nx_join_requests to authenticated;
revoke all on public.nx_join_requests from anon;

create or replace function public.nx_request_join(p_org uuid, p_note text default null, p_name text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid; k text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  if nx_is_member(p_org) then raise exception 'You are already a member.' using errcode = 'P0001'; end if;
  k := case when exists (select 1 from ngos where id = p_org) then 'ngo' when exists (select 1 from oh_organisations where id = p_org and listed_publicly and kind not in ('ngo', 'coordinator', 'state', 'municipal')) then 'oh' end;
  if k is null then raise exception 'That organisation does not take requests to join. Ask it for an invitation code.' using errcode = '42501'; end if;
  if (select count(*) from nx_join_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then raise exception 'You sent several requests today. Try again tomorrow.' using errcode = 'P0001'; end if;
  insert into nx_join_requests (org_id, org_kind, display_name, note) values (p_org, k, nullif(left(btrim(coalesce(p_name, '')), 80), ''), nullif(left(btrim(coalesce(p_note, '')), 500), '')) returning id into v;
  insert into nx_notifications (user_id, org_id, kind, title, href)
  select m, p_org, 'approval', left(coalesce(nullif(btrim(p_name), ''), 'Someone') || ' asked to join', 200), '/requests'
    from nx_org_members(p_org, array['admin', 'lead', 'coordinator']) m;
  return v;
end $$;

-- A lead decides, and chooses the role. Roles that carry clinical, laboratory or government authority are given only
-- by a lead of that organisation, never chosen by the person asking.
create or replace function public.nx_decide_join(p_request uuid, p_decision text, p_role text default null) returns text
language plpgsql security definer set search_path = public as $$
declare r nx_join_requests;
begin
  select * into r from nx_join_requests where id = p_request for update;
  if r.id is null or coalesce(nx_org_role(r.org_id), '') not in ('admin', 'lead') then raise exception 'Only a lead of the organisation decides.' using errcode = '42501'; end if;
  if r.status <> 'requested' then raise exception 'That request was already decided.' using errcode = 'P0001'; end if;
  if p_decision = 'approve' then
    if r.org_kind = 'ngo' then
      if coalesce(p_role, 'member') not in ('member', 'coordinator', 'veterinarian', 'field_worker') then raise exception 'Choose member, coordinator, veterinarian or field worker.' using errcode = '22023'; end if;
      insert into ngo_members (ngo_id, user_id, role) values (r.org_id, r.user_id, coalesce(p_role, 'member')) on conflict do nothing;
    else
      if coalesce(p_role, '') not in ('coordinator', 'clinician', 'nurse', 'records', 'lab_scientist', 'analyst', 'field', 'trainer') then raise exception 'Choose the role this person has here.' using errcode = '22023'; end if;
      insert into oh_members (organisation_id, user_id, role, display_name) values (r.org_id, r.user_id, p_role, r.display_name) on conflict do nothing;
    end if;
    update nx_join_requests set status = 'approved', role = coalesce(p_role, 'member'), decided_by = auth.uid(), decided_at = now() where id = r.id;
  elsif p_decision = 'decline' then
    update nx_join_requests set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = r.id;
  else raise exception 'approve or decline' using errcode = '22023'; end if;
  insert into nx_notifications (user_id, org_id, kind, title, href) values (r.user_id, r.org_id, 'system', case when p_decision = 'approve' then 'Your request to join was accepted' else 'Your request to join was declined' end, '/home');
  return p_decision;
end $$;
revoke all on function public.nx_request_join(uuid, text, text), public.nx_decide_join(uuid, text, text) from public, anon;
grant execute on function public.nx_request_join(uuid, text, text), public.nx_decide_join(uuid, text, text) to authenticated;

-- ===== 20261116160000_rebuild_bite_referral_link =====
-- A bite recorded at the facility a person was referred to keeps the referral it came from.
-- Before this, the clinic could say only that the bite came "from a referral" and the link was lost: oh_record_exposure had
-- no parameter for it. This adds p_transfer (default NULL, so every existing caller keeps working), checks the referral was
-- sent to this facility and is still open, stores the link once per referral, and marks the referral arrived if it was not.
--
-- Additive and reversible: one nullable column, one partial unique index, and the function replaced with one more argument.
-- Rollback: recreate oh_record_exposure from 20261110230655_one_health_v2_2_workflows.sql (18 arguments), then
--   DROP INDEX health.health_exposures_one_per_transfer; ALTER TABLE health.exposures DROP COLUMN transfer_id;
-- No existing row is changed.

ALTER TABLE health.exposures ADD COLUMN IF NOT EXISTS transfer_id uuid REFERENCES health.transfers(id);
CREATE UNIQUE INDEX IF NOT EXISTS health_exposures_one_per_transfer ON health.exposures (transfer_id) WHERE transfer_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text);

CREATE OR REPLACE FUNCTION public.oh_record_exposure(
  p_facility uuid, p_exposure_on date, p_kind text, p_area uuid, p_age_band text DEFAULT 'not_recorded', p_sex text DEFAULT 'not_recorded',
  p_patient_ref text DEFAULT NULL, p_species text DEFAULT 'dog', p_ownership text DEFAULT 'unknown', p_animal_description text DEFAULT NULL,
  p_animal_place text DEFAULT NULL, p_category text DEFAULT 'not_recorded', p_source text DEFAULT 'walk_in', p_notice uuid DEFAULT NULL,
  p_contact_phone text DEFAULT NULL, p_reminder_consent boolean DEFAULT false, p_request_followup boolean DEFAULT true,
  p_wound_washed text DEFAULT 'not_recorded', p_transfer uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE td date := public.oh_org_today(p_facility); eid uuid; c text; hid uuid; target uuid; prog uuid; due_days int;
BEGIN
  PERFORM public.oh_need(public.oh_is_facility(p_facility) AND public.oh_can(p_facility, 'record_exposure'), 'Only staff of this facility can record a bite');
  PERFORM public.oh_need(p_category = 'not_recorded' OR public.oh_can(p_facility, 'assess'), 'Only a clinician can record the exposure category');
  PERFORM public.oh_need(p_exposure_on <= td, 'The date it happened cannot be in the future');
  PERFORM public.oh_need(p_exposure_on >= td - 365, 'The date it happened is more than a year ago');
  IF p_transfer IS NOT NULL THEN
    PERFORM public.oh_need(EXISTS (SELECT 1 FROM health.transfers t WHERE t.id = p_transfer AND t.to_org = p_facility AND t.status IN ('sent', 'arrived')), 'That referral was not sent to this facility, or it was closed');
    PERFORM public.oh_need(NOT EXISTS (SELECT 1 FROM health.exposures x WHERE x.transfer_id = p_transfer), 'A bite is already recorded for this referral');
  END IF;
  c := public.oh_code('BX', p_facility);
  INSERT INTO health.exposures (facility_id, code, patient_ref, age_band, sex, area_id, exposure_on, presented_on, exposure_kind, category, category_by, category_by_name, wound_washed,
    animal_species, animal_ownership, animal_description, animal_place, source, notice_id, contact_phone, reminder_consent, created_by, transfer_id)
  VALUES (p_facility, c, nullif(btrim(p_patient_ref), ''), p_age_band, p_sex, p_area, p_exposure_on, td, p_kind, p_category,
    CASE WHEN p_category <> 'not_recorded' THEN auth.uid() END, CASE WHEN p_category <> 'not_recorded' THEN public.oh_actor_name() END, p_wound_washed,
    p_species, p_ownership, nullif(btrim(p_animal_description), ''), nullif(btrim(p_animal_place), ''), CASE WHEN p_transfer IS NOT NULL THEN 'referral' ELSE p_source END, p_notice,
    CASE WHEN p_reminder_consent THEN nullif(btrim(p_contact_phone), '') END, p_reminder_consent AND nullif(btrim(p_contact_phone), '') IS NOT NULL, auth.uid(), p_transfer)
  RETURNING id INTO eid;
  IF p_transfer IS NOT NULL THEN
    UPDATE health.transfers SET status = 'arrived', closed_by_name = public.oh_actor_name(), closed_at = now() WHERE id = p_transfer AND status = 'sent';
    IF FOUND THEN PERFORM health.log(p_facility, 'transfer_arrived', 'transfer', p_transfer); END IF;
  END IF;
  IF p_notice IS NOT NULL THEN UPDATE health.citizen_notices SET status = 'presented' WHERE id = p_notice AND facility_id = p_facility; END IF;
  IF p_request_followup AND p_ownership <> 'owned' AND p_area IS NOT NULL THEN
    SELECT a.organisation_id, a.programme_id INTO target, prog
      FROM public.oh_assignments a JOIN public.oh_participations pp ON pp.programme_id = a.programme_id AND pp.organisation_id = p_facility
     WHERE a.duty = 'animal_followup' AND a.area_id = p_area
     ORDER BY (SELECT max(depth) FROM public.oh_programme_line(a.programme_id)) DESC LIMIT 1;
    IF target IS NOT NULL THEN
      due_days := public.oh_cfg_int(prog, 'followup_due_days', 3, 1, 30);
      INSERT INTO public.oh_handoffs (programme_id, kind, from_org, to_org, title, detail, area_id, place, status, due_on, created_by)
      VALUES (prog, 'animal_followup', p_facility, target,
        'Find and observe the ' || CASE p_species WHEN 'unknown' THEN 'animal' ELSE p_species END || ' involved in '
          || CASE p_kind WHEN 'bite' THEN 'a bite' WHEN 'scratch' THEN 'a scratch' WHEN 'lick_broken_skin' THEN 'a lick on broken skin' ELSE 'contact' END || ' on ' || to_char(p_exposure_on, 'DD Mon'),
        concat_ws(E'\n', CASE WHEN nullif(btrim(p_animal_description), '') IS NOT NULL THEN 'Animal: ' || btrim(p_animal_description) END,
          'The facility asked for the animal to be located and its health recorded. Record what you find; if it is sick or dies, arrange a sample for the laboratory.',
          'No patient details are shared with this request.'),
        p_area, nullif(btrim(p_animal_place), ''), 'open', p_exposure_on + due_days, auth.uid())
      RETURNING id INTO hid;
      UPDATE health.exposures SET handoff_id = hid WHERE id = eid;
    END IF;
  END IF;
  PERFORM health.log(p_facility, 'record_exposure', 'exposure', eid);
  RETURN jsonb_build_object('id', eid, 'code', c, 'handoff_id', hid, 'transfer_id', p_transfer);
END $$;

REVOKE ALL ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.oh_record_exposure(uuid, date, text, uuid, text, text, text, text, text, text, text, text, text, uuid, text, boolean, boolean, text, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';

commit;
