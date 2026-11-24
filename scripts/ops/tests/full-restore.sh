#!/usr/bin/env bash
# Local test (needs root, PostgreSQL 16 server binaries, age and zip): bash scripts/ops/tests/full-restore.sh
# Full-fidelity local test of the backup/restore pipeline against an emulated Supabase:
# API roles, platform schemas (auth, storage, extensions), default privileges that grant ALL to anon,
# Storage policies, a custom trigger on auth.users, an extension in the extensions schema.
set -uo pipefail
S="${TMPDIR:-/tmp}/straypaw-backup-test-full"
rm -rf "$S"; mkdir -p "$S"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"; D=/var/lib/postgresql/fulltest; PORT=54397
set +H
runuser -u postgres -- $PGBIN/pg_ctl -D $D stop -m immediate >/dev/null 2>&1
rm -rf $D; runuser -u postgres -- mkdir -p $D
runuser -u postgres -- $PGBIN/initdb -D $D -A trust >/dev/null || exit 1
runuser -u postgres -- $PGBIN/pg_ctl -D $D -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -l $D.log -w start >/dev/null || exit 1
U="postgresql://postgres@127.0.0.1:$PORT"
psql -q "$U/postgres" -c "create role anon nologin" -c "create role authenticated nologin" -c "create role service_role nologin"

# What a fresh Supabase project already has before any restore.
PLATFORM=$(cat <<'SQL'
create schema auth; create schema storage; create schema extensions;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table auth.users(id uuid primary key, email text, phone text, encrypted_password text, email_confirmed_at timestamptz,
  banned_until timestamptz, deleted_at timestamptz, role text, aud text, raw_app_meta_data jsonb, raw_user_meta_data jsonb, last_sign_in_at timestamptz);
create table auth.identities(id uuid primary key, user_id uuid references auth.users, provider text, identity_data jsonb);
create table storage.buckets(id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets, name text, owner uuid, owner_id text,
  metadata jsonb, user_metadata jsonb, version text, created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored, unique (bucket_id, name));
alter table storage.objects enable row level security;
create function storage.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger update_objects_updated_at before update on storage.objects for each row execute function storage.touch();
create extension "uuid-ossp" with schema extensions;
grant usage on schema public, auth, storage, extensions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
SQL
)
for db in src dst dst_noacl dst_err; do psql -q "$U/postgres" -c "create database $db"; psql -q "$U/$db" -c "$PLATFORM"; done

psql -q "$U/src" <<'SQL'
create extension pgcrypto with schema extensions;
create schema private;
create table public.dogs(id serial primary key, name text, notes text, owner uuid, digest text default encode(extensions.digest('x','sha256'),'hex'));
alter table public.dogs enable row level security;
create policy dogs_read on public.dogs for select to authenticated using (owner = auth.uid());
revoke all on public.dogs from anon;                               -- production-style revoke
create table public.open_t(id int); create table private.secrets(k text);
grant select (id) on public.open_t to anon;  revoke insert on public.open_t from authenticated;
create view public.public_dogs as select id, name from public.dogs;
grant select on public.public_dogs to anon;
create function public.admin_wipe() returns void language sql security definer as 'select 1';
revoke all on function public.admin_wipe() from public, anon, authenticated;
create function public.on_signup() returns trigger language plpgsql security definer as $$ begin insert into public.dogs(name) values ('signup:'||new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.on_signup();
create policy "sightings public read" on storage.objects for select to anon using (bucket_id = 'sightings');
create policy "nx files own" on storage.objects for all to authenticated using (owner_id = auth.uid()::text) with check (bucket_id = 'nx-files');
insert into storage.buckets values ('sightings','sightings',true,8388608,'{image/jpeg}'), ('nx-files','nx-files',false,null,null);
insert into auth.users(id,email,encrypted_password,role,aud,raw_app_meta_data,email_confirmed_at)
  select gen_random_uuid(), 'person'||g||'@example.invalid', '$2a$10$abcdefghijklmnopqrstuv'||g, 'authenticated','authenticated','{"provider":"email"}', now() from generate_series(1,12) g;
insert into auth.identities select gen_random_uuid(), id, 'email', jsonb_build_object('email', email) from auth.users;
insert into public.dogs(name, notes) select 'dog '||g, E'line1\nline2\ttab \\ ünïcode' from generate_series(1,300) g;
insert into storage.objects(bucket_id,name,owner_id,metadata,user_metadata,version)
  select 'nx-files', 'org/'||g||'/doc #'||g||'.pdf', (select id::text from auth.users limit 1), jsonb_build_object('size',100+g,'mimetype','application/pdf','eTag','"e'||g||'"'), '{"k":"v"}', 'v1' from generate_series(1,5) g;
SQL
age-keygen -o "$S/k1.txt" 2>"$S/p1.txt"; age-keygen -o "$S/k2.txt" 2>"$S/p2.txt"
P1=$(grep -o 'age1[0-9a-z]*' "$S/p1.txt"); P2=$(grep -o 'age1[0-9a-z]*' "$S/p2.txt")
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
pass=0; fail=0; ok(){ echo "PASS: $1"; pass=$((pass+1)); }; bad(){ echo "FAIL: $1"; fail=$((fail+1)); }
has(){ psql -AtXq "$U/$1" -c "$2"; }

DB_URL="$U/src" DUMPER=pg_dump AGE_RECIPIENTS="$P1 $P2" KEEP_PLAINTEXT_DIR="$S/plain" bash scripts/ops/db-backup.sh test "$S/out" > "$S/backup.log" 2>&1 && ok "backup with generated extensions/platform/acl/fingerprint" || { bad "backup"; cat "$S/backup.log"; }
F=$(ls "$S"/out/*.age); P=$(ls -d "$S"/plain/*)
grep -q '^create extension if not exists pgcrypto with schema extensions;' "$P/extensions.sql" && ok "extensions.sql recreates pgcrypto in its schema" || bad "extensions.sql"
grep -q 'sightings public read' "$P/platform.sql" && grep -q 'on_auth_user_created' "$P/platform.sql" && ok "platform.sql carries Storage policies and the auth.users trigger" || bad "platform.sql"
grep -q 'revoke all on table public.dogs from public, anon' "$P/acl.sql" && ok "acl.sql revokes then regrants" || bad "acl.sql"
grep -q "sightings public read" "$P/schema.sql" && bad "schema.sql unexpectedly has storage policy (exclusion emulation broken)" || ok "schema.sql lacks Storage policies, as the CLI's does (gap reproduced)"

# Recovery path exactly as an owner would do it: artifact zip -> unzip -> decrypt with EITHER key -> restore.
(cd "$S/out" && zip -q "$S/artifact.zip" "$(basename "$F")")
CHECK_ONLY=1 AGE_IDENTITY_FILE="$S/k2.txt" bash scripts/ops/db-restore.sh "$S/artifact.zip" >/dev/null 2>&1 && ok "artifact zip decrypts with the second recipient key" || bad "zip/second key"
TARGET_DB_URL="$U/dst" AGE_IDENTITY_FILE="$S/k1.txt" bash scripts/ops/db-restore.sh "$S/artifact.zip" > "$S/restore.log" 2>&1 && ok "restore + counts + fingerprint from artifact zip" || { bad "full restore"; cat "$S/restore.log"; }
grep -E "^OK" "$S/restore.log"

[ "$(has dst "select has_table_privilege('anon','public.dogs','select')")" = f ] && ok "anon still cannot read dogs after restore" || bad "anon can read dogs"
[ "$(has dst "select has_function_privilege('anon','public.admin_wipe()','execute')")" = f ] && ok "anon still cannot execute admin_wipe()" || bad "anon can execute admin_wipe"
[ "$(has dst "select has_column_privilege('anon','public.open_t','id','select')")" = t ] && ok "column grant preserved" || bad "column grant lost"
[ "$(has dst "select count(*) from pg_policy where polrelid='storage.objects'::regclass")" = 2 ] && ok "Storage policies restored" || bad "storage policies"
[ "$(has dst "select count(*) from pg_trigger where tgname='on_auth_user_created'")" = 1 ] && ok "auth.users trigger restored" || bad "auth trigger"
[ "$(has dst "select count(*) from auth.users")" = 12 ] && [ "$(has dst "select count(*) from public.dogs where name like 'signup:%'")" = "$(has src "select count(*) from public.dogs where name like 'signup:%'")" ] && ok "auth users restored without re-firing the signup trigger" || bad "auth users / trigger refire"
[ "$(has dst "select md5(string_agg(encrypted_password,',' order by id)) from auth.users")" = "$(has src "select md5(string_agg(encrypted_password,',' order by id)) from auth.users")" ] && ok "password hashes identical (users keep their passwords)" || bad "password hashes"
[ "$(has dst "select nextval('public.dogs_id_seq')")" = "$(( $(has src "select last_value from public.dogs_id_seq") + 1 ))" ] && ok "sequence position preserved" || bad "sequence"

# Negative control: the CLI-equivalent restore (no acl.sql, no platform.sql) must be caught.
cp -R "$P" "$S/noacl"; : > "$S/noacl/acl.sql"; : > "$S/noacl/platform.sql"
(cd "$S/noacl" && sha256sum roles.sql schema.sql data.sql extensions.sql platform.sql acl.sql counts.tsv structure.tsv meta.txt > SHA256SUMS)
out=$(TARGET_DB_URL="$U/dst_noacl" bash scripts/ops/db-restore.sh "$S/noacl" 2>&1); rc=$?
[ $rc -ne 0 ] && echo "$out" | grep -q 'grant_relation' && echo "$out" | grep -q 'policy' && ok "fingerprint catches a CLI-only restore (open grants, missing policies)" || { bad "negative control not caught"; echo "$out" | tail -5; }
[ "$(has dst_noacl "select has_table_privilege('anon','public.dogs','select')")" = t ] && ok "(confirms the gap: CLI-only restore lets anon read dogs)" || echo "note: gap not reproduced"

# Storage metadata reconcile after an API re-upload rewrote owner/metadata.
psql -q "$U/dst" -c "update storage.objects set owner_id = null, metadata = '{\"eTag\":\"new\"}', user_metadata = null"
TARGET_DB_URL="$U/dst" VERIFY_ONLY=1 bash scripts/ops/db-restore.sh "$P" >/dev/null 2>&1 && bad "fingerprint missed rewritten Storage metadata" || ok "fingerprint detects rewritten Storage metadata"
TARGET_DB_URL="$U/dst" VERIFY_ONLY=1 SKIP_KINDS=storage_objects bash scripts/ops/db-restore.sh "$P" > "$S/skip.log" 2>&1 && grep -q "not yet compared: storage_objects" "$S/skip.log" && ok "SKIP_KINDS defers only the Storage metadata comparison" || { bad "SKIP_KINDS"; tail -3 "$S/skip.log"; }
TARGET_DB_URL="$U/dst" bash scripts/ops/storage-reconcile.sh "$P" && ok "reconcile restores Storage owner and metadata" || bad "reconcile"
TARGET_DB_URL="$U/dst" VERIFY_ONLY=1 bash scripts/ops/db-restore.sh "$P" >/dev/null 2>&1 && ok "fingerprint matches again after reconcile" || bad "fingerprint after reconcile"

# A failing row must not leak its values into logs.
cp -R "$P" "$S/err"; sed -i '0,/^COPY public.dogs/{/^COPY public.dogs/{n;s/^[0-9]*\t/notanumber\tSECRET-PII-MARKER\t/}}' "$S/err/data.sql"
(cd "$S/err" && sha256sum roles.sql schema.sql data.sql extensions.sql platform.sql acl.sql counts.tsv structure.tsv meta.txt > SHA256SUMS)
out=$(TARGET_DB_URL="$U/dst_err" bash scripts/ops/db-restore.sh "$S/err" 2>&1)
echo "$out" | grep -q "SECRET-PII-MARKER\|notanumber" && bad "row values leaked into the log" || ok "failed row reported without its values"
echo "$out" | grep -Eq 'table public.dogs: SQLSTATE [0-9A-Z]{5}' && ok "failure names table and SQLSTATE" || { bad "failure report"; echo "$out"; }
[ "$(has dst_err "select count(*) from pg_class where relname='dogs'")" = 0 ] && ok "failed restore committed nothing" || bad "partial restore committed"

[ -n "${KEEP_UP:-}" ] || runuser -u postgres -- $PGBIN/pg_ctl -D $D stop -m fast >/dev/null
echo "== $pass passed, $fail failed"; [ $fail -eq 0 ]
