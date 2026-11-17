#!/usr/bin/env bash
# Vercel "Ignored Build Step": exit 0 skips the build, exit 1 builds.
#
# Only main (production) and demo (demo.straypaw.org, on the staging database)
# build. vercel.json's git.deploymentEnabled already stops other branches from
# starting a build; this is the same rule for any build that starts anyway.
# Pull requests are built and tested by GitHub's Quality gate, not by Vercel.
case "$VERCEL_GIT_COMMIT_REF" in
  main|demo) ;;
  *) echo "Not main or demo: skipped (GitHub's Quality gate builds and tests branches)."; exit 0 ;;
esac
# Build when there is no previous deployment, when the commit is the one
# already deployed (a deliberate redeploy: how an environment change, such as a
# new key or MARKETING_EXPERIENCE, reaches the deployment), when that commit is
# not in Vercel's shallow clone (diffing it would fail with "bad object"), on
# any git error, or when something the site is built from changed. Tests, docs,
# migrations and other scripts do not change the site, so they skip the build.
prev="$VERCEL_GIT_PREVIOUS_SHA"
[ -z "$prev" ] && exit 1
[ "$prev" = "$VERCEL_GIT_COMMIT_SHA" ] && exit 1
git cat-file -e "${prev}^{commit}" 2>/dev/null || exit 1
git diff --quiet "$prev" HEAD -- src public package.json package-lock.json next.config.mjs vercel.json tsconfig.json \
  postcss.config.mjs tailwind.config.ts middleware.ts scripts/vercel-ignore.sh scripts/sarvam-sdk-privacy.mjs \
  scripts/build-info.mjs scripts/no-fixtures.mjs scripts/copy-maplibre-worker.mjs vendor && exit 0
exit 1
