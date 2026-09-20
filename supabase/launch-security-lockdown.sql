-- StrayPaw launch security lockdown.
-- Run after RUN-ALL-MIGRATIONS.sql, security-hardening-rls.sql and rollout-hardening.sql.
-- Idempotent. Removes implicit PUBLIC execution from app-owned SECURITY DEFINER
-- functions, restores only deliberate client roles, and closes public base-table
-- shortcuts around curated views.

-- 1) Explicitly deny clients on internal plumbing tables. RLS without a policy is
-- already fail-closed; these named policies make the intent durable and visible.
do $$
declare t text;
begin
  foreach t in array array[
    'access_grants','content_reports','feedback','feeding_zone_volunteers',
    'helpers','import_location_cache','personal_access_codes','rate_limits'
  ] loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists internal_deny_client_access on public.%I', t);
      execute format(
        'create policy internal_deny_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
        t
      );
    end if;
  end loop;
end $$;

-- 2) SECURITY DEFINER functions must never inherit PostgreSQL's default PUBLIC
-- EXECUTE. Service-role remains able to use app-owned definer functions; client
-- roles are re-granted deliberately below.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and not exists (
        select 1
        from pg_depend d
        join pg_extension e on e.oid = d.refobjid
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
  end loop;
end $$;

-- Anonymous RPCs are intentionally limited to narrow community/public actions.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname = any(array[
        'add_comment','like_sighting','log_feed','log_seen',
        'track_event','published_totals','nearby_animals','india_mask',
        'create_feeding_zone'
      ])
  loop
    execute format('grant execute on function %s to anon, authenticated', r.fn);
  end loop;
end $$;

-- Signed-in product RPCs. Sensitive moderation/admin/server routes are excluded
-- and stay service-role-only.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype <> 'trigger'::regtype
      and p.proname not like 'admin_%'
      and p.proname <> all(array[
        'approve_partner_request','reject_partner_request',
        'approve_sighting','reject_sighting','verify_case',
        'report_sighting','report_sighting_for_org',
        'resolve_access_code','resolve_invite_code','redeem_access_code',
        'mint_access_code','check_rate_limit','rebuild_india_mask',
        'recount_animal_sightings','submit_content_report','submit_feedback',
        'submit_helper','delete_sighting'
      ])
      and not exists (
        select 1
        from pg_depend d
        join pg_extension e on e.oid = d.refobjid
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
  loop
    execute format('grant execute on function %s to authenticated', r.fn);
  end loop;
end $$;

-- 3) Lock search_path on every app-owned function so object resolution cannot be
-- changed by the caller. Keep extensions available for PostGIS/helper functions.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1
        from pg_depend d
        join pg_extension e on e.oid = d.refobjid
        where d.classid = 'pg_proc'::regclass
          and d.objid = p.oid
          and d.deptype = 'e'
      )
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format('alter function %s set search_path = public, extensions', r.fn);
  end loop;
end $$;

-- 4) Feeding-zone public projections: retain the existing API shape but never
-- disclose auth/user UUIDs. Exact volunteer contacts remain private.
create or replace view feeding_zone_public as
select
  fz.id, fz.name, fz.description, fz.zone, fz.lat, fz.lng, fz.photo_url,
  null::uuid as created_by_id,
  fz.created_by_name, fz.created_at, fz.last_fed_at,
  (select count(*) from feeding_zone_volunteers v where v.feeding_zone_id = fz.id) as volunteer_count,
  fz.ngo_id
from feeding_zones fz;

create or replace view feeding_zone_volunteer_public as
select id, feeding_zone_id, null::uuid as user_id, user_name, days, created_at
from feeding_zone_volunteers;

create or replace view feeding_zone_checkin_public as
select id, feeding_zone_id, null::uuid as actor_id, actor_name, note, created_at
from feeding_zone_checkins;

grant select on feeding_zone_public, feeding_zone_volunteer_public,
  feeding_zone_checkin_public to anon, authenticated, service_role;

-- Public clients must use the projections, not the underlying rows.
revoke select on feeding_zones, feeding_zone_volunteers, feeding_zone_checkins
  from anon, authenticated;

-- 5) Guest zone creation is allowed, but a guest cannot impersonate a user.
-- A signed-in creator is always stamped from auth context.
create or replace function create_feeding_zone(
  p_name text,
  p_description text default null,
  p_zone text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_photo_url text default null,
  p_actor_id uuid default null,
  p_actor_name text default null
)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_actor uuid;
begin
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required.'; end if;
  if p_lat is null or p_lng is null then raise exception 'A location is required.'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordinates are outside the valid range';
  end if;
  v_actor := auth.uid();
  if p_actor_id is not null and v_actor is not null and p_actor_id <> v_actor then
    raise exception 'Actor does not match signed-in user';
  end if;
  insert into feeding_zones (
    name, description, zone, lat, lng, photo_url, created_by_id, created_by_name
  ) values (
    btrim(p_name), nullif(btrim(coalesce(p_description,'')), ''),
    nullif(btrim(coalesce(p_zone,'')), ''), p_lat, p_lng, p_photo_url,
    v_actor, nullif(btrim(coalesce(p_actor_name,'')), '')
  ) returning id into v_id;
  return v_id;
end $$;
revoke execute on function create_feeding_zone(text,text,text,double precision,double precision,text,uuid,text)
  from public;
grant execute on function create_feeding_zone(text,text,text,double precision,double precision,text,uuid,text)
  to anon, authenticated, service_role;

-- Check-ins are genuinely signed-in-only; never trust the supplied actor UUID.
create or replace function checkin_feeding_zone(
  p_zone_id uuid, p_actor_id uuid, p_actor_name text, p_note text default null
)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'Sign in as the person checking in';
  end if;
  insert into feeding_zone_checkins (feeding_zone_id, actor_id, actor_name, note)
  values (
    p_zone_id, auth.uid(), nullif(btrim(coalesce(p_actor_name,'')), ''),
    nullif(btrim(coalesce(p_note,'')), '')
  );
  update feeding_zones set last_fed_at = now() where id = p_zone_id;
end $$;
revoke execute on function checkin_feeding_zone(uuid,uuid,text,text)
  from public, anon;
grant execute on function checkin_feeding_zone(uuid,uuid,text,text)
  to authenticated, service_role;


-- 6) Guard legacy write RPCs that predate strict auth scoping.
create or replace function upsert_volunteer(
  p_id uuid, p_name text, p_phone text default null
)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null or auth.uid() <> p_id then
    raise exception 'Sign in as this volunteer';
  end if;
  insert into volunteers (id, name, phone)
  values (auth.uid(), nullif(btrim(coalesce(p_name,'')), ''), nullif(btrim(coalesce(p_phone,'')), ''))
  on conflict (id) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, volunteers.phone);
end $$;
revoke execute on function upsert_volunteer(uuid,text,text) from public, anon;
grant execute on function upsert_volunteer(uuid,text,text) to authenticated, service_role;

create or replace function assign_case(
  p_case_id uuid,
  p_assignee_id uuid,
  p_assignee_name text,
  p_actor_id uuid,
  p_actor_name text
)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_ngo uuid;
begin
  if auth.uid() is null or auth.uid() <> p_actor_id then
    raise exception 'Sign in as the assigning user';
  end if;
  select my_ngo() into v_ngo;
  if v_ngo is null then raise exception 'Organisation access required'; end if;
  if not exists (select 1 from cases where id = p_case_id and ngo_id = v_ngo) then
    raise exception 'Case is not in your organisation';
  end if;
  if not exists (
    select 1 from ngo_members
    where ngo_id = v_ngo and user_id = p_assignee_id
  ) then
    raise exception 'Assignee is not in your organisation';
  end if;

  update cases set
    assignee_id = p_assignee_id,
    assignee_name = nullif(btrim(coalesce(p_assignee_name,'')), ''),
    status = case when status = 'unverified' then 'assigned' else status end,
    updated_at = now(),
    last_activity_at = now()
  where id = p_case_id and ngo_id = v_ngo;

  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (
    p_case_id, auth.uid(), nullif(btrim(coalesce(p_actor_name,'')), ''),
    'assigned', 'Assigned to ' || coalesce(nullif(btrim(p_assignee_name), ''), 'team member')
  );
end $$;
revoke execute on function assign_case(uuid,uuid,text,uuid,text) from public, anon;
grant execute on function assign_case(uuid,uuid,text,uuid,text) to authenticated, service_role;

-- Observation relinking is an operator/reviewer action, never a normal client RPC.
revoke execute on function relink_sighting(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function relink_sighting(uuid,uuid,text,text) to service_role;

-- PostGIS ships these SECURITY DEFINER helpers in public. StrayPaw does not call
-- them through PostgREST, so do not expose them as RPC endpoints to clients.
revoke execute on function st_estimatedextent(text,text)
  from public, anon, authenticated;
revoke execute on function st_estimatedextent(text,text,text)
  from public, anon, authenticated;
revoke execute on function st_estimatedextent(text,text,text,boolean)
  from public, anon, authenticated;


-- 7) Reporter identity is private. Preserve public API column names so clients
-- remain compatible, but never expose reporter names from community records.
create or replace view public_live_sightings as
select id, dog_id, null::text as reporter_name, photo_url,
       round(lat::numeric, 2)::double precision as lat,
       round(lng::numeric, 2)::double precision as lng,
       zone, nickname, mood_tags, notes, trust_score, likes, status, created_at
from sightings
where status = 'live';

create or replace view public_feed_events as
select id, dog_id, null::text as reporter_name, food_type, created_at
from feed_events;

create or replace view public_comments as
select id, dog_id, null::text as reporter_name, body, created_at
from comments;

grant select on public_live_sightings, public_feed_events, public_comments
  to anon, authenticated;
