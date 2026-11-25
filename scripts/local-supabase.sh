#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Local Supabase for development: Docker + Supabase CLI on your machine, so
# day-to-day work and schema experiments cost nothing and never touch a
# hosted project.
#
#   npm run db:local -- start    # start the stack; loads the schema the first time
#   npm run db:local -- env      # print .env.local lines for this stack
#   npm run db:local -- reset    # wipe local data and load the schema again
#   npm run db:local -- stop
#
# Schema source for start/reset (first one set wins):
#   SCHEMA_DIR=dir        a decrypted backup directory (roles.sql + schema.sql).
#                         Only roles and schema are loaded, never data.sql.
#   STAGING_DB_URL=…      staging's Session pooler URI; roles and schema are
#                         dumped from it (no rows).
# Production data never comes here: it is personal data about members of the
# public and partner organisations. Use synthetic records for local testing.
#
# The stack lives in .supabase-local/ (gitignored), separate from
# supabase/migrations, so the CLI never tries to replay the repository's
# partial migration history against an empty database.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
W="$ROOT/.supabase-local"
SB="${SUPABASE_CMD:-npx -y supabase@2.122.1}"
PRODUCTION_REF="toujthlzjmhmoyykmayx"
LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
cmd="${1:-start}"

sb() { # shellcheck disable=SC2086
  $SB "$@" --workdir "$W"; }

need_docker() {
  docker info >/dev/null 2>&1 || { echo "Docker is not running. Start Docker Desktop (or the docker daemon) first." >&2; exit 2; }
}

init() {
  [ -f "$W/supabase/config.toml" ] && return
  mkdir -p "$W"
  sb init < /dev/null > /dev/null
  sed -i.bak -E 's/^project_id = .*/project_id = "straypaw-local"/; s/^major_version = .*/major_version = 17/' "$W/supabase/config.toml"
  rm -f "$W/supabase/config.toml.bak"
}

load_schema() {
  local tmp; tmp="$(mktemp -d)"
  if [ -n "${SCHEMA_DIR:-}" ]; then
    cp "$SCHEMA_DIR/roles.sql" "$SCHEMA_DIR/schema.sql" "$tmp/"
  elif [ -n "${STAGING_DB_URL:-}" ]; then
    case "$STAGING_DB_URL" in *"$PRODUCTION_REF"*) echo "STAGING_DB_URL points at production. Refusing." >&2; exit 3 ;; esac
    # shellcheck disable=SC2086
    $SB db dump --db-url "$STAGING_DB_URL" -f "$tmp/roles.sql" --role-only
    # shellcheck disable=SC2086
    $SB db dump --db-url "$STAGING_DB_URL" -f "$tmp/schema.sql"
  else
    echo "The stack is running with Supabase's empty schema. To load StrayPaw's schema, set STAGING_DB_URL or SCHEMA_DIR and run: npm run db:local -- reset"
    rm -rf "$tmp"; return
  fi
  sed -i.bak -E 's/^(GRANT "postgres" TO "cli_login_postgres".*)$/-- \1/' "$tmp/roles.sql"
  psql --quiet --single-transaction -v ON_ERROR_STOP=1 -f "$tmp/roles.sql" -f "$tmp/schema.sql" "$LOCAL_DB" > /dev/null
  rm -rf "$tmp"
  touch "$W/.schema-loaded"
  echo "StrayPaw schema loaded (no rows)."
}

print_env() {
  sb status -o env 2>/dev/null | sed -n -E \
    -e 's/^API_URL="?([^"]*)"?$/NEXT_PUBLIC_SUPABASE_URL=\1/p' \
    -e 's/^ANON_KEY="?([^"]*)"?$/NEXT_PUBLIC_SUPABASE_ANON_KEY=\1/p' \
    -e 's/^SERVICE_ROLE_KEY="?([^"]*)"?$/SUPABASE_SERVICE_ROLE_KEY=\1/p'
}

case "$cmd" in
  start)
    need_docker; init
    sb start
    [ -f "$W/.schema-loaded" ] || load_schema
    echo; echo "Add to .env.local:"; print_env ;;
  reset)
    need_docker; init
    sb db reset --local --no-seed > /dev/null
    rm -f "$W/.schema-loaded"; load_schema ;;
  env) print_env ;;
  status) sb status ;;
  stop) sb stop ;;
  *) echo "usage: $0 start|env|reset|status|stop" >&2; exit 2 ;;
esac
