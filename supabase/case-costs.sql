-- ════════════════════════════════════════════════════════════════
-- Case cost tracking — what a rescue is expected to cost and what's been
-- spent so far. Feeds the case page's transparency + ties naturally into a
-- fundraiser for the same animal.
--
-- Depends on: cases.sql (cases table), location-privacy.sql (is_ngo_member()).
-- Idempotent.
-- ════════════════════════════════════════════════════════════════

alter table cases add column if not exists cost_estimate integer; -- INR, planned
alter table cases add column if not exists cost_spent    integer; -- INR, to date

-- Only the case's handler (assignee) or a verified NGO member may set costs.
create or replace function set_case_cost(
  p_case_id  uuid,
  p_estimate integer default null,
  p_spent    integer default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update cases set
    cost_estimate = coalesce(p_estimate, cost_estimate),
    cost_spent    = coalesce(p_spent, cost_spent),
    last_activity_at = now()
  where id = p_case_id
    and (assignee_id = auth.uid() or is_ngo_member());
  return found;
end $$;

grant execute on function set_case_cost(uuid,integer,integer) to authenticated;
