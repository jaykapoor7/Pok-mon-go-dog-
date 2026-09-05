-- ════════════════════════════════════════════════════════════════
-- Per-org dashboard data, a partner sees ONLY their own org's cases plus the
-- shared pool of unclaimed community reports (so they can still pick new ones
-- up). SECURITY DEFINER + my_ngo() means the scoping is decided from the caller's
-- authenticated session, not the client. Depends on: partner-onboarding.sql
-- (my_ngo), cases table. Idempotent.
-- ════════════════════════════════════════════════════════════════
create or replace function my_org_cases()
returns setof cases language sql security definer set search_path = public stable as $$
  select * from cases
  where ngo_id = my_ngo() or ngo_id is null
  order by last_activity_at desc
  limit 500;
$$;

grant execute on function my_org_cases() to authenticated;
