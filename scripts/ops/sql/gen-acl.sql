-- Emits SQL that makes every privilege in our own schemas exactly what it is in
-- the source database: revoke from the API roles, then grant back what the
-- source grants.
--
-- Why: pg_dump (and so `supabase db dump`) writes privileges relative to each
-- object's owner defaults. A fresh Supabase project has ALTER DEFAULT
-- PRIVILEGES granting ALL to anon/authenticated/service_role, so on restore
-- every table and function we deliberately revoked would come back open to
-- anon. Verified on 24 Nov 2026 with a local reproduction; production revokes
-- anon on 121 tables and 394 functions.
-- Read-only. Run with: psql -AtX -f gen-acl.sql
set search_path to pg_catalog;

with us as (
  select oid, nspname from pg_namespace
  where nspname !~ '^(pg_|_timescaledb_|timescaledb_)'
    and nspname not in ('information_schema', '_analytics', '_realtime', '_supavisor', 'auth', 'etl', 'extensions',
      'pgbouncer', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'cron', 'dbdev', 'graphql',
      'graphql_public', 'net', 'pgmq', 'pgsodium', 'pgsodium_masks', 'pgtle', 'repack', 'tiger', 'tiger_data',
      'topology', 'vault')
),
api_roles as (select 'public, anon, authenticated, service_role'::text as list),
objs as (
  -- schemas
  select 1 as ord, us.nspname as k, 'schema'::text as kw, quote_ident(us.nspname) as ident,
         coalesce(n.nspacl, acldefault('n', n.nspowner)) as acl, n.nspowner as owner
  from us join pg_namespace n on n.oid = us.oid
  union all
  -- tables, views, materialized views, foreign tables, sequences
  select 2, us.nspname || '.' || c.relname, case when c.relkind = 'S' then 'sequence' else 'table' end,
         format('%I.%I', us.nspname, c.relname),
         coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner)), c.relowner
  from pg_class c join us on us.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
  union all
  -- functions and procedures
  select 3, us.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         'routine', format('%I.%I(%s)', us.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
         coalesce(p.proacl, acldefault('f', p.proowner)), p.proowner
  from pg_proc p join us on us.oid = p.pronamespace
  where p.prokind in ('f', 'p')
    and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
)
select stmt from (
  select o.ord, o.k, 0 as sub, format('revoke all on %s %s from %s;', o.kw, o.ident, (select list from api_roles)) as stmt
  from objs o
  union all
  select o.ord, o.k, 1, format('grant %s on %s %s to %s%s;', a.privilege_type, o.kw, o.ident,
           case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end,
           case when a.is_grantable then ' with grant option' else '' end)
  from objs o, lateral aclexplode(o.acl) a
  where a.grantee <> o.owner
  union all
  -- column-level grants (re-applied after the table-level revoke above)
  select 2, us.nspname || '.' || c.relname, 2, format('grant %s (%I) on table %I.%I to %s%s;', a.privilege_type, att.attname,
           us.nspname, c.relname,
           case when a.grantee = 0 then 'public' else quote_ident(pg_get_userbyid(a.grantee)) end,
           case when a.is_grantable then ' with grant option' else '' end)
  from pg_attribute att
  join pg_class c on c.oid = att.attrelid
  join us on us.oid = c.relnamespace,
  lateral aclexplode(att.attacl) a
  where att.attacl is not null and att.attnum > 0 and not att.attisdropped and a.grantee <> c.relowner
) s
order by ord, k, sub, stmt;
