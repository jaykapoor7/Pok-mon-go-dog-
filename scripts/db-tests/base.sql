-- Minimal stand-ins for the parts of the production schema that the rebuild migrations touch. Used only by scripts/db-tests (a local Postgres in WebAssembly); never applied to a real database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb, email_confirmed_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') $$;
create schema if not exists storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
grant usage on schema auth, storage, public to authenticated, anon;
grant execute on function auth.uid(), auth.role() to authenticated, anon;
grant select, insert on storage.objects to authenticated;

create table public.ngos (id uuid primary key default gen_random_uuid(), name text not null, slug text, demo_mode boolean default false, city text, logo_url text, cover_photo text, status text default 'active');
-- The public profile columns ngo_update_profile writes (supabase/org-profiles.sql).
alter table public.ngos add column mission text, add column about text, add column website text, add column contact_email text, add column contact_phone text, add column state text, add column areas_of_work text[], add column founded_year int, add column registration_no text;
create table public.ngo_members (ngo_id uuid references public.ngos, user_id uuid, role text, created_at timestamptz default now(), primary key (ngo_id, user_id));
create table public.review_offices (id uuid primary key default gen_random_uuid(), name text);
create table public.review_office_members (office_id uuid references public.review_offices, user_id uuid, role text, primary key (office_id, user_id));
create table public.dogs (id uuid primary key default gen_random_uuid(), ngo_id uuid, name text, straypaw_id text, code text, cover_photo text, species text, sex text, photo_url text, identity_state text, last_seen_at timestamptz, zone text, city text, vaccination_status text, sterilisation_status text, created_at timestamptz default now());
create table public.cases (id uuid primary key default gen_random_uuid(), ngo_id uuid, dog_id uuid, title text, case_code text, zone text, city text, due_at timestamptz, follow_up_at date, resolved_at timestamptz, status text default 'open', created_at timestamptz default now());
create table public.medical_events (id uuid primary key default gen_random_uuid(), dog_id uuid, kind text, event_date date, created_at timestamptz default now());
create table public.animal_followups (id uuid primary key default gen_random_uuid(), ngo_id uuid, case_id uuid, dog_id uuid, due_at timestamptz, status text default 'open');
-- Training (20261107090000_training_lms.sql), only the columns the automation rules read.
create table public.training_courses (id uuid primary key default gen_random_uuid(), ngo_id uuid, title text);
create table public.training_lessons (id uuid primary key default gen_random_uuid(), course_id uuid references public.training_courses, title text);
create table public.training_assignments (id uuid primary key default gen_random_uuid(), course_id uuid references public.training_courses, ngo_id uuid, user_id uuid, assigned_by uuid, due_on date, unique (course_id, user_id));
create table public.training_progress (id uuid primary key default gen_random_uuid(), lesson_id uuid references public.training_lessons, course_id uuid, user_id uuid, ngo_id uuid, passed boolean not null default true, unique (lesson_id, user_id));
create or replace function public.my_ngo() returns uuid language sql stable security definer set search_path = public as $$ select ngo_id from ngo_members where user_id = auth.uid() order by created_at limit 1 $$;
grant execute on function public.my_ngo() to authenticated;
-- As in Supabase, signed-in sessions hold table privileges and row-level security narrows them.
grant select, insert, update on public.dogs, public.cases, public.ngos, public.medical_events, public.animal_followups to authenticated;
-- Field mode (20261102132030_field_vaccination_receipts.sql, 20261103004523_offline_intake_and_lifecycle.sql): only
-- what those two migrations and their functions read and write, so the real migrations load as written.
alter table public.medical_events add column if not exists case_id uuid, add column if not exists notes text, add column if not exists performed_by text, add column if not exists created_by_id uuid;
create table public.operational_audit_log (id bigserial primary key, ngo_id uuid, actor_id uuid, entity_type text, entity_id uuid, action text, before_data jsonb, after_data jsonb, created_at timestamptz not null default now());
create table public.abc_attestations (id uuid primary key default gen_random_uuid(), case_id uuid, kind text, revoked_at timestamptz, created_at timestamptz default now());
create table public.case_updates (id uuid primary key default gen_random_uuid(), case_id uuid, actor_id uuid, actor_name text, note text, created_at timestamptz default now());
create or replace function public.add_medical_event(p_dog_id uuid, p_case_id uuid default null, p_kind text default 'treatment', p_event_date date default current_date, p_notes text default null, p_performed_by text default null)
returns uuid language sql security definer set search_path = public as $$
  insert into medical_events (dog_id, case_id, kind, event_date, notes, performed_by, created_by_id) values (p_dog_id, p_case_id, coalesce(p_kind, 'treatment'), coalesce(p_event_date, current_date), p_notes, p_performed_by, auth.uid()) returning id;
$$;
create or replace function public.sp_actor_name() returns text language sql stable security definer set search_path = public as $$ select coalesce((select raw_user_meta_data->>'display_name' from auth.users where id = auth.uid()), 'Member') $$;
create or replace function public.sp_member_role(p_ngo uuid) returns text language sql stable security definer set search_path = public as $$ select role from ngo_members where user_id = auth.uid() and ngo_id = p_ngo $$;
create or replace function public.add_case_note(p_case_id uuid, p_actor_id uuid, p_actor_name text, p_note text) returns uuid language sql security definer set search_path = public as $$ insert into case_updates (case_id, actor_id, actor_name, note) values (p_case_id, p_actor_id, p_actor_name, p_note) returning id $$;
create or replace function public.add_case_followup(p_case_id uuid, p_dog_id uuid, p_due date, p_notes text) returns uuid language sql security definer set search_path = public as $$ select null::uuid $$;
create table public.report_packages (id uuid primary key default gen_random_uuid(), ngo_id uuid, office_id uuid, status text default 'draft', case_ids uuid[] default '{}', submitted_at timestamptz);
grant select on public.medical_events, public.operational_audit_log to authenticated;
-- Deleting and restoring records (20261103180000_removable_records.sql, 20261120131000_records_remove_animals_names.sql):
-- the columns and the timeline table those functions read, as in production.
alter table public.dogs add column color text default 'Brown', add column created_by_id uuid;
alter table public.cases add column created_by_id uuid;
create table public.animal_timeline_events (id uuid primary key default gen_random_uuid(), dog_id uuid references public.dogs(id) on delete cascade, case_id uuid references public.cases(id) on delete set null, event_type text, title text, actor_id uuid, actor_name text, occurred_at timestamptz default now(), created_at timestamptz default now());
create table public.evidence_items (id uuid primary key default gen_random_uuid(), ngo_id uuid, case_id uuid references public.cases(id) on delete set null, dog_id uuid references public.dogs(id) on delete set null, created_at timestamptz default now());
create table public.evidence_reviews (id uuid primary key default gen_random_uuid(), evidence_id uuid references public.evidence_items(id), created_at timestamptz default now());
