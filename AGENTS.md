# StrayPaw agent workflow

Before designing, editing, reviewing, or testing StrayPaw:
1. Read `DESIGN.md`, relevant `docs/ARCHITECTURE.md` and `docs/AGENT-SKILLS.md`.
2. Use `.agents/skills/straypaw-skill-issue-workflow/SKILL.md` for skill selection. Claude Code can also use its equivalent in `.claude/skills/`.
3. Select installed skills by task, not every skill for every task.
   - Marketing page and frontend: `frontend-design`, `ui-ux-pro-max`, and `taste-skill` (if supporting libraries present).
   - Next.js performance: `react-best-practices`.
   - Accessibility: `wcag-audit-patterns` and `web-design-guidelines`.
   - UX QA: `agent-browser` (requires CLI and browser availability).
   - Videos: `remotion-best-practices` (only in Remotion projects).
4. Existing StrayPaw requirements outrank general skill suggestions. Preserve real data, geographic continuity, attribution, privacy/RLS, visual identity, existing working flows, and locked copy.
5. Do not make production changes merely because a skill recommends them. Run applicable checks and explain unverified findings.
