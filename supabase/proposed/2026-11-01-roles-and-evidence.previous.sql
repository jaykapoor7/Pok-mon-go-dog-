-- Production definitions before 2026-11-01-roles-and-evidence.sql (for rollback).
CREATE OR REPLACE FUNCTION public.add_org_member(p_email text, p_role text DEFAULT 'member'::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ DECLARE v_uid uuid; v_ngo uuid; v_inserted uuid; BEGIN SELECT public.my_ngo() INTO v_ngo; IF v_ngo IS NULL THEN RETURN json_build_object('ok',false,'error','Not a partner organization.'); END IF; IF NOT public.can_manage_org() THEN RETURN json_build_object('ok',false,'error','Only your team lead can add members.'); END IF; IF p_role IS NULL OR p_role NOT IN ('member','admin','field_worker') THEN p_role := 'member'; END IF; SELECT id INTO v_uid FROM auth.users WHERE lower(email)=lower(btrim(p_email)) LIMIT 1; IF v_uid IS NULL THEN RETURN json_build_object('ok',false,'error','No StrayPaw account with that email, ask them to sign in once first.'); END IF; INSERT INTO public.ngo_members(user_id,ngo_id,role) VALUES(v_uid,v_ngo,p_role) ON CONFLICT(user_id) DO NOTHING RETURNING user_id INTO v_inserted; IF v_inserted IS NULL THEN RETURN json_build_object('ok',false,'error','This account already belongs to an organization.'); END IF; RETURN json_build_object('ok',true); END $function$
;

CREATE OR REPLACE FUNCTION public.set_member_role(p_user_id uuid, p_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
