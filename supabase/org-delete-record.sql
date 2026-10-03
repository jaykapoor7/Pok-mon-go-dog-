-- ════════════════════════════════════════════════════════════════════
-- Deleting a record from an organisation's working register.
--
-- The Records view lists four kinds of entry: rescue cases, care
-- (medical events), follow-ups and outcomes (timeline events). A team
-- lead can delete any of them for their own organisation. Before the row
-- goes, a full copy (with a case's updates and follow-ups) is written to
-- operational_audit_log as before_data, so a deletion is attributable and
-- can be restored by hand. Members who are not leads cannot delete.
--
-- Deleting a case removes its updates and follow-ups (ON DELETE CASCADE);
-- care entries, timeline events, documents and evidence that pointed at it
-- keep their animal and lose only the case link. The animal record itself
-- is never deleted here. The spatial queue triggers on cases and
-- medical_events refresh the map's cell totals.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.delete_org_record(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid   uuid := auth.uid();
  v_ngo   uuid;
  v_role  text;
  v_email text;
  v_lead  boolean;
  v_snap  jsonb;
begin
  if v_uid is null then raise exception 'Sign in to delete records.'; end if;

  select ngo_id, role into v_ngo, v_role from ngo_members where user_id = v_uid limit 1;
  if v_ngo is null then raise exception 'Only members of an organisation can delete its records.'; end if;

  select lower(btrim(email)) into v_email from auth.users where id = v_uid;
  v_lead := coalesce(v_role in ('admin', 'lead'), false)
            or exists (select 1 from org_email_invites
                        where ngo_id = v_ngo and role = 'lead' and lower(btrim(email)) = v_email);
  if not v_lead then raise exception 'Only a team lead can delete records.'; end if;

  if p_kind = 'case' then
    select jsonb_build_object(
             'case', to_jsonb(c),
             'case_updates', coalesce((select jsonb_agg(to_jsonb(u)) from case_updates u where u.case_id = c.id), '[]'::jsonb),
             'followups', coalesce((select jsonb_agg(to_jsonb(f)) from animal_followups f where f.case_id = c.id), '[]'::jsonb))
      into v_snap
      from cases c where c.id = p_id and c.ngo_id = v_ngo;
    if v_snap is null then raise exception 'That case is not on your organisation''s register.'; end if;
    insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data)
      values (v_ngo, v_uid, 'case', p_id, 'delete', v_snap);
    delete from cases where id = p_id and ngo_id = v_ngo;

  elsif p_kind = 'medical' then
    select to_jsonb(m) into v_snap
      from medical_events m
     where m.id = p_id
       and (exists (select 1 from dogs d where d.id = m.dog_id and d.ngo_id = v_ngo)
            or exists (select 1 from cases c where c.id = m.case_id and c.ngo_id = v_ngo));
    if v_snap is null then raise exception 'That care entry is not on your organisation''s register.'; end if;
    insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data)
      values (v_ngo, v_uid, 'medical_event', p_id, 'delete', v_snap);
    delete from medical_events where id = p_id;

  elsif p_kind = 'followup' then
    select to_jsonb(f) into v_snap from animal_followups f where f.id = p_id and f.ngo_id = v_ngo;
    if v_snap is null then raise exception 'That follow-up is not on your organisation''s register.'; end if;
    insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data)
      values (v_ngo, v_uid, 'followup', p_id, 'delete', v_snap);
    delete from animal_followups where id = p_id and ngo_id = v_ngo;

  elsif p_kind = 'timeline' then
    select to_jsonb(t) into v_snap from animal_timeline_events t where t.id = p_id and t.ngo_id = v_ngo;
    if v_snap is null then raise exception 'That outcome is not on your organisation''s register.'; end if;
    insert into operational_audit_log (ngo_id, actor_id, entity_type, entity_id, action, before_data)
      values (v_ngo, v_uid, 'timeline_event', p_id, 'delete', v_snap);
    delete from animal_timeline_events where id = p_id and ngo_id = v_ngo;

  else
    raise exception 'Unknown record kind %.', p_kind;
  end if;
end $$;

revoke all on function public.delete_org_record(text, uuid) from public, anon;
grant execute on function public.delete_org_record(text, uuid) to authenticated;
