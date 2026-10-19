# Skills used and setup verification

Project instructions read before editing: `AGENTS.md`, `DESIGN.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/AGENT-SKILLS.md`, `.agents/skills/straypaw-skill-issue-workflow/SKILL.md`, `docs/MOTION.md`.

| Skill | Successfully loaded and applied | Supporting resources verified |
| --- | --- | --- |
| StrayPaw skill/issue workflow | Constraints, skill routing, real-data safeguards, issue #31, validation and PR workflow. | Project entrypoint and architecture/design documents. |
| frontend-design | Retained the existing credited Coromandel hero; opaque reading surface, subject-specific composition, deliberate restraint. | `SKILL.md`, `LICENSE.txt`. |
| react-best-practices / vercel-react-best-practices | Parallel independent reads; removed unnecessary homepage WebGL, frames, listeners and map data; protected async selection and label updates. | Installed full upstream package, compiled guide and individual bundle/parallel-fetch rules. |
| web-design-guidelines | Reviewed semantics, focus, touch targets, forms, motion and images. | Fresh upstream `command.md` fetched successfully on 19 October, rather than claiming the stub contained the rules. |
| ui-ux-pro-max | Keyboard tab patterns, touch targets, responsive hierarchy and visible feedback. | Installed full package; Python 3 search ran against `ux-guidelines.csv` for “keyboard navigation tabs”; three applicable results. Read quick-reference checklist. |
| taste-skill / design-taste-frontend | Used subject inventory, still-first composition, actual browser inspector and screenshot critique. | Installed full upstream package; scripts, references and assets verified. `inspect.mjs` executed at 1440, 768, 390. Its generic visual FAILs are not reported as a pass: it asks for more motion, four pictures, no cream/mono/dividers/labels and shorter headlines. Those conflict with this brief's locked copy, four sections, identity and motion restraint. No random direction or speculative redesign was generated. |
| agent-browser | Real deployed map/city selection, marketing, reporting entry and animal profile inspection; screenshots and axe audits. | Installed CLI 0.39.1 under `/tmp/straypaw-browser`, loaded matching `core` and `dogfood` usage; Chromium 154 at `/usr/bin/chromium`. Existing Playwright suite also ran. |
| wcag-audit-patterns | POUR review, native labels and semantics, contrast, focus containment, recoverable validation and reduced-motion QA. | Installed full `references/details.md`; axe-core browser audit and manual keyboard checks. |
| Existing review-animations / improve-animations | Replaced decorative scroll choreography with direct state changes; used standards to review timing, purpose, interruptibility and reading stability. Read-only product audit delegated under improve-animations' fan-out instruction. | `STANDARDS.md`, project `docs/MOTION.md`, skill entrypoints. |

Initial setup issues were recovered: npm's default cache was outside writable roots, so installs used `/tmp/straypaw-npm`. `scripts/install-agent-skills.sh` stopped at React because upstream renamed it `vercel-react-best-practices`; the correct package and required remaining supports were installed directly. The script now uses the current name. It installs Remotion only with `--video`; no video work or Remotion guidance was used here.

Requested non-video skills are available after setup. The connected browser extension had no callable tool; standalone agent-browser and repository Playwright supplied browser QA. Full installed third-party libraries remain local, avoiding an unrelated multi-megabyte vendoring change in this PR. `npx skills list` discovers them. The unrelated Claude-only `straypaw-design` entrypoint has invalid YAML in its description; it was not used or claimed as successfully discoverable.

Cloud skill availability changed during the session; no Supabase cloud skill was available when product repairs were implemented. No database schema, RLS policy, auth contract or backend operation was changed.
