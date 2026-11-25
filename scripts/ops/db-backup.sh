#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Logical backup of a StrayPaw Supabase database, encrypted with age.
#
#   DB_URL=postgresql://…  AGE_RECIPIENTS="age1…"  scripts/ops/db-backup.sh <label> <out-dir>
#
# Produces <out-dir>/<label>-<UTC stamp>.tar.gz.age containing:
#   roles.sql, schema.sql, data.sql  `supabase db dump` (Supabase's documented restorable format)
#   extensions.sql   extensions in their schemas    } what `supabase db dump` leaves out,
#   platform.sql     Storage/Auth policies, custom  } generated from the live catalog
#                    triggers on auth tables, cron   } (scripts/ops/sql/gen-*.sql)
#   acl.sql          exact privileges on our objects }
#   counts.tsv       rows per table, parsed from data.sql (same snapshot)
#   structure.tsv    fingerprint of structure, privileges, policies, buckets,
#                    cron, and digests of Auth users and Storage metadata
#   SHA256SUMS, meta.txt
#
# What is deliberately NOT included (see docs/SUPABASE-COST-AND-BACKUPS.md):
#   cron.job_run_details (operational log), realtime.* (ephemeral), vault
#   secrets (encrypted with a per-project key; the backup fails if any exist
#   so they are never silently lost), Storage file bytes (storage-backup.mjs),
#   project settings outside Postgres (Auth/SMTP/API settings).
#
# The repository is public, so the output is only ever written encrypted to
# the age public key(s) in AGE_RECIPIENTS.
#
# Env:
#   DB_URL              Session pooler URI (GitHub runners are IPv4-only)
#   AGE_RECIPIENTS      age public key(s), space separated; required
#   DUMPER              supabase (default) | pg_dump (plain Postgres; local tests
#                       only, emulates the CLI's schema exclusions)
#   SUPABASE_CMD        how to run the CLI (default: "npx -y supabase@2.122.1")
#   KEEP_PLAINTEXT_DIR  also leave the plaintext files there (same-runner drill only)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

label="${1:?usage: db-backup.sh <label> <out-dir>}"
out="${2:?usage: db-backup.sh <label> <out-dir>}"
: "${DB_URL:?DB_URL is required}"
DUMPER="${DUMPER:-supabase}"
SUPABASE_CMD="${SUPABASE_CMD:-npx -y supabase@2.122.1}"
SQL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sql"

recipients=()
for r in ${AGE_RECIPIENTS:-}; do recipients+=(-r "$r"); done
if [ "${#recipients[@]}" -eq 0 ]; then
  echo "AGE_RECIPIENTS is empty: refusing to write an unencrypted backup." >&2
  exit 2
fi
command -v age >/dev/null || { echo "age is not installed" >&2; exit 2; }
command -v psql >/dev/null || { echo "psql is not installed" >&2; exit 2; }

# The CLI's own exclusion lists (supabase db dump --dry-run, CLI 2.122.1).
SCHEMA_EXCLUDE='information_schema|pg_*|_analytics|_realtime|_supavisor|auth|etl|extensions|pgbouncer|realtime|storage|supabase_functions|supabase_migrations|cron|dbdev|graphql|graphql_public|net|pgmq|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault'
DATA_EXCLUDE='information_schema|pg_*|graphql|graphql_public|pgsodium|pgsodium_masks|pgtle|repack|tiger|tiger_data|timescaledb_*|_timescaledb_*|topology|vault|etl|extensions|pgbouncer|realtime|supabase_migrations|_analytics|_realtime|_supavisor'

q() { psql "$DB_URL" -AtX -v ON_ERROR_STOP=1 -q "$@"; }
fingerprint() { q -F "$(printf '\t')" -f "$SQL_DIR/fingerprint.sql" | LC_ALL=C sort; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="$label-$stamp"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
dir="$work/$name"
mkdir -p "$dir" "$out"

vault_secrets="$(q -c "select case when to_regclass('vault.secrets') is null then 0 else (xpath('/row/c/text()', query_to_xml('select count(*) as c from vault.secrets', false, true, '')))[1]::text::int end")"
if [ "$vault_secrets" != "0" ]; then
  echo "vault.secrets holds $vault_secrets secret(s). Vault secrets are encrypted with a per-project key and cannot be restored from a dump; record them elsewhere and remove them from Vault, or extend this backup." >&2
  exit 1
fi

dump() {
  echo "Dumping $label with $DUMPER…"
  case "$DUMPER" in
    supabase)
      # shellcheck disable=SC2086
      $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/roles.sql" --role-only || return 1
      # shellcheck disable=SC2086
      $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/schema.sql" || return 1
      # shellcheck disable=SC2086
      $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/data.sql" --use-copy --data-only \
        -x "storage.buckets_vectors" -x "storage.vector_indexes" -x "cron.job" -x "cron.job_run_details" || return 1
      ;;
    pg_dump)
      printf -- '-- roles: not dumped in pg_dump mode\n' > "$dir/roles.sql"
      pg_dump --schema-only --no-owner --exclude-schema "$SCHEMA_EXCLUDE" "$DB_URL" > "$dir/schema.sql" || return 1
      pg_dump --data-only --no-owner --exclude-schema "$DATA_EXCLUDE" \
        --exclude-table 'cron.*' --exclude-table 'auth.schema_migrations' --exclude-table 'storage.migrations' "$DB_URL" > "$dir/data.sql" || return 1
      ;;
    *) echo "Unknown DUMPER: $DUMPER" >&2; exit 2 ;;
  esac
  for g in extensions platform acl; do
    { echo "-- $g.sql: generated by scripts/ops/sql/gen-$g.sql from the live catalog"; q -f "$SQL_DIR/gen-$g.sql"; } > "$dir/$g.sql" || return 1
  done
  return 0
}

# Fingerprint before and after the dump: if anything changed in between, the
# files could disagree with each other, so dump again (once).
for attempt in 1 2; do
  fingerprint > "$work/fp-before.tsv"
  # A dropped connection (restart, maintenance, pooler hiccup) gets one retry.
  if ! dump; then
    echo "Dump failed; retrying once in ${DUMP_RETRY_DELAY:-60} s." >&2
    sleep "${DUMP_RETRY_DELAY:-60}"
    dump
  fi
  fingerprint > "$work/fp-after.tsv"
  if cmp -s "$work/fp-before.tsv" "$work/fp-after.tsv"; then break; fi
  changed="$(diff "$work/fp-before.tsv" "$work/fp-after.tsv" | grep -E '^[<>]' | cut -f1,2 | sort -u | tr '\n' ' ')"
  if [ "$attempt" = 2 ]; then
    echo "The database kept changing during the dump ($changed). Try again later." >&2
    exit 1
  fi
  echo "Changed during the dump ($changed); dumping again."
done
cp "$work/fp-after.tsv" "$dir/structure.tsv"

for f in roles.sql schema.sql data.sql acl.sql structure.tsv; do
  [ -s "$dir/$f" ] || { echo "$f is empty: backup failed" >&2; exit 1; }
done
grep -q '^COPY ' "$dir/data.sql" || { echo "data.sql has no COPY blocks: dump failed" >&2; exit 1; }

# Rows per table, read from the dump. In COPY text format every row is one
# line (embedded newlines are escaped), and each block ends with "\.".
awk '
  /^COPY / {
    # The table is everything between "COPY " and " (cols)" / " FROM stdin",
    # so quoted identifiers containing spaces stay whole.
    t=substr($0, 6); sub(/ \(.*$/, "", t); sub(/ FROM stdin;$/, "", t)
    n=0; inblk=1; next
  }
  inblk && $0 == "\\." { print t "\t" n; inblk=0; next }
  inblk { n++ }
' "$dir/data.sql" > "$dir/counts.tsv"

{
  echo "label=$label"
  echo "created_utc=$stamp"
  echo "dumper=$DUMPER"
  echo "format=2"
  echo "tables=$(wc -l < "$dir/counts.tsv" | tr -d ' ')"
  echo "rows=$(awk -F'\t' '{s+=$2} END {print s+0}' "$dir/counts.tsv")"
  echo "structure_items=$(wc -l < "$dir/structure.tsv" | tr -d ' ')"
  echo "policies_platform=$(grep -c '^drop policy' "$dir/platform.sql" || true)"
  echo "triggers_platform=$(grep -c '^drop trigger' "$dir/platform.sql" || true)"
  echo "cron_jobs=$(grep -c 'cron.schedule' "$dir/platform.sql" || true)"
  echo "acl_statements=$(wc -l < "$dir/acl.sql" | tr -d ' ')"
  echo "git_sha=${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
} > "$dir/meta.txt"
(cd "$dir" && sha256sum roles.sql schema.sql data.sql extensions.sql platform.sql acl.sql counts.tsv structure.tsv meta.txt > SHA256SUMS)

tar -C "$work" -czf - "$name" | age "${recipients[@]}" -o "$out/$name.tar.gz.age"

if [ -n "${KEEP_PLAINTEXT_DIR:-}" ]; then
  mkdir -p "$KEEP_PLAINTEXT_DIR"
  cp -R "$dir" "$KEEP_PLAINTEXT_DIR/"
fi

echo "Wrote $out/$name.tar.gz.age ($(du -h "$out/$name.tar.gz.age" | cut -f1))"
cat "$dir/meta.txt"
