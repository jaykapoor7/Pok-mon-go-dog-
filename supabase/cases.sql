-- ════════════════════════════════════════════════════════════════
-- StrayPaw Delhi — NGO operations layer (Phase 1: cases + ownership)
--
-- Additive. Does not touch sightings / dogs / moderation. Run once in the
-- Supabase SQL editor.
--
-- Model:  Dog (continuity, already exists) 1──* Case (operational lifecycle)
--         Case 1──* case_updates (audit trail)
--         Volunteer (lightweight identity; reuses the app's local id)
--
-- Identity is the existing local {id,name}; writes flow through SECURITY
-- DEFINER functions that record who-did-what. "Only the assignee can update"
-- is enforced inside update_case_status.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────
do $$ begin
  create type case_status as enum
    ('unverified','assigned','in_progress','resolved','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_severity as enum ('low','normal','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_category as enum
    ('injury','sterilisation','rescue','vaccination','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_resolution as enum ('sterilized','rescued','treated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_update_type as enum
    ('created','claimed','assigned','status_changed','note','reopened');
exception when duplicate_object then null; end $$;

-- ── Volunteers (lightweight — id generated client-side) ─────────
create table if not exists volunteers (
  id         uuid primary key,
  name       text not null,
  phone      text,
  ngo_id     uuid references ngos(id),
  created_at timestamptz default now()
);

-- ── Cases ───────────────────────────────────────────────────────
create table if not exists cases (
  id               uuid primary key default uuid_generate_v4(),
  dog_id           uuid references dogs(id) on delete set null,
  title            text not null,
  description      text,
  zone             text,
  lat              double precision,
  lng              double precision,
  severity         case_severity default 'normal',
  category         case_category default 'other',
  tags             text[] default '{}',
  status           case_status default 'unverified',
  resolution       case_resolution,
  assignee_id      uuid references volunteers(id),
  assignee_name    text,
  ngo_id           uuid references ngos(id),
  created_by_id    uuid,
  created_by_name  text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_activity_at timestamptz default now(),
  due_at           timestamptz
);
create index if not exists cases_status_idx       on cases (status);
create index if not exists cases_assignee_idx      on cases (assignee_id);
create index if not exists cases_activity_idx      on cases (last_activity_at desc);
create index if not exists cases_severity_idx      on cases (severity);
create index if not exists cases_geo_idx           on cases (lat, lng);

-- ── Case updates (audit trail) ─────────────────────────────────
create table if not exists case_updates (
  id          uuid primary key default uuid_generate_v4(),
  case_id     uuid references cases(id) on delete cascade,
  actor_id    uuid,
  actor_name  text,
  type        case_update_type not null,
  from_status case_status,
  to_status   case_status,
  note        text,
  created_at  timestamptz default now()
);
create index if not exists case_updates_case_idx on case_updates (case_id, created_at);

-- ════════════════════════════════════════════════════════════════
-- Functions (all SECURITY DEFINER; writes are audited)
-- ════════════════════════════════════════════════════════════════

-- Register/refresh a volunteer (called on first operational action).
create or replace function upsert_volunteer(p_id uuid, p_name text, p_phone text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into volunteers (id, name, phone) values (p_id, p_name, p_phone)
  on conflict (id) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, volunteers.phone);
end;
$$;

-- Create a case (status starts 'unverified'); writes the 'created' audit row.
create or replace function create_case(
  p_title       text,
  p_description text default null,
  p_dog_id      uuid default null,
  p_zone        text default null,
  p_lat         float default null,
  p_lng         float default null,
  p_severity    case_severity default 'normal',
  p_category    case_category default 'other',
  p_tags        text[] default '{}',
  p_actor_id    uuid default null,
  p_actor_name  text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into cases (dog_id, title, description, zone, lat, lng, severity,
                     category, tags, status, created_by_id, created_by_name)
  values (p_dog_id, p_title, p_description, p_zone, p_lat, p_lng, p_severity,
          p_category, p_tags, 'unverified', p_actor_id, p_actor_name)
  returning id into v_id;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (v_id, p_actor_id, p_actor_name, 'created', 'unverified', 'Case opened');
  return v_id;
end;
$$;

-- Claim an UNASSIGNED case → becomes the assignee, status → assigned.
create or replace function claim_case(p_case_id uuid, p_actor_id uuid, p_actor_name text)
returns boolean language plpgsql security definer set search_path = public as $$
declare c cases;
begin
  update cases set
    assignee_id      = p_actor_id,
    assignee_name    = p_actor_name,
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id and assignee_id is null
  returning * into c;

  if not found then return false; end if;

  insert into case_updates (case_id, actor_id, actor_name, type, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, 'claimed', c.status,
          p_actor_name || ' claimed this case');
  return true;
end;
$$;

-- Reassign a case to another volunteer.
create or replace function assign_case(
  p_case_id uuid, p_assignee_id uuid, p_assignee_name text,
  p_actor_id uuid, p_actor_name text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update cases set
    assignee_id      = p_assignee_id,
    assignee_name    = p_assignee_name,
    status           = case when status = 'unverified' then 'assigned' else status end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, p_actor_id, p_actor_name, 'assigned',
          'Assigned to ' || p_assignee_name);
end;
$$;

-- Update status. Enforces: a case must be claimed, and ONLY the assignee may
-- change its status. Records from/to + an optional note. Handles reopen.
create or replace function update_case_status(
  p_case_id    uuid,
  p_to_status  case_status,
  p_actor_id   uuid,
  p_actor_name text,
  p_resolution case_resolution default null,
  p_note       text default null
)
returns json language plpgsql security definer set search_path = public as $$
declare
  c       cases;
  v_type  case_update_type := 'status_changed';
begin
  select * into c from cases where id = p_case_id;
  if not found then return json_build_object('ok', false, 'error', 'not found'); end if;

  if c.assignee_id is null then
    return json_build_object('ok', false, 'error', 'Claim the case before updating it.');
  end if;
  if c.assignee_id <> p_actor_id then
    return json_build_object('ok', false, 'error', 'Only the assignee can update this case.');
  end if;
  if p_to_status = c.status then
    return json_build_object('ok', false, 'error', 'Case is already in that status.');
  end if;
  if p_to_status = 'unverified' then
    return json_build_object('ok', false, 'error', 'Cannot move a case back to unverified.');
  end if;
  if p_to_status = 'resolved' and p_resolution is null then
    return json_build_object('ok', false, 'error', 'A resolution is required to resolve a case.');
  end if;

  if c.status in ('resolved','closed') and p_to_status = 'in_progress' then
    v_type := 'reopened';
  end if;

  update cases set
    status           = p_to_status,
    resolution       = case when p_to_status = 'resolved' then p_resolution
                            when p_to_status = 'in_progress' then null
                            else resolution end,
    updated_at       = now(),
    last_activity_at = now()
  where id = p_case_id;

  insert into case_updates (case_id, actor_id, actor_name, type,
                            from_status, to_status, note)
  values (p_case_id, p_actor_id, p_actor_name, v_type, c.status, p_to_status, p_note);

  return json_build_object('ok', true, 'status', p_to_status);
end;
$$;

-- Free-text note on a case (any volunteer; bumps activity so it's not "overdue").
create or replace function add_case_note(
  p_case_id uuid, p_actor_id uuid, p_actor_name text, p_note text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into case_updates (case_id, actor_id, actor_name, type, note)
  values (p_case_id, p_actor_id, p_actor_name, 'note', p_note);
  update cases set last_activity_at = now() where id = p_case_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- Row Level Security — public read (NGO-internal but no auth yet);
-- all writes go through the functions above.
-- ════════════════════════════════════════════════════════════════
alter table volunteers   enable row level security;
alter table cases        enable row level security;
alter table case_updates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['volunteers','cases','case_updates'] loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

grant execute on function upsert_volunteer(uuid,text,text) to anon, authenticated, service_role;
grant execute on function create_case(text,text,uuid,text,float,float,case_severity,case_category,text[],uuid,text) to anon, authenticated, service_role;
grant execute on function claim_case(uuid,uuid,text) to anon, authenticated, service_role;
grant execute on function assign_case(uuid,uuid,text,uuid,text) to anon, authenticated, service_role;
grant execute on function update_case_status(uuid,case_status,uuid,text,case_resolution,text) to anon, authenticated, service_role;
grant execute on function add_case_note(uuid,uuid,text,text) to anon, authenticated, service_role;
