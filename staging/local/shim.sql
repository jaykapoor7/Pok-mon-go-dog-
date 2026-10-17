-- ════════════════════════════════════════════════════════════════
-- StrayPaw local staging: Supabase-compatibility shim.
--
-- Recreates, on a plain PostgreSQL 16 cluster, the small part of a
-- Supabase project that the repo's SQL assumes already exists:
--   • the API roles (anon, authenticated, service_role, authenticator)
--     with Supabase's grant model (default privileges in `public` grant
--     everything to the API roles; RLS is the gate),
--   • auth.users + auth.uid()/auth.role()/auth.jwt()/auth.email() reading
--     request.jwt.claims exactly like PostgREST sets it,
--   • storage.buckets / storage.objects (+ storage.foldername) stubs,
--   • (pg_cron is the real extension, preloaded by setup.sh),
--   • extensions: uuid-ossp, pgcrypto, pg_trgm, unaccent, postgis.
--
-- This file is LOCAL ONLY. It is never applied to a Supabase project.
-- ════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

-- ── Roles (cluster-wide; idempotent) ───────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit password 'local-staging-only'; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

-- ── Extensions ─────────────────────────────────────────────────
create schema if not exists extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto    with schema extensions;
create extension if not exists pg_trgm     with schema extensions;
create extension if not exists unaccent    with schema extensions;
-- PostGIS lives in public on many Supabase projects created before 2023
-- (the repo creates it with a bare `create extension postgis`).
create extension if not exists postgis;
grant usage on schema extensions to anon, authenticated, service_role;

-- Supabase puts `extensions` on every role's search_path.
alter database :"DBNAME" set search_path = "$user", public, extensions;
set search_path = "$user", public, extensions;

-- ── Grant model of a Supabase project ──────────────────────────
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- ── auth schema ────────────────────────────────────────────────
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                  uuid primary key default extensions.uuid_generate_v4(),
  instance_id         uuid,
  aud                 text default 'authenticated',
  role                text default 'authenticated',
  email               text unique,
  phone               text,
  encrypted_password  text,
  email_confirmed_at  timestamptz,
  confirmed_at        timestamptz,
  last_sign_in_at     timestamptz,
  raw_app_meta_data   jsonb default '{}'::jsonb,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  is_anonymous        boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  deleted_at          timestamptz
);
-- On Supabase the API roles cannot read auth.users; only definer functions can.
revoke all on auth.users from anon, authenticated;
grant all on auth.users to service_role;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email()
  to anon, authenticated, service_role;

-- ── storage schema (stubs: tables and policies apply; no object store) ──
create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null unique,
  owner              uuid,
  public             boolean default false,
  avif_autodetection boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[],
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table if not exists storage.objects (
  id               uuid primary key default extensions.uuid_generate_v4(),
  bucket_id        text references storage.buckets(id),
  name             text,
  owner            uuid,
  owner_id         text,
  metadata         jsonb,
  path_tokens      text[] generated always as (string_to_array(name, '/')) stored,
  version          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  last_accessed_at timestamptz default now()
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
create or replace function storage.filename(name text) returns text
language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;
create or replace function storage.extension(name text) returns text
language sql immutable as $$
  select reverse(split_part(reverse(storage.filename(name)), '.', 1))
$$;

-- ── pg_cron ────────────────────────────────────────────────────
-- The real pg_cron extension is loaded by setup.sh (shared_preload_libraries,
-- cron.database_name = this database). launch-spatial-schedule.sql creates it
-- and schedules a job; setup.sh deactivates every job after the migrations so
-- nothing mutates state while the tests run.
