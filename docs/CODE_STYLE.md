# Code style

## Principles

Optimize for readable, boring, traceable code. StrayPaw already has substantial domain logic; consistency is more valuable than clever abstraction.

## TypeScript and React

- Use TypeScript for application code.
- Prefer existing path aliases such as `@/...`.
- Keep server logic on the server; add `"use client"` only when a component actually needs browser state/effects/events.
- Prefer small domain helpers in `src/lib/` over large components that fetch, transform and render data in one place.
- Reuse established components and patterns before creating another variant.
- Avoid `any` in new domain code when a useful type can be expressed locally.
- Preserve null/unknown states instead of converting them to zero/false for convenience.

## Naming

- Components/types: PascalCase.
- Functions/variables: camelCase.
- Route/file names follow existing App Router conventions.
- Database names stay snake_case.
- Prefer domain names already used by the product; do not introduce synonyms for the same entity.

## Error handling

- Fail closed on permissions.
- Give users actionable messages without leaking internal implementation.
- Do not swallow authorization/security errors to fall back to broader data.
- Optional integrations may fail gracefully only where the existing product contract allows that.

## Data access

- Keep Supabase access in established data/domain modules where possible.
- Avoid fetching the same dataset independently in multiple components.
- Service-role access is server-only.
- Do not use demo/fixture data as a production fallback for real records.

## Styling

Frontend implementation rules live in `docs/DESIGN_SYSTEM.md` and `.claude/skills/straypaw-design/SKILL.md`. Do not encode a second design system in component-local magic numbers.

## Comments

Comments should explain a non-obvious constraint, security reason, compatibility edge, or why a surprising implementation is deliberate. Do not narrate obvious code.

When a hack is necessary, state the condition that would allow it to be removed.

## Changes

Prefer focused changes. A bug fix should not silently redesign unrelated pages or rename core domain concepts. When refactoring, preserve behavior first and separate product behavior changes when practical.

## Tests and checks

Run the narrowest relevant test while developing, then the normal type/lint/build gates for meaningful changes. Add regression coverage for bugs that are likely to recur, especially authorization, migrations, imports, map math and responsive UI behavior.
