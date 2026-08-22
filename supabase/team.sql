-- ════════════════════════════════════════════════════════════════
-- Team management — list an org's members and manage roles (field workers
-- are first-class). Depends on: partner-onboarding.sql (ngo_members, my_ngo),
-- cases.sql (volunteers for display names). Idempotent.
-- ════════════════════════════════════════════════════════════════

-- Members of the caller's org, with display names (SECURITY DEFINER bypasses
-- the self-only RLS on ngo_members so a member can see the whole team).
create or replace function my_org_members()
returns table(user_id uuid, role text, name text)
language sql security definer set search_path = public as $$
  select m.user_id, coalesce(m.role, 'member'), coalesce(v.name, 'Member')
  from ngo_members m
  left join volunteers v on v.id = m.user_id
  where m.ngo_id = my_ngo();
$$;

-- Set a teammate's role (member | admin | field_worker). Any member of the
-- same org may manage roles for the pilot.
create or replace function set_member_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from ngo_members where user_id = auth.uid() and ngo_id = my_ngo()) then
    raise exception 'Not a member';
  end if;
  if p_role not in ('member', 'admin', 'field_worker') then
    raise exception 'Invalid role';
  end if;
  update ngo_members set role = p_role where user_id = p_user_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function my_org_members() to authenticated;
grant execute on function set_member_role(uuid,text) to authenticated;
