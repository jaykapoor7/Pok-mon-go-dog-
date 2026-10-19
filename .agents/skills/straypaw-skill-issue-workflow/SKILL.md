---
name: straypaw-skill-issue-workflow
description: Route StrayPaw design, performance, QA and motion tasks to locally available skills without violating product or data rules.
---

# StrayPaw agent skill routing

Follow the current user request, locked copy decisions, `DESIGN.md`, security/privacy requirements and `docs/ARCHITECTURE.md` before any third-party guidance.

## Available in this repository

- Public web UI and composition: `frontend-design`, existing `straypaw-design` (Claude only), and `taste-skill` for ideas.
- Design critique and product UX: `ui-ux-pro-max` and `web-design-guidelines`.
- Next.js / React: `react-best-practices`.
- Accessibility audits: `wcag-audit-patterns` and `web-design-guidelines`.
- Browser QA: `agent-browser` when its external CLI is installed, otherwise repository Playwright tests.
- Motion and animation: existing animation skills; `remotion-best-practices` only for video/Remotion work.

**Dependency notice:** A skill folder containing only `SKILL.md` may describe other required reference files, scripts, tools or data that are not vendored. Do not pretend these resources exist. If missing, use the available standalone guidance and state that the advanced workflow needs upstream setup. Browser CLI installation is not automatic.

## Required safeguards

- Never invent records, metrics, partners, locations, outcomes or demo data.
- Preserve map continuity, touch/mobile usability, authentication, permissions and existing user flows.
- Respect art provenance, licenses, photo sensitivity, accessible interaction and reduced-motion preferences.
- Avoid generic visual templates that conflict with StrayPaw's identity.
- Keep existing production UI and copy unchanged unless explicitly requested.
- No database migrations or production deployment without requested scope.
- Before merging code changes, run relevant checks, review the diff and note any checks that could not run.
