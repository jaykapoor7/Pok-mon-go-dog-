# Release recovery and rollback

This document covers recovery for the current StrayPaw application. Older app branches and historical redesign commits are **not** validated rollback targets for today's schema or deployed workflows.

## Before any production change

1. Record the deployed commit, current Vercel deployment URL, configuration version and relevant migration identifiers.
2. Check current backup and restoration availability for the actual production database and any private object storage.
3. Confirm whether the change affects SQL functions, RLS, background jobs, encrypted data, integrations or client-side caches.
4. Identify a responsible maintainer, an expected verification result and a decision threshold for reverting.

## Application rollback

If a release causes a regression, use Vercel's deployment history to restore a known-good deployment **only after checking its compatibility with the current database and external services**. Reassess authentication, NGO operations, municipal reviewer permissions, API health, relevant user journeys and release-specific behavior.

Treat the hosting rollback as an application-code operation, **not** a database or data rollback. A previous application build can be incompatible with later schema, policies or stored data.

Do not reset or force-push `main` as an incident response. Preserve commit and release history. Use a reviewed revert commit or a new corrective pull request if a code change is needed.

## Database and evidence recovery

- Do not assume migrations are additive, reversible or safe to reapply.
- Inspect the exact migration and current schema; never run an old migration collection blindly.
- Avoid restoring whole production datasets without first addressing records created after the target point and downstream effects on partner organisations.
- Changes to animal, clinical, billing, release, audit and reviewer evidence require a documented recovery plan and appropriate authorisation.
- Verify row-level security, grants, storage access and audit integrity after any repair.
- Preserve incident evidence, do not copy live personal data into issues or test fixtures, and rotate exposed credentials through the service provider where necessary.

## Verification after recovery

Confirm deployment identity, health endpoints, a representative NGO read/write journey, role-separated municipal access, audit receipts, export controls and any affected integrations. Record what was directly tested and what remains unverified.

See [the CI quality gate](.github/workflows/dev-check.yml), [architecture](docs/ARCHITECTURE.md), [database notes](docs/DATABASE.md) and [QA checklist](docs/QA-CHECKLIST.md). Historical recovery notes in `docs/` describe their own dates, not current production instructions.
