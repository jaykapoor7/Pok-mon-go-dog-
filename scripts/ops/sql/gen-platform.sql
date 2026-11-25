-- Emits SQL for customisations that live in Supabase-managed schemas, which
-- `supabase db dump` leaves out of schema.sql:
--   1. RLS policies on auth/storage/realtime tables (e.g. who may read or upload
--      in each Storage bucket). Platform-owned cron policies are skipped.
--   2. Triggers on auth/storage/realtime tables that call our own functions
--      (e.g. a trigger on auth.users). Supabase's own triggers are skipped.
--   3. pg_cron jobs, re-created through cron.schedule (cron.job rows are not
--      restored directly: the table is platform-owned).
--   4. Materialized views: a schema dump creates them WITH NO DATA and a data
--      dump never refreshes them, so after a restore they are unpopulated:
--      reads fail and REFRESH ... CONCURRENTLY jobs fail forever. Every view
--      populated in the source is refreshed here (found by the first
--      production restore drill, 24 Nov 2026).
-- Applied after the data, with normal trigger behaviour. Read-only.
-- Run with: psql -AtX -f gen-platform.sql
set search_path to pg_catalog;

select format('drop policy if exists %I on %I.%I;', p.polname, n.nspname, c.relname) || chr(10) ||
       format('create policy %I on %I.%I as %s for %s to %s%s%s;',
         p.polname, n.nspname, c.relname,
         case when p.polpermissive then 'permissive' else 'restrictive' end,
         case p.polcmd when 'r' then 'select' when 'a' then 'insert' when 'w' then 'update' when 'd' then 'delete' else 'all' end,
         coalesce(nullif(array_to_string(array(select case when r = 0 then 'public' else quote_ident(pg_get_userbyid(r)) end
                   from unnest(p.polroles) r order by 1), ', '), ''), 'public'),
         case when p.polqual is not null then ' using (' || pg_get_expr(p.polqual, p.polrelid) || ')' else '' end,
         case when p.polwithcheck is not null then ' with check (' || pg_get_expr(p.polwithcheck, p.polrelid) || ')' else '' end)
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('auth', 'storage', 'realtime')
order by n.nspname, c.relname, p.polname;

select format('drop trigger if exists %I on %I.%I;', t.tgname, n.nspname, c.relname) || chr(10) ||
       pg_get_triggerdef(t.oid) || ';' ||
       case t.tgenabled::text when 'D' then chr(10) || format('alter table %I.%I disable trigger %I;', n.nspname, c.relname, t.tgname) else '' end
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc f on f.oid = t.tgfoid
join pg_namespace fn on fn.oid = f.pronamespace
where not t.tgisinternal
  and n.nspname in ('auth', 'storage', 'realtime')
  and fn.nspname not in ('auth', 'storage', 'realtime', 'extensions', 'pg_catalog', 'cron', 'vault', 'supabase_functions')
order by n.nspname, c.relname, t.tgname;

select to_regclass('cron.job') is not null as has_cron \gset
\if :has_cron
select case when j.jobname is null
         then format('select cron.schedule(%L, %L);', j.schedule, j.command)
         else format('select cron.schedule(%L, %L, %L);', j.jobname, j.schedule, j.command) end ||
       case when not j.active and j.jobname is not null
         then chr(10) || format('select cron.alter_job(job_id := (select jobid from cron.job where jobname = %L), active := false);', j.jobname)
         else '' end
from cron.job j
order by j.jobname nulls last, j.jobid;
\endif

select format('refresh materialized view %I.%I;', n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'm' and c.relispopulated
  and n.nspname !~ '^(pg_|_timescaledb_|timescaledb_)'
  and n.nspname not in ('information_schema', '_analytics', '_realtime', '_supavisor', 'auth', 'etl', 'extensions',
    'pgbouncer', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'cron', 'dbdev', 'graphql',
    'graphql_public', 'net', 'pgmq', 'pgsodium', 'pgsodium_masks', 'pgtle', 'repack', 'tiger', 'tiger_data',
    'topology', 'vault')
order by c.oid;  -- creation order, so a view built on another is refreshed after it
