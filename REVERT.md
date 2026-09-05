# Reverting StrayPaw

There are two versions of StrayPaw on the remote, each pinned to a branch:

| Version | Branch | Commit | What it is |
|---|---|---|---|
| **v2, platform** (current) | `main` / `claude/straypaw-delhi-app-toifso` | `fa8d4a3` | Animal-welfare **data & operations platform**, species-agnostic cases, org profiles/dashboards, surveys/census, terracotta operational UI. Built for DDS + CUPA. |
| **v1, original app** | `restore/original-app` | `7afcf78` | The **original consumer stray-dog app**, olive palette, community map/report/feed, shared partner console. Everything *before* this redesign. |

`restore/original-app` is a permanent, untouched snapshot of the old app. It is
never modified by ongoing work, so it's always there to roll back to.

## To roll back to the old app

**Option A, repoint your deploy (safest, reversible in one click).**
In your host (e.g. Vercel), change the Production Branch from `main` to
`restore/original-app` and redeploy. To come back, switch it to `main` again.
Nothing is lost either way.

**Option B, reset `main` to the old app (git).**
```bash
git fetch origin
git checkout main
git reset --hard origin/restore/original-app   # main now = the old app
git push --force-with-lease origin main
```
To return to the platform version later:
```bash
git reset --hard fa8d4a3 && git push --force-with-lease origin main
```
(The platform history stays on `claude/straypaw-delhi-app-toifso`, so `fa8d4a3`
is always recoverable.)

## About the database (important, no DB rollback needed)

Every migration this redesign added is **additive and idempotent**, new columns
(`species`, `medical_notes`, `photos`, `follow_up_at`, `config`, `role`, …) and
new tables (`surveys`, `survey_areas`, `survey_responses`, `fundraiser_updates`,
`rate_limits`, …). It never drops or renames anything the old app uses.

So reverting the **code** to `restore/original-app` is safe with the current
database as-is: the old app simply ignores the extra columns/tables. You do
**not** need to undo any SQL to run the old app.

If you want a truly clean old-app database too, restore a Supabase backup from
before the migrations, but for a normal rollback that isn't necessary.

## Quick reference

- Current platform HEAD: `fa8d4a3`
- Old-app snapshot: `7afcf78` (branch `restore/original-app`)
- Start of the redesign: `a0dec56` (everything from here up is v2)
