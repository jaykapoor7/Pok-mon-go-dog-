# StrayPaw 2.0 — rollback plan

2.0 is code only. It adds no migration, no table, no RPC and no environment
variable, and it writes nothing that 1.0 cannot read. Rolling back is therefore
a code rollback; data needs no restore.

## Before release (founder decision)

1. Remove the branch guard from `vercel.json` (`"claude/friendly-noether-u1c7u4": false`) only if a preview is wanted, and only once preview builds no longer receive production secrets (see `CURRENT_STATE_AUDIT.md`, "Deploy safety").
2. Run `e2e/straypaw2.spec.ts` against a staging project with real member accounts, and the RLS checks in `straypaw-2-permissions.md`.
3. Note the production deployment ID currently serving `main` (Vercel → Deployments). That deployment is the rollback target.
4. Merge by pull request, never by force push, so `main` keeps a single revertable merge commit.

## If something is wrong after release

**Fastest (minutes, no build):** in Vercel, promote the noted pre-release
deployment back to production ("Instant Rollback"). The 1.0 code serves again
immediately. Because every 2.0 redirect is temporary (307), browsers have not
cached them and old URLs resolve to 1.0 pages at once.

**Durable (one build):** `git revert -m 1 <merge-commit>` on `main` and deploy.
This restores every 1.0 page, component and redirect in one commit.

**Partial:** a single 2.0 screen can be withdrawn by deleting its redirect line
in `next.config.mjs` and restoring its 1.0 page from the parent commit
(`git checkout <merge>^1 -- src/app/<route>`), together with the components the
import-graph script reports as needed.

## What a rollback does not need

- No database restore: 2.0 wrote only through RPCs 1.0 already uses.
- No user communication about data: reports, cases, care events and follows
  made in 2.0 are ordinary rows that 1.0 shows.
- Device storage keys added by 2.0 (`sp2.report.draft`, `sp2.learn.done`,
  `sp2.field.drafts`, `sp2.veil.seen`) are ignored by 1.0. One thing to tell
  field staff: unsent field-mode drafts stay on their phones, so they should
  send them before the switch.
