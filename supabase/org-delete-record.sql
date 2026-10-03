-- ════════════════════════════════════════════════════════════════════
-- Deleting a record from an organisation's working register.
--
-- Public RPC stays SECURITY INVOKER. The privileged implementation lives
-- in a non-exposed private schema, which preserves the existing lead/admin
-- checks and audit snapshots without exposing a SECURITY DEFINER function
-- through the public API schema.
-- ════════════════════════════════════════════════════════════════════

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.delete_org_record_impl(p_kind text, p_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_ngo   uuid;
  v_role  text;
  v_email text;
  v_lead  boolean;
  v_snap  jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to delete records.';
  end if;

  select m.ngo_id, m.role
    into v_ngo, v_role
    from public.ngo_members m
   where m.user_id = v_uid
   limit 1;

  if v_ngo is null then
    raise exception 'Only members of an organisation can delete its records.';
  end if;

  select lower(btrim(u.email))
    into v_email
    from auth.users u
   where u.id = v_uid;

  v_lead := coalesce(v_role in ('admin', 'lead'), false)
            or exists (
              select 1
                from public.org_email_invites i
               where i.ngo_id = v_ngo
                 and i.role = 'lead'
                 and lower(btrim(i.email)) = v_email
            );

  if not v_lead then
    raise exception 'Only a team lead can delete records.';
  end if;

  if p_kind = 'case' then
    select jsonb_build_object(
             'case', to_jsonb(c),
             'case_updates', coalesce(
               (select jsonb_agg(to_jsonb(u))
                  from public.case_updates u
                 where u.case_id = c.id),
               '[]'::jsonb
             ),
             'followups', coalesce(
               (select jsonb_agg(to_jsonb(f))
                  from public.animal_followups f
                 where f.case_id = c.id),
               '[]'::jsonb
             )
           )
      into v_snap
      from public.cases c
     where c.id = p_id
       and c.ngo_id = v_ngo;

    if v_snap is null then
      raise exception 'That case is not on your organisation''s register.';
    end if;

    insert into public.operational_audit_log
      (ngo_id, actor_id, entity_type, entity_id, action, before_data)
    values
      (v_ngo, v_uid, 'case', p_id, 'delete', v_snap);

    delete from public.cases
     where id = p_id
       and ngo_id = v_ngo;

  elsif p_kind = 'medical' then
    select to_jsonb(m)
      into v_snap
      from public.medical_events m
     where m.id = p_id
       and (
         exists (
           select 1
             from public.dogs d
            where d.id = m.dog_id
              and d.ngo_id = v_ngo
         )
         or exists (
           select 1
             from public.cases c
            where c.id = m.case_id
              and c.ngo_id = v_ngo
         )
       );

    if v_snap is null then
      raise exception 'That care entry is not on your organisation''s register.';
    end if;

    insert into public.operational_audit_log
      (ngo_id, actor_id, entity_type, entity_id, action, before_data)
    values
      (v_ngo, v_uid, 'medical_event', p_id, 'delete', v_snap);

    delete from public.medical_events
     where id = p_id;

  elsif p_kind = 'followup' then
    select to_jsonb(f)
      into v_snap
      from public.animal_followups f
     where f.id = p_id
       and f.ngo_id = v_ngo;

    if v_snap is null then
      raise exception 'That follow-up is not on your organisation''s register.';
    end if;

    insert into public.operational_audit_log
      (ngo_id, actor_id, entity_type, entity_id, action, before_data)
    values
      (v_ngo, v_uid, 'followup', p_id, 'delete', v_snap);

    delete from public.animal_followups
     where id = p_id
       and ngo_id = v_ngo;

  elsif p_kind = 'timeline' then
    select to_jsonb(t)
      into v_snap
      from public.animal_timeline_events t
     where t.id = p_id
       and t.ngo_id = v_ngo;

    if v_snap is null then
      raise exception 'That outcome is not on your organisation''s register.';
    end if;

    insert into public.operational_audit_log
      (ngo_id, actor_id, entity_type, entity_id, action, before_data)
    values
      (v_ngo, v_uid, 'timeline_event', p_id, 'delete', v_snap);

    delete from public.animal_timeline_events
     where id = p_id
       and ngo_id = v_ngo;

  else
    raise exception 'Unknown record kind %.', p_kind;
  end if;
end
$$;

revoke all on function private.delete_org_record_impl(text, uuid) from public, anon;
grant execute on function private.delete_org_record_impl(text, uuid) to authenticated;

create or replace function public.delete_org_record(p_kind text, p_id uuid)
returns void
language sql
security invoker
set search_path to ''
as $$
  select private.delete_org_record_impl(p_kind, p_id);
$$;

revoke all on function public.delete_org_record(text, uuid) from public, anon;
grant execute on function public.delete_org_record(text, uuid) to authenticated;
