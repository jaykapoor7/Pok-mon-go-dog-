-- PROPOSED, NOT APPLIED. StrayPaw AI structured action log.
--
-- Every AI-prepared change is already saved through the normal RPCs and its
-- history entry says "Prepared with StrayPaw AI, confirmed by <name>". This
-- optional table adds a queryable log of those confirmations, of tasks and
-- bite records confirmed from Kaju, and of each time Kaju read a facility's
-- patient records for a clinician (health_read: the register function and a
-- row count, never a patient detail). Apply only after review; /api/ai/log
-- and src/sp3/ai/actionLog.ts report "not_deployed" until it exists, and the
-- server keeps its own log line for each patient-record read meanwhile.

create table if not exists public.ai_action_log (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ngo_id          uuid references public.ngos(id) on delete set null,
  -- A facility, reviewing office or other partner organisation, for work outside an NGO.
  organisation_id uuid,
  kind            text not null check (kind in ('open_case','add_note','schedule_followup','record_care','add_task','register_exposure','health_read')),
  ok              boolean not null,
  target          text,
  summary         text
);

alter table public.ai_action_log enable row level security;

-- A person writes only their own rows, for their own organisation or one they are a member of.
create policy ai_action_log_insert on public.ai_action_log for insert to authenticated
  with check (user_id = auth.uid()
    and (ngo_id is null or ngo_id = public.my_ngo())
    and (organisation_id is null or public.nx_is_member(organisation_id)));

-- Members of an organisation read their organisation's log; a person always reads their own rows.
create policy ai_action_log_read on public.ai_action_log for select to authenticated
  using (user_id = auth.uid()
    or (ngo_id is not null and ngo_id = public.my_ngo())
    or (organisation_id is not null and public.nx_is_member(organisation_id)));

grant select, insert on public.ai_action_log to authenticated;
revoke all on public.ai_action_log from anon;
