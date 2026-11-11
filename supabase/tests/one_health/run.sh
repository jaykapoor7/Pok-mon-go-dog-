#!/usr/bin/env bash
# Runs the One Health migration and its behaviour tests against a throwaway
# local PostgreSQL 16 (never against staging or production).
#   PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres supabase/tests/one_health/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
psql -q -c "drop database if exists one_health_test" -c "create database one_health_test"
psql -q -d one_health_test -v ON_ERROR_STOP=1 -f "$here/stubs.sql" >/dev/null
psql -q -d one_health_test -v ON_ERROR_STOP=1 -f "$here/../../migrations/20261112090000_one_health.sql" 2>&1 | grep -v NOTICE || true
# Applying twice must be harmless.
psql -q -d one_health_test -v ON_ERROR_STOP=1 -f "$here/../../migrations/20261112090000_one_health.sql" 2>&1 | grep -v NOTICE || true
out="$(psql -q -d one_health_test -v ON_ERROR_STOP=1 -f "$here/test.sql" 2>&1)"
echo "$out" | grep -E "^(ok|not ok)|ERROR"
if echo "$out" | grep -qE "not ok|ERROR"; then exit 1; fi
