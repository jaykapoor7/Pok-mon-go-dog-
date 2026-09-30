-- Production recovery: private case intake fields and indexes for the paths
-- that timed out after the historical imports. Safe to apply once the app
-- branch using the extended create_case() signature is deployed.

alter table public.cases add column if not exists informer_contact text;

-- These are evidence-backed from the production timeout logs. They support
-- case/profile joins and idempotent import recovery without changing records.
create index if not exists cases_dog_id_idx on public.cases (dog_id);
create index if not exists cases_ngo_activity_idx on public.cases (ngo_id, last_activity_at desc, id desc);
create index if not exists cases_unclaimed_activity_idx on public.cases (last_activity_at desc, id desc) where ngo_id is null;
create index if not exists dogs_ngo_last_seen_idx on public.dogs (ngo_id, last_seen desc, id desc);
create index if not exists dogs_city_h3_idx on public.dogs (city, h3_r8) where h3_r8 is not null;
create index if not exists dogs_city_lng_lat_idx on public.dogs (city, lng, lat) where lat is not null and lng is not null;
create index if not exists cases_dog_status_idx on public.cases (dog_id, status);
create index if not exists animal_timeline_events_case_id_idx on public.animal_timeline_events (case_id);
create index if not exists animal_timeline_events_ngo_id_idx on public.animal_timeline_events (ngo_id);
create index if not exists animal_timeline_events_dog_occurred_idx on public.animal_timeline_events (dog_id, occurred_at desc);
create index if not exists medical_events_dog_event_date_idx on public.medical_events (dog_id, event_date desc);
create index if not exists case_updates_case_created_idx on public.case_updates (case_id, created_at desc);
create index if not exists animal_followups_case_due_idx on public.animal_followups (case_id, due_at desc);
create index if not exists import_rows_imported_dog_id_idx on public.import_rows (imported_dog_id);
create index if not exists import_rows_imported_case_id_idx on public.import_rows (imported_case_id);
create index if not exists import_rows_imported_sighting_id_idx on public.import_rows (imported_sighting_id);
create index if not exists import_rows_matched_dog_id_idx on public.import_rows (matched_dog_id);

-- Keyset pagination for organisation tables. This keeps both an NGO's own
-- history bounded without relying on a client
-- side join or an OFFSET that grows with imported history.
create or replace function public.list_org_cases(
  p_limit integer default 101,
  p_before_at timestamptz default null,
  p_before_id uuid default null
) returns setof public.cases
language sql security definer set search_path = public stable as $$
  select c.*
  from public.cases c
  where c.ngo_id = public.my_ngo()
    and (
      p_before_at is null
      or (c.last_activity_at, c.id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
  order by c.last_activity_at desc, c.id desc
  limit greatest(1, least(coalesce(p_limit, 101), 201));
$$;

grant execute on function public.list_org_cases(integer, timestamptz, uuid) to authenticated;
revoke execute on function public.list_org_cases(integer, timestamptz, uuid) from public;

-- Add all opening-screen operational data in the same transactional write.
-- The informer is private: no public view in this migration selects it.
drop function if exists public.create_case(
  text, text, uuid, text, double precision, double precision,
  public.case_severity, public.case_category, text[], uuid, text, text
);

create function public.create_case(
  p_title text,
  p_description text default null,
  p_dog_id uuid default null,
  p_zone text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_severity public.case_severity default 'normal',
  p_category public.case_category default 'other',
  p_tags text[] default '{}',
  p_actor_id uuid default null,
  p_actor_name text default null,
  p_species text default 'dog',
  p_informer_contact text default null,
  p_hospital text default null,
  p_cost_estimate numeric default null,
  p_cost_spent numeric default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ngo uuid; v_name text; v_city text;
begin
  if auth.uid() is null or (p_actor_id is not null and p_actor_id <> auth.uid()) then
    raise exception 'Sign in as the case uploader';
  end if;
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Organisation access required'; end if;
  if p_dog_id is not null and not exists (select 1 from dogs where id = p_dog_id and ngo_id = v_ngo) then
    raise exception 'That animal is not in your organisation';
  end if;
  if p_cost_estimate is not null and p_cost_estimate < 0 then raise exception 'Estimated cost cannot be negative'; end if;
  if p_cost_spent is not null and p_cost_spent < 0 then raise exception 'Spent cost cannot be negative'; end if;

  v_name := coalesce(nullif(auth.jwt() ->> 'email', ''), nullif(btrim(p_actor_name), ''));
  insert into cases (
    dog_id, title, description, zone, lat, lng, severity, category, tags,
    species, status, ngo_id, assignee_id, assignee_name, created_by_id,
    created_by_name, informer_contact, hospital, cost_estimate, cost_spent
  ) values (
    p_dog_id, p_title, nullif(btrim(p_description), ''), nullif(btrim(p_zone), ''),
    p_lat, p_lng, p_severity, p_category, p_tags, coalesce(p_species, 'dog'),
    'in_progress', v_ngo, auth.uid(), v_name, auth.uid(), v_name,
    nullif(btrim(p_informer_contact), ''), nullif(btrim(p_hospital), ''),
    p_cost_estimate, p_cost_spent
  ) returning id into v_id;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (v_id, auth.uid(), v_name, 'created', 'in_progress', 'Case opened by organisation');
  select city into v_city from public.dogs where id = p_dog_id;
  perform public.enqueue_spatial_refresh(v_city, 'case_created');
  return v_id;
end $$;

create or replace function public.set_case_intake(
  p_case_id uuid,
  p_informer_contact text default null,
  p_hospital text default null
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or my_ngo() is null then
    raise exception 'Organisation access required';
  end if;
  update cases
     set informer_contact = nullif(btrim(p_informer_contact), ''),
         hospital = nullif(btrim(p_hospital), ''),
         last_activity_at = now(), updated_at = now()
   where id = p_case_id and ngo_id = my_ngo();
  if found then
    insert into case_updates (case_id, actor_id, actor_name, type, note)
    values (p_case_id, auth.uid(), nullif(auth.jwt() ->> 'email', ''), 'note', 'Updated private intake and clinic details');
  end if;
  return found;
end $$;

grant execute on function public.create_case(
  text, text, uuid, text, double precision, double precision,
  public.case_severity, public.case_category, text[], uuid, text, text,
  text, text, numeric, numeric
) to authenticated;
grant execute on function public.set_case_intake(uuid, text, text) to authenticated;
revoke execute on function public.create_case(
  text, text, uuid, text, double precision, double precision,
  public.case_severity, public.case_category, text[], uuid, text, text,
  text, text, numeric, numeric
) from public;
revoke execute on function public.set_case_intake(uuid, text, text) from public;

-- ── Bounded, idempotent imports ────────────────────────────────────────
-- A row-level source key means a retry can safely upsert only the current
-- pending window. Existing imported records retain their source_metadata;
-- the controlled post-deploy backfill below is intentionally left to an
-- operator because it may touch historical records.
alter table public.import_batches add column if not exists commit_cursor uuid;
alter table public.import_batches add column if not exists commit_started_at timestamptz;
alter table public.dogs add column if not exists import_source_key text;
alter table public.cases add column if not exists import_source_key text;
alter table public.medical_events add column if not exists import_source_key text;
alter table public.animal_followups add column if not exists import_source_key text;
alter table public.animal_timeline_events add column if not exists import_source_key text;

create unique index if not exists dogs_import_source_key_uq on public.dogs (import_source_key) where import_source_key is not null;
create unique index if not exists cases_import_source_key_uq on public.cases (import_source_key) where import_source_key is not null;
create unique index if not exists medical_events_import_source_key_uq on public.medical_events (import_source_key) where import_source_key is not null;
create unique index if not exists animal_followups_import_source_key_uq on public.animal_followups (import_source_key) where import_source_key is not null;
create unique index if not exists animal_timeline_events_import_source_key_uq on public.animal_timeline_events (import_source_key) where import_source_key is not null;
-- PostgREST's `onConflict=import_source_key` requires an inferable unique
-- index. PostgreSQL permits multiple NULLs in these indexes, so they retain
-- the existing rows that predate this recovery path.
create unique index if not exists dogs_import_source_key_conflict_uq on public.dogs (import_source_key);
create unique index if not exists cases_import_source_key_conflict_uq on public.cases (import_source_key);
create unique index if not exists medical_events_import_source_key_conflict_uq on public.medical_events (import_source_key);
create unique index if not exists animal_followups_import_source_key_conflict_uq on public.animal_followups (import_source_key);
create unique index if not exists animal_timeline_events_import_source_key_conflict_uq on public.animal_timeline_events (import_source_key);
-- The pending RPC filters by this exact shape on every chunk.
create index if not exists import_rows_pending_keyset_idx on public.import_rows (batch_id, id)
  where error is null and decision <> 'skip';

create or replace function public.next_pending_import_rows(
  p_batch_id uuid,
  p_after_id uuid default null,
  p_limit integer default 100
) returns table(
  id uuid, batch_id uuid, raw_row jsonb, normalized jsonb, matched_dog_id uuid,
  classification text, decision text, imported_dog_id uuid, imported_case_id uuid, error text
)
language sql security definer set search_path = public stable as $$
  select r.id, r.batch_id, r.raw_row, r.normalized, r.matched_dog_id,
         r.classification, r.decision, r.imported_dog_id, r.imported_case_id, r.error
    from public.import_rows r
   where r.batch_id = p_batch_id
     and r.error is null
     and r.decision <> 'skip'
     and (p_after_id is null or r.id > p_after_id)
     and (
       (r.classification in ('rescue', 'adoption', 'foster') and r.imported_case_id is null)
       or (r.classification in ('treatment', 'sterilisation', 'vaccination', 'follow_up') and r.imported_dog_id is null)
     )
   order by r.id
   limit greatest(1, least(coalesce(p_limit, 100), 100));
$$;
revoke all on function public.next_pending_import_rows(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.next_pending_import_rows(uuid, uuid, integer) to service_role;

-- ── Controlled spatial rollups ─────────────────────────────────────────
-- Public reads hit these compact city/cell rows. They never rebuild from the
-- full register. A worker takes queued cities one at a time after imports or
-- operational updates; queueing one row is the only synchronous side effect.
create table if not exists public.spatial_city_cells (
  city text not null,
  state text,
  zone text,
  h3_r8 text not null,
  animals integer not null default 0,
  needs_help integer not null default 0,
  sterilised integer not null default 0,
  vaccinated integer not null default 0,
  open_cases integer not null default 0,
  cases integer not null default 0,
  care_events integer not null default 0,
  latest_seen timestamptz,
  refreshed_at timestamptz not null default now(),
  primary key (city, h3_r8)
);
create index if not exists spatial_city_cells_city_animals_idx on public.spatial_city_cells (city, animals desc, h3_r8);
alter table public.spatial_city_cells enable row level security;
drop policy if exists spatial_city_cells_public_read on public.spatial_city_cells;
create policy spatial_city_cells_public_read on public.spatial_city_cells for select to anon, authenticated using (true);

create table if not exists public.spatial_refresh_queue (
  city text primary key,
  requested_at timestamptz not null default now(),
  reason text not null default 'record_change'
);
alter table public.spatial_refresh_queue enable row level security;
revoke all on public.spatial_refresh_queue from anon, authenticated;

create or replace function public.enqueue_spatial_refresh(p_city text, p_reason text default 'record_change')
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if nullif(btrim(p_city), '') is null then return false; end if;
  insert into public.spatial_refresh_queue (city, requested_at, reason)
  values (btrim(p_city), now(), coalesce(nullif(btrim(p_reason), ''), 'record_change'))
  on conflict (city) do update set requested_at = excluded.requested_at, reason = excluded.reason;
  return true;
end $$;
revoke all on function public.enqueue_spatial_refresh(text, text) from public, anon, authenticated;
grant execute on function public.enqueue_spatial_refresh(text, text) to service_role;

-- Ordinary record writes only mark their affected city dirty. They do not
-- synchronously rebuild a cell, invalidate a platform cache, or touch any
-- other organisation's records. This covers close/reopen and imports even
-- when they use an older write RPC.
create or replace function public.queue_spatial_from_case()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_city text;
begin
  select city into v_city from public.dogs where id = coalesce(new.dog_id, old.dog_id);
  perform public.enqueue_spatial_refresh(coalesce(new.city, old.city, v_city), 'case_change');
  if tg_op = 'UPDATE' and old.city is distinct from new.city then
    perform public.enqueue_spatial_refresh(old.city, 'case_moved');
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists queue_spatial_after_case_change on public.cases;
create trigger queue_spatial_after_case_change after insert or update of status, city, h3_r8, dog_id, resolved_at on public.cases
for each row execute function public.queue_spatial_from_case();

create or replace function public.queue_spatial_from_dog()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_spatial_refresh(coalesce(new.city, old.city), 'animal_change');
  if tg_op = 'UPDATE' and old.city is distinct from new.city then
    perform public.enqueue_spatial_refresh(old.city, 'animal_moved');
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists queue_spatial_after_dog_change on public.dogs;
create trigger queue_spatial_after_dog_change after insert or update of city, h3_r8, needs_help, sterilisation_status, vaccination_status on public.dogs
for each row execute function public.queue_spatial_from_dog();

-- Seed controlled maintenance once after this recovery migration. This queues
-- only the cities that currently have map-ready records; it performs no map
-- rebuild inside the migration or a visitor request.
insert into public.spatial_refresh_queue (city, reason)
select distinct d.city, 'recovery_backfill'
  from public.dogs d
 where d.city is not null and d.h3_r8 is not null and not coalesce(d.is_demo, false)
on conflict (city) do nothing;

create or replace function public.rebuild_spatial_city(p_city text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_rows integer;
begin
  if nullif(btrim(p_city), '') is null then return 0; end if;
  delete from public.spatial_city_cells where city = btrim(p_city);
  with animal_cells as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::integer as animals,
           count(*) filter (where d.needs_help)::integer as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::integer as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::integer as vaccinated,
           max(d.last_seen) as latest_seen
      from public.dogs d
     where d.city = btrim(p_city) and d.h3_r8 is not null and not coalesce(d.is_demo, false)
     group by d.city, d.h3_r8
  ), case_cells as (
    select coalesce(c.city, d.city) as city, coalesce(c.h3_r8, d.h3_r8) as h3_r8,
           count(*)::integer as cases,
           count(*) filter (where c.status in ('open', 'in_progress'))::integer as open_cases
      from public.cases c
      left join public.dogs d on d.id = c.dog_id
     where coalesce(c.city, d.city) = btrim(p_city) and coalesce(c.h3_r8, d.h3_r8) is not null and not coalesce(c.is_demo, false)
     group by coalesce(c.city, d.city), coalesce(c.h3_r8, d.h3_r8)
  ), care_cells as (
    select d.city, d.h3_r8, count(*)::integer as care_events
      from public.medical_events m join public.dogs d on d.id = m.dog_id
     where d.city = btrim(p_city) and d.h3_r8 is not null and not coalesce(m.is_demo, false)
     group by d.city, d.h3_r8
  )
  insert into public.spatial_city_cells (city, state, zone, h3_r8, animals, needs_help, sterilised, vaccinated, open_cases, cases, care_events, latest_seen, refreshed_at)
  select a.city, a.state, a.zone, a.h3_r8, a.animals, a.needs_help, a.sterilised, a.vaccinated,
         coalesce(c.open_cases, 0), coalesce(c.cases, 0), coalesce(k.care_events, 0), a.latest_seen, now()
    from animal_cells a
    left join case_cells c on c.city = a.city and c.h3_r8 = a.h3_r8
    left join care_cells k on k.city = a.city and k.h3_r8 = a.h3_r8;
  get diagnostics v_rows = row_count;
  delete from public.spatial_refresh_queue where city = btrim(p_city);
  return v_rows;
end $$;
revoke all on function public.rebuild_spatial_city(text) from public, anon, authenticated;
grant execute on function public.rebuild_spatial_city(text) to service_role;

grant select on public.spatial_city_cells to anon, authenticated, service_role;

create or replace function public.list_public_spatial_cities(p_limit integer default 200)
returns table(city text, state text, animals bigint, cases bigint, open_cases bigint, cells bigint, latest_seen timestamptz)
language sql security definer set search_path = public stable as $$
  select s.city, max(s.state) as state, sum(s.animals)::bigint, sum(s.cases)::bigint,
         sum(s.open_cases)::bigint, count(*)::bigint, max(s.latest_seen)
    from public.spatial_city_cells s
   group by s.city
   order by sum(s.animals) desc, s.city
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;
grant execute on function public.list_public_spatial_cities(integer) to anon, authenticated, service_role;

-- Organisation equivalents keep the same bounded map contract, but always
-- derive the organisation from the authenticated database identity.
create or replace function public.list_org_spatial_cities(p_limit integer default 100)
returns table(city text, state text, animals bigint, cases bigint, open_cases bigint, cells bigint, latest_seen timestamptz)
language sql security definer set search_path = public stable as $$
  with a as (
    select d.city, max(d.state) as state, count(*)::bigint as animals,
           count(distinct d.h3_r8)::bigint as cells, max(d.last_seen) as latest_seen
      from public.dogs d
     where auth.uid() is not null and d.ngo_id = public.my_ngo() and d.city is not null and d.h3_r8 is not null
     group by d.city
  ), c as (
    select d.city, count(*)::bigint as cases,
           count(*) filter (where c.status in ('open', 'in_progress'))::bigint as open_cases
      from public.cases c join public.dogs d on d.id = c.dog_id
     where auth.uid() is not null and c.ngo_id = public.my_ngo() and d.city is not null
     group by d.city
  )
  select a.city, a.state, a.animals, coalesce(c.cases, 0), coalesce(c.open_cases, 0), a.cells, a.latest_seen
    from a left join c using (city)
   order by a.animals desc, a.city
   limit greatest(1, least(coalesce(p_limit, 100), 200));
$$;

create or replace function public.list_org_spatial_cells(p_city text, p_limit integer default 4000)
returns table(city text, state text, zone text, h3_r8 text, animals bigint, needs_help bigint, sterilised bigint, vaccinated bigint, open_cases bigint, cases bigint, care_events bigint, latest_seen timestamptz)
language sql security definer set search_path = public stable as $$
  with animal_cells as (
    select d.city, max(d.state) as state, max(d.zone) as zone, d.h3_r8,
           count(*)::bigint as animals, count(*) filter (where d.needs_help)::bigint as needs_help,
           count(*) filter (where d.sterilisation_status = 'sterilised')::bigint as sterilised,
           count(*) filter (where d.vaccination_status = 'vaccinated')::bigint as vaccinated,
           max(d.last_seen) as latest_seen
      from public.dogs d
     where auth.uid() is not null and d.ngo_id = public.my_ngo()
       and d.city = nullif(btrim(p_city), '') and d.h3_r8 is not null
     group by d.city, d.h3_r8
  ), case_cells as (
    select coalesce(c.h3_r8, d.h3_r8) as h3_r8, count(*)::bigint as cases,
           count(*) filter (where c.status in ('open', 'in_progress'))::bigint as open_cases
      from public.cases c join public.dogs d on d.id = c.dog_id
     where auth.uid() is not null and c.ngo_id = public.my_ngo() and d.city = nullif(btrim(p_city), '')
     group by coalesce(c.h3_r8, d.h3_r8)
  ), care_cells as (
    select d.h3_r8, count(*)::bigint as care_events
      from public.medical_events m join public.dogs d on d.id = m.dog_id
     where auth.uid() is not null and d.ngo_id = public.my_ngo() and d.city = nullif(btrim(p_city), '')
     group by d.h3_r8
  )
  select a.city, a.state, a.zone, a.h3_r8, a.animals, a.needs_help, a.sterilised, a.vaccinated,
         coalesce(c.open_cases, 0), coalesce(c.cases, 0), coalesce(k.care_events, 0), a.latest_seen
    from animal_cells a left join case_cells c using (h3_r8) left join care_cells k using (h3_r8)
   order by a.animals desc, a.h3_r8
   limit greatest(1, least(coalesce(p_limit, 4000), 4000));
$$;
revoke all on function public.list_org_spatial_cities(integer) from public, anon;
revoke all on function public.list_org_spatial_cells(text, integer) from public, anon;
grant execute on function public.list_org_spatial_cities(integer) to authenticated, service_role;
grant execute on function public.list_org_spatial_cells(text, integer) to authenticated, service_role;
