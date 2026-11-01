-- StrayPaw: ABC roles and private evidence photos (2026-11-01).
-- Applied to STAGING (ucxfxiddufwqithtdtix) first, then production.
--
-- 1. Roles. The ABC workflow needs a veterinarian (signs procedures) and a
--    coordinator (reviews evidence). Until now an organisation lead could only
--    choose member / admin / field_worker, so nobody in production could be
--    made a veterinarian. set_member_role and add_org_member now accept the
--    two ABC roles too. Same rules otherwise: only a lead changes roles (or
--    anyone while the organisation has no lead), the last lead cannot be
--    demoted, and every change is written to operational_audit_log.
--
-- 2. Evidence photos. A private bucket, abc-evidence. Files live under
--    <ngo_id>/<case_id>/<file>. A member of the organisation may upload into
--    its own cases only; files are never public, never overwritten and never
--    deleted by clients. Members of the organisation read them through
--    short-lived signed URLs; a municipal reviewer reads them only for cases
--    inside a package submitted to their office.
--
-- Changes two existing functions (role list widened, logic otherwise the
-- same) and adds one bucket with four storage policies. No row is changed.

create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ngo uuid := public.my_ngo(); v_admins int; v_before text;
begin
  if v_ngo is null then raise exception 'Not a member'; end if;
  if not (exists (select 1 from ngo_members where user_id = auth.uid() and ngo_id = v_ngo and role = 'admin')
          or not exists (select 1 from ngo_members where ngo_id = v_ngo and role = 'admin')) then
    raise exception 'Only your team lead can change roles.';
  end if;
  if p_role not in ('member', 'admin', 'field_worker', 'veterinarian', 'coordinator') then raise exception 'Invalid role'; end if;
  select role into v_before from ngo_members where user_id = p_user_id and ngo_id = v_ngo;
  if v_before is null then return false; end if;
  if p_role <> 'admin' and v_before = 'admin' then
    select count(*) into v_admins from ngo_members where ngo_id = v_ngo and role = 'admin';
    if v_admins <= 1 then raise exception 'Keep at least one team lead, promote someone else first.'; end if;
  end if;
  update ngo_members set role = p_role where user_id = p_user_id and ngo_id = v_ngo;
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  values (v_ngo, auth.uid(), 'ngo_member', p_user_id, 'set_member_role', jsonb_build_object('role', v_before), jsonb_build_object('role', p_role));
  return true;
end $$;
revoke all on function public.set_member_role(uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;

create or replace function public.add_org_member(p_email text, p_role text default 'member')
returns json language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_ngo uuid := public.my_ngo(); v_inserted uuid;
begin
  if v_ngo is null then return json_build_object('ok', false, 'error', 'Not a partner organization.'); end if;
  if not (exists (select 1 from ngo_members where user_id = auth.uid() and ngo_id = v_ngo and role = 'admin')
          or not exists (select 1 from ngo_members where ngo_id = v_ngo and role = 'admin')) then
    return json_build_object('ok', false, 'error', 'Only your team lead can add members.');
  end if;
  if p_role is null or p_role not in ('member', 'admin', 'field_worker', 'veterinarian', 'coordinator') then p_role := 'member'; end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then return json_build_object('ok', false, 'error', 'No StrayPaw account with that email, ask them to sign in once first.'); end if;
  insert into ngo_members (user_id, ngo_id, role) values (v_uid, v_ngo, p_role) on conflict (user_id) do nothing returning user_id into v_inserted;
  if v_inserted is null then return json_build_object('ok', false, 'error', 'This account already belongs to an organization.'); end if;
  insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  values (v_ngo, auth.uid(), 'ngo_member', v_uid, 'add_org_member', jsonb_build_object('role', p_role));
  return json_build_object('ok', true);
end $$;
revoke all on function public.add_org_member(text, text) from public, anon;
grant execute on function public.add_org_member(text, text) to authenticated;

-- ── evidence photos ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('abc-evidence', 'abc-evidence', false, 15728640,
        array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

/* May the signed-in person upload into this path? <ngo>/<case>/<file>, own
   organisation, a case of that organisation. */
create or replace function public.sp_evidence_path_writable(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and (storage.foldername(p_name))[1] = public.my_ngo()::text
     and exists (select 1 from cases c where c.id::text = (storage.foldername(p_name))[2] and c.ngo_id = public.my_ngo())
$$;
/* May the signed-in person read it? Their organisation's files, or a case in
   a package submitted to an office they review for. */
create or replace function public.sp_evidence_path_readable(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (
    (storage.foldername(p_name))[1] = public.my_ngo()::text
    or exists (select 1 from report_packages p join review_office_members m on m.office_id = p.office_id
               where m.user_id = auth.uid() and p.status <> 'draft'
                 and (storage.foldername(p_name))[2] = any (select x::text from unnest(p.case_ids) x)))
$$;
revoke all on function public.sp_evidence_path_writable(text) from public, anon;
revoke all on function public.sp_evidence_path_readable(text) from public, anon;
grant execute on function public.sp_evidence_path_writable(text) to authenticated;
grant execute on function public.sp_evidence_path_readable(text) to authenticated;

create policy abc_evidence_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'abc-evidence' and public.sp_evidence_path_writable(name));
create policy abc_evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'abc-evidence' and public.sp_evidence_path_readable(name));
-- ── reviewing offices: staff add reviewers by email ───────────────────
/* Service role only (the moderation console). Returns the account id for an
   email, or null. Never callable from a browser session. */
create or replace function public.admin_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1
$$;
revoke all on function public.admin_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_user_id_by_email(text) to service_role;

-- No update or delete policy: evidence files are append-only for clients.

-- Rollback (restores the previous role list; leaves uploaded files alone):
--   drop policy if exists abc_evidence_insert on storage.objects;
--   drop policy if exists abc_evidence_read on storage.objects;
--   drop function if exists public.sp_evidence_path_writable(text);
--   drop function if exists public.sp_evidence_path_readable(text);
--   drop function if exists public.admin_user_id_by_email(text);
--   (bucket kept if it holds files; delete it from the dashboard only when empty)
--   re-create set_member_role / add_org_member from the definitions saved in
--   supabase/proposed/2026-11-01-roles-and-evidence.previous.sql
