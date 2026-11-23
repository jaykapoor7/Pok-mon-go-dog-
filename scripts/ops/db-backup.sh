#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# Logical backup of a StrayPaw Supabase database, encrypted with age.
#
#   DB_URL=postgresql://…  AGE_RECIPIENTS="age1…"  scripts/ops/db-backup.sh <label> <out-dir>
#
# Produces <out-dir>/<label>-<UTC stamp>.tar.gz.age containing:
#   roles.sql, schema.sql, data.sql   the three files Supabase documents for a
#                                      restorable dump (supabase db dump)
#   counts.tsv                         rows per table, parsed from data.sql itself,
#                                      so it matches the dump's snapshot exactly
#   SHA256SUMS, meta.txt
#
# Why encrypted: this repository is public, so GitHub Actions artifacts can be
# downloaded by anyone. The backup is only ever written encrypted to one or
# more age public keys (AGE_RECIPIENTS, space or newline separated). The
# matching private key stays with the owner, offline. There is no plaintext
# mode in CI.
#
# Env:
#   DB_URL              Session pooler URI (GitHub runners are IPv4-only)
#   AGE_RECIPIENTS      age public key(s); required
#   DUMPER              supabase (default) | pg_dump (plain Postgres, local tests only)
#   SUPABASE_CMD        how to run the CLI (default: "npx -y supabase@2.122.1")
#   KEEP_PLAINTEXT_DIR  if set, also leave the plaintext files there (for the
#                       restore drill on the same ephemeral runner). Never set
#                       this to a path that is uploaded.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

label="${1:?usage: db-backup.sh <label> <out-dir>}"
out="${2:?usage: db-backup.sh <label> <out-dir>}"
: "${DB_URL:?DB_URL is required}"
DUMPER="${DUMPER:-supabase}"
SUPABASE_CMD="${SUPABASE_CMD:-npx -y supabase@2.122.1}"

recipients=()
for r in ${AGE_RECIPIENTS:-}; do recipients+=(-r "$r"); done
if [ "${#recipients[@]}" -eq 0 ]; then
  echo "AGE_RECIPIENTS is empty: refusing to write an unencrypted backup." >&2
  exit 2
fi
command -v age >/dev/null || { echo "age is not installed" >&2; exit 2; }

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="$label-$stamp"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
dir="$work/$name"
mkdir -p "$dir" "$out"

echo "Dumping $label with $DUMPER…"
case "$DUMPER" in
  supabase)
    # shellcheck disable=SC2086
    $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/roles.sql" --role-only
    # shellcheck disable=SC2086
    $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/schema.sql"
    # shellcheck disable=SC2086
    $SUPABASE_CMD db dump --db-url "$DB_URL" -f "$dir/data.sql" --use-copy --data-only \
      -x "storage.buckets_vectors" -x "storage.vector_indexes"
    ;;
  pg_dump)
    printf -- '-- roles: not dumped in pg_dump mode\n' > "$dir/roles.sql"
    pg_dump --schema-only --no-owner --no-privileges "$DB_URL" > "$dir/schema.sql"
    pg_dump --data-only --no-owner "$DB_URL" > "$dir/data.sql"
    ;;
  *) echo "Unknown DUMPER: $DUMPER" >&2; exit 2 ;;
esac

for f in roles.sql schema.sql data.sql; do
  [ -s "$dir/$f" ] || { echo "$f is empty: dump failed" >&2; exit 1; }
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
  echo "tables=$(wc -l < "$dir/counts.tsv" | tr -d ' ')"
  echo "rows=$(awk -F'\t' '{s+=$2} END {print s+0}' "$dir/counts.tsv")"
  echo "git_sha=${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
} > "$dir/meta.txt"
(cd "$dir" && sha256sum roles.sql schema.sql data.sql counts.tsv meta.txt > SHA256SUMS)

tar -C "$work" -czf - "$name" | age "${recipients[@]}" -o "$out/$name.tar.gz.age"

if [ -n "${KEEP_PLAINTEXT_DIR:-}" ]; then
  mkdir -p "$KEEP_PLAINTEXT_DIR"
  cp -R "$dir" "$KEEP_PLAINTEXT_DIR/"
fi

echo "Wrote $out/$name.tar.gz.age ($(du -h "$out/$name.tar.gz.age" | cut -f1))"
cat "$dir/meta.txt"
