-- ════════════════════════════════════════════════════════════════
-- Tasks, assignable field tasks (not every task maps to a case). Create a
-- task, assign it to a teammate, give it a due date, mark it done.
-- Depends on: partner-onboarding.sql (my_ngo, is_ngo_member). Idempotent.
-- ════════════════════════════════════════════════════════════════

create table if not exists tasks (
  id            uuid primary key default gen_random_uuid(),
  ngo_id        uuid,
  title         text not null,
  assignee_id   uuid,
  assignee_name text,
  due_at        date,
  status        text not null default 'open', -- open | done
  case_id       uuid,
  animal_id     uuid,
  created_by_id uuid,
  created_at    timestamptz not null default now()
);
create index if not exists tasks_ngo_idx on tasks (ngo_id, status);

alter table tasks enable row level security;
-- Tasks are private to the owning org (my_ngo() runs as the caller).
drop policy if exists tasks_read on tasks;
create policy tasks_read on tasks for select using (ngo_id = my_ngo());

create or replace function create_task(
  p_title text, p_assignee_id uuid default null, p_assignee_name text default null,
  p_due_at date default null, p_case_id uuid default null, p_animal_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a partner organization'; end if;
  insert into tasks (ngo_id, title, assignee_id, assignee_name, due_at, case_id, animal_id, created_by_id)
  values (v_ngo, p_title, p_assignee_id, p_assignee_name, p_due_at, p_case_id, p_animal_id, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function set_task_status(p_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update tasks set status = p_status where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

create or replace function assign_task(p_id uuid, p_assignee_id uuid, p_assignee_name text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update tasks set assignee_id = p_assignee_id, assignee_name = p_assignee_name
   where id = p_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function create_task(text,uuid,text,date,uuid,uuid) to authenticated;
grant execute on function set_task_status(uuid,text) to authenticated;
grant execute on function assign_task(uuid,uuid,text) to authenticated;
