#!/usr/bin/env node
// Read-only Supabase security inventory. This is deliberately separate from
// migrations so Security Advisor findings can be named from the live catalog
// before a policy change is applied.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function fromEnvFile(key) {
  const path = join(root, ".env.local");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").split("\n").find((value) => value.trim().startsWith(`${key}=`));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}
const url = process.env.SUPABASE_POOLER_URL ?? process.env.DATABASE_URL ?? fromEnvFile("SUPABASE_POOLER_URL") ?? fromEnvFile("DATABASE_URL");
if (!url) throw new Error("Set SUPABASE_POOLER_URL (Session Pooler URI) before running this read-only audit.");
const client = new pg.Client({ connectionString: url, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : { rejectUnauthorized: false } });

const queries = {
  rls_disabled: `select c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by c.relname`,
  public_tables: `select c.relname as table, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
      coalesce(json_agg(json_build_object('policy', p.polname, 'roles', p.polroles::regrole[], 'command', p.polcmd,
        'using', pg_get_expr(p.polqual, p.polrelid), 'check', pg_get_expr(p.polwithcheck, p.polrelid)) order by p.polname)
        filter (where p.polname is not null), '[]'::json) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
      left join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public' and c.relkind = 'r'
    group by c.oid order by c.relname`,
  definer_functions: `select p.oid::regprocedure as function, p.prosecdef as security_definer,
      has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
      pg_get_functiondef(p.oid) like '%search_path%' as has_search_path
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef order by 1`,
  storage_buckets: `select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id`,
  storage_policies: `select polname as policy, polcmd as command, polroles::regrole[] as roles,
      pg_get_expr(polqual, polrelid) as using, pg_get_expr(polwithcheck, polrelid) as check
    from pg_policy where polrelid = 'storage.objects'::regclass order by polname`,
};

try {
  await client.connect();
  const output = {};
  for (const [name, query] of Object.entries(queries)) output[name] = (await client.query(query)).rows;
  console.log(JSON.stringify(output, null, 2));
} finally {
  await client.end().catch(() => {});
}
