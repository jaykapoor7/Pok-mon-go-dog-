-- Count scheduled work with unspecified provenance as current, matching the UI.
-- No source rows, dates or historical records are changed.
create or replace function public.org_followup_scope_counts()
returns table(scheduled_overdue bigint,scheduled_due_week bigint,historical_upcoming bigint)
language sql stable security definer set search_path=pg_catalog,public as $$
 with scoped as (
  select af.due_at,coalesce(
   af.import_batch_id is not null or af.import_source_key is not null
   or lower(coalesce(af.kind,'')) like 'imported%'
   or c.provenance='imported_historical_record'
   or (af.case_id is null and d.provenance='imported_historical_record'),false
  ) as historical
  from public.animal_followups af
  left join public.cases c on c.id=af.case_id
  left join public.dogs d on d.id=coalesce(af.dog_id,c.dog_id)
  where auth.uid() is not null and public.my_ngo() is not null
   and coalesce(c.ngo_id,d.ngo_id)=public.my_ngo()
   and af.status='upcoming' and not coalesce(c.is_demo,d.is_demo,false)
 )
 select count(*) filter(where not historical and due_at<now()),
 count(*) filter(where not historical and due_at>=now() and due_at<=now()+interval '7 days'),
 count(*) filter(where historical) from scoped
$$;
revoke all on function public.org_followup_scope_counts() from public,anon;
grant execute on function public.org_followup_scope_counts() to authenticated;
-- Reverting the function definition restores prior behavior; source data is untouched.
