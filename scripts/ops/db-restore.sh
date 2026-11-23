#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Restore a backup made by scripts/ops/db-backup.sh, then prove it: every
# table's row count in the restored database must equal the count recorded
# in the dump (counts.tsv).
#
#   TARGET_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
#   AGE_IDENTITY_FILE=~/.config/straypaw/backup.key \
#     scripts/ops/db-restore.sh production-20261123T204100Z.tar.gz.age
#
#   # or a plaintext backup directory (the CI restore drill):
#   TARGET_DB_URL=… scripts/ops/db-restore.sh /path/to/production-20261123T204100Z
#
# Safety:
#   - Never restores into the production project. Recovery goes into a NEW
#     project (or a local stack), and Vercel is switched only after checks.
#   - Any other hosted Supabase target needs ALLOW_REMOTE_RESTORE=<its ref>.
#   - The target should be empty (fresh `supabase start` or a new project);
#     the restore runs in one transaction and stops at the first error.
#
# Env:
#   TARGET_DB_URL       where to restore (required)
#   AGE_IDENTITY_FILE   private key for .age files
#   VERIFY_ONLY=1       skip the restore, only compare counts with the target
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

src="${1:?usage: db-restore.sh <backup.tar.gz.age | backup dir>}"
: "${TARGET_DB_URL:?TARGET_DB_URL is required}"
PRODUCTION_REF="toujthlzjmhmoyykmayx"

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

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

if [ -d "$src" ]; then
  dir="$src"
else
  case "$src" in
    *.age)
      : "${AGE_IDENTITY_FILE:?AGE_IDENTITY_FILE is required to decrypt $src}"
      age -d -i "$AGE_IDENTITY_FILE" "$src" | tar -C "$work" -xzf - ;;
    *.tar.gz) tar -C "$work" -xzf "$src" ;;
    *) echo "Unrecognised backup: $src" >&2; exit 2 ;;
  esac
  dir="$(find "$work" -mindepth 1 -maxdepth 1 -type d | head -1)"
fi

echo "Checking integrity of $(basename "$dir")…"
(cd "$dir" && sha256sum --quiet -c SHA256SUMS)
cat "$dir/meta.txt"

if [ "${VERIFY_ONLY:-}" != "1" ]; then
  # Known, documented incompatibilities when restoring a hosted dump into a
  # fresh stack (docs: Backup and Restore using the CLI → Troubleshooting).
  mkdir -p "$work/fixed"
  sed -E 's/^(GRANT "postgres" TO "cli_login_postgres".*)$/-- \1/' "$dir/roles.sql" > "$work/fixed/roles.sql"
  cp "$dir/schema.sql" "$work/fixed/schema.sql"
  cp "$dir/data.sql" "$work/fixed/data.sql"
  server_major="$(psql "$TARGET_DB_URL" -Atqc 'show server_version_num' | cut -c1-2)"
  if [ "$server_major" -lt 17 ]; then
    sed -i -E 's/^(SET transaction_timeout.*)$/-- \1/' "$work/fixed/schema.sql" "$work/fixed/data.sql"
  fi

  echo "Restoring into the target…"
  psql --quiet --single-transaction --variable ON_ERROR_STOP=1 \
    --file "$work/fixed/roles.sql" \
    --file "$work/fixed/schema.sql" \
    --command 'SET session_replication_role = replica' \
    --file "$work/fixed/data.sql" \
    --dbname "$TARGET_DB_URL" > "$work/restore.log"
fi

echo "Comparing row counts…"
sql=""
while IFS=$'\t' read -r table _; do
  [ -n "$table" ] || continue
  esc="${table//\'/\'\'}"
  sql+="${sql:+ union all }select '$esc', count(*) from $table"
done < "$dir/counts.tsv"
psql "$TARGET_DB_URL" -AtF $'\t' -v ON_ERROR_STOP=1 -c "$sql" | sort > "$work/actual.tsv"
sort "$dir/counts.tsv" > "$work/expected.tsv"

if diff -u "$work/expected.tsv" "$work/actual.tsv" > "$work/diff.txt"; then
  echo "OK: $(wc -l < "$work/expected.tsv" | tr -d ' ') tables, $(awk -F'\t' '{s+=$2} END {print s+0}' "$work/expected.tsv") rows match the backup."
else
  echo "MISMATCH between the backup and the restored database:" >&2
  cat "$work/diff.txt" >&2
  exit 1
fi
