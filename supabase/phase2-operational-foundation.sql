-- Phase 2 operational cohort integrity.
-- Exact, organisation-scoped follow-up totals for Today and Follow-ups.
-- Historical source dates stay visible, but never enter scheduled work.

create or replace function public.org_followup_scope_counts()
returns table (
  scheduled_overdue bigint,
  scheduled_due_week bigint,
  historical_upcoming bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select public.my_ngo() as ngo_id
  ), scoped as (
    select
      af.due_at,
      (
        af.import_batch_id is not null
        or af.import_source_key is not null
        or lower(coalesce(af.kind, '')) like 'imported%'
        or c.provenance = 'imported_historical_record'
        or (af.case_id is null and d.provenance = 'imported_historical_record')
      ) as is_historical
    from public.animal_followups af
    left join public.cases c on c.id = af.case_id
    left join public.dogs d on d.id = coalesce(af.dog_id, c.dog_id)
    cross join me
    where auth.uid() is not null
      and me.ngo_id is not null
      and coalesce(c.ngo_id, d.ngo_id) = me.ngo_id
      and af.status = 'upcoming'
      and not coalesce(c.is_demo, d.is_demo, false)
  )
  select
    count(*) filter (where not is_historical and due_at < now())::bigint,
    count(*) filter (where not is_historical and due_at >= now() and due_at <= now() + interval '7 days')::bigint,
    count(*) filter (where is_historical)::bigint
  from scoped;
$$;

revoke all on function public.org_followup_scope_counts() from public;
revoke all on function public.org_followup_scope_counts() from anon;
grant execute on function public.org_followup_scope_counts() to authenticated;
grant execute on function public.org_followup_scope_counts() to service_role;

comment on function public.org_followup_scope_counts() is
  'Exact current scheduled and historical upcoming follow-up cohorts for the signed-in organisation. Historical import dates never enter scheduled counts.';
