-- Phase 1 operational integrity
-- Restores the authenticated historical-review queue and makes the Field
-- map's current/historical cohorts explicit. Safe to replay; no record data
-- is changed and existing RLS-backed organization boundaries are preserved.

create or replace function public.org_historical_review_queue()
returns table (
  id uuid,
  case_code text,
  title text,
  condition_class text,
  status_class text,
  source_status text,
  occurred_at timestamptz,
  last_activity_at timestamptz,
  severity text,
  animal_name text,
  straypaw_id text,
  zone text,
  city text,
  h3_r8 text,
  evidence_score integer,
  medical_count integer,
  evidence_count integer,
  has_treatment_note boolean,
  has_review_note boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.case_code,
    c.title,
    c.condition_class,
    p.status_class,
    nullif(btrim(c.source_metadata -> 'normalized' ->> 'status'), ''),
    p.occurred_at,
    c.last_activity_at,
    c.severity::text,
    d.name,
    d.straypaw_id,
    c.zone,
    p.city,
    p.h3_r8,
    case
      when coalesce(m.n, 0) > 0 or coalesce(e.n, 0) > 0 then 3
      when nullif(btrim(c.source_metadata -> 'normalized' ->> 'treatment_update'), '') is not null
        or nullif(btrim(c.source_metadata -> 'normalized' ->> 'review'), '') is not null then 2
      when nullif(btrim(c.source_metadata -> 'normalized' ->> 'rescue_plan'), '') is not null
        or nullif(btrim(c.source_metadata -> 'normalized' ->> 'case_detail'), '') is not null then 1
      else 0
    end as evidence_score,
    coalesce(m.n, 0),
    coalesce(e.n, 0),
    nullif(btrim(c.source_metadata -> 'normalized' ->> 'treatment_update'), '') is not null,
    nullif(btrim(c.source_metadata -> 'normalized' ->> 'review'), '') is not null
  from public.public_case_facts p
  join public.cases c on c.id = p.id
  join public.ngos n on n.id = c.ngo_id
  left join public.dogs d on d.id = c.dog_id
  left join lateral (
    select count(*)::integer n from public.medical_events me where me.case_id = c.id
  ) m on true
  left join lateral (
    select count(*)::integer n from public.evidence_items ei where ei.case_id = c.id
  ) e on true
  where auth.uid() is not null
    and c.ngo_id = public.my_ngo()
    and c.provenance = 'imported_historical_record'
    and c.status_reviewed_at is null
    and p.status_class in ('open', 'in_progress')
    and p.city = n.city
    and (c.last_activity_at is null or c.imported_at is null or c.last_activity_at <= c.imported_at + interval '1 day')
  order by coalesce(nullif(btrim(c.zone), ''), 'Locality not recorded'), evidence_score desc, p.occurred_at asc;
$$;

revoke all on function public.org_historical_review_queue() from public, anon;
grant execute on function public.org_historical_review_queue() to authenticated, service_role;

create or replace function public.list_org_open_work_cells_v2()
returns table(
  city text,
  h3_r8 text,
  open_cases bigint,
  stale_cases bigint,
  historical_cases bigint,
  critical_cases bigint
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
      case when c.provenance = 'imported_historical_record' and d.city is not null
           then d.city else coalesce(nullif(btrim(c.city), ''), d.city) end as city,
      case when c.provenance = 'imported_historical_record' and d.h3_r8 is not null
           then d.h3_r8 else coalesce(c.h3_r8, d.h3_r8) end as h3_r8,
      c.status_class,
      c.condition_class,
      coalesce(c.source_event_at, c.created_at) as occurred_at,
      c.last_activity_at,
      c.provenance = 'imported_historical_record' and c.status_reviewed_at is null as is_historical
    from public.cases c
    left join public.dogs d on d.id = c.dog_id
    cross join me
    where auth.uid() is not null
      and me.ngo_id is not null
      and coalesce(c.ngo_id, d.ngo_id) = me.ngo_id
      and not coalesce(c.is_demo, false)
  )
  select
    city,
    h3_r8,
    count(*) filter (where not is_historical)::bigint as open_cases,
    count(*) filter (
      where not is_historical
        and occurred_at < now() - interval '90 days'
        and (last_activity_at is null or last_activity_at < now() - interval '30 days')
    )::bigint as stale_cases,
    count(*) filter (where is_historical)::bigint as historical_cases,
    count(*) filter (
      where not is_historical
        and condition_class in ('Road accident','Maggot wound','Human abuse','Dog bite','Entrapment','Suspected rabies')
    )::bigint as critical_cases
  from scoped
  where status_class in ('open','in_progress')
    and city is not null
    and h3_r8 is not null
  group by city, h3_r8
  order by count(*) filter (where not is_historical) desc, city, h3_r8;
$$;

revoke all on function public.list_org_open_work_cells_v2() from public, anon;
grant execute on function public.list_org_open_work_cells_v2() to authenticated, service_role;
