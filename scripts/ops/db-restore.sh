#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Restore a backup made by scripts/ops/db-backup.sh, then prove it:
#   1. every table's row count equals the dump's (counts.tsv), and
#   2. the restored database's fingerprint equals the source's
#      (structure.tsv): tables, RLS, policies incl. Storage, privileges on
#      every table/column/function/schema, functions, views, indexes,
#      constraints, triggers incl. auth.users, extensions, Realtime tables,
#      buckets, cron jobs, Auth account and Storage metadata digests.
#
#   TARGET_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
#   AGE_IDENTITY_FILE=~/straypaw-backup.key \
#     scripts/ops/db-restore.sh production-20261123T204100Z.tar.gz.age
#
#   # only decrypt and check integrity (no database needed):
#   CHECK_ONLY=1 AGE_IDENTITY_FILE=… scripts/ops/db-restore.sh <file.tar.gz.age | file.zip>
#
# Restore order: extensions → roles → schema → data (triggers off) →
# platform policies/triggers/cron → exact privileges.
#
# Logs: errors from data.sql are reported as SQLSTATE + table only, never the
# row (CI logs of this repository are public).
#
# Safety: never restores into production; any other hosted Supabase target
# needs ALLOW_REMOTE_RESTORE=<its ref>; the target must be empty (fresh
# `supabase start` or a new project). One transaction: all or nothing.
#
# Env:
#   TARGET_DB_URL       where to restore (not needed with CHECK_ONLY=1)
#   AGE_IDENTITY_FILE   private key for .age files
#   VERIFY_ONLY=1       skip the restore, only run the checks against the target
#   SKIP_KINDS          fingerprint kinds not to compare yet (e.g. "storage_objects"
#                       before Storage files are restored and reconciled)
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

src="${1:?usage: db-restore.sh <backup.tar.gz.age | .zip | backup dir>}"
PRODUCTION_REF="toujthlzjmhmoyykmayx"
SQL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/sql"
TARGET_DB_URL="${TARGET_DB_URL:-}"

if [ "${CHECK_ONLY:-}" != "1" ]; then
  [ -n "$TARGET_DB_URL" ] || { echo "TARGET_DB_URL is required" >&2; exit 2; }
  case "$TARGET_DB_URL" in
    *"$PRODUCTION_REF"*)
      echo "Refusing: the target is the production project ($PRODUCTION_REF). Restore into a new project instead (docs/SUPABASE-COST-AND-BACKUPS.md)." >&2
      exit 3 ;;
  esac
  if printf '%s' "$TARGET_DB_URL" | grep -Eq 'supabase\.(co|com)'; then
    ref="$(printf '%s' "$TARGET_DB_URL" | grep -Eo '(postgres\.|db\.)[a-z0-9]{20}' | head -1 | sed -E 's/^(postgres|db)\.//')"
    if [ -z "$ref" ] || [ "${ALLOW_REMOTE_RESTORE:-}" != "$ref" ]; then
      echo "Refusing: hosted target${ref:+ ($ref)}. Set ALLOW_REMOTE_RESTORE=$ref to confirm it is a new, empty project." >&2
      exit 3
    fi
  fi
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

decrypt() { # $1 = .age file
  : "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required to decrypt $1}"
  age -d -i "$AGE_IDENTITY_FILE" "$1" | tar -C "$work" -xzf -
}
if [ -d "$src" ]; then
  dir="$src"
else
  case "$src" in
    *.zip) # an Actions artifact as downloaded from GitHub
      mkdir -p "$work/zip"; unzip -q "$src" -d "$work/zip"
      inner="$(find "$work/zip" -name '*.tar.gz.age' | head -1)"
      [ -n "$inner" ] || { echo "No .tar.gz.age inside $src" >&2; exit 2; }
      decrypt "$inner" ;;
    *.age) decrypt "$src" ;;
    *.tar.gz) tar -C "$work" -xzf "$src" ;;
    *) echo "Unrecognised backup: $src" >&2; exit 2 ;;
  esac
  dir="$(find "$work" -mindepth 1 -maxdepth 1 -type d ! -name zip | head -1)"
fi

echo "Checking integrity of $(basename "$dir")…"
(cd "$dir" && sha256sum --quiet -c SHA256SUMS)
cat "$dir/meta.txt"
[ "${CHECK_ONLY:-}" = "1" ] && { echo "OK: decrypted and every file matches its checksum."; exit 0; }

file_or_empty() { if [ -f "$dir/$1" ]; then printf '%s' "$dir/$1"; else : > "$work/empty-$1"; printf '%s' "$work/empty-$1"; fi; }

if [ "${VERIFY_ONLY:-}" != "1" ]; then
  # Known, documented incompatibilities when restoring a hosted dump into a
  # fresh stack (docs: Backup and Restore using the CLI → Troubleshooting).
  mkdir -p "$work/fixed"
  sed -E 's/^(GRANT "postgres" TO "cli_login_postgres".*)$/-- \1/' "$dir/roles.sql" > "$work/fixed/roles.sql"
  cp "$dir/schema.sql" "$dir/data.sql" "$work/fixed/"
  server_major="$(psql "$TARGET_DB_URL" -AtXqc 'show server_version_num' | cut -c1-2)"
  if [ "$server_major" -lt 17 ]; then
    sed -i -E 's/^(SET transaction_timeout.*)$/-- \1/' "$work/fixed/schema.sql" "$work/fixed/data.sql"
  fi

  echo "Restoring into the target…"
  if ! psql --quiet --no-psqlrc --single-transaction --variable ON_ERROR_STOP=1 \
      --command '\set VERBOSITY terse' --command '\set SHOW_CONTEXT never' \
      --file "$(file_or_empty extensions.sql)" \
      --file "$work/fixed/roles.sql" \
      --file "$work/fixed/schema.sql" \
      --command 'SET session_replication_role = replica' \
      --command '\set VERBOSITY sqlstate' \
      --file "$work/fixed/data.sql" \
      --command 'SET session_replication_role = DEFAULT' \
      --command '\set VERBOSITY terse' \
      --file "$(file_or_empty platform.sql)" \
      --file "$(file_or_empty acl.sql)" \
      --dbname "$TARGET_DB_URL" > "$work/restore.out" 2> "$work/restore.err"; then
    echo "Restore failed; nothing was committed." >&2
    # Report without row values: data.sql errors become "table + SQLSTATE".
    grep -E '^psql:.*: (ERROR|FATAL):' "$work/restore.err" | head -5 | while IFS= read -r line; do
      f="$(printf '%s' "$line" | sed -E 's/^psql:([^:]+):([0-9]+):.*/\1/')"
      n="$(printf '%s' "$line" | sed -E 's/^psql:([^:]+):([0-9]+):.*/\2/')"
      if [ "$f" = "$work/fixed/data.sql" ]; then
        code="$(printf '%s' "$line" | grep -Eo '[0-9A-Z]{5}$' || echo '?')"
        table="$(awk -v n="$n" 'NR<=n && /^COPY / {t=substr($0,6); sub(/ \(.*$/,"",t); sub(/ FROM stdin;$/,"",t)} NR==n {print t; exit}' "$f")"
        echo "  data.sql line $n, table ${table:-?}: SQLSTATE $code (row values withheld)" >&2
      else
        echo "  $(basename "$f") line $n: ${line#*: }" | cut -c1-400 >&2
      fi
    done
    exit 1
  fi
fi

echo "Comparing row counts…"
sql=""
while IFS=$'\t' read -r table _; do
  [ -n "$table" ] || continue
  esc="${table//\'/\'\'}"
  sql+="${sql:+ union all }select '$esc', count(*) from $table"
done < "$dir/counts.tsv"
psql "$TARGET_DB_URL" -AtXF $'\t' -v ON_ERROR_STOP=1 -c "$sql" | LC_ALL=C sort > "$work/actual.tsv"
LC_ALL=C sort "$dir/counts.tsv" > "$work/expected.tsv"
if ! diff -u "$work/expected.tsv" "$work/actual.tsv" > "$work/diff.txt"; then
  echo "MISMATCH in row counts between the backup and the restored database:" >&2
  grep -E '^[-+][^-+]' "$work/diff.txt" >&2
  exit 1
fi
echo "OK: $(wc -l < "$work/expected.tsv" | tr -d ' ') tables, $(awk -F'\t' '{s+=$2} END {print s+0}' "$work/expected.tsv") rows match the backup."

if [ ! -f "$dir/structure.tsv" ]; then
  echo "This backup predates fingerprints (format 1): structure and permissions not compared." >&2
  exit 0
fi
echo "Comparing structure, privileges, policies and metadata…"
skip="${SKIP_KINDS:-}"
filter() { if [ -n "$skip" ]; then grep -Ev "^($(printf '%s' "$skip" | tr ' ,' '||'))	" || true; else cat; fi; }
psql "$TARGET_DB_URL" -AtX -q -v ON_ERROR_STOP=1 -F "$(printf '\t')" -f "$SQL_DIR/fingerprint.sql" | LC_ALL=C sort | filter > "$work/fp-actual.tsv"
filter < "$dir/structure.tsv" | LC_ALL=C sort > "$work/fp-expected.tsv"
# The target may have extra extensions (a fresh project enables some by default).
missing="$(LC_ALL=C comm -23 "$work/fp-expected.tsv" "$work/fp-actual.tsv")"
extra="$(LC_ALL=C comm -13 "$work/fp-expected.tsv" "$work/fp-actual.tsv" | grep -v '^extension	' || true)"
if [ -n "$missing" ] || [ -n "$extra" ]; then
  echo "MISMATCH in structure/privileges/metadata (kind, object):" >&2
  [ -n "$missing" ] && printf '%s\n' "$missing" | cut -f1,2 | sed 's/^/  missing or different in restore: /' | head -40 >&2
  [ -n "$extra" ] && printf '%s\n' "$extra" | cut -f1,2 | sed 's/^/  only in restore: /' | head -40 >&2
  exit 1
fi
echo "OK: $(wc -l < "$work/fp-expected.tsv" | tr -d ' ') structure, privilege, policy and metadata items match${skip:+ (not yet compared: $skip)}."
