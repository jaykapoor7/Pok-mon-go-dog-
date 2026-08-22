-- ════════════════════════════════════════════════════════════════
-- Platform foundation (Phase 1) — generalize the core from "stray dogs"
-- to species-agnostic, organization-aware animal-welfare operations.
--
-- Purely ADDITIVE. Everything defaults to today's behaviour (species = 'dog'),
-- so the existing product keeps working untouched.
-- ════════════════════════════════════════════════════════════════

-- Species-agnostic animals + cases. Default 'dog' preserves all existing data.
alter table dogs  add column if not exists species text not null default 'dog';
alter table cases add column if not exists species text not null default 'dog';

-- DDS + operational workflows: an explicit follow-up date on a case.
alter table cases add column if not exists follow_up_at date;

-- Organization-aware: per-org configuration (enabled modules, animal noun,
-- custom case categories …) and member roles (field workers are first-class).
alter table ngos        add column if not exists config jsonb not null default '{}'::jsonb;
alter table ngo_members add column if not exists role   text  not null default 'member'; -- member | admin | field_worker

create index if not exists cases_species_idx     on cases (species);
create index if not exists cases_follow_up_idx    on cases (follow_up_at) where follow_up_at is not null;

-- Set/clear a case's follow-up date — the case handler or a verified NGO member.
create or replace function set_case_followup(
  p_case_id uuid,
  p_follow_up_at date
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update cases set
    follow_up_at = p_follow_up_at,
    last_activity_at = now()
  where id = p_case_id
    and (assignee_id = auth.uid() or is_ngo_member());
  return found;
end $$;

grant execute on function set_case_followup(uuid,date) to authenticated;
