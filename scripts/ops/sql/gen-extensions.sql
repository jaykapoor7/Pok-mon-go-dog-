-- Emits SQL that re-creates every installed extension in its original schema.
-- Needed because `supabase db dump` excludes the `extensions` schema, so PostGIS,
-- pgvector, http and friends (and every type they define) are missing on restore.
-- Read-only. Run with: psql -AtX -f gen-extensions.sql
set search_path to pg_catalog;
select stmt from (
  select 1 as ord, n.nspname as k, format('create schema if not exists %I;', n.nspname) as stmt
  from (select distinct e.extnamespace from pg_extension e) x
  join pg_namespace n on n.oid = x.extnamespace
  where n.nspname not in ('pg_catalog', 'public')
  union all
  select 2, e.extname, case
    when n.nspname = 'pg_catalog' then format('create extension if not exists %I;', e.extname)
    else format('create extension if not exists %I with schema %I;', e.extname, n.nspname)
  end
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname <> 'plpgsql'
) s order by ord, k;
