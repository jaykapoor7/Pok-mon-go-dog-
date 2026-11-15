-- Kaju's durable execution (Stage 3 of the rebuild). Additive: new tables and functions, new columns on the mission
-- tables, and the mission step state list widened. No existing row is changed or removed.
--
-- A mission is a list of steps. Each step names a tool from a fixed registry. The registry says how much autonomy the
-- tool has (0 read, 1 draft, 2 automatic low-risk, 3 ask for approval, 4 a person only). An organisation can make a tool
-- stricter, never looser. Steps run in the database, as the person who started the mission, with the same checks as if
-- they had done it themselves; they keep running when the browser is closed. A failed step is retried with backoff and
-- never repeats an effect it already made. Every change is written to the mission's trace.

-- Registry ------------------------------------------------------------------------------------------------------------

create table if not exists public.nx_kaju_tools (
  name text primary key check (name ~ '^[a-z_]{3,40}$'),
  label text not null check (length(label) <= 120),
  level int not null check (level between 0 and 4),
  external boolean not null default false,
  description text not null check (length(description) <= 400)
);
alter table public.nx_kaju_tools enable row level security;
drop policy if exists nx_kaju_tools_read on public.nx_kaju_tools;
create policy nx_kaju_tools_read on public.nx_kaju_tools for select to authenticated using (true);
grant select on public.nx_kaju_tools to authenticated;
revoke all on public.nx_kaju_tools from anon;

insert into public.nx_kaju_tools (name, label, level, external, description) values
  ('find_due_followups', 'Find cases due a follow-up', 0, false, 'Reads open cases with a follow-up due, by place and period. Cases that already have an open follow-up task are counted, not listed.'),
  ('find_overdue_cases', 'Find overdue cases', 0, false, 'Reads open cases past their due date.'),
  ('create_task', 'Create a task', 2, false, 'Creates one task in the organisation, optionally assigned to a member and linked to a record.'),
  ('create_followup_tasks', 'Create follow-up tasks', 3, false, 'Creates one follow-up task per case found by an earlier step. A case with an open follow-up is never given a second one.'),
  ('post_message', 'Post in a channel', 2, false, 'Posts a message as Kaju, on behalf of the person, in a channel they can read.'),
  ('notify_members', 'Notify members', 2, false, 'Sends an in-app notification to named members of the organisation.'),
  ('send_external', 'Send an email or WhatsApp message', 3, true, 'Queues a message to someone outside StrayPaw. It is delivered only through a connected, approved account.'),
  ('verify_claim', 'Decide a verification', 4, false, 'A reviewing officer decides. Kaju never approves or rejects a claim.'),
  ('validate_result', 'Validate a laboratory result', 4, false, 'Authorised laboratory staff validate. Kaju never validates a result.'),
  ('clinical_decision', 'Make a clinical decision', 4, false, 'Diagnosis, treatment and dosing are decided by a clinician. Kaju never makes them.'),
  ('grant_data_access', 'Grant access to restricted data', 4, false, 'The data steward decides. Kaju never grants access.')
on conflict (name) do update set label = excluded.label, level = excluded.level, external = excluded.external, description = excluded.description;

-- An organisation's own rules: a tool can be made stricter (a higher level) or switched off. Leads and admins set them.
create table if not exists public.nx_kaju_policies (
  org_id uuid not null,
  tool text not null references public.nx_kaju_tools on delete cascade,
  level int not null check (level between 0 and 4),
  enabled boolean not null default true,
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (org_id, tool)
);
alter table public.nx_kaju_policies enable row level security;
drop policy if exists nx_kaju_policies_read on public.nx_kaju_policies;
create policy nx_kaju_policies_read on public.nx_kaju_policies for select to authenticated using (public.nx_is_member(org_id));
drop policy if exists nx_kaju_policies_write on public.nx_kaju_policies;
create policy nx_kaju_policies_write on public.nx_kaju_policies for all to authenticated
  using (coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead'))
  with check (coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead') and updated_by = auth.uid()
              and level >= (select t.level from public.nx_kaju_tools t where t.name = tool));
grant select, insert, update, delete on public.nx_kaju_policies to authenticated;
revoke all on public.nx_kaju_policies from anon;

-- A person's own limits. They can hold Kaju to drafts only, or turn off the understanding-while-typing composer.
create table if not exists public.nx_kaju_prefs (
  user_id uuid primary key default auth.uid(),
  predictive boolean not null default true,
  autonomy_cap int not null default 2 check (autonomy_cap between 0 and 2),
  updated_at timestamptz not null default now()
);
alter table public.nx_kaju_prefs enable row level security;
drop policy if exists nx_kaju_prefs_own on public.nx_kaju_prefs;
create policy nx_kaju_prefs_own on public.nx_kaju_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.nx_kaju_prefs to authenticated;
revoke all on public.nx_kaju_prefs from anon;

-- The level a tool runs at in an organisation for a person: the registry's level, raised by the organisation's rule,
-- and anything above the person's own cap needs approval. 9 means switched off.
create or replace function public.nx_tool_level(p_org uuid, p_tool text, p_user uuid default auth.uid()) returns int
language sql stable security definer set search_path = public as $$
  select case when p.enabled is false then 9
              else greatest(t.level, coalesce(p.level, 0),
                            case when t.level = 2 and coalesce((select autonomy_cap from nx_kaju_prefs where user_id = p_user), 2) < 2 then 3 else 0 end) end
    from nx_kaju_tools t left join nx_kaju_policies p on p.org_id = p_org and p.tool = t.name where t.name = p_tool;
$$;
revoke all on function public.nx_tool_level(uuid, text, uuid) from public, anon;
grant execute on function public.nx_tool_level(uuid, text, uuid) to authenticated;

-- Missions and steps: what the engine needs to resume, retry and explain ----------------------------------------------

alter table public.nx_missions add column if not exists source text not null default 'kaju' check (source in ('kaju', 'automation', 'channel'));
alter table public.nx_missions add column if not exists start_key text check (length(start_key) <= 80);
alter table public.nx_missions add column if not exists deadline timestamptz;
alter table public.nx_missions add column if not exists error text check (length(error) <= 500);
alter table public.nx_missions add column if not exists channel_id uuid references public.nx_channels on delete set null;
alter table public.nx_missions add column if not exists deadline_noted boolean not null default false;
create unique index if not exists nx_missions_start_key on public.nx_missions (owner_id, start_key) where start_key is not null;

alter table public.nx_mission_steps add column if not exists input jsonb not null default '{}'::jsonb;
alter table public.nx_mission_steps add column if not exists level int check (level between 0 and 9);
alter table public.nx_mission_steps add column if not exists why text check (length(why) <= 300);
alter table public.nx_mission_steps add column if not exists next_attempt_at timestamptz;
alter table public.nx_mission_steps add column if not exists max_attempts int not null default 5 check (max_attempts between 1 and 10);
alter table public.nx_mission_steps add column if not exists started_at timestamptz;
alter table public.nx_mission_steps add column if not exists finished_at timestamptz;
alter table public.nx_mission_steps add column if not exists note text check (length(note) <= 500);
alter table public.nx_mission_steps drop constraint if exists nx_mission_steps_state_check;
alter table public.nx_mission_steps add constraint nx_mission_steps_state_check
  check (state in ('todo', 'running', 'done', 'waiting_approval', 'waiting_person', 'retrying', 'failed', 'skipped', 'cancelled'));
create index if not exists nx_mission_steps_due on public.nx_mission_steps (next_attempt_at) where state in ('todo', 'retrying');

-- The trace: one row per thing that happened, in plain words, for the mission's owner.
create table if not exists public.nx_mission_events (
  id bigint generated always as identity primary key,
  mission_id uuid not null references public.nx_missions on delete cascade,
  step_id uuid references public.nx_mission_steps on delete cascade,
  at timestamptz not null default now(),
  kind text not null check (kind in ('created', 'policy', 'started', 'succeeded', 'failed', 'retry_scheduled', 'waiting_approval', 'approved', 'edited', 'rejected', 'waiting_person', 'person_done', 'cancelled', 'completed', 'blocked', 'recovered', 'deadline', 'deduplicated')),
  message text not null check (length(message) <= 400),
  data jsonb
);
create index if not exists nx_mission_events_mission on public.nx_mission_events (mission_id, id);
alter table public.nx_mission_events enable row level security;
drop policy if exists nx_mission_events_read on public.nx_mission_events;
create policy nx_mission_events_read on public.nx_mission_events for select to authenticated using (
  exists (select 1 from public.nx_missions m where m.id = mission_id and m.owner_id = auth.uid()));
grant select on public.nx_mission_events to authenticated;
revoke all on public.nx_mission_events from anon;

-- What a step already did. A retried step finds its effect here and does not do it again.
create table if not exists public.nx_tool_effects (
  idempotency_key text primary key,
  mission_id uuid references public.nx_missions on delete cascade,
  step_id uuid references public.nx_mission_steps on delete cascade,
  tool text not null,
  result jsonb not null,
  at timestamptz not null default now()
);
alter table public.nx_tool_effects enable row level security;
revoke all on public.nx_tool_effects from anon, authenticated;

-- Messages to people outside StrayPaw. Nothing here is delivered until a connected account exists and the step that
-- queued it was approved; until then the row says so. Recipients are visible only to whoever queued them.
create table if not exists public.nx_outbox (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  mission_id uuid references public.nx_missions on delete set null,
  step_id uuid references public.nx_mission_steps on delete set null,
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  recipient text not null check (length(recipient) between 3 and 200),
  subject text check (length(subject) <= 200),
  body text not null check (length(body) between 1 and 4000),
  status text not null default 'queued' check (status in ('queued', 'not_connected', 'sent', 'failed', 'cancelled')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text check (length(last_error) <= 500),
  provider_ref text check (length(provider_ref) <= 200),
  idempotency_key text unique,
  created_by uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists nx_outbox_due on public.nx_outbox (next_attempt_at) where status in ('queued', 'failed');
alter table public.nx_outbox enable row level security;
drop policy if exists nx_outbox_read on public.nx_outbox;
create policy nx_outbox_read on public.nx_outbox for select to authenticated using (created_by = auth.uid() and public.nx_is_member(org_id));
grant select on public.nx_outbox to authenticated;
revoke all on public.nx_outbox from anon;

-- Organisation memory --------------------------------------------------------------------------------------------------
-- How the organisation works (procedures, templates, decisions) and a person's own preferences. Stored as short entries
-- with their source, not as copies of conversations. An organisation entry is used once a lead or admin approves it.
create table if not exists public.nx_kaju_memory (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  scope text not null check (scope in ('org', 'personal')),
  kind text not null check (kind in ('procedure', 'template', 'decision', 'preference', 'fact')),
  title text not null check (length(title) between 2 and 160),
  body text not null check (length(body) between 2 and 4000),
  source_kind text check (source_kind in ('message', 'record', 'document', 'person')),
  source_ref text check (length(source_ref) <= 200),
  valid_until date,
  created_by uuid not null default auth.uid(),
  approved_by uuid, approved_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists nx_kaju_memory_org on public.nx_kaju_memory (org_id, scope) where revoked_at is null;
alter table public.nx_kaju_memory enable row level security;
drop policy if exists nx_kaju_memory_read on public.nx_kaju_memory;
create policy nx_kaju_memory_read on public.nx_kaju_memory for select to authenticated using (
  public.nx_is_member(org_id) and (created_by = auth.uid() or (scope = 'org' and (approved_at is not null or coalesce(public.nx_org_role(org_id), '') in ('admin', 'lead')))));
drop policy if exists nx_kaju_memory_add on public.nx_kaju_memory;
create policy nx_kaju_memory_add on public.nx_kaju_memory for insert to authenticated with check (
  public.nx_is_member(org_id) and created_by = auth.uid() and approved_by is null and approved_at is null and revoked_at is null
  and (scope = 'org' or kind = 'preference'));
grant select, insert on public.nx_kaju_memory to authenticated;
revoke all on public.nx_kaju_memory from anon;

create or replace function public.nx_memory_decide(p_id uuid, p_action text) returns boolean
language plpgsql security definer set search_path = public as $$
declare m nx_kaju_memory;
begin
  select * into m from nx_kaju_memory where id = p_id;
  if m.id is null or not nx_is_member(m.org_id) then raise exception 'not found' using errcode = '42501'; end if;
  if p_action = 'approve' then
    if m.scope <> 'org' or coalesce(nx_org_role(m.org_id), '') not in ('admin', 'lead') then raise exception 'a lead or admin approves organisation memory' using errcode = '42501'; end if;
    update nx_kaju_memory set approved_by = auth.uid(), approved_at = now() where id = p_id and revoked_at is null;
  elsif p_action = 'revoke' then
    if m.created_by <> auth.uid() and coalesce(nx_org_role(m.org_id), '') not in ('admin', 'lead') then raise exception 'only its author or a lead can remove it' using errcode = '42501'; end if;
    update nx_kaju_memory set revoked_at = now() where id = p_id;
  else raise exception 'approve or revoke' using errcode = '22023'; end if;
  return true;
end $$;
revoke all on function public.nx_memory_decide(uuid, text) from public, anon;
grant execute on function public.nx_memory_decide(uuid, text) to authenticated;

-- The engine ------------------------------------------------------------------------------------------------------------

create or replace function public.nx_mission_event(p_mission uuid, p_step uuid, p_kind text, p_message text, p_data jsonb default null) returns void
language sql security definer set search_path = public as $$
  insert into nx_mission_events (mission_id, step_id, kind, message, data) values (p_mission, p_step, p_kind, left(p_message, 400), p_data);
  update nx_missions set updated_at = now() where id = p_mission;
$$;
revoke all on function public.nx_mission_event(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- The display name of a person, for messages Kaju posts on their behalf.
create or replace function public.nx_person_name(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), nullif(trim(raw_user_meta_data->>'name'), ''), 'a member') from auth.users where id = p_user;
$$;
revoke all on function public.nx_person_name(uuid) from public, anon, authenticated;

-- One tool, run as p_actor in p_org. Raises on any refusal or failure; the caller decides whether to retry.
create or replace function public.nx_tool_exec(p_actor uuid, p_org uuid, p_tool text, p_input jsonb, p_key text, p_mission uuid, p_step uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_prev jsonb; v_out jsonb; v_id uuid; v_ch uuid; v_n int := 0; v_skip int := 0; u uuid;
  v_place text; v_when text; v_today date := (now() at time zone 'Asia/Kolkata')::date; v_from date; v_to date; v_cases jsonb;
begin
  if p_key is not null then
    select result into v_prev from nx_tool_effects where idempotency_key = p_key;
    if found then return v_prev || jsonb_build_object('deduplicated', true); end if;
  end if;
  if not nx_user_is_member(p_org, p_actor) then raise exception 'the person who started this is no longer a member of the organisation' using errcode = '42501'; end if;

  if p_tool = 'find_due_followups' then
    v_place := nullif(btrim(p_input->>'place'), ''); v_when := lower(coalesce(nullif(btrim(p_input->>'when'), ''), 'any'));
    if v_when = 'today' then v_from := v_today; v_to := v_today;
    elsif v_when = 'tomorrow' then v_from := v_today + 1; v_to := v_today + 1;
    elsif v_when = 'this week' then v_from := v_today; v_to := v_today + (7 - extract(isodow from v_today)::int);
    elsif v_when = 'next week' then v_from := v_today + (8 - extract(isodow from v_today)::int); v_to := v_from + 6;
    else v_when := 'any'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', coalesce(c.case_code, upper(left(c.id::text, 8))), 'title', coalesce(nullif(c.title, ''), 'Case'), 'place', coalesce(c.zone, c.city), 'due', coalesce(c.due_at, c.follow_up_at::timestamptz)::date)), '[]'::jsonb), count(*)
      into v_cases, v_n
      from (select * from cases c where c.ngo_id = p_org and c.resolved_at is null
              and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
              and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
              and not exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open')
            order by coalesce(c.due_at, c.follow_up_at::timestamptz) nulls last limit 50) c;
    select count(*) into v_skip from cases c where c.ngo_id = p_org and c.resolved_at is null
       and (v_place is null or c.zone ilike v_place or c.city ilike v_place)
       and (v_when = 'any' or coalesce(c.due_at, c.follow_up_at::timestamptz)::date between v_from and v_to)
       and exists (select 1 from nx_tasks t where t.org_id = p_org and t.record_kind = 'case' and t.record_id = c.id::text and t.state = 'open');
    v_out := jsonb_build_object('cases', v_cases, 'found', v_n, 'already_open', v_skip, 'place', v_place, 'when', v_when);

  elsif p_tool = 'find_overdue_cases' then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'code', coalesce(c.case_code, upper(left(c.id::text, 8))), 'title', coalesce(nullif(c.title, ''), 'Case'), 'due', c.due_at::date)), '[]'::jsonb), count(*)
      into v_cases, v_n
      from (select * from cases c where c.ngo_id = p_org and c.resolved_at is null and c.due_at < now() order by c.due_at limit 50) c;
    v_out := jsonb_build_object('cases', v_cases, 'found', v_n);

  elsif p_tool = 'create_task' then
    if length(coalesce(btrim(p_input->>'title'), '')) = 0 then raise exception 'a task needs a title' using errcode = '22023'; end if;
    u := nx_try_uuid(p_input->>'assignee_id');
    if u is not null and not nx_user_is_member(p_org, u) then raise exception 'the assignee is not a member of the organisation' using errcode = '42501'; end if;
    insert into nx_tasks (org_id, title, note, due_on, assignee_id, assignee_name, created_by, source_kind, record_kind, record_id, record_label, mission_id, channel_id)
    values (p_org, left(btrim(p_input->>'title'), 240), left(p_input->>'note', 2000), nullif(p_input->>'due_on', '')::date, u,
            case when u is not null then nx_person_name(u) else left(p_input->>'assignee_name', 80) end, p_actor, 'kaju',
            nullif(p_input->>'record_kind', ''), nullif(p_input->>'record_id', ''), left(p_input->>'record_label', 160), p_mission, nx_try_uuid(p_input->>'channel_id'))
    returning id into v_id;
    v_out := jsonb_build_object('task_id', v_id);

  elsif p_tool = 'create_followup_tasks' then
    select result into v_prev from nx_mission_steps where mission_id = p_mission and position = coalesce((p_input->>'from_step')::int, 1) and state = 'done';
    if v_prev is null then raise exception 'the step that finds the cases has not finished' using errcode = 'P0001'; end if;
    insert into nx_tasks (org_id, title, state, due_on, assignee_name, created_by, source_kind, record_kind, record_id, record_label, mission_id)
    select p_org, left('Follow up: ' || (e->>'title'), 240), 'open', nullif(e->>'due', '')::date, left(p_input->>'team', 80), p_actor, 'kaju', 'case', e->>'id', e->>'code', p_mission
      from jsonb_array_elements(coalesce(v_prev->'cases', '[]'::jsonb)) e
     where not exists (select 1 from nx_tasks x where x.org_id = p_org and x.record_kind = 'case' and x.record_id = e->>'id' and x.state = 'open')
    on conflict (mission_id, record_id) where mission_id is not null do nothing;
    get diagnostics v_n = row_count;
    v_out := jsonb_build_object('created', v_n, 'considered', jsonb_array_length(coalesce(v_prev->'cases', '[]'::jsonb)));

  elsif p_tool = 'post_message' then
    v_ch := coalesce(nx_try_uuid(p_input->>'channel_id'), (select id from nx_channels where org_id = p_org and name = p_input->>'channel' and kind in ('channel', 'announcement')));
    if v_ch is null then raise exception 'that channel was not found' using errcode = 'P0001'; end if;
    if not nx_user_can_read_channel(v_ch, p_actor) then raise exception 'the person who started this cannot post in that channel' using errcode = '42501'; end if;
    if length(coalesce(btrim(p_input->>'body'), '')) = 0 then raise exception 'a message needs words' using errcode = '22023'; end if;
    insert into nx_messages (channel_id, author_id, author_kind, author_name, body, record_kind, record_id, record_label)
    values (v_ch, null, 'kaju', left('Kaju for ' || nx_person_name(p_actor), 120), left(p_input->>'body', 4000),
            nullif(p_input->>'record_kind', ''), nullif(p_input->>'record_id', ''), left(p_input->>'record_label', 160))
    returning id into v_id;
    v_out := jsonb_build_object('message_id', v_id, 'channel_id', v_ch);

  elsif p_tool = 'notify_members' then
    for u in select nx_try_uuid(x) from jsonb_array_elements_text(coalesce(p_input->'user_ids', '[]'::jsonb)) x loop
      if u is null or not nx_user_is_member(p_org, u) then raise exception 'a recipient is not a member of the organisation' using errcode = '42501'; end if;
      insert into nx_notifications (user_id, org_id, kind, title, body, href)
      values (u, p_org, 'task', left(coalesce(nullif(btrim(p_input->>'title'), ''), 'Kaju has something for you'), 200), left(p_input->>'body', 500),
              case when coalesce(p_input->>'href', '') ~ '^/' then left(p_input->>'href', 300) end);
      v_n := v_n + 1;
    end loop;
    v_out := jsonb_build_object('notified', v_n);

  elsif p_tool = 'send_external' then
    if coalesce(p_input->>'channel', '') not in ('email', 'whatsapp', 'sms') then raise exception 'email, whatsapp or sms' using errcode = '22023'; end if;
    insert into nx_outbox (org_id, mission_id, step_id, channel, recipient, subject, body, created_by, approved_by, approved_at, idempotency_key)
    select p_org, p_mission, p_step, p_input->>'channel', left(btrim(p_input->>'to'), 200), left(p_input->>'subject', 200), left(p_input->>'body', 4000), p_actor, s.approved_by, s.approved_at, p_key
      from nx_mission_steps s where s.id = p_step
    returning id into v_id;
    v_out := jsonb_build_object('outbox_id', v_id, 'status', 'queued');

  else
    raise exception 'Kaju has no tool called %', p_tool using errcode = '22023';
  end if;

  if p_key is not null then insert into nx_tool_effects (idempotency_key, mission_id, step_id, tool, result) values (p_key, p_mission, p_step, p_tool, v_out); end if;
  return v_out;
end $$;
revoke all on function public.nx_tool_exec(uuid, uuid, text, jsonb, text, uuid, uuid) from public, anon, authenticated;

-- Run what is due in one mission. Stops at the first step that needs a person.
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
      perform nx_mission_event(m.id, null, 'completed', 'Mission completed.');
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
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('A person is needed: ' || s.label, 200), '/kaju/missions?m=' || m.id);
      continue;
    elsif s.level = 3 and s.approved_at is null then
      update nx_mission_steps set state = 'waiting_approval', needs_approval = true, level = 3,
             why = coalesce(s.why, case when (select external from nx_kaju_tools where name = s.tool) then 'It reaches someone outside StrayPaw.' else 'It changes several records at once.' end) where id = s.id;
      perform nx_mission_event(m.id, s.id, 'waiting_approval', 'Waiting for your approval: ' || s.label);
      insert into nx_notifications (user_id, org_id, kind, title, href) values (m.owner_id, m.org_id, 'approval', left('Approve: ' || s.label, 200), '/kaju/approvals?m=' || m.id);
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
        insert into nx_notifications (user_id, org_id, kind, title, body, href) values (m.owner_id, m.org_id, 'system', left('Kaju stopped: ' || m.title, 200), 'A step failed. Nothing after it ran. Open the mission to retry or cancel.', '/kaju/missions?m=' || m.id);
      else
        update nx_mission_steps set state = 'retrying', error = left(v_err, 500), next_attempt_at = now() + make_interval(mins => least(60, power(2, s.attempts + 1)::int)) where id = s.id;
        perform nx_mission_event(m.id, s.id, 'retry_scheduled', 'Will try again in ' || least(60, power(2, s.attempts + 1)::int) || ' min: ' || left(v_err, 200));
      end if;
    end;
  end loop;
end $$;
revoke all on function public.nx_mission_advance(uuid) from public, anon, authenticated;

-- Start a mission from a plan. p_steps: [{ label, tool, input }]. The plan comes from the composer or a model and is
-- untrusted: every tool must be in the registry, and the policy is decided again when each step runs.
create or replace function public.nx_mission_start(p_org uuid, p_title text, p_request jsonb, p_steps jsonb, p_key text default null, p_channel uuid default null, p_deadline timestamptz default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; e jsonb; i int := 0; v_recent int;
begin
  if auth.uid() is null or not nx_is_member(p_org) then raise exception 'You are not a member of this organisation.' using errcode = '42501'; end if;
  if p_key is not null then select id into v_id from nx_missions where owner_id = auth.uid() and start_key = p_key; if v_id is not null then return v_id; end if; end if;
  select count(*) into v_recent from nx_missions where owner_id = auth.uid() and created_at > now() - interval '1 minute';
  if v_recent >= 10 then raise exception 'Too many missions started in the last minute. Try again shortly.' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) not between 1 and 20 then raise exception 'a mission has 1 to 20 steps' using errcode = '22023'; end if;
  if length(coalesce(btrim(p_title), '')) = 0 then raise exception 'a mission needs a title' using errcode = '22023'; end if;
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
revoke all on function public.nx_mission_start(uuid, text, jsonb, jsonb, text, uuid, timestamptz) from public, anon;
grant execute on function public.nx_mission_start(uuid, text, jsonb, jsonb, text, uuid, timestamptz) to authenticated;

-- A decision on the step that is waiting: approve (optionally with edited input), reject, or "I did it" for a person-only step.
create or replace function public.nx_mission_decide(p_step uuid, p_decision text, p_input jsonb default null, p_note text default null)
returns text language plpgsql security definer set search_path = public as $$
declare s nx_mission_steps; m nx_missions;
begin
  select * into s from nx_mission_steps where id = p_step for update;
  select * into m from nx_missions where id = s.mission_id;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who started this mission decides its steps.' using errcode = '42501'; end if;
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
revoke all on function public.nx_mission_decide(uuid, text, jsonb, text) from public, anon;
grant execute on function public.nx_mission_decide(uuid, text, jsonb, text) to authenticated;

-- Recovery: try a failed step again from the start. Its earlier effect, if any, is found and not repeated.
create or replace function public.nx_mission_retry(p_mission uuid) returns text
language plpgsql security definer set search_path = public as $$
declare m nx_missions; s nx_mission_steps;
begin
  select * into m from nx_missions where id = p_mission for update;
  if m.id is null or m.owner_id <> auth.uid() then raise exception 'Only the person who started this mission can retry it.' using errcode = '42501'; end if;
  select * into s from nx_mission_steps where mission_id = m.id and state in ('failed', 'retrying') order by position limit 1;
  if s.id is null then raise exception 'Nothing to retry.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'todo', attempts = 0, next_attempt_at = null, error = null, finished_at = null where id = s.id;
  update nx_missions set state = 'running', error = null, updated_at = now() where id = m.id;
  perform nx_mission_event(m.id, s.id, 'recovered', 'Retried by ' || nx_person_name(auth.uid()) || ': ' || s.label);
  return nx_mission_advance(m.id);
end $$;
revoke all on function public.nx_mission_retry(uuid) from public, anon;
grant execute on function public.nx_mission_retry(uuid) to authenticated;

-- Cancel: everything not yet done stops, including queued outside messages.
create or replace function public.nx_mission_cancel(p_mission uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update nx_missions set state = 'cancelled', updated_at = now() where id = p_mission and owner_id = auth.uid() and state not in ('completed', 'cancelled');
  if not found then raise exception 'This mission cannot be cancelled.' using errcode = 'P0001'; end if;
  update nx_mission_steps set state = 'cancelled'
   where mission_id = p_mission and state in ('todo', 'retrying', 'waiting_approval', 'waiting_person', 'failed');
  update nx_outbox set status = 'cancelled', updated_at = now() where mission_id = p_mission and status in ('queued', 'failed');
  perform nx_mission_event(p_mission, null, 'cancelled', 'Cancelled by ' || nx_person_name(auth.uid()) || '.');
end $$;
revoke all on function public.nx_mission_cancel(uuid) from public, anon;
grant execute on function public.nx_mission_cancel(uuid) to authenticated;

-- Run my due missions now (the app calls this when the person is here), or every due mission (the scheduler).
create or replace function public.nx_mission_run_mine() returns int
language plpgsql security definer set search_path = public as $$
declare v uuid; n int := 0;
begin
  if auth.uid() is null then return 0; end if;
  for v in select distinct m.id from nx_missions m join nx_mission_steps s on s.mission_id = m.id
            where m.owner_id = auth.uid() and m.state in ('ready', 'running', 'retrying') and s.state in ('todo', 'retrying') and coalesce(s.next_attempt_at, now()) <= now() limit 20 loop
    perform nx_mission_advance(v); n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.nx_mission_run_mine() from public, anon;
grant execute on function public.nx_mission_run_mine() to authenticated;

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
    perform nx_mission_event(d.id, null, 'deadline', 'The deadline passed before the mission finished.');
    insert into nx_notifications (user_id, org_id, kind, title, href) values (d.owner_id, d.org_id, 'system', left('Past its deadline: ' || d.title, 200), '/kaju/missions?m=' || d.id);
  end loop;
  return n;
end $$;
revoke all on function public.nx_mission_tick() from public, anon, authenticated;

-- The scheduler runs due steps every minute, in the database, whether or not anyone has the app open.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'nx-mission-tick';
    perform cron.schedule('nx-mission-tick', '* * * * *', 'select public.nx_mission_tick()');
  end if;
end $$;
