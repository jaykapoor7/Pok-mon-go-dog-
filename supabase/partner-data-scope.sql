-- ════════════════════════════════════════════════════════════════
-- Per-org dashboard data. A partner sees ONLY their own org's cases plus the
-- shared pool of unclaimed community reports. SECURITY DEFINER + my_ngo()
-- decides scope from the authenticated session, not client input.
--
-- Do not cap this function. Historical NGO imports routinely exceed 500 rows;
-- the client paginates its own organisation table and uses this function for
-- shared-pool discovery. Keeping a SQL LIMIT here made valid history appear
-- to disappear from dashboards and analytics.
-- ════════════════════════════════════════════════════════════════
create or replace function my_org_cases()
returns setof cases language sql security definer set search_path = public stable as $$
  select * from cases
  where ngo_id = my_ngo() or ngo_id is null
  order by last_activity_at desc;
$$;

grant execute on function my_org_cases() to authenticated;
