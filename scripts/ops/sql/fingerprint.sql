-- Structural and security fingerprint of a StrayPaw database: one row per
-- object, "kind<TAB>name<TAB>md5". Taken from the source at backup time and
-- from the restored copy afterwards; any difference fails the restore check.
--
-- Covers what row counts cannot: tables and columns, RLS switches, policies
-- (including Storage's), privileges on every table, column, function and
-- schema, functions, views, indexes, constraints, triggers (including custom
-- ones on auth.users), extensions, Realtime publication tables, Storage bucket
-- settings, pg_cron jobs, and digests of Auth accounts (password hashes
-- included), Auth identities and Storage object metadata.
-- Prints names and hashes only, never row values. Read-only.
-- Run with: psql -AtX -F "$(printf '\t')" -f fingerprint.sql
set search_path to pg_catalog;

with _us as (
  select oid, nspname from pg_namespace
  where nspname !~ '^(pg_|_timescaledb_|timescaledb_)'
    and nspname not in ('information_schema', '_analytics', '_realtime', '_supavisor', 'auth', 'etl', 'extensions',
      'pgbouncer', 'realtime', 'storage', 'supabase_functions', 'supabase_migrations', 'cron', 'dbdev', 'graphql',
      'graphql_public', 'net', 'pgmq', 'pgsodium', 'pgsodium_masks', 'pgtle', 'repack', 'tiger', 'tiger_data',
      'topology', 'vault')
)
-- Relations: kind, RLS switches, options, columns
select 'relation', n.nspname || '.' || c.relname,
       md5(concat_ws('|', c.relkind, c.relrowsecurity, c.relforcerowsecurity, array_to_string(c.reloptions, ','),
         (select string_agg(concat_ws(':', a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull, a.attidentity,
                   a.attgenerated, pg_get_expr(d.adbin, d.adrelid)), ';' order by a.attnum)
            from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
           where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped)))
from pg_class c join _us n on n.oid = c.relnamespace
where c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
union all
-- Privileges on relations (owner excluded: ownership may legitimately change on restore)
select 'grant_relation', n.nspname || '.' || c.relname,
       md5(array_to_string(array(select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end || ':' || a.privilege_type || case when a.is_grantable then '*' else '' end
         from aclexplode(coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a
         where a.grantee <> c.relowner order by 1), ','))
from pg_class c join _us n on n.oid = c.relnamespace
where c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
union all
select 'grant_column', n.nspname || '.' || c.relname,
       md5(string_agg(att.attname || '=' || array_to_string(array(select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end || ':' || a.privilege_type || case when a.is_grantable then '*' else '' end
           from aclexplode(att.attacl) a where a.grantee <> c.relowner order by 1), ','), ';' order by att.attname))
from pg_attribute att join pg_class c on c.oid = att.attrelid join _us n on n.oid = c.relnamespace
where att.attacl is not null and att.attnum > 0 and not att.attisdropped
group by n.nspname, c.relname
union all
-- Views and materialized views: definition
select 'view', n.nspname || '.' || c.relname, md5(pg_get_viewdef(c.oid))
from pg_class c join _us n on n.oid = c.relnamespace where c.relkind in ('v', 'm')
union all
-- Functions and procedures: full definition (security definer, search_path, body)
select 'function', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', md5(pg_get_functiondef(p.oid))
from pg_proc p join _us n on n.oid = p.pronamespace
where p.prokind in ('f', 'p')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
union all
select 'grant_function', n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
       md5(array_to_string(array(select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end || ':' || a.privilege_type || case when a.is_grantable then '*' else '' end
         from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee <> p.proowner order by 1), ','))
from pg_proc p join _us n on n.oid = p.pronamespace
where p.prokind in ('f', 'p')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
union all
select 'grant_schema', n.nspname,
       md5(array_to_string(array(select case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end || ':' || a.privilege_type || case when a.is_grantable then '*' else '' end
         from aclexplode(coalesce(s.nspacl, acldefault('n', s.nspowner))) a where a.grantee <> s.nspowner order by 1), ','))
from _us n join pg_namespace s on s.oid = n.oid
union all
-- Indexes and constraints
select 'index', n.nspname || '.' || ic.relname, md5(pg_get_indexdef(i.indexrelid))
from pg_index i join pg_class ic on ic.oid = i.indexrelid join pg_class tc on tc.oid = i.indrelid join _us n on n.oid = tc.relnamespace
union all
select 'constraint', n.nspname || '.' || c.relname || '.' || k.conname, md5(pg_get_constraintdef(k.oid))
from pg_constraint k join pg_class c on c.oid = k.conrelid join _us n on n.oid = c.relnamespace
union all
-- RLS policies everywhere except pg_cron's own
select 'policy', n.nspname || '.' || c.relname || '.' || p.polname,
       md5(concat_ws('|', p.polpermissive, p.polcmd,
         array_to_string(array(select case when r = 0 then 'PUBLIC' else pg_get_userbyid(r) end from unnest(p.polroles) r order by 1), ','),
         pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid)))
from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname <> 'cron'
union all
-- Triggers on our tables, and our own triggers on platform tables (e.g. auth.users)
select 'trigger', n.nspname || '.' || c.relname || '.' || t.tgname, md5(pg_get_triggerdef(t.oid) || t.tgenabled::text)
from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
join pg_proc f on f.oid = t.tgfoid join pg_namespace fn on fn.oid = f.pronamespace
where not t.tgisinternal
  and (n.oid in (select oid from _us)
       or (n.nspname in ('auth', 'storage', 'realtime')
           and fn.nspname not in ('auth', 'storage', 'realtime', 'extensions', 'pg_catalog', 'cron', 'vault', 'supabase_functions')))
union all
select 'extension', e.extname || '@' || e.extnamespace::regnamespace::text, md5(e.extname)
from pg_extension e
union all
select 'publication', pt.pubname || ':' || pt.schemaname || '.' || pt.tablename, md5(pt.pubname)
from pg_publication_tables pt where pt.pubname not like 'supabase_realtime_%';

-- Platform tables that may not exist everywhere (local tests, older stacks).
select to_regclass('storage.buckets') is not null as has_storage,
       to_regclass('auth.users') is not null as has_auth,
       to_regclass('auth.identities') is not null as has_identities,
       to_regclass('cron.job') is not null as has_cron \gset
\if :has_storage
select 'bucket', b.id, md5(concat_ws('|', b.public, b.file_size_limit, array_to_string(b.allowed_mime_types, ','))) from storage.buckets b;
select 'storage_objects', 'all',
       md5(coalesce(string_agg(md5(concat_ws('|', o.bucket_id, o.name, to_jsonb(o) ->> 'owner_id', o.metadata::text,
         (to_jsonb(o) -> 'user_metadata')::text)), ',' order by o.bucket_id, o.name), '')) || ':' || count(*)
from storage.objects o;
\endif
\if :has_auth
select 'auth_users', 'all',
       md5(coalesce(string_agg(md5(concat_ws('|', u.id,
         (select string_agg(coalesce(to_jsonb(u) ->> k, ''), '|' order by i) from unnest(array['email', 'phone', 'encrypted_password',
           'email_confirmed_at', 'phone_confirmed_at', 'banned_until', 'deleted_at', 'role', 'aud', 'is_sso_user',
           'raw_app_meta_data', 'raw_user_meta_data']) with ordinality as x(k, i)))), ',' order by u.id), ''))
       || ':' || count(*)
from auth.users u;
\endif
\if :has_identities
select 'auth_identities', 'all',
       md5(coalesce(string_agg(md5(concat_ws('|', i.id, to_jsonb(i) ->> 'user_id', to_jsonb(i) ->> 'provider', to_jsonb(i) ->> 'provider_id', to_jsonb(i) ->> 'identity_data')), ',' order by i.id), '')) || ':' || count(*)
from auth.identities i;
\endif
\if :has_cron
select 'cron_job', coalesce(j.jobname, j.jobid::text), md5(concat_ws('|', j.schedule, j.command, j.active)) from cron.job j;
\endif
