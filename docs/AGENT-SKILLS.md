# Skill Issue integration for StrayPaw

Skill Issue (https://skill-issue.in/) is a *directory*, not a dependency. Install selected open-source skills from their upstream maintainers into this project's Claude/Codex workspace. We do not install everything in the directory.

## Selected upstream skills (project scope)

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

The upstream third-party skill packages are **not vendored or installed by this documentation change**. Running the commands above on a checkout is required to make those external skills available, followed by explicit review and commit if they should be shared through GitHub. This separation avoids importing unreviewed executable content into a production repository.

## Quality gate

```sh
npm run typecheck
npm run build
npm run test:e2e
```

These commands require a working checkout and environment. No production deploy or database migration is part of this integration.
