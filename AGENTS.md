# StrayPaw agent instructions

This file is the entry point for coding agents working in this repository.

## Before changing code

Read the documentation that matches the task:

- Any frontend/UI change: `.claude/skills/straypaw-design/SKILL.md` and `docs/DESIGN_SYSTEM.md`.
- Authentication, permissions, public/private data, forms, uploads, admin tools, embeds, or server credentials: `docs/SECURITY.md`.
- Tables, RLS, views, RPCs, migrations, imports, spatial data, or Supabase reads/writes: `docs/DATABASE.md`.
- Route handlers or external/internal HTTP interfaces: `docs/API.md`.
- Structural changes or new subsystems: `docs/ARCHITECTURE.md`.
- General implementation work: `docs/CODE_STYLE.md`.

For product intent, use the current application and current implementation before old plans. Files under `plans/` are historical working documents unless explicitly marked otherwise.

## Source-of-truth order

When documentation conflicts:

1. Current production code and current Supabase SQL.
2. These maintained docs.
3. The permanent StrayPaw design skill for visual decisions.
4. README/checklists.
5. Historical files under `plans/`.

Do not preserve a documented rule that the current system has intentionally replaced. Update the relevant doc in the same change.

## Non-negotiables

- StrayPaw is civic field infrastructure, not a generic SaaS dashboard.
- Never invent live records, partner activity, outcomes, counts, medical status, coverage, or population estimates.
- Preserve the separation between public/community data and organisation-private operational data.
- Never put a service-role key, admin secret, database URI, Resend key, Turnstile secret, or other server credential in client code.
- Do not weaken RLS, grants, authentication, rate limits, or public-data minimisation to make a feature easier to implement.
- Database changes must be idempotent and must be reflected in the appropriate migration bundle/workflow.
- A public view must expose only fields deliberately safe for anonymous access.
- Organisation space is determined by the route/workspace being used; do not infer privileged access from a client-side role string.
- Empty and sparse states are normal. Do not fill them with fixtures in production.
- Phone is the primary field-work surface. Verify 320, 360, 390, and 1280 px for meaningful UI work.

## Expected validation

Use the smallest relevant checks, then expand when the change crosses boundaries:

```bash
npm run typecheck
npm run lint
npm run build
```

For database/security work also use the repository's security and RPC checks where applicable:

```bash
npm run db:security:audit
npm run db:security:matrix
npm run test:sql-rpc-mapping
```

For interaction/regression work use the relevant Playwright suite(s). Do not claim a path is verified unless it was actually exercised.

## Documentation discipline

Keep these files short and factual. They describe the project as it exists. If implementation changes one of these contracts, update the contract in the same PR.
