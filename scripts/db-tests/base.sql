-- Minimal stand-ins for the parts of the production schema that the rebuild migrations touch. Used only by scripts/db-tests (a local Postgres in WebAssembly); never applied to a real database.
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
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
create table public.ngo_members (ngo_id uuid references public.ngos, user_id uuid, role text, created_at timestamptz default now(), primary key (ngo_id, user_id));
create table public.review_offices (id uuid primary key default gen_random_uuid(), name text);
create table public.review_office_members (office_id uuid references public.review_offices, user_id uuid, role text, primary key (office_id, user_id));
create table public.dogs (id uuid primary key default gen_random_uuid(), ngo_id uuid, name text, straypaw_id text, code text, cover_photo text, species text, sex text, photo_url text, identity_state text, last_seen_at timestamptz, zone text, city text, vaccination_status text, sterilisation_status text, created_at timestamptz default now());
create table public.cases (id uuid primary key default gen_random_uuid(), ngo_id uuid, dog_id uuid, title text, case_code text, zone text, city text, due_at timestamptz, follow_up_at date, resolved_at timestamptz, status text default 'open', created_at timestamptz default now());
create table public.medical_events (id uuid primary key default gen_random_uuid(), dog_id uuid, kind text, event_date date, created_at timestamptz default now());
create table public.animal_followups (id uuid primary key default gen_random_uuid(), case_id uuid, dog_id uuid, due_at timestamptz, status text default 'open');
create or replace function public.my_ngo() returns uuid language sql stable security definer set search_path = public as $$ select ngo_id from ngo_members where user_id = auth.uid() order by created_at limit 1 $$;
grant execute on function public.my_ngo() to authenticated;
-- As in Supabase, signed-in sessions hold table privileges and row-level security narrows them.
grant select, insert, update on public.dogs, public.cases, public.ngos, public.medical_events, public.animal_followups to authenticated;
