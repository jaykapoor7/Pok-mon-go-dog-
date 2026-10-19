# Claude Code instructions — StrayPaw

Read `AGENTS.md` and `DESIGN.md` first for product constraints and skill selection.
Use the project-local skills in `.claude/skills/` when relevant. The skill router is `.claude/skills/straypaw-skill-issue-workflow/SKILL.md`.

Prioritize StrayPaw's documented design decisions and real data over generic recommendations from external skills. Preserve user-locked decisions and existing functionality. Never deploy production, run database migrations, or alter existing workflows unless specifically asked. Check mobile and accessibility, respect reduced motion, and verify TypeScript/build/e2e before proposing production code merges.
