# StrayPaw 2.0 — design system

One original system, four registers. Everything lives under `src/sp/` and is
scoped by the `.sp` class the Shell puts on every 2.0 page, so the public site
and the landing hero are untouched.

## Idea

**A living field atlas, printed.** Paper with fibre, two inks slightly off
register, serif names for places and animals, mono ledgers for figures, and
hatching wherever something is not known. It borrows the warmth of Indian
small-press printing and field notebooks without imitating any folk tradition;
traditional art arrives only as commissioned work in the art slots
(`docs/straypaw-2/ART_SLOTS.md`).

## Tokens (`src/sp/sp.css`)

| Group | Tokens | Use |
|---|---|---|
| Brand inks | `--ink #0b1e3d`, `--shell #f3ede4`, `--paper #fffdf9`, `--flame #f05b40`, `--blue #2457ce` | Text and bars; paper ground; urgency and the one primary action; selection and neutral evidence |
| Care | `--teal #1f6f80` | Care recorded, sterilised, done |
| Field inks | `--turmeric`, `--indigo #2f3d8f`, `--leaf`, `--terracotta #b65a3a`, `--lac`, `--sky` | Cartography and workspace registers |
| Lines | `--line`, `--line-2`, `--line-3` | Hairline rules; no boxed cards inside a page |
| Unknown | `--hatch`, `.pill.is-unknown`, hatched bar parts | "Not recorded", never painted as "no" |
| Ground | `--fibre` (SVG feTurbulence) | Paper fibre behind maps |
| Type | `--sans` DM Sans, `--serif` Instrument Serif, `--mono` DM Mono (next/font) | Body; names of places, animals, findings; IDs, dates, figures |
| Motion | `--ease`, `--ease-in-out`, `--spring`, `--quick 140ms`, `--move 280ms` | Purposeful transitions only |
| Layout | `--bar 58px` | The ink bar |

## Workspace registers

| Workspace | Ink | Character |
|---|---|---|
| Community | flame + blue on paper | Atlas, documentary records, warm editorial pages |
| NGO | teal | Dense, task-first: queue, inspector, ledgers, keys |
| Municipality | indigo (`--civ`) | Institutional: layer index, numbered findings, method beside every claim |
| Education | terracotta (`--lrn`) + per-course field inks | Printed syllabus, exercises framed like plates |

## Primitives (`src/sp/ui`)

- `State` — loading, empty, error, forbidden; always explains, never shows a failed read as zero.
- `Ack` — `draft · pending · saved · failed · offline`. Saved only after the database answers.
- `Method` — unit · precision · period line under maps and figures.
- `Portrait` — real photograph with credit, sensitive veil (remembered per session), or a typographic "No photograph recorded" plate. Never an illustration standing in for an animal.
- `ArtSlot` — a commissioned-art position; until signed, an original two-ink plate labelled "Artwork to be commissioned".
- `ledger`, `chrono`, `pill`, `chip`, `seg`, `tabs`, `btn` — the components every page composes.
- `Partition` (NGO) and finding figures (Municipality) — yes / no / not recorded as one strip, unknown hatched.

## Patterns

- **Atlas** (`src/sp/atlas`): India → city → area → animal; national stamps by evidence kind; H3 areas drawn round; printed pies for sterilisation; compare, playback, URL state.
- **Queue + inspector** (`/ngo`): Linear-style keys, cohorts kept apart, receipts for every action.
- **Register** (`/ngo/animals`, `/community/organisations`): stable columns, sticky head, unknown pills.
- **Findings** (`/city/insights`): number, claim, limit, figure, method; same source prints as the City report.
- **Lesson** (`/learn/courses/...`): syllabus rail, short read, one exercise, takeaway, next.

## Responsive

Phone first. Every page tested at 390px and 1440px with no horizontal
overflow. On phones the shell becomes a thumb bar (three destinations, the
workspace action, More), inspectors become sheets, rails become scrolling
chips, tables drop secondary columns. Touch targets ≥ 44px.

## Motion

Camera travel between scales; inspector and sheet entrances; report screens
slide; Academy figures transition. `prefers-reduced-motion` removes CSS motion
and shortens camera moves in JavaScript. No ambient animation in 2.0 pages.

## Accessibility

Real headings per page, labelled regions and controls, `aria-live` for every
receipt, visible focus, Escape closes sheets and popovers, keyboard paths for
the queue (j/k, Enter, o, m) and moderation (A, R, →), WCAG AA text contrast on
paper.
