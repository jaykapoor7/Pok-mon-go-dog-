#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Restore drill on a CI runner (Docker + Supabase CLI): proves a backup can
# rebuild a working Supabase project, not just a database.
#
#   scripts/ops/restore-drill.sh <plaintext db backup dir> [<plaintext storage backup dir>]
#
# 1. Starts a fresh local Supabase stack (Postgres 17, Auth, Storage, PostgREST).
# 2. Restores the database (db-restore.sh): row counts + fingerprint of
#    structure, privileges, policies, triggers, cron, buckets, Auth digests.
# 3. Auth: the Auth server (GoTrue) lists exactly the restored accounts.
# 4. Storage: uploads every file back, restores row metadata
#    (storage-reconcile.sh), downloads every file and compares sha256, then
#    re-checks the full fingerprint including Storage object metadata.
# 5. Permissions over HTTP, as an anonymous visitor: a revoked base table is
#    refused by the Data API; a public view answers; a public bucket's file
#    is served; a private bucket's file is refused.
# 6. Free plan fit: database < 500 MB, Storage < 1 GB, largest file < 50 MB.
# 7. Performance: the heaviest production jobs and public reads timed with
#    the database container limited to Nano-like resources (1 CPU, 0.5 GB).
#
# Writes a Markdown report to $REPORT (default: stdout). Prints counts,
# HTTP statuses and timings only: no row values, no object paths.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

dbdir="${1:?usage: restore-drill.sh <db backup dir> [<storage backup dir>]}"
stdir="${2:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SB="${SUPABASE_CMD:-supabase}"
REPORT="${REPORT:-/dev/stdout}"
W="$(mktemp -d)"
fail=0
say() { echo "$*"; if [ "$REPORT" != /dev/stdout ]; then echo "$*" >> "$REPORT"; fi; }
check() { if [ "$1" = ok ]; then say "- ✅ $2"; else say "- ❌ $2"; fail=1; fi; }

cleanup() { $SB stop --workdir "$W" --no-backup >/dev/null 2>&1 || true; rm -rf "$W"; }
trap cleanup EXIT

say "### Restore drill: $(grep '^label=' "$dbdir/meta.txt" | cut -d= -f2) ($(grep '^created_utc=' "$dbdir/meta.txt" | cut -d= -f2))"
$SB init --workdir "$W" < /dev/null > /dev/null
sed -i -E 's/^project_id = .*/project_id = "drill"/; s/^major_version = .*/major_version = 17/' "$W/supabase/config.toml"
$SB start --workdir "$W" -x studio,imgproxy,edge-runtime,logflare,vector > "$W/start.log" 2>&1 || { tail -20 "$W/start.log"; exit 1; }
eval "$($SB status --workdir "$W" -o env 2>/dev/null | grep -E '^(API_URL|DB_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
export TARGET_DB_URL="$DB_URL"
sqlv() { psql "$DB_URL" -AtXq -v ON_ERROR_STOP=1 -c "$1"; }

# 2. Database
skip=""; [ -n "$stdir" ] && skip="storage_objects"
if SKIP_KINDS="$skip" bash "$HERE/db-restore.sh" "$dbdir" > "$W/restore.log" 2>&1; then
  check ok "Database restored: $(grep '^OK: .* rows' "$W/restore.log" | sed 's/^OK: //')"
  check ok "Structure, privileges, policies: $(grep '^OK: .* items' "$W/restore.log" | sed 's/^OK: //')"
else
  cat "$W/restore.log" >&2
  check fail "Database restore or verification failed (see job log)"
  exit 1
fi

# 3. Auth server reads the restored accounts
users="$(sqlv "select count(*) from auth.users")"
code="$(curl -s -o "$W/users.json" -w '%{http_code}' "$API_URL/auth/v1/admin/users?page=1&per_page=1000" \
  -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY")"
listed="$(jq '.users | length' "$W/users.json" 2>/dev/null || echo '?')"
[ "$code" = 200 ] && [ "$listed" = "$users" ] && check ok "Auth server lists all $users restored accounts" \
  || check fail "Auth server: HTTP $code, listed $listed of $users accounts"
rm -f "$W/users.json"

# 4. Storage files and metadata
if [ -n "$stdir" ]; then
  export SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" ALLOW_STORAGE_RESTORE=local
  node "$HERE/storage-backup.mjs" restore "$stdir" > "$W/st.log" 2>&1 && check ok "Storage: $(tail -1 "$W/st.log")" || { cat "$W/st.log" >&2; check fail "Storage upload failed"; }
  bash "$HERE/storage-reconcile.sh" "$dbdir" > "$W/rec.log" 2>&1 && check ok "Storage metadata: $(tail -1 "$W/rec.log" | sed 's/^OK: //')" || { cat "$W/rec.log" >&2; check fail "Storage metadata reconcile failed"; }
  node "$HERE/storage-backup.mjs" verify "$stdir" > "$W/ver.log" 2>&1 && check ok "Storage bytes: $(tail -1 "$W/ver.log" | sed 's/^OK: //')" || { cat "$W/ver.log" >&2; check fail "Storage bytes differ"; }
  VERIFY_ONLY=1 bash "$HERE/db-restore.sh" "$dbdir" > "$W/fp2.log" 2>&1 && check ok "Full fingerprint incl. Storage metadata matches" || { tail -20 "$W/fp2.log" >&2; check fail "Fingerprint after Storage restore differs"; }
fi

# 5. Permissions over HTTP as an anonymous visitor
anon() { curl -s -o /dev/null -w '%{http_code}' "$API_URL$1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"; }
if [ "$(sqlv "select to_regclass('public.dogs') is not null and not has_table_privilege('anon', 'public.dogs', 'select')")" = t ]; then
  c="$(anon '/rest/v1/dogs?select=id&limit=1')"
  case "$c" in 401|403) check ok "Data API refuses anon on revoked table dogs (HTTP $c)" ;; *) check fail "Data API answered anon on revoked table dogs with HTTP $c" ;; esac
fi
if [ "$(sqlv "select to_regclass('public.public_animal_profiles') is not null")" = t ]; then
  c="$(anon '/rest/v1/public_animal_profiles?select=id&limit=1')"
  [ "$c" = 200 ] && check ok "Data API serves the public view to anon (HTTP 200)" || check fail "Public view returned HTTP $c to anon"
fi
if [ -n "$stdir" ]; then
  pick() { node -e '
    const m = JSON.parse(require("fs").readFileSync(process.argv[1] + "/manifest.json", "utf8"));
    const pub = new Set(m.buckets.filter(b => b.public).map(b => b.id));
    const o = m.objects.find(o => (process.argv[2] === "public") === pub.has(o.bucket));
    if (o) process.stdout.write(encodeURIComponent(o.bucket) + "/" + o.path.split("/").map(encodeURIComponent).join("/"));
  ' "$stdir" "$1"; }
  p="$(pick public)"; if [ -n "$p" ]; then c="$(anon "/storage/v1/object/public/$p")"; [ "$c" = 200 ] && check ok "Public bucket file served to anon (HTTP 200)" || check fail "Public bucket file returned HTTP $c"; fi
  p="$(pick private)"; if [ -n "$p" ]; then
    c1="$(anon "/storage/v1/object/authenticated/$p")"; c2="$(anon "/storage/v1/object/public/$p")"
    case "$c1$c2" in *200*) check fail "Private bucket file reachable by anon (HTTP $c1/$c2)" ;; *) check ok "Private bucket file refused to anon (HTTP $c1/$c2)" ;; esac
  fi
fi

# 6. Free plan fit
db_mb="$(sqlv "select round(pg_database_size(current_database()) / 1048576.0)")"
st_mb="$(sqlv "select coalesce(round(sum((metadata->>'size')::bigint) / 1048576.0), 0) from storage.objects")"
max_mb="$(sqlv "select coalesce(round(max((metadata->>'size')::bigint) / 1048576.0, 1), 0) from storage.objects")"
[ "$db_mb" -lt 500 ] && check ok "Database ${db_mb} MB of the Free plan's 500 MB" || check fail "Database ${db_mb} MB exceeds Free's 500 MB"
[ "$st_mb" -lt 1024 ] && check ok "Storage ${st_mb} MB of Free's 1 GB (largest file ${max_mb} MB of 50 MB)" || check fail "Storage ${st_mb} MB exceeds Free's 1 GB"

# 7. Performance under Nano-like limits
if [ "${PERF:-1}" = 1 ]; then
  sqlv "select cron.unschedule(jobid) from cron.job" > /dev/null 2>&1 || true   # no background jobs during timing
  city="$(sqlv "select coalesce((select city from public.dogs where city is not null group by city order by count(*) desc limit 1), 'Delhi')" 2>/dev/null || echo Delhi)"
  city="${city//\'/\'\'}"
  benches=(
    "refresh_map_snapshots|select public.refresh_map_snapshots()"
    "refresh public_spatial_animals_cache|refresh materialized view concurrently public.public_spatial_animals_cache"
    "drain_spatial_refresh_queue(4)|select public.drain_spatial_refresh_queue(4)"
    "nx_mission_tick|select public.nx_mission_tick()"
    "list_public_org_impacts|select count(*) from public.list_public_org_impacts()"
    "count_public_case_stories(top city)|select public.count_public_case_stories('$city')"
    "get_public_platform_totals|select public.get_public_platform_totals()"
    "public_animal_profiles (500 rows)|select count(*) from (select * from public.public_animal_profiles limit 500) x"
  )
  run() { # label sql -> median ms of 3 runs, or "n/a"
    local sql="$2" t a=()
    for _ in 1 2 3; do
      local s; s=$(date +%s%N)
      psql "$DB_URL" -AtXq -v ON_ERROR_STOP=1 -c "$sql" > /dev/null 2>&1 || { echo "n/a"; return; }
      a+=($(( ($(date +%s%N) - s) / 1000000 )))
    done
    printf '%s\n' "${a[@]}" | sort -n | sed -n 2p
  }
  declare -A free
  for b in "${benches[@]}"; do free["${b%%|*}"]="$(run "${b%%|*}" "${b#*|}")"; done
  container="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_drill$' | head -1)"
  docker update --cpus 1 --memory 512m --memory-swap 512m "$container" > /dev/null
  say ""; say "#### Timings (median of 3; runner unconstrained vs database limited to 1 CPU / 0.5 GB like Nano)"
  say "| Query | Unconstrained | Nano-like |"; say "|---|---:|---:|"
  slow=0
  for b in "${benches[@]}"; do
    n="$(run "${b%%|*}" "${b#*|}")"
    say "| ${b%%|*} | ${free[${b%%|*}]} ms | $n ms |"
    [ "$n" != n/a ] && [ "$n" -gt 30000 ] && slow=1
  done
  if docker inspect "$container" --format '{{.State.OOMKilled}}' | grep -q true; then check fail "Database was killed for memory under 0.5 GB"; fi
  [ "$slow" = 0 ] && check ok "No measured query over 30 s under Nano-like limits" || say "- ⚠️ At least one query took over 30 s under Nano-like limits"
fi

say ""
[ "$fail" = 0 ] && say "**Drill passed.**" || say "**Drill FAILED.**"
exit "$fail"
