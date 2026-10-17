#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# StrayPaw local staging: build a throwaway PostgreSQL 16 database from the
# repo's SQL, seed synthetic TEST- data, and run the permission tests.
#
#   staging/local/setup.sh            # fresh cluster+db, migrate, seed, test
#   staging/local/setup.sh --no-test  # stop after seeding
#   staging/local/setup.sh --stop     # stop the cluster
#
# Safety: this script only ever talks to a cluster it creates itself, on
# 127.0.0.1:${STAGING_PORT:-54329}. It never reads .env files and never uses
# any Supabase/Vercel credential. DATABASE_URL / SUPABASE_* are ignored.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
PORT="${STAGING_PORT:-54329}"
DB="straypaw_staging"
PGDATA_DIR="${STAGING_PGDATA:-${TMPDIR:-/tmp}/straypaw-staging-pg}"
LOG="$PGDATA_DIR.log"
unset DATABASE_URL SUPABASE_POOLER_URL PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE

# Never run the server as root: use the `postgres` OS user when invoked as root.
if [ "$(id -u)" = "0" ]; then
  AS=(runuser -u postgres --)
  # postgres must be able to traverse to the data directory's parent.
  d="$(dirname "$PGDATA_DIR")"; while [ "$d" != "/" ]; do chmod o+x "$d" 2>/dev/null || true; d="$(dirname "$d")"; done
  mkdir -p "$PGDATA_DIR"; chown postgres "$PGDATA_DIR"; chmod 700 "$PGDATA_DIR"
  touch "$LOG"; chown postgres "$LOG"
else
  AS=()
  mkdir -p "$PGDATA_DIR"; chmod 700 "$PGDATA_DIR"
fi

pgctl() { "${AS[@]}" "$PGBIN/pg_ctl" -D "$PGDATA_DIR" "$@"; }

if [ "${1:-}" = "--stop" ]; then pgctl stop -m fast || true; exit 0; fi

if [ ! -f "$PGDATA_DIR/PG_VERSION" ]; then
  echo "▸ initdb $PGDATA_DIR"
  "${AS[@]}" "$PGBIN/initdb" -D "$PGDATA_DIR" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
fi

if ! pgctl status >/dev/null 2>&1; then
  echo "▸ start postgres on 127.0.0.1:$PORT"
  pgctl -l "$LOG" -w start -o "-p $PORT -c listen_addresses=127.0.0.1 \
    -c unix_socket_directories=$PGDATA_DIR -c shared_preload_libraries=pg_cron \
    -c cron.database_name=$DB -c max_locks_per_transaction=1024 -c fsync=off" >/dev/null
fi

export STAGING_URL="postgresql://postgres@127.0.0.1:$PORT/$DB"
PSQL=(psql -X -q -h 127.0.0.1 -p "$PORT" -U postgres -v ON_ERROR_STOP=1)

echo "▸ recreate database $DB"
"${PSQL[@]}" -d postgres -c "drop database if exists $DB with (force)" -c "create database $DB" >/dev/null

echo "▸ shim (roles, auth, storage, extensions)"
"${PSQL[@]}" -d "$DB" -v DBNAME="$DB" -f "$HERE/shim.sql" >/dev/null

echo "▸ apply repo migrations"
node "$HERE/apply.mjs" | tee "$HERE/.last-apply.txt"

echo "▸ pause pg_cron jobs (deterministic tests)"
"${PSQL[@]}" -d "$DB" -c "update cron.job set active = false" >/dev/null 2>&1 || true

echo "▸ seed synthetic TEST- data"
"${PSQL[@]}" -d "$DB" -f "$HERE/seed.sql" >/dev/null

if [ "${1:-}" = "--no-test" ]; then echo "Ready: $STAGING_URL"; exit 0; fi

echo "▸ run permission tests"
node "$HERE/run-tests.mjs"
