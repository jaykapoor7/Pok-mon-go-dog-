-- ════════════════════════════════════════════════════════════════
-- Team-lead permissions, make the org "lead" (admin) a first-class role with
-- special powers, and enforce it SERVER-SIDE so a normal member can't manage the
-- team by calling the RPCs directly. Multi-tenant: every check is scoped to the
-- caller's own org (my_ngo()), so orgs stay secluded from each other.
--
-- Depends on: partner-onboarding.sql (my_ngo, ngo_members), location-privacy.sql
-- (is_ngo_member), team.sql (the RPCs redefined below). Idempotent.
-- ════════════════════════════════════════════════════════════════

-- Is the caller the team lead (admin) of their own org?
create or replace function is_ngo_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from ngo_members
    where user_id = auth.uid() and ngo_id = my_ngo() and role = 'admin'
  );
$$;

-- May the caller manage their org's team? True when they're the lead (admin),
-- OR when the org has no admin yet (bootstrap: a freshly created org whose
-- founder hasn't been marked admin isn't locked out).
create or replace function can_manage_org()
returns boolean language sql security definer set search_path = public stable as $$
  select is_ngo_member() and (
    is_ngo_admin()
    or not exists (select 1 from ngo_members where ngo_id = my_ngo() and role = 'admin')
  );
$$;

grant execute on function is_ngo_admin() to authenticated;
grant execute on function can_manage_org() to authenticated;

-- ── Lead-gated team management (redefines team.sql RPCs) ────────────

-- Add a teammate by email, lead only. Scoped to the caller's org.
create or replace function add_org_member(p_email text, p_role text default 'member')
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_ngo uuid;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then return json_build_object('ok', false, 'error', 'Not a partner organization.'); end if;
  if not can_manage_org() then
    return json_build_object('ok', false, 'error', 'Only your team lead can add members.');
  end if;
  if p_role not in ('member','admin','field_worker') then p_role := 'member'; end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'No StrayPaw account with that email, ask them to sign in once first.');
  end if;
  insert into ngo_members (user_id, ngo_id, role) values (v_uid, v_ngo, p_role)
    on conflict (user_id) do update set ngo_id = excluded.ngo_id, role = excluded.role;
  return json_build_object('ok', true);
end $$;

-- Remove a teammate, lead only, own org only, never yourself.
create or replace function remove_org_member(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_org() then raise exception 'Only your team lead can remove members.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove yourself.'; end if;
  delete from ngo_members where user_id = p_user_id and ngo_id = my_ngo();
  return found;
end $$;

-- Change a teammate's role, lead only. Keeps at least one lead in the org.
create or replace function set_member_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid; v_admins int;
begin
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Not a member'; end if;
  if not can_manage_org() then raise exception 'Only your team lead can change roles.'; end if;
  if p_role not in ('member', 'admin', 'field_worker') then raise exception 'Invalid role'; end if;

  -- Don't let the org be left with no lead (demoting the last admin).
  if p_role <> 'admin' then
    select count(*) into v_admins from ngo_members where ngo_id = v_ngo and role = 'admin';
    if v_admins <= 1 and exists (
      select 1 from ngo_members where user_id = p_user_id and ngo_id = v_ngo and role = 'admin'
    ) then
      raise exception 'Keep at least one team lead, promote someone else first.';
    end if;
  end if;

  update ngo_members set role = p_role where user_id = p_user_id and ngo_id = v_ngo;
  return found;
end $$;

grant execute on function add_org_member(text,text) to authenticated;
grant execute on function remove_org_member(uuid) to authenticated;
grant execute on function set_member_role(uuid,text) to authenticated;
