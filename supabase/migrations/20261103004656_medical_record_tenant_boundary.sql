-- Align staging's legacy permissive medical-event policy with tenant boundaries.
-- Public projection views remain available; raw clinical records are private.
create or replace function public.operations_can_read_record(p_case uuid,p_dog uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select auth.uid() is not null and (
  exists(select 1 from public.cases c where c.id=p_case and c.ngo_id=public.my_ngo())
  or exists(select 1 from public.dogs d where d.id=p_dog and d.ngo_id=public.my_ngo())
  or exists(select 1 from public.report_packages p join public.review_office_members m on m.office_id=p.office_id
   where m.user_id=auth.uid() and p.status<>'draft' and p_case=any(p.case_ids))
 )
$$;
revoke all on function public.operations_can_read_record(uuid,uuid) from public,anon;
grant execute on function public.operations_can_read_record(uuid,uuid) to authenticated;
revoke select on public.medical_events from anon;
create policy operations_medical_boundary on public.medical_events as restrictive for select to authenticated
 using(public.operations_can_read_record(case_id,dog_id));
create policy operations_medical_reader on public.medical_events for select to authenticated
 using(public.operations_can_read_record(case_id,dog_id));
