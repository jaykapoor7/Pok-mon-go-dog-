#!/usr/bin/env bash
# Runs the AnimalID migration and its behaviour tests against a throwaway local
# PostgreSQL 16 with pgvector (never against staging or production).
#   PGHOST=/path/to/socket PGPORT=5433 PGUSER=postgres supabase/tests/animalid/run.sh
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
psql -q -c "drop database if exists animalid_test" -c "create database animalid_test"
psql -q -d animalid_test -f "$here/stubs.sql" 2>&1 | grep -v "already exists" || true
psql -q -d animalid_test -v ON_ERROR_STOP=1 -f "$here/../../migrations/20261110100000_animalid.sql" 2>&1 | grep -v "skipping" || true
psql -q -d animalid_test -v ON_ERROR_STOP=1 -f "$here/test.sql" 2>&1 | grep -E "ok |ERROR"
