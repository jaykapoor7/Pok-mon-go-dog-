#!/usr/bin/env bash
# Fetch the most recent customer reviews for an App Store app.
# Usage: bash fetch_reviews.sh <app_id> [country] [page]
#
# Uses the public iTunes RSS feed. Returns up to 50 reviews per page.
# Pages 1-10 are available (max 500 reviews total).

set -euo pipefail

APP_ID="${1:?Usage: fetch_reviews.sh <app_id> [country] [page]}"
COUNTRY="${2:-us}"
PAGE="${3:-1}"

URL="https://itunes.apple.com/${COUNTRY}/rss/customerreviews/page=${PAGE}/id=${APP_ID}/sortBy=mostRecent/json"

curl -s --fail --max-time 15 "$URL"
