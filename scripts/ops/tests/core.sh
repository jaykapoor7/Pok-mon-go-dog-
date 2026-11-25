#!/usr/bin/env bash
# Local test (needs root, PostgreSQL 16 server binaries and age): bash scripts/ops/tests/core.sh
# Local end-to-end test of scripts/ops/db-backup.sh + db-restore.sh on a throwaway PG16 cluster.
set -uo pipefail
S="${TMPDIR:-/tmp}/straypaw-backup-test-core"
rm -rf "$S"; mkdir -p "$S"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"; D=/var/lib/postgresql/sptest
runuser -u postgres -- $PGBIN/pg_ctl -D $D stop -m immediate >/dev/null 2>&1
rm -rf $D; runuser -u postgres -- mkdir -p $D
runuser -u postgres -- $PGBIN/initdb -D $D -A trust >/dev/null || exit 1
runuser -u postgres -- $PGBIN/pg_ctl -D $D -o "-p 54399 -k /tmp -c listen_addresses=127.0.0.1" -l $D.log -w start >/dev/null || { cat $D.log; exit 1; }
U="postgresql://postgres@127.0.0.1:54399"
psql "$U/postgres" -qc "create role anon nologin" -c "create role authenticated nologin" -c "create role service_role nologin" -c "create database src" -c "create database dst" -c "create database dst2" -c "create database dst3"
psql "$U/src" -q <<'SQL'
create schema app_auth; create table app_auth.users(id uuid primary key default gen_random_uuid(), email text);
create table public.dogs(id serial primary key, name text, notes text, tags text[]);
create table public."Odd Name"(id int);
create table public.empty_t(id int);
insert into app_auth.users(email) select 'u'||g||'@example.invalid' from generate_series(1,12) g;
insert into public.dogs(name,notes,tags) select 'dog '||g, E'line1\nline2\ttab \\ backslash ünïcode', array['a','b'] from generate_series(1,500) g;
insert into public.dogs(name,notes) values ('quote''s', E'\\.'), ('empty','');
insert into public."Odd Name" values (1),(2),(3);
SQL
age-keygen -o "$S/key.txt" 2>"$S/pub.txt"; PUB=$(grep -o 'age1[0-9a-z]*' "$S/pub.txt")
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."
pass=0; fail=0; ok(){ echo "PASS: $1"; pass=$((pass+1)); }; bad(){ echo "FAIL: $1"; fail=$((fail+1)); }

DB_URL="$U/src" DUMPER=pg_dump AGE_RECIPIENTS="" bash scripts/ops/db-backup.sh t "$S/out" </dev/null >/dev/null 2>&1 && bad "should refuse without recipients" || ok "refuses unencrypted backup"

DB_URL="$U/src" DUMPER=pg_dump AGE_RECIPIENTS="$PUB" KEEP_PLAINTEXT_DIR="$S/plain" bash scripts/ops/db-backup.sh test "$S/out" </dev/null >$S/b.log 2>&1 && ok "backup written" || bad "backup"
F=$(ls "$S"/out/*.age)
head -c 21 "$F" | grep -q "age-encryption.org" && ok "output is age-encrypted" || bad "not encrypted"
grep -q "line1" "$F" && bad "plaintext leaked" || ok "no plaintext in artifact"
cat "$S"/plain/*/counts.tsv

TARGET_DB_URL="$U/dst" AGE_IDENTITY_FILE="$S/key.txt" bash scripts/ops/db-restore.sh "$F" >$S/r.log 2>&1 && ok "decrypt+restore+verify" || bad "restore"
[ "$(psql "$U/dst" -Atc "select notes from public.dogs where id=1")" = "$(psql "$U/src" -Atc "select notes from public.dogs where id=1")" ] && ok "tricky text round-trips byte-for-byte" || bad "text differs"

TARGET_DB_URL="$U/dst3" bash scripts/ops/db-restore.sh "$(ls -d "$S"/plain/*)" >/dev/null && ok "plaintext dir restore (CI drill path)" || bad "dir restore"

age-keygen -o "$S/bad.txt" 2>/dev/null
TARGET_DB_URL="$U/dst2" AGE_IDENTITY_FILE="$S/bad.txt" bash scripts/ops/db-restore.sh "$F" >/dev/null 2>&1 && bad "wrong key accepted" || ok "wrong key rejected"

mkdir -p "$S/t"; age -d -i "$S/key.txt" "$F" | tar -C "$S/t" -xzf -; d=$(ls -d "$S"/t/*)
sed -i 's/^7\tdog 7/7\tdog X/' "$d/data.sql"
TARGET_DB_URL="$U/dst2" bash scripts/ops/db-restore.sh "$d" >/dev/null 2>&1 && bad "tamper accepted" || ok "tampered backup rejected by checksum"

psql "$U/dst" -qc "delete from public.dogs where id=3"
TARGET_DB_URL="$U/dst" VERIFY_ONLY=1 AGE_IDENTITY_FILE="$S/key.txt" bash scripts/ops/db-restore.sh "$F" >/dev/null 2>&1 && bad "mismatch missed" || ok "row-count mismatch detected"

out=$(TARGET_DB_URL="postgresql://postgres.toujthlzjmhmoyykmayx:x@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" bash scripts/ops/db-restore.sh "$F" 2>&1); [ $? -eq 3 ] && ok "production target refused" || bad "prod guard: $out"
out=$(TARGET_DB_URL="postgresql://postgres:x@db.abcdefghijklmnopqrst.supabase.co:5432/postgres" bash scripts/ops/db-restore.sh "$F" 2>&1); [ $? -eq 3 ] && ok "unconfirmed hosted target refused" || bad "remote guard: $out"

runuser -u postgres -- $PGBIN/pg_ctl -D $D stop -m fast >/dev/null
echo "== $pass passed, $fail failed"; [ $fail -eq 0 ]
