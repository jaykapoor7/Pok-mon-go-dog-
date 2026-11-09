#!/usr/bin/env bash
# Survey sessions migration and behaviour tests on a throwaway local PostgreSQL 16 (never staging or production).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
psql -q -c "drop database if exists survey_sessions_test" -c "create database survey_sessions_test"
psql -q -d survey_sessions_test -f "$here/../supabase-stubs.sql" 2>&1 | grep -v "already exists" || true
psql -q -d survey_sessions_test -v ON_ERROR_STOP=1 -f "$here/stubs.sql"
psql -q -d survey_sessions_test -v ON_ERROR_STOP=1 -f "$here/../../migrations/20261110110000_survey_sessions.sql"
psql -q -d survey_sessions_test -v ON_ERROR_STOP=1 -f "$here/test.sql" 2>&1 | grep -E "ok |ERROR"
