#!/usr/bin/env bash
# Fetch app download and revenue estimates from Sensor Tower's public API.
# Usage: bash fetch_app_stats.sh <app_id> [app_id2,app_id3,...]
#
# Accepts one or more comma-separated App Store IDs.
# Returns JSON with monthly download/revenue estimates, ratings, publisher info, etc.
#
# Key fields in the response (per app in the "apps" array):
#   - humanized_worldwide_last_month_revenue  (.string, .revenue, .prefix, .units)
#   - humanized_worldwide_last_month_downloads (.string, .downloads, .prefix, .units)
#   - rating, rating_count, price, publisher_name, categories, etc.

set -euo pipefail

APP_IDS="${1:?Usage: fetch_app_stats.sh <app_id1[,app_id2,app_id3,...]>}"

URL="https://app.sensortower.com/api/ios/apps?app_ids=${APP_IDS}"

curl -s --fail --max-time 15 "$URL"
