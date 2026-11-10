-- Source-aware operational events for reliable adoption after rollout.
-- This migration never backfills historical records or invents prior activity.
create schema if not exists founder_private;
revoke all on schema founder_private from public, anon, authenticated;
create table if not exists public.founder_workflow_events (
  id bigint generated always as identity primary key,
  source_table text not null,
  source_id uuid not null,
  action text not null check (action in
    ('case_created','case_updated','case_resolved','animal_recorded','medical_recorded','followup_completed')),
  actor_id uuid,
  ngo_id uuid,
  case_id uuid,
  member_at_event boolean not null default false,
  org_verified_at_event boolean not null default false,
  occurred_at timestamptz not null default now(),
  captured_at timestamptz not null default now(),
  unique(source_table,source_id,action)
);
alter table public.founder_workflow_events enable row level security;
revoke all on table public.founder_workflow_events from anon,authenticated;
grant select,insert,update on table public.founder_workflow_events to service_role;
create index if not exists founder_event_time_idx on public.founder_workflow_events(occurred_at desc);
create index if not exists founder_event_org_time_idx on public.founder_workflow_events(ngo_id,occurred_at desc);
create index if not exists founder_event_actor_time_idx on public.founder_workflow_events(actor_id,occurred_at desc);

create table if not exists public.founder_tracking_status (
  singleton boolean primary key default true check (singleton),
  started_at timestamptz not null default now()
);
alter table public.founder_tracking_status enable row level security;
revoke all on table public.founder_tracking_status from anon,authenticated;
grant select,insert on table public.founder_tracking_status to service_role;
insert into public.founder_tracking_status(singleton) values(true) on conflict(singleton) do nothing;

create or replace function founder_private.capture_workflow_event()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  org uuid;
  actor uuid;
  case_ref uuid;
  act text;
  rec_id uuid;
  org_demo boolean;
  is_member boolean := false;
  is_verified boolean := false;
begin
  if tg_table_name='cases' then
    if new.import_batch_id is not null or coalesce(new.is_demo,false)
       or new.provenance='imported_historical_record' then return new; end if;
    if tg_op='INSERT' then
      act:='case_created'; actor:=new.created_by_id;
    elsif tg_op='UPDATE' and old.resolved_at is null and new.resolved_at is not null then
      act:='case_resolved'; actor:=null; -- case creator is NOT assumed to be resolver
    else return new;
    end if;
    rec_id:=new.id; case_ref:=new.id; org:=new.ngo_id;
  elsif tg_table_name='case_updates' then
    if coalesce(new.is_demo,false) then return new; end if;
    select c.ngo_id into org from public.cases c where c.id=new.case_id
      and c.import_batch_id is null and coalesce(c.is_demo,false)=false
      and c.provenance is distinct from 'imported_historical_record';
    if not found then return new; end if;
    act:='case_updated'; actor:=new.actor_id; case_ref:=new.case_id; rec_id:=new.id;
  elsif tg_table_name='medical_events' then
    if new.import_batch_id is not null or coalesce(new.is_demo,false) then return new; end if;
    if new.case_id is not null then select ngo_id into org from public.cases where id=new.case_id; end if;
    if org is null and new.dog_id is not null then select ngo_id into org from public.dogs where id=new.dog_id; end if;
    act:='medical_recorded'; actor:=new.created_by_id; rec_id:=new.id; case_ref:=new.case_id;
  elsif tg_table_name='dogs' then
    if new.import_batch_id is not null or coalesce(new.is_demo,false)
      or new.provenance in ('imported_historical_record','public_dataset') then return new; end if;
    act:='animal_recorded'; actor:=new.created_by_id; rec_id:=new.id; org:=new.ngo_id;
  elsif tg_table_name='animal_followups' then
    if tg_op<>'UPDATE' or new.import_batch_id is not null
      or old.completed_at is not null or new.completed_at is null then return new; end if;
    act:='followup_completed'; actor:=null; -- no completed-by field exists
    rec_id:=new.id; org:=new.ngo_id; case_ref:=new.case_id;
  else return new;
  end if;
  if org is not null then
    select coalesce(o.demo_mode,false),coalesce(o.verified,false)
      into org_demo,is_verified from public.ngos o where o.id=org;
    if coalesce(org_demo,false) then return new; end if;
  end if;
  -- Event actors must correspond to actual Auth users; client-generated IDs
  -- without an Auth identity do not qualify for active-user metrics.
  if actor is not null and not exists(select 1 from auth.users u where u.id=actor) then
    actor:=null;
  end if;
  if actor is not null and org is not null then
    select exists(select 1 from public.ngo_members m where m.user_id=actor and m.ngo_id=org)
      into is_member;
  end if;
  insert into public.founder_workflow_events
    (source_table,source_id,action,actor_id,ngo_id,case_id,member_at_event,org_verified_at_event)
  values (tg_table_name,rec_id,act,actor,org,case_ref,is_member,is_verified)
  on conflict(source_table,source_id,action) do nothing;
  return new;
exception when others then
  -- Never block an animal-care write because its analytics side effect failed.
  return new;
end $$;
revoke all on function founder_private.capture_workflow_event() from public,anon,authenticated;

drop trigger if exists founder_capture_case on public.cases;
create trigger founder_capture_case after insert or update of resolved_at on public.cases
for each row execute function founder_private.capture_workflow_event();

drop trigger if exists founder_capture_case_update on public.case_updates;
create trigger founder_capture_case_update after insert on public.case_updates
for each row execute function founder_private.capture_workflow_event();

drop trigger if exists founder_capture_medical on public.medical_events;
create trigger founder_capture_medical after insert on public.medical_events
for each row execute function founder_private.capture_workflow_event();

drop trigger if exists founder_capture_animal on public.dogs;
create trigger founder_capture_animal after insert on public.dogs
for each row execute function founder_private.capture_workflow_event();

drop trigger if exists founder_capture_followup on public.animal_followups;
create trigger founder_capture_followup after update of completed_at on public.animal_followups
for each row execute function founder_private.capture_workflow_event();

-- Private, actor-verified activity summary; 7d/30d coverage is labelled partial
-- until the instrumentation window is old enough to support it.
create or replace function public.founder_activity_rollup(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare
  tracking_at timestamptz;
  result jsonb;
begin
  if p_from is null or p_to is null or p_to<=p_from or p_to>now()+interval '1 day'
    or p_to-p_from>interval '93 days' then
    raise exception 'Invalid activity window' using errcode='22023';
  end if;
  select started_at into tracking_at from public.founder_tracking_status where singleton=true;
  select jsonb_build_object(
    'tracking_started_at',tracking_at,
    'window_complete_7d',tracking_at<=p_to-interval '7 days',
    'window_complete_30d',tracking_at<=p_to-interval '30 days',
    'qualifying_event_count',count(*) filter(where action in('case_created','case_updated','medical_recorded','animal_recorded') and actor_id is not null),
    'event_count',count(*),
    'verified_actors_7d',count(distinct actor_id) filter(
      where actor_id is not null and action in('case_created','case_updated','medical_recorded','animal_recorded')
        and occurred_at>=p_to-interval '7 days'),
    'verified_orgs_7d',count(distinct ngo_id) filter(
      where member_at_event and org_verified_at_event and actor_id is not null
        and action in('case_created','case_updated','medical_recorded','animal_recorded')
        and occurred_at>=p_to-interval '7 days'),
    'verified_actors_30d',count(distinct actor_id) filter(
      where actor_id is not null and action in('case_created','case_updated','medical_recorded','animal_recorded')
        and occurred_at>=p_to-interval '30 days'),
    'verified_orgs_30d',count(distinct ngo_id) filter(
      where member_at_event and org_verified_at_event and actor_id is not null
        and action in('case_created','case_updated','medical_recorded','animal_recorded')
        and occurred_at>=p_to-interval '30 days'),
    'by_org',coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.events desc)
      from (select ngo_id,count(*) events,count(distinct actor_id) actors
        from public.founder_workflow_events
        where occurred_at>=p_from and occurred_at<p_to and actor_id is not null
          and member_at_event and org_verified_at_event
          and action in('case_created','case_updated','medical_recorded','animal_recorded')
          and ngo_id is not null group by ngo_id) x
    ),'[]'::jsonb)
  ) into result from public.founder_workflow_events where occurred_at>=p_from and occurred_at<p_to;
  return result;
end $$;
revoke all on function public.founder_activity_rollup(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.founder_activity_rollup(timestamptz,timestamptz) to service_role;
