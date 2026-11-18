-- Kaju intelligence layer: rollout control for paid inference, saved conversations, and pilot feedback.
--
-- Additive: new tables, functions, policies and grants, and one new nullable column (kaju_model_usage.org_id, no
-- default, so no rewrite). No existing row, function or policy changes.
-- Nothing here turns paid inference on. The switch row is created OFF and only an owner with SQL access turns it on.
--
-- 1. Rollout control (paid model use, fail-closed)
--    kaju_ai_control  one row: the database switch for every paid model call (live = false by default), and the
--                     owner's user id. The app also needs STRAYPAW_AI_MODE=model and the rest of the environment
--                     (src/lib/ai/inference.ts); both locks must be open.
--    kaju_ai_access   grants: a person or an organisation may use the model, each with a monthly rupee budget and a
--                     daily request cap. Written only with SQL access (service role); read by nobody through the API.
--    kaju_ai_eligibility(p_org)  what the gate needs before each run, for the caller only (pre-check and status).
--    kaju_ai_reserve / kaju_ai_settle  server only: reserve an answer's whole allowance under one lock before any
--                     model call, then replace it with the real cost. Parallel requests cannot overshoot a budget.
--    kaju_ai_stop()   the owner's emergency stop from inside the app. Turning the switch back on needs SQL access.
--
-- 2. Saved conversations
--    kaju_threads / kaju_thread_turns  a person's own conversations, readable only by them and only while they still
--    belong to the organisation the conversation was held in. Health-workspace conversations are never saved here.
--
-- 3. Pilot feedback and observability
--    kaju_turn_log   one row per Kaju answer: which tools ran, how it ended, how long it took, tokens and cost. Never
--                    the question or the answer text.
--    kaju_feedback   a person's rating of an answer, an optional reason, optional words and minutes saved.
--    kaju_pilot_metrics(p_org, p_days)  aggregates for an organisation's admins and leads, or every organisation for
--                    the owner. Counts only; no person is named.
--
-- Rollback: supabase/rollback/20261119090000_kaju_intelligence_layer-rollback.sql (tested in scripts/db-tests).

-- ── 1. Rollout control ────────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.kaju_ai_control (
  id boolean primary key default true check (id),
  live boolean not null default false,
  owner_user_id uuid references auth.users(id),
  note text check (note is null or length(note) <= 300),
  updated_by text check (updated_by is null or length(updated_by) <= 120),
  updated_at timestamptz not null default now()
);
insert into public.kaju_ai_control (id, live) values (true, false) on conflict (id) do nothing;
alter table public.kaju_ai_control enable row level security;
revoke all on public.kaju_ai_control from public, anon, authenticated;

create table if not exists public.kaju_ai_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid,
  monthly_budget_inr numeric(10,2) not null check (monthly_budget_inr > 0 and monthly_budget_inr <= 100000),
  daily_requests int not null check (daily_requests between 1 and 5000),
  expires_at timestamptz,
  note text check (note is null or length(note) <= 300),
  granted_by text not null check (length(granted_by) between 2 and 120),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (num_nonnulls(user_id, org_id) = 1)
);
create index if not exists kaju_ai_access_user on public.kaju_ai_access (user_id) where revoked_at is null;
create index if not exists kaju_ai_access_org on public.kaju_ai_access (org_id) where revoked_at is null;
alter table public.kaju_ai_access enable row level security;
revoke all on public.kaju_ai_access from public, anon, authenticated;

-- Spend reservations. Before any model call the server reserves the most that answer may cost, under one database-wide
-- lock, so parallel requests cannot all pass the same remaining budget. The reservation counts as spent (and as one
-- request today) until the server settles it with the real cost; a run that dies without settling stays counted in
-- full, which errs towards stopping. Written and read only by the server's service role.
create table if not exists public.kaju_ai_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  purpose text not null check (purpose in ('kaju_chat', 'photo_check')),
  amount_inr numeric(10,4) not null check (amount_inr > 0 and amount_inr <= 100),
  created_at timestamptz not null default now()
);
create index if not exists kaju_ai_reservations_user on public.kaju_ai_reservations (user_id, created_at);
alter table public.kaju_ai_reservations enable row level security;
revoke all on public.kaju_ai_reservations from public, anon, authenticated;

-- The organisation a run was for, which may be a health facility or reviewing office rather than an NGO
-- (ngo_id references ngos, so it cannot hold those). Nullable, no default: a metadata-only change on an empty table.
alter table public.kaju_model_usage add column if not exists org_id uuid;
create index if not exists kaju_model_usage_org_id on public.kaju_model_usage (org_id, created_at desc) where org_id is not null;

-- What has been used or reserved, for one person and one organisation, in India's day and month. Internal.
create or replace function public.kaju_ai_spent(p_user uuid, p_org uuid)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  with t as (select (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as d0,
                    (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as m0),
       u as (select m.user_id, coalesce(m.org_id, m.ngo_id) as org, m.cost_inr as amount, m.created_at from public.kaju_model_usage m, t where m.created_at >= t.m0
             union all
             select r.user_id, r.org_id, r.amount_inr, r.created_at from public.kaju_ai_reservations r, t where r.created_at >= t.m0)
  select jsonb_build_object(
    'user_today', (select count(*) from u, t where u.user_id = p_user and u.created_at >= t.d0),
    'org_today', (select count(*) from u, t where p_org is not null and u.org = p_org and u.created_at >= t.d0),
    'month_inr', (select coalesce(sum(u.amount), 0) from u),
    'user_month_inr', (select coalesce(sum(u.amount), 0) from u where u.user_id = p_user),
    'org_month_inr', (select coalesce(sum(u.amount), 0) from u where p_org is not null and u.org = p_org));
$$;
revoke all on function public.kaju_ai_spent(uuid, uuid) from public, anon, authenticated;

-- Everything the gate needs before a run, for the caller only (used for the pre-check and status; the binding
-- decision is kaju_ai_reserve). Organisation figures are returned only for an organisation the caller belongs to.
create or replace function public.kaju_ai_eligibility(p_org uuid default null)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  with o as (select case when p_org is not null and public.nx_is_member(p_org) then p_org
                         when p_org is null then public.my_ngo() end as id),
       ug as (select a.monthly_budget_inr, a.daily_requests from public.kaju_ai_access a
               where a.user_id = auth.uid() and a.revoked_at is null and (a.expires_at is null or a.expires_at > now())
               order by a.created_at desc limit 1),
       og as (select a.monthly_budget_inr, a.daily_requests from public.kaju_ai_access a, o
               where o.id is not null and a.org_id = o.id and a.revoked_at is null and (a.expires_at is null or a.expires_at > now())
               order by a.created_at desc limit 1)
  select case when auth.uid() is null then null else
    jsonb_build_object(
      'live', coalesce((select c.live from public.kaju_ai_control c where c.id), false),
      'user_grant', (select jsonb_build_object('monthly_budget_inr', ug.monthly_budget_inr, 'daily_requests', ug.daily_requests) from ug),
      'org_grant', (select jsonb_build_object('monthly_budget_inr', og.monthly_budget_inr, 'daily_requests', og.daily_requests) from og))
    || public.kaju_ai_spent(auth.uid(), (select o.id from o)) end;
$$;
revoke all on function public.kaju_ai_eligibility(uuid) from public, anon;
grant execute on function public.kaju_ai_eligibility(uuid) to authenticated;

-- The binding decision. Server only (service role), for a user id the server verified from the session token. Under one
-- transaction-scoped advisory lock it re-reads the switch, grants and spend (including other reservations) and, only
-- if this answer's whole allowance still fits every limit, reserves it. The limits from the deployment's settings are
-- passed in; grants and the switch come from the database and cannot be widened by the caller.
create or replace function public.kaju_ai_reserve(p_user uuid, p_org uuid, p_purpose text, p_amount numeric,
                                                  p_ceiling numeric, p_user_daily int, p_org_daily int)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  org uuid; s jsonb; rid uuid;
  ug_m numeric; ug_d int; og_m numeric; og_d int;
begin
  if p_user is null or p_purpose is null or p_amount is null or p_amount <= 0 or p_amount > 100
     or coalesce(p_ceiling, 0) <= 0 or coalesce(p_user_daily, 0) <= 0 or coalesce(p_org_daily, 0) <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;
  perform pg_advisory_xact_lock(hashtext('straypaw.kaju_ai_spend'));
  if not coalesce((select c.live from public.kaju_ai_control c where c.id), false) then
    return jsonb_build_object('ok', false, 'reason', 'switched_off');
  end if;
  org := case when p_org is not null and public.nx_user_is_member(p_org, p_user) then p_org end;
  select a.monthly_budget_inr, a.daily_requests into ug_m, ug_d from public.kaju_ai_access a
   where a.user_id = p_user and a.revoked_at is null and (a.expires_at is null or a.expires_at > now()) order by a.created_at desc limit 1;
  if org is not null then
    select a.monthly_budget_inr, a.daily_requests into og_m, og_d from public.kaju_ai_access a
     where a.org_id = org and a.revoked_at is null and (a.expires_at is null or a.expires_at > now()) order by a.created_at desc limit 1;
  end if;
  if ug_m is null and og_m is null then return jsonb_build_object('ok', false, 'reason', 'no_grant'); end if;
  s := public.kaju_ai_spent(p_user, org);
  if (s->>'month_inr')::numeric + p_amount > p_ceiling then return jsonb_build_object('ok', false, 'reason', 'ceiling'); end if;
  if (s->>'user_today')::int >= p_user_daily then return jsonb_build_object('ok', false, 'reason', 'user_daily'); end if;
  if org is not null and (s->>'org_today')::int >= p_org_daily then return jsonb_build_object('ok', false, 'reason', 'org_daily'); end if;
  if ug_m is not null and ((s->>'user_month_inr')::numeric + p_amount > ug_m or (s->>'user_today')::int >= ug_d) then
    return jsonb_build_object('ok', false, 'reason', 'user_budget');
  end if;
  if og_m is not null and ((s->>'org_month_inr')::numeric + p_amount > og_m or (s->>'org_today')::int >= og_d) then
    return jsonb_build_object('ok', false, 'reason', 'org_budget');
  end if;
  insert into public.kaju_ai_reservations (user_id, org_id, purpose, amount_inr) values (p_user, org, p_purpose, p_amount) returning id into rid;
  return jsonb_build_object('ok', true, 'id', rid);
end $$;
revoke all on function public.kaju_ai_reserve(uuid, uuid, text, numeric, numeric, int, int) from public, anon, authenticated;
grant execute on function public.kaju_ai_reserve(uuid, uuid, text, numeric, numeric, int, int) to service_role;

-- Replace a reservation with what the run really used. Server only. If this fails, the reservation stays counted.
create or replace function public.kaju_ai_settle(p_id uuid, p_model text, p_input_tokens int, p_output_tokens int, p_cost_inr numeric)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare r public.kaju_ai_reservations;
begin
  delete from public.kaju_ai_reservations where id = p_id returning * into r;
  if r.id is null then return false; end if;
  insert into public.kaju_model_usage (user_id, ngo_id, org_id, purpose, model, input_tokens, output_tokens, cost_inr)
  values (r.user_id, (select n.id from public.ngos n where n.id = r.org_id), r.org_id, r.purpose, left(coalesce(nullif(p_model, ''), 'unknown'), 120),
          least(greatest(coalesce(p_input_tokens, 0), 0), 5000000), least(greatest(coalesce(p_output_tokens, 0), 0), 500000),
          least(greatest(coalesce(p_cost_inr, 0), 0), 100000));
  return true;
end $$;
revoke all on function public.kaju_ai_settle(uuid, text, int, int, numeric) from public, anon, authenticated;
grant execute on function public.kaju_ai_settle(uuid, text, int, int, numeric) to service_role;

-- The owner's emergency stop. Only stops; starting again is a deliberate SQL change.
create or replace function public.kaju_ai_stop(p_note text default null)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.kaju_ai_control;
begin
  select * into c from public.kaju_ai_control where id;
  if auth.uid() is null or c.owner_user_id is null or c.owner_user_id <> auth.uid() then
    raise exception 'Only the owner can stop Kaju''s model use here' using errcode = '42501';
  end if;
  update public.kaju_ai_control set live = false, note = left(coalesce(p_note, 'Stopped from the app'), 300),
         updated_by = 'owner (app)', updated_at = now() where id;
  return true;
end $$;
revoke all on function public.kaju_ai_stop(text) from public, anon;
grant execute on function public.kaju_ai_stop(text) to authenticated;

-- Whether the caller is the owner, and the switch's state, for the owner's control panel. Nothing for anyone else.
create or replace function public.kaju_ai_owner_status()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select case when auth.uid() is not null and c.owner_user_id = auth.uid() then jsonb_build_object(
    'live', c.live, 'note', c.note, 'updated_by', c.updated_by, 'updated_at', c.updated_at,
    'grants', (select coalesce(jsonb_agg(jsonb_build_object('kind', case when a.user_id is null then 'organisation' else 'person' end,
                 'monthly_budget_inr', a.monthly_budget_inr, 'daily_requests', a.daily_requests, 'expires_at', a.expires_at, 'note', a.note) order by a.created_at), '[]'::jsonb)
               from public.kaju_ai_access a where a.revoked_at is null and (a.expires_at is null or a.expires_at > now())),
    'month_inr', (public.kaju_ai_spent(null, null)->>'month_inr')::numeric,
    'open_reservations', (select count(*) from public.kaju_ai_reservations),
    'month_runs', (select count(*) from public.kaju_model_usage u
                  where u.created_at >= (date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'))
  ) end
  from public.kaju_ai_control c where c.id;
$$;
revoke all on function public.kaju_ai_owner_status() from public, anon;
grant execute on function public.kaju_ai_owner_status() to authenticated;

-- ── 2. Saved conversations ────────────────────────────────────────────────────────────────────────────────────────

create table if not exists public.kaju_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  org_id uuid,
  workspace text check (workspace is null or workspace in ('ngo', 'government', 'research', 'none')),
  title text not null check (length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists kaju_threads_mine on public.kaju_threads (user_id, updated_at desc) where archived_at is null;
alter table public.kaju_threads enable row level security;
drop policy if exists kaju_threads_own on public.kaju_threads;
create policy kaju_threads_own on public.kaju_threads for select to authenticated
  using (user_id = (select auth.uid()) and (org_id is null or public.nx_is_member(org_id)));
drop policy if exists kaju_threads_add on public.kaju_threads;
create policy kaju_threads_add on public.kaju_threads for insert to authenticated
  with check (user_id = (select auth.uid()) and (org_id is null or public.nx_is_member(org_id)) and archived_at is null);
drop policy if exists kaju_threads_edit on public.kaju_threads;
create policy kaju_threads_edit on public.kaju_threads for update to authenticated
  using (user_id = (select auth.uid()) and (org_id is null or public.nx_is_member(org_id)))
  with check (user_id = (select auth.uid()) and (org_id is null or public.nx_is_member(org_id)));
drop policy if exists kaju_threads_remove on public.kaju_threads;
create policy kaju_threads_remove on public.kaju_threads for delete to authenticated using (user_id = (select auth.uid()));
-- Supabase grants every privilege on new tables by default; take them all back, then give only what is used, so the
-- column list below really is the only thing that can be updated (org_id and user_id never change).
revoke all on public.kaju_threads from public, anon, authenticated;
grant select, insert, delete on public.kaju_threads to authenticated;
grant update (title, updated_at, archived_at) on public.kaju_threads to authenticated;

create table if not exists public.kaju_thread_turns (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.kaju_threads(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  role text not null check (role in ('user', 'kaju')),
  text text not null check (length(text) <= 12000),
  -- What the answer showed (sources, tables, charts), never prepared changes: those are not confirmable later.
  reply jsonb check (reply is null or pg_column_size(reply) <= 120000),
  created_at timestamptz not null default now()
);
create index if not exists kaju_thread_turns_thread on public.kaju_thread_turns (thread_id, id);
alter table public.kaju_thread_turns enable row level security;
drop policy if exists kaju_thread_turns_own on public.kaju_thread_turns;
create policy kaju_thread_turns_own on public.kaju_thread_turns for select to authenticated using (
  exists (select 1 from public.kaju_threads t where t.id = thread_id and t.user_id = (select auth.uid()) and (t.org_id is null or public.nx_is_member(t.org_id))));
drop policy if exists kaju_thread_turns_add on public.kaju_thread_turns;
create policy kaju_thread_turns_add on public.kaju_thread_turns for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.kaju_threads t where t.id = thread_id and t.user_id = (select auth.uid()) and t.archived_at is null and (t.org_id is null or public.nx_is_member(t.org_id))));
revoke all on public.kaju_thread_turns from public, anon, authenticated;
grant select, insert on public.kaju_thread_turns to authenticated;

-- Keep a conversation's "last used" time current when a turn is added.
create or replace function public.kaju_thread_touch() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.kaju_threads set updated_at = now() where id = new.thread_id; return new; end $$;
revoke all on function public.kaju_thread_touch() from public, anon, authenticated;
drop trigger if exists kaju_thread_touch on public.kaju_thread_turns;
create trigger kaju_thread_touch after insert on public.kaju_thread_turns for each row execute function public.kaju_thread_touch();

-- Conversations nobody has used for 180 days are removed. Run by the owner or a scheduled job with SQL access.
create or replace function public.kaju_threads_purge(p_days int default 180) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.kaju_threads where updated_at < now() - make_interval(days => greatest(p_days, 30));
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.kaju_threads_purge(int) from public, anon, authenticated;

-- ── 3. Pilot feedback and observability ───────────────────────────────────────────────────────────────────────────

create table if not exists public.kaju_turn_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  workspace text check (workspace is null or length(workspace) <= 40),
  surface text not null default 'other' check (surface in ('dock', 'page', 'channel', 'voice', 'capture', 'other')),
  page_kind text check (page_kind is null or length(page_kind) <= 80),
  intent text check (intent is null or length(intent) <= 60),
  engine text not null check (engine in ('model', 'tools')),
  outcome text not null check (outcome in ('answered', 'prepared', 'clarify', 'no_match', 'limit', 'refused', 'error')),
  tools text[] not null default '{}' check (cardinality(tools) <= 16),
  tool_failures int not null default 0 check (tool_failures between 0 and 50),
  proposals int not null default 0 check (proposals between 0 and 50),
  citations int not null default 0 check (citations between 0 and 200),
  latency_ms int check (latency_ms is null or latency_ms between 0 and 600000),
  input_tokens int check (input_tokens is null or input_tokens between 0 and 5000000),
  output_tokens int check (output_tokens is null or output_tokens between 0 and 500000),
  cost_inr numeric(10,4) check (cost_inr is null or cost_inr between 0 and 10000),
  retry boolean not null default false,
  correction boolean not null default false,
  lang text check (lang is null or lang in ('en', 'hi', 'hinglish', 'other'))
);
create index if not exists kaju_turn_log_org on public.kaju_turn_log (org_id, created_at desc);
create index if not exists kaju_turn_log_user on public.kaju_turn_log (user_id, created_at desc);
alter table public.kaju_turn_log enable row level security;
-- Written only by the server (service role) with the user id it verified, so pilot figures cannot be padded from a
-- browser. People read their own rows.
drop policy if exists kaju_turn_log_add on public.kaju_turn_log;
drop policy if exists kaju_turn_log_own on public.kaju_turn_log;
create policy kaju_turn_log_own on public.kaju_turn_log for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.kaju_turn_log from public, anon, authenticated;
grant select on public.kaju_turn_log to authenticated;

create table if not exists public.kaju_feedback (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references public.kaju_turn_log(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  reason text check (reason is null or reason in ('wrong', 'not_useful', 'incomplete', 'slow', 'unsafe', 'great', 'saved_time', 'other')),
  comment text check (comment is null or length(comment) <= 1000),
  minutes_saved int check (minutes_saved is null or minutes_saved between 0 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (turn_id, user_id)
);
alter table public.kaju_feedback enable row level security;
drop policy if exists kaju_feedback_own on public.kaju_feedback;
create policy kaju_feedback_own on public.kaju_feedback for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists kaju_feedback_add on public.kaju_feedback;
create policy kaju_feedback_add on public.kaju_feedback for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.kaju_turn_log l where l.id = turn_id and l.user_id = (select auth.uid())));
drop policy if exists kaju_feedback_edit on public.kaju_feedback;
create policy kaju_feedback_edit on public.kaju_feedback for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.kaju_turn_log l where l.id = turn_id and l.user_id = (select auth.uid())));
revoke all on public.kaju_feedback from public, anon, authenticated;
grant select, insert on public.kaju_feedback to authenticated;
grant update (rating, reason, comment, minutes_saved, updated_at) on public.kaju_feedback to authenticated;

-- Aggregates for an organisation's admins and leads (p_org), or every organisation for the owner (p_org null).
-- Counts only. Comments are returned for the owner and the organisation's admins without the writer's name or time.
create or replace function public.kaju_pilot_metrics(p_org uuid default null, p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
        owner boolean; allowed boolean; r jsonb;
begin
  if auth.uid() is null then return null; end if;
  owner := exists (select 1 from public.kaju_ai_control c where c.id and c.owner_user_id = auth.uid());
  allowed := case when p_org is null then owner else (owner or coalesce(public.nx_org_role(p_org), '') in ('admin', 'lead')) end;
  if not allowed then return null; end if;
  with l as (select * from public.kaju_turn_log where created_at >= since and (p_org is null or org_id = p_org)),
       f as (select f.* from public.kaju_feedback f join l on l.id = f.turn_id)
  select jsonb_build_object(
    'days', least(greatest(coalesce(p_days, 30), 1), 365),
    'turns', (select count(*) from l),
    'people', (select count(distinct user_id) from l),
    'organisations', case when p_org is null then (select count(distinct org_id) from l) else 1 end,
    'by_outcome', (select coalesce(jsonb_object_agg(outcome, n), '{}'::jsonb) from (select outcome, count(*) n from l group by outcome) x),
    'by_engine', (select coalesce(jsonb_object_agg(engine, n), '{}'::jsonb) from (select engine, count(*) n from l group by engine) x),
    'by_surface', (select coalesce(jsonb_object_agg(surface, n), '{}'::jsonb) from (select surface, count(*) n from l group by surface) x),
    'by_lang', (select coalesce(jsonb_object_agg(coalesce(lang, 'unknown'), n), '{}'::jsonb) from (select lang, count(*) n from l group by lang) x),
    'top_intents', (select coalesce(jsonb_agg(jsonb_build_object('intent', intent, 'turns', n, 'completed', done) order by n desc), '[]'::jsonb)
                    from (select coalesce(intent, 'unclassified') intent, count(*) n, count(*) filter (where outcome in ('answered', 'prepared')) done
                          from l group by 1 order by 2 desc limit 15) x),
    'top_tools', (select coalesce(jsonb_agg(jsonb_build_object('tool', tool, 'runs', n) order by n desc), '[]'::jsonb)
                  from (select tool, count(*) n from l, unnest(l.tools) tool group by tool order by 2 desc limit 15) x),
    'tool_failure_turns', (select count(*) from l where tool_failures > 0),
    'retries', (select count(*) from l where retry),
    'corrections', (select count(*) from l where correction),
    'median_latency_ms', (select percentile_disc(0.5) within group (order by latency_ms) from l where latency_ms is not null),
    'p90_latency_ms', (select percentile_disc(0.9) within group (order by latency_ms) from l where latency_ms is not null),
    'model_cost_inr', (select coalesce(sum(cost_inr), 0) from l),
    'model_tokens', jsonb_build_object('input', (select coalesce(sum(input_tokens), 0) from l), 'output', (select coalesce(sum(output_tokens), 0) from l)),
    'cost_per_completed_inr', (select case when count(*) filter (where outcome in ('answered', 'prepared')) = 0 then null
                                  else round(coalesce(sum(cost_inr), 0) / count(*) filter (where outcome in ('answered', 'prepared')), 4) end from l),
    'feedback', jsonb_build_object('up', (select count(*) from f where rating = 1), 'down', (select count(*) from f where rating = -1),
                 'minutes_saved', (select coalesce(sum(minutes_saved), 0) from f),
                 'reasons', (select coalesce(jsonb_object_agg(reason, n), '{}'::jsonb) from (select reason, count(*) n from f where reason is not null group by reason) x)),
    'comments', (select coalesce(jsonb_agg(jsonb_build_object('rating', rating, 'reason', reason, 'comment', comment) order by created_at desc), '[]'::jsonb)
                 from (select * from f where comment is not null order by created_at desc limit 20) x)
  ) into r;
  return r;
end $$;
revoke all on function public.kaju_pilot_metrics(uuid, int) from public, anon;
grant execute on function public.kaju_pilot_metrics(uuid, int) to authenticated;
