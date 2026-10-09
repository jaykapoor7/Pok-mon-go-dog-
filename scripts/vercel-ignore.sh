#!/usr/bin/env bash
# Vercel "Ignored Build Step": exit 0 skips the build, exit 1 builds.
# Build when there is no previous deployment, when that commit is not in
# Vercel's shallow clone (diffing it would fail with "bad object"), on any
# git error, or when an app path changed. Skip only for unrelated changes.
prev="$VERCEL_GIT_PREVIOUS_SHA"
[ -z "$prev" ] && exit 1
git cat-file -e "${prev}^{commit}" 2>/dev/null || exit 1
git diff --quiet "$prev" HEAD -- src public scripts supabase/functions package.json package-lock.json \
  next.config.mjs vercel.json tsconfig.json postcss.config.mjs tailwind.config.ts middleware.ts && exit 0
exit 1
