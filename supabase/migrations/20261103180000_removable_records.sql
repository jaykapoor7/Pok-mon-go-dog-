-- Delete what you added, safely.
--
-- Anything a person or Kaju adds to an organisation's record (a case, a case
-- update, a timeline entry, a care record, a follow-up, an evidence file
-- entry) can be deleted from the screen it appears on. A deletion is never
-- silent: the row (and, for a case, its follow-ups and updates) is copied to
-- removed_records, the operational audit log records who removed it and why,
-- and an organisation lead can restore it within 30 days.
--
-- Who may delete: an admin or coordinator of the organisation, or the person
-- who added the record within the last 24 hours. What may not be deleted:
-- anything inside a prepared or submitted report package (return the package
-- first), anything a veterinarian has signed or reviewed, and anything other
-- records still depend on. Those refusals come back as plain sentences.

create table if not exists public.removed_records (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null,
  kind text not null check (kind in ('case', 'update', 'timeline', 'care', 'followup', 'evidence')),
  record_id uuid not null,
  data jsonb not null,
  reason text,
  removed_by uuid not null references auth.users(id),
  removed_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by uuid references auth.users(id)
);
create index if not exists removed_records_ngo_idx on public.removed_records (ngo_id, removed_at desc);
alter table public.removed_records enable row level security;
revoke all on public.removed_records from public, anon, authenticated;
grant select on public.removed_records to authenticated;
create policy removed_records_read on public.removed_records for select to authenticated
  using (ngo_id = public.my_ngo() and coalesce(public.sp_member_role(ngo_id), '') in ('admin', 'coordinator'));

create or replace function operations_private.removable_table(p_kind text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case p_kind
    when 'case' then 'cases' when 'update' then 'case_updates' when 'timeline' then 'animal_timeline_events'
    when 'care' then 'medical_events' when 'followup' then 'animal_followups' when 'evidence' then 'evidence_items' end
$$;
revoke all on function operations_private.removable_table(text) from public, anon, authenticated;

create or replace function public.remove_record(p_kind text, p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  uid uuid := auth.uid(); org uuid := public.my_ngo(); tbl text := operations_private.removable_table(p_kind);
  v jsonb; owner_ngo uuid; lead boolean; author uuid; case_ref uuid; data jsonb; rid uuid;
begin
  if uid is null or org is null then raise exception 'Sign in to your organisation to delete records'; end if;
  if tbl is null or p_id is null then raise exception 'This kind of record cannot be deleted here'; end if;
  if p_reason is not null and length(p_reason) > 500 then raise exception 'Keep the reason under 500 characters'; end if;

  execute format('select to_jsonb(t) from public.%I t where t.id = $1 for update', tbl) into v using p_id;
  if v is null then raise exception 'That record no longer exists'; end if;

  case_ref := case when p_kind = 'case' then p_id else nullif(v->>'case_id', '')::uuid end;
  owner_ngo := coalesce(nullif(v->>'ngo_id', '')::uuid,
    (select c.ngo_id from public.cases c where c.id = case_ref),
    (select d.ngo_id from public.dogs d where d.id = nullif(v->>'dog_id', '')::uuid));
  if owner_ngo is distinct from org then raise exception 'That record belongs to another organisation'; end if;

  lead := coalesce(public.sp_member_role(org), '') in ('admin', 'coordinator');
  author := coalesce(nullif(v->>'created_by', ''), nullif(v->>'actor_id', ''))::uuid;
  if not lead and not (author = uid and (v->>'created_at')::timestamptz > now() - interval '24 hours') then
    raise exception 'Only a coordinator or admin can delete this. You can delete what you added in the last 24 hours';
  end if;

  if case_ref is not null and exists (select 1 from public.report_packages q where case_ref = any (q.case_ids) and q.status <> 'returned') then
    raise exception 'This record is part of a report package. Return or remove the package first';
  end if;
  if p_kind = 'case' and exists (select 1 from public.abc_attestations a where a.case_id = p_id and a.revoked_at is null) then
    raise exception 'A veterinarian has signed this case. Ask them to revoke the sign-off first';
  end if;
  if p_kind = 'evidence' and exists (select 1 from public.evidence_reviews r where r.evidence_id = p_id) then
    raise exception 'This evidence has been reviewed and stays on the record';
  end if;

  data := jsonb_build_object('row', v);
  if p_kind = 'case' then
    data := data || jsonb_build_object(
      'followups', coalesce((select jsonb_agg(to_jsonb(f)) from public.animal_followups f where f.case_id = p_id), '[]'::jsonb),
      'updates', coalesce((select jsonb_agg(to_jsonb(u)) from public.case_updates u where u.case_id = p_id), '[]'::jsonb));
  end if;

  insert into public.removed_records (ngo_id, kind, record_id, data, reason, removed_by)
  values (org, p_kind, p_id, data, nullif(btrim(p_reason), ''), uid) returning id into rid;
  begin
    execute format('delete from public.%I where id = $1', tbl) using p_id;
  exception when foreign_key_violation then
    raise exception 'Other records still depend on this one, so it stays. Delete those first';
  end;
  insert into public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data, after_data)
  values (org, uid, tbl, p_id, 'remove_record', v, jsonb_build_object('removed_record', rid, 'reason', nullif(btrim(p_reason), '')));
  return rid;
end $$;

create or replace function public.restore_record(p_removed uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare
  uid uuid := auth.uid(); org uuid := public.my_ngo(); r public.removed_records; tbl text; x jsonb;
begin
  if uid is null or org is null then raise exception 'Sign in to your organisation to restore records'; end if;
  select * into r from public.removed_records where id = p_removed and ngo_id = org for update;
  if not found then raise exception 'That deletion is not in your organisation'; end if;
  if r.restored_at is not null then raise exception 'That record has already been restored'; end if;
  if not (coalesce(public.sp_member_role(org), '') in ('admin', 'coordinator') or (r.removed_by = uid and r.removed_at > now() - interval '1 hour')) then
    raise exception 'Only a coordinator or admin can restore this';
  end if;
  if r.removed_at < now() - interval '30 days' then raise exception 'Deletions can be restored for 30 days'; end if;
  tbl := operations_private.removable_table(r.kind);
  execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', tbl, tbl) using r.data->'row';
  if r.kind = 'case' then
    for x in select * from jsonb_array_elements(coalesce(r.data->'updates', '[]'::jsonb)) loop
      insert into public.case_updates select * from jsonb_populate_record(null::public.case_updates, x);
    end loop;
    for x in select * from jsonb_array_elements(coalesce(r.data->'followups', '[]'::jsonb)) loop
      insert into public.animal_followups select * from jsonb_populate_record(null::public.animal_followups, x);
    end loop;
  end if;
  update public.removed_records set restored_at = now(), restored_by = uid where id = r.id;
  insert into public.operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, after_data)
  values (org, uid, tbl, r.record_id, 'restore_record', jsonb_build_object('removed_record', r.id));
  return r.record_id;
end $$;

revoke all on function public.remove_record(text, uuid, text), public.restore_record(uuid) from public, anon;
grant execute on function public.remove_record(text, uuid, text), public.restore_record(uuid) to authenticated;
