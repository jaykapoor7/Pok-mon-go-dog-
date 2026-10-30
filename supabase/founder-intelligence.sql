-- Founder Intelligence. Private operational reporting; historical imports never count as adoption.
-- Keep all admin data behind ADMIN_SECRET + service-role server routes. No browser grants.
create table if not exists public.founder_pilots (
  id uuid primary key default gen_random_uuid(),
  ngo_id uuid not null references public.ngos(id) on delete restrict,
  label text not null check(length(trim(label)) between 2 and 160),
  stage text not null default 'planned' check(stage in
    ('planned','onboarding','active','paused','completed','sustained','cancelled')),
  started_on date, ended_on date,
  target_workflows text[] not null default '{}',
  baseline jsonb not null default '{}'::jsonb,
  success_criteria jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint founder_pilots_date_order check(ended_on is null or started_on is null or ended_on >= started_on)
);
alter table public.founder_pilots enable row level security;
revoke all on table public.founder_pilots from anon, authenticated;
grant select, insert, update, delete on public.founder_pilots to service_role;
create index if not exists founder_pilots_ngo_stage_idx on public.founder_pilots(ngo_id,stage);

create table if not exists public.founder_web_snapshots (
  id uuid primary key default gen_random_uuid(),
  range_start timestamptz not null,
  range_end timestamptz not null,
  project_id text not null,
  visitors integer not null check(visitors >= 0),
  pageviews integer not null check(pageviews >= 0),
  source text not null default 'vercel_api' check(source = 'vercel_api'),
  fetched_at timestamptz not null default now(),
  constraint founder_web_window check(range_end > range_start),
  constraint founder_web_unique unique(range_start,range_end,project_id)
);
alter table public.founder_web_snapshots enable row level security;
revoke all on table public.founder_web_snapshots from anon, authenticated;
grant select, insert, update on public.founder_web_snapshots to service_role;
create index if not exists founder_web_snapshots_recent_idx on public.founder_web_snapshots(fetched_at desc);

-- SQL-sourced aggregate. Invoker security: only the service_role can call it.
-- No contact fields, individual identities, or sensitive case notes are returned.
create or replace function public.founder_analytics_rollup(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security invoker
set search_path = ''
as $$
declare result jsonb;
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to > now() + interval '1 day'
     or p_to-p_from > interval '93 days' then
    raise exception 'Invalid analytics window' using errcode='22023';
  end if;
  select jsonb_build_object(
    'window',jsonb_build_object('from',p_from,'to',p_to),
    'organizations', (
      select jsonb_build_object(
        'registered',count(*),
        'verified',count(*) filter(where coalesce(verified,false)),
        'operational_partners',count(*) filter(where partner_status='operational_partner'),
        'with_members',(select count(distinct ngo_id) from public.ngo_members),
        'memberships',(select count(*) from public.ngo_members)
      ) from public.ngos where coalesce(demo_mode,false)=false
    ),
    'organization_rows',coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.name)
      from (
        select o.id,o.name,o.city,o.partner_status,o.verified,
          (select count(*) from public.ngo_members m where m.ngo_id=o.id) as members,
          (select count(*) from public.cases c
            where c.ngo_id=o.id and c.created_at>=p_from and c.created_at<p_to
              and c.import_batch_id is null and coalesce(c.is_demo,false)=false
              and c.provenance is distinct from 'imported_historical_record') as native_cases,
          (select count(*) from public.cases c
            where c.ngo_id=o.id and c.import_batch_id is not null) as historical_cases,
          (select count(distinct a.actor_id) from public.operational_audit_log a
            where a.ngo_id=o.id and a.created_at>=p_from and a.created_at<p_to and a.actor_id is not null) as audited_actors
        from public.ngos o where coalesce(o.demo_mode,false)=false
      ) x
    ),'[]'::jsonb),
    'cases', (
      select jsonb_build_object(
        'total',count(*),
        'imported',count(*) filter(where import_batch_id is not null or provenance='imported_historical_record'),
        'native_total',count(*) filter(where import_batch_id is null and coalesce(is_demo,false)=false and provenance is distinct from 'imported_historical_record'),
        'native_created',count(*) filter(where created_at>=p_from and created_at<p_to and import_batch_id is null and coalesce(is_demo,false)=false and provenance is distinct from 'imported_historical_record'),
        'native_resolved',count(*) filter(where resolved_at>=p_from and resolved_at<p_to and import_batch_id is null and coalesce(is_demo,false)=false and provenance is distinct from 'imported_historical_record'),
        'native_verified',count(*) filter(where resolved_at>=p_from and resolved_at<p_to and coalesce(proof_verified,false) and import_batch_id is null and coalesce(is_demo,false)=false and provenance is distinct from 'imported_historical_record'),
        'first_action_documented',count(*) filter(where first_action_at is not null and import_batch_id is null and coalesce(is_demo,false)=false),
        'latest_created',max(created_at)
      ) from public.cases
    ),
    'care',(
      select jsonb_build_object(
        'events_total',count(*),
        'imported',count(*) filter(where import_batch_id is not null),
        'native_created',count(*) filter(where created_at>=p_from and created_at<p_to and import_batch_id is null and coalesce(is_demo,false)=false),
        'native_verified',null,
        'by_kind',coalesce((select jsonb_agg(row_to_json(k)::jsonb order by k.count desc)
          from (select kind,count(*) from public.medical_events where created_at>=p_from and created_at<p_to
             and import_batch_id is null and coalesce(is_demo,false)=false group by kind) k),'[]'::jsonb)
      ) from public.medical_events
    ),
    'followups',(
      select jsonb_build_object(
        'total',count(*),
        'imported',count(*) filter(where import_batch_id is not null),
        'native_completed',count(*) filter(where completed_at>=p_from and completed_at<p_to and import_batch_id is null),
        'native_overdue',count(*) filter(where due_at<now() and completed_at is null and import_batch_id is null and status not in ('cancelled','done'))
      ) from public.animal_followups
    ),
    'product',(
      select jsonb_build_object(
        'events',count(*),
        'identified_events',count(*) filter(where user_id is not null),
        'identified_users',count(distinct user_id),
        'sessions',count(distinct session_id),
        'browser_ids',count(distinct anon_id),
        'last_event',max(created_at),
        'by_name',coalesce((select jsonb_agg(row_to_json(k)::jsonb order by k.count desc) from
          (select name,count(*) from public.events where created_at>=p_from and created_at<p_to group by name) k),'[]'::jsonb)
      ) from public.events where created_at>=p_from and created_at<p_to
    ),
    'daily_events',coalesce((
      select jsonb_agg(row_to_json(d)::jsonb order by d.day) from
       (select (created_at at time zone 'UTC')::date as day, count(*) as events,
          count(distinct session_id) as sessions from public.events
        where created_at>=p_from and created_at<p_to group by 1 order by 1) d
    ),'[]'::jsonb),
    'report_funnel',(
      with sessions as (
        select session_id,
          bool_or(name='report_started') as started,
          bool_or(name='report_photo_added') as photo,
          bool_or(name='report_location_set') as located,
          bool_or(name='report_details_filled') as details,
          bool_or(name='report_submitted') as submitted
        from public.events where created_at>=p_from and created_at<p_to
         and session_id is not null and name like 'report_%'
        group by session_id
      )
      select jsonb_build_object(
        'started',count(*) filter(where started),
        'photo',count(*) filter(where started and photo),
        'located',count(*) filter(where started and located),
        'details',count(*) filter(where started and details),
        'submitted',count(*) filter(where started and submitted)
      ) from sessions
    ),
    'operational_audit',(
      select jsonb_build_object(
        'actions',count(*),
        'identified_actions',count(*) filter(where actor_id is not null),
        'organizations_with_identified_actions',count(distinct ngo_id) filter(where actor_id is not null),
        'identified_actors',count(distinct actor_id)
      ) from public.operational_audit_log
      where created_at>=p_from and created_at<p_to
    ),
    'pilots',coalesce((
      select jsonb_agg(row_to_json(p)::jsonb order by p.created_at desc)
      from (
        select t.id,t.ngo_id,o.name as organization,t.label,t.stage,t.started_on,t.ended_on,
          t.target_workflows,t.baseline,t.success_criteria,t.notes,t.created_at,t.updated_at
        from public.founder_pilots t join public.ngos o on o.id=t.ngo_id
      ) p
    ),'[]'::jsonb),
    'coverage',(
      select jsonb_build_object(
        'animals',(select count(*) from public.dogs where coalesce(is_demo,false)=false),
        'historical_animals',(select count(*) from public.dogs where provenance='imported_historical_record'),
        'public_dataset_animals',(select count(*) from public.dogs where provenance='public_dataset'),
        'timeline_events',(select count(*) from public.animal_timeline_events),
        'imports',(select count(*) from public.import_batches),
        'latest_import',(select max(completed_at) from public.import_batches)
      )
    ),
    'generated_at',now()
  ) into result;
  return result;
end $$;
revoke all on function public.founder_analytics_rollup(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.founder_analytics_rollup(timestamptz,timestamptz) to service_role;
