#!/usr/bin/env bash
# Search the iTunes Store for apps matching a query term.
# Usage: bash search_apps.sh "quit vaping" [country] [limit]
#
# Returns JSON with app metadata: trackId, trackName, averageUserRating,
# userRatingCount, price, formattedPrice, description, sellerName, etc.

set -euo pipefail

TERM="${1:?Usage: search_apps.sh <search_term> [country] [limit]}"
COUNTRY="${2:-us}"
LIMIT="${3:-25}"

ENCODED_TERM=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1]))" "$TERM")

URL="https://itunes.apple.com/search?term=${ENCODED_TERM}&entity=software&country=${COUNTRY}&limit=${LIMIT}"

curl -s --fail --max-time 15 "$URL"
