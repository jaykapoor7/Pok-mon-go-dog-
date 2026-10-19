# Skill Issue integration for StrayPaw

## Installed in this repository

The following upstream skill packages are committed under **both** `.claude/skills/` and `.agents/skills/`, so a normal checkout of this branch includes them without a separate install command:

- `frontend-design`: upstream `SKILL.md` and Apache-2.0 license.
- `react-best-practices`: upstream `SKILL.md` and compiled `AGENTS.md` (complete rules reference).
- `web-design-guidelines`: upstream `SKILL.md`. This skill fetches fresh review guidelines at execution time, so a network-capable agent is needed to perform its audits.

Pinned source copies were retrieved from the upstream default branches when this integration was made; updates require explicit review. They are **not** npm runtime dependencies. Other suggested skills remain optional and are not installed.

Skill Issue (https://skill-issue.in/) is a *directory*, not a dependency. Install selected open-source skills from their upstream maintainers into this project's Claude/Codex workspace. We do not install everything in the directory.

## Re-install or update upstream skills (optional)

From the repository root, inspect upstream skill contents and provenance *before* running the following commands. GitHub CLI 2.90+ supports `gh skill preview` and `gh skill install`.

```sh
# Distinctive frontend art direction
gh skill install anthropics/skills frontend-design --agent claude-code --scope project
gh skill install anthropics/skills frontend-design --agent codex --scope project

# React and Next.js performance
gh skill install vercel-labs/agent-skills react-best-practices --agent claude-code --scope project
gh skill install vercel-labs/agent-skills react-best-practices --agent codex --scope project

# Interface quality checks
gh skill install vercel-labs/agent-skills web-design-guidelines --agent claude-code --scope project
gh skill install vercel-labs/agent-skills web-design-guidelines --agent codex --scope project
```

Source paths and skill names must be reconfirmed using `gh skill install OWNER/REPO` (discovery mode) before execution, since repository layouts and skill manifests can change. Do not use `--all`, `--force` or `--global`. If an upstream skill is absent, skip it rather than substituting unverified code.

## Optional after review

- `ui-ux-pro-max-skill`: design critique and patterns
- `agent-browser`: browser automation (may require additional local runtime)
- `accessibility-compliance`: accessibility audit
- `remotion-best-practices`: video projects, not the production web runtime
- `taste-skill`: consider only if it does not conflict with StrayPaw's established design system

Use the source links and install commands presented for each skill on Skill Issue, and verify that they point to the intended repositories before installing.

## Project-specific integration already committed

Both `.claude/skills/straypaw-skill-issue-workflow/SKILL.md` and `.agents/skills/straypaw-skill-issue-workflow/SKILL.md` route eligible tasks, preserve project rules, and explain which third-party skills to load. The existing `straypaw-design` and animation skills are retained unchanged.

Three reviewed upstream skills are vendored in both agent directories. Other skill candidates have not been installed. Future updates require source review. No production runtime dependency was added.

## Quality gate

```sh
npm run typecheck
npm run build
npm run test:e2e
```

These commands require a working checkout and environment. No production deploy or database migration is part of this integration.
