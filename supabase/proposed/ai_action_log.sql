-- PROPOSED, NOT APPLIED. StrayPaw AI structured action log.
--
-- Every AI-prepared change is already saved through the normal RPCs and its
-- history entry says "Prepared with StrayPaw AI, confirmed by <name>". This
-- optional table adds a queryable log of those confirmations. Apply only
-- after review; /api/ai/log reports "not_deployed" until it exists.

create table if not exists public.ai_action_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ngo_id      uuid references public.ngos(id) on delete set null,
  kind        text not null check (kind in ('open_case','add_note','schedule_followup','record_care')),
  ok          boolean not null,
  target      text,
  summary     text
);

alter table public.ai_action_log enable row level security;

-- A person writes only their own rows, for their own organisation.
create policy ai_action_log_insert on public.ai_action_log for insert to authenticated
  with check (user_id = auth.uid() and (ngo_id is null or ngo_id = public.my_ngo()));

-- Members of an organisation read their organisation's log.
create policy ai_action_log_read on public.ai_action_log for select to authenticated
  using (ngo_id is not null and ngo_id = public.my_ngo());

revoke all on public.ai_action_log from anon;
