# StrayPaw agent skills

Skill Issue (https://skill-issue.in/) is a discovery directory. Upstream skills are installed for both Claude Code and Codex, under `.claude/skills/` and `.agents/skills/`.

## Included in GitHub

**Self-contained project copies:** `frontend-design`, `react-best-practices` (including compiled rules), and `web-design-guidelines`.

**Skill entrypoints:** `ui-ux-pro-max`, `taste-skill`, `agent-browser`, `wcag-audit-patterns`, and `remotion-best-practices`. Their upstream tools, datasets, reference files, and/or browser runtime are **not** all included in the checked-in copies, so those advanced workflows need full local installation.

Existing animation and StrayPaw-specific skills are preserved.

## Complete local installation

From a checkout of this repository with Node.js and npm:

```bash
bash scripts/install-agent-skills.sh
npx --yes skills list
```

The script uses the official `skills` installer and the curated upstream repositories to copy the full skill packages, including supporting files, into both agents' project-level directories. Review upstream content and the resulting git diff before trusting executable scripts. Third-party skills can change when run against upstream default branches.

The `agent-browser` skill requires a separate browser runtime / CLI installation before live navigation and testing. `remotion-best-practices` is design/developer guidance, not a video rendering engine, and no Remotion dependency is added to the production app.

## Task selection and guardrails

The root `AGENTS.md` and `CLAUDE.md` link to the local StrayPaw skill router. Use only the relevant skill(s) for each task. The user's current instructions and locked decisions, `DESIGN.md`, architecture, access control, RLS, verified data, photo sensitivity, art licensing, and mobile map functionality outrank external design recommendations.

No new runtime features, app routes, migrations, or production changes are authorized by installing skills.

For production feature changes, run `npm run typecheck`, `npm run build`, and relevant tests, including `npm run test:e2e` where available.
