#!/usr/bin/env bash
# Builds the local One Health demo database (never staging or production):
# Supabase stand-ins, the One Health migration, then the illustrative seed.
#   PGHOST=/tmp/pg PGPORT=5433 PGUSER=postgres scripts/oh-local/setup.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
psql -q -c "drop database if exists straypaw_local" -c "create database straypaw_local"
psql -q -d straypaw_local -v ON_ERROR_STOP=1 -f scripts/oh-local/local-base.sql >/dev/null
psql -q -d straypaw_local -v ON_ERROR_STOP=1 -f supabase/migrations/20261112090000_one_health.sql 2>&1 | grep -v NOTICE || true
psql -q -d straypaw_local -v ON_ERROR_STOP=1 -f supabase/seed/one_health_bengaluru_demo.sql 2>&1 | grep -v NOTICE || true
psql -d straypaw_local -tAc "select 'exposures '||count(*) from health.exposures union all select 'courses '||count(*) from health.pep_courses union all select 'doses due '||count(*) from health.pep_doses where status='due' union all select 'handoffs '||count(*) from public.oh_handoffs union all select 'samples '||count(*) from public.oh_samples union all select 'dogs '||count(*) from public.dogs"
