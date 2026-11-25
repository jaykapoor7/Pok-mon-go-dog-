#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# One-time setup of StrayPaw's backups, run by the OWNER on their own machine.
# Uses your logged-in `gh` and `supabase` CLIs; secrets go straight from the
# CLIs (or a hidden prompt) into GitHub via stdin. Nothing secret is printed,
# put on a command line, or written to disk except your private backup key.
#
#   bash scripts/ops/setup-backups.sh            # configure everything
#   bash scripts/ops/setup-backups.sh check      # show what is configured (names only)
#   bash scripts/ops/setup-backups.sh verify <artifact.zip>
#                                                # decrypt a downloaded backup with your key
#
# Needs: gh (gh auth login), supabase (supabase login), age, jq.
# Sets on jaykapoor7/Pok-mon-go-dog-:
#   variable BACKUP_AGE_RECIPIENTS        your age public key (public by design)
#   secrets  BACKUP_SUPABASE_URL, BACKUP_SUPABASE_SERVICE_KEY        (production)
#            STAGING_POOLER_URL, STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_KEY
#            BACKUP_HEARTBEAT_URL         (healthchecks.io dead-man's switch)
# Production's SUPABASE_POOLER_URL already exists and is left alone.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
set +x  # never trace: values must not reach the terminal

REPO="jaykapoor7/Pok-mon-go-dog-"
PROD_REF="toujthlzjmhmoyykmayx"
STAGING_REF="ucxfxiddufwqithtdtix"
KEY_DIR="${STRAYPAW_KEY_DIR:-$HOME/.config/straypaw}"
KEY_FILE="$KEY_DIR/straypaw-backup.key"

say() { printf '%s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { say "Missing: $1 ($2)"; exit 2; }; }
put_secret() { # name, value on stdin; never echoed
  gh secret set "$1" --repo "$REPO" > /dev/null
  say "  ✓ secret $1 set"
}
service_key() { # project ref -> service-role/secret key on stdout (captured, never printed)
  local json
  # --reveal: without it, sb_secret_ keys come back masked.
  json="$(supabase projects api-keys --project-ref "$1" --reveal -o json 2>/dev/null)" || return 1
  jq -r '[.. | objects | select(has("api_key"))] as $k
    | (([$k[] | select(.name == "service_role")] + [$k[] | select((.type // "") == "secret")])[0].api_key // empty)
    | select(test("[*•]") | not)' <<< "$json"
}

cmd="${1:-setup}"
case "$cmd" in
  check)
    need gh "https://cli.github.com"
    say "Secrets on $REPO (names only):"; gh secret list --repo "$REPO" | cut -f1 | sed 's/^/  /'
    say "Variables:"; gh variable list --repo "$REPO" | cut -f1 | sed 's/^/  /'
    [ -f "$KEY_FILE" ] && say "Private key present: $KEY_FILE" || say "No private key at $KEY_FILE"
    exit 0 ;;
  verify)
    zip="${2:?usage: setup-backups.sh verify <downloaded-artifact.zip>}"
    [ -f "$KEY_FILE" ] || { say "No key at $KEY_FILE"; exit 2; }
    CHECK_ONLY=1 AGE_IDENTITY_FILE="$KEY_FILE" bash "$(dirname "$0")/db-restore.sh" "$zip"
    exit $? ;;
  setup) ;;
  *) say "usage: $0 [setup|check|verify <zip>]"; exit 2 ;;
esac

need gh "https://cli.github.com, then: gh auth login"
need supabase "https://supabase.com/docs/guides/cli, then: supabase login"
need age "brew install age / apt install age"
need jq "brew install jq / apt install jq"
gh auth status > /dev/null 2>&1 || { say "Run: gh auth login"; exit 2; }
supabase projects list > /dev/null 2>&1 || { say "Run: supabase login"; exit 2; }

say "1/4 Backup encryption key"
if [ -f "$KEY_FILE" ]; then
  say "  key already exists at $KEY_FILE (kept)"
else
  mkdir -p "$KEY_DIR"; chmod 700 "$KEY_DIR"
  ( umask 077; age-keygen -o "$KEY_FILE" 2> /dev/null )
  say "  created $KEY_FILE (readable only by you)"
fi
pub="$(age-keygen -y "$KEY_FILE")"
gh variable set BACKUP_AGE_RECIPIENTS --repo "$REPO" --body "$pub" > /dev/null
say "  ✓ variable BACKUP_AGE_RECIPIENTS set to your public key"

say "2/4 Production Storage access"
printf '%s' "https://$PROD_REF.supabase.co" | put_secret BACKUP_SUPABASE_URL
k="$(service_key "$PROD_REF")" || true
[ -n "$k" ] || { say "  Could not read production's service key with the Supabase CLI. Is this account an owner of the project?"; exit 1; }
printf '%s' "$k" | put_secret BACKUP_SUPABASE_SERVICE_KEY; unset k

say "3/4 Staging"
printf '%s' "https://$STAGING_REF.supabase.co" | put_secret STAGING_SUPABASE_URL
k="$(service_key "$STAGING_REF")" || true
[ -n "$k" ] || { say "  Could not read staging's service key with the Supabase CLI."; exit 1; }
printf '%s' "$k" | put_secret STAGING_SUPABASE_SERVICE_KEY; unset k
say "  Paste staging's Session pooler URI (Dashboard → straypaw-staging → Connect → Session pooler,"
say "  with the database password filled in). Input is hidden:"
IFS= read -rs uri; say ""
case "$uri" in
  *"$PROD_REF"*) say "  That is the PRODUCTION URI. Refusing."; exit 1 ;;
  postgres*"$STAGING_REF"*pooler.supabase.com*) ;;
  *) say "  That does not look like staging's Session pooler URI (postgresql://postgres.$STAGING_REF:…@…pooler.supabase.com:5432/postgres)."; exit 1 ;;
esac
if command -v psql >/dev/null 2>&1; then
  psql "$uri" -Atqc 'select 1' > /dev/null 2>&1 && say "  ✓ staging URI connects" || { say "  The URI did not connect (wrong password?)."; exit 1; }
fi
printf '%s' "$uri" | put_secret STAGING_POOLER_URL; unset uri

say "4/4 Backup heartbeat (alerts you when no backup succeeded)"
say "  Paste a healthchecks.io API key to create the check automatically (Project → Settings → API keys),"
say "  or just press Enter to paste an existing ping URL instead. Input is hidden:"
IFS= read -rs hc; say ""
if [ -n "$hc" ]; then
  # The API key goes to curl through stdin (-K -), never on its command line.
  ping="$(printf 'header = "X-Api-Key: %s"\n' "$hc" | curl -fsS -m 20 -K - https://healthchecks.io/api/v3/checks/ -H 'Content-Type: application/json' \
    --data '{"name":"StrayPaw database backup","timeout":86400,"grace":21600,"unique":["name"],"desc":"Pinged by the Database backup workflow"}' \
    | jq -r '.ping_url // empty')"; unset hc
  [ -n "$ping" ] || { say "  healthchecks.io did not return a ping URL (check the API key)."; exit 1; }
  say "  ✓ check 'StrayPaw database backup' ready (period 1 day, grace 6 h). Add your phone/email under Integrations."
else
  say "  Paste the check's ping URL (hidden):"; IFS= read -rs ping; say ""
  case "$ping" in https://hc-ping.com/*|https://*/ping/*) ;; *) say "  Not a healthchecks ping URL."; exit 1 ;; esac
fi
printf '%s' "$ping" | put_secret BACKUP_HEARTBEAT_URL; unset ping

say ""
say "Done. Two things only you can do:"
say "  • Copy $KEY_FILE into your password manager now (and one more place)."
say "    Without it the backups cannot be read."
say "  • Tell Claude 'secrets are set' so it re-runs Backup verification on PR #138."
