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

-- ── NGO self-service member management ──────────────────────────
-- Add a teammate to the caller's org by email. SECURITY DEFINER runs as the
-- function owner, which can read auth.users to resolve the email → user id.
create or replace function add_org_member(p_email text, p_role text default 'member')
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return json_build_object('ok', false, 'error', 'Not a partner organization.'); end if;
  if p_role not in ('member','admin','field_worker') then p_role := 'member'; end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'No StrayPaw account with that email — ask them to sign in once first.');
  end if;
  insert into ngo_members (user_id, ngo_id, role) values (v_uid, v_ngo, p_role)
    on conflict (user_id) do update set ngo_id = excluded.ngo_id, role = excluded.role;
  return json_build_object('ok', true);
end $$;

create or replace function remove_org_member(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- can't remove yourself (keeps at least the acting admin in the org)
  if p_user_id = auth.uid() then raise exception 'You cannot remove yourself.'; end if;
  delete from ngo_members where user_id = p_user_id and ngo_id = my_ngo();
  return found;
end $$;

grant execute on function add_org_member(text,text) to authenticated;
grant execute on function remove_org_member(uuid) to authenticated;
