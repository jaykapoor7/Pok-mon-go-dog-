#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# After Storage files are uploaded back (storage-backup.mjs restore), put each
# object's original row metadata back: owner, owner_id, metadata (size,
# mimetype, eTag…), user_metadata, timestamps, version. Uploading through the
# Storage API rewrites those fields, and RLS policies on storage.objects can
# depend on owner/owner_id.
#
#   TARGET_DB_URL=… scripts/ops/storage-reconcile.sh <plaintext db backup dir>
#
# Reads the storage.objects block from that backup's data.sql into a
# temporary table, updates matching objects, then fails unless every object in
# the backup exists in the target with identical owner and metadata.
# Same production guard as db-restore.sh. Prints counts only.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

dir="${1:?usage: storage-reconcile.sh <db backup dir>}"
: "${TARGET_DB_URL:?TARGET_DB_URL is required}"
case "$TARGET_DB_URL" in *toujthlzjmhmoyykmayx*) echo "Refusing: production target." >&2; exit 3 ;; esac
if printf '%s' "$TARGET_DB_URL" | grep -Eq 'supabase\.(co|com)'; then
  ref="$(printf '%s' "$TARGET_DB_URL" | grep -Eo '(postgres\.|db\.)[a-z0-9]{20}' | head -1 | sed -E 's/^(postgres|db)\.//')"
  [ -n "$ref" ] && [ "${ALLOW_REMOTE_RESTORE:-}" = "$ref" ] || { echo "Refusing: hosted target; set ALLOW_REMOTE_RESTORE=<ref>." >&2; exit 3; }
fi

work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
header="$(grep -m1 -E '^COPY "?storage"?\."?objects"? ' "$dir/data.sql" || true)"
[ -n "$header" ] || { echo "No storage.objects rows in this backup; nothing to reconcile."; exit 0; }
cols="$(printf '%s' "$header" | sed -E 's/^COPY [^(]+\((.*)\) FROM stdin;$/\1/')"
awk -v h="$header" '$0 == h {on=1; next} on && $0 == "\\." {exit} on {print}' "$dir/data.sql" > "$work/rows.copy"

set_list="$(printf '%s' "$cols" | tr ',' '\n' | sed -E 's/^ *//; s/ *$//' \
  | grep -Ev '^"?(id|bucket_id|name|path_tokens)"?$' | awk '{printf "%s%s = t.%s", (NR>1?", ":""), $0, $0}')"

{
  echo '\set VERBOSITY sqlstate'
  echo 'begin;'
  echo 'set local session_replication_role = replica;  -- keep original updated_at (trigger off)'
  echo 'create temporary table _o as select * from storage.objects with no data;'
  echo "copy _o ($cols) from stdin;"
  cat "$work/rows.copy"
  echo '\.'
  echo "update storage.objects o set $set_list from _o t where o.bucket_id = t.bucket_id and o.name = t.name;"
  echo "select 'missing', count(*) from _o t where not exists (select 1 from storage.objects o where o.bucket_id = t.bucket_id and o.name = t.name)"
  echo "union all select 'different', count(*) from _o t join storage.objects o using (bucket_id, name)"
  echo "  where (to_jsonb(o) -> 'owner_id', o.metadata, to_jsonb(o) -> 'user_metadata') is distinct from (to_jsonb(t) -> 'owner_id', t.metadata, to_jsonb(t) -> 'user_metadata')"
  echo "union all select 'objects', count(*) from _o;"
  echo 'commit;'
} > "$work/reconcile.sql"

psql "$TARGET_DB_URL" -AtX -q -v ON_ERROR_STOP=1 -F "$(printf '\t')" -f "$work/reconcile.sql" > "$work/result.tsv" 2> "$work/err" || {
  echo "Reconcile failed: $(grep -Eo 'ERROR: +[0-9A-Z]{5}' "$work/err" | head -1)" >&2; exit 1; }
missing="$(awk -F'\t' '$1=="missing"{print $2}' "$work/result.tsv")"
different="$(awk -F'\t' '$1=="different"{print $2}' "$work/result.tsv")"
total="$(awk -F'\t' '$1=="objects"{print $2}' "$work/result.tsv")"
if [ "$missing" != "0" ] || [ "$different" != "0" ]; then
  echo "MISMATCH: of $total objects in the backup, $missing are missing and $different differ in owner or metadata." >&2
  exit 1
fi
echo "OK: owner and metadata of all $total Storage objects match the backup."
