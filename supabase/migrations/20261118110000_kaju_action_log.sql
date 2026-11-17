-- Kaju's action log: one row for each action a person confirmed from Kaju, and for each time Kaju read a facility's
-- patient records for a clinician.
--
-- The owner decided (2026-11-17) that Kaju may read human-health data, with the signed-in person's own access only,
-- and that each such read is recorded. Every Kaju-prepared change already has its own history on the record; this
-- table adds one queryable log across them, and is where each patient-record read is kept:
--   kind 'health_read': which register function was read and how many rows, never a patient detail.
--
-- Written by the server with the person's own session (src/sp3/ai/actionLog.ts, /api/ai/log), so row-level security
-- decides. Append-only: there is no update or delete policy, so nobody can change or remove a row through the API.
-- A person writes only rows about themselves, for an organisation they belong to; members of an organisation read
-- its rows; a person always reads their own.
--
-- Additive: one new table, its policies, two indexes and grants. Nothing existing changes.
-- Applied on staging (checked in a rolled-back run as a sample clinician and NGO coordinator) and production, 2026-11-17.
-- Rollback: drop table public.ai_action_log;

create table if not exists public.ai_action_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ngo_id          uuid references public.ngos(id) on delete set null,
  -- A health facility, laboratory, reviewing office or other partner organisation, for work outside an NGO.
  organisation_id uuid,
  kind            text not null check (kind in ('open_case','add_note','schedule_followup','record_care','add_task','register_exposure','health_read')),
  ok              boolean not null,
  target          text check (target is null or length(target) <= 200),
  summary         text check (summary is null or length(summary) <= 200)
);

create index if not exists ai_action_log_ngo on public.ai_action_log (ngo_id, created_at desc) where ngo_id is not null;
create index if not exists ai_action_log_org on public.ai_action_log (organisation_id, created_at desc) where organisation_id is not null;

alter table public.ai_action_log enable row level security;

drop policy if exists ai_action_log_insert on public.ai_action_log;
create policy ai_action_log_insert on public.ai_action_log for insert to authenticated
  with check (user_id = auth.uid()
    and (ngo_id is null or public.nx_is_member(ngo_id))
    and (organisation_id is null or public.nx_is_member(organisation_id)));

drop policy if exists ai_action_log_read on public.ai_action_log;
create policy ai_action_log_read on public.ai_action_log for select to authenticated
  using (user_id = auth.uid()
    or (ngo_id is not null and public.nx_is_member(ngo_id))
    or (organisation_id is not null and public.nx_is_member(organisation_id)));

revoke all on public.ai_action_log from public, anon;
grant select, insert on public.ai_action_log to authenticated;
-- Supabase's default privileges also grant update, delete and truncate on new tables; truncate is not bound by
-- row-level security, so these are taken back. Signed-in people can read and add, nothing else.
revoke update, delete, truncate, references, trigger on public.ai_action_log from authenticated;
