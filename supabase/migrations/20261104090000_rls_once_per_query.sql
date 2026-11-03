-- Row security that scales with the register.
--
-- The read policies on care, operations and register tables called
-- operations_can_read_record(case_id, dog_id) (a SECURITY DEFINER function
-- that looks up the caller's organisation and reviewing offices) once or
-- twice for EVERY row, and my_ngo() once per row. On a register of ~22,500
-- care records a single screen made tens of thousands of lookups (17 s).
--
-- Same rules, evaluated once per query: the organisation comes from
-- (select public.my_ngo()) and a reviewer's readable cases from
-- (select public.operations_reviewer_case_ids()), both computed once
-- (initPlan). Who can read what is unchanged: an organisation reads its own
-- cases and animals; a reviewing office reads cases in packages submitted to
-- it; nobody reads anything signed out. operations_can_read_record() is kept
-- for the functions that call it. Measured on production as one member:
-- 17.2 s -> 1.0 s, identical rows (1,565).

create or replace function public.operations_reviewer_case_ids()
returns uuid[] language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(array_agg(distinct c), '{}'::uuid[])
  from public.report_packages p
  join public.review_office_members m on m.office_id = p.office_id
  cross join lateral unnest(p.case_ids) as c
  where m.user_id = auth.uid() and p.status <> 'draft'
$$;
revoke all on function public.operations_reviewer_case_ids() from public, anon;
grant execute on function public.operations_reviewer_case_ids() to authenticated;

-- Care records.
alter policy operations_medical_boundary on public.medical_events using (
  (select auth.uid()) is not null and (
    exists (select 1 from public.cases x where x.id = medical_events.case_id and x.ngo_id = (select public.my_ngo()))
    or exists (select 1 from public.dogs d where d.id = medical_events.dog_id and d.ngo_id = (select public.my_ngo()))
    or medical_events.case_id = any ((select public.operations_reviewer_case_ids())::uuid[])));
alter policy operations_medical_reader on public.medical_events using (
  (select auth.uid()) is not null and (
    exists (select 1 from public.cases x where x.id = medical_events.case_id and x.ngo_id = (select public.my_ngo()))
    or exists (select 1 from public.dogs d where d.id = medical_events.dog_id and d.ngo_id = (select public.my_ngo()))
    or medical_events.case_id = any ((select public.operations_reviewer_case_ids())::uuid[])));
alter policy medical_events_org_read on public.medical_events using (
  exists (select 1 from public.dogs d where d.id = medical_events.dog_id and d.ngo_id = (select public.my_ngo()))
  or exists (select 1 from public.cases c where c.id = medical_events.case_id and c.ngo_id = (select public.my_ngo())));

-- Animal operations and their reviews.
alter policy operation_event_read on public.animal_operation_events using (
  (select auth.uid()) is not null and (
    exists (select 1 from public.cases x where x.id = animal_operation_events.case_id and x.ngo_id = (select public.my_ngo()))
    or exists (select 1 from public.dogs d where d.id = animal_operation_events.dog_id and d.ngo_id = (select public.my_ngo()))
    or animal_operation_events.case_id = any ((select public.operations_reviewer_case_ids())::uuid[])));
alter policy operation_review_read on public.animal_operation_reviews using (
  exists (select 1 from public.animal_operation_events e where e.id = animal_operation_reviews.event_id and (select auth.uid()) is not null and (
    exists (select 1 from public.cases x where x.id = e.case_id and x.ngo_id = (select public.my_ngo()))
    or exists (select 1 from public.dogs d where d.id = e.dog_id and d.ngo_id = (select public.my_ngo()))
    or e.case_id = any ((select public.operations_reviewer_case_ids())::uuid[]))));

-- The organisation's register: the same test, the organisation looked up once.
alter policy dogs_org_read on public.dogs using (ngo_id = (select public.my_ngo()));
alter policy cases_org_read on public.cases using (ngo_id = (select public.my_ngo()));
alter policy animal_timeline_events_org_read on public.animal_timeline_events using (ngo_id = (select public.my_ngo()));
alter policy animal_followups_org_read on public.animal_followups using (ngo_id = (select public.my_ngo()));
alter policy evidence_items_org_read on public.evidence_items using (ngo_id = (select public.my_ngo()));
alter policy case_updates_org_read on public.case_updates using (
  exists (select 1 from public.cases c where c.id = case_updates.case_id and c.ngo_id = (select public.my_ngo())));
