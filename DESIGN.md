# StrayPaw product design system

## Product character

StrayPaw is a shared field record, not a generic dashboard. The landing site is
editorial and human; the product is precise, map-led and calm under pressure.
Every working view should make one question obvious, keep its next action close,
and reveal supporting detail only after a person chooses a place or record.

| Space | Job | Visual posture |
| --- | --- | --- |
| Community | Find, understand and add to a local record | **Atlas** — map first, quiet data labels, human records in the foreground |
| NGO | Decide what the team should do next | **Field operating system** — queue first, map as context, actions visible on the active row |
| Municipality | Audit coverage and programme progress | **Geographic command surface** — a city map with comparable layers, time and drill-down |
| Animal record | Verify one animal's history | **Living record** — photography, identity and a chronological trail |

## Foundations

### Colour

Never introduce a new product palette without a specific semantic reason.

| Token | Value | Use |
| --- | --- | --- |
| Ink | `#0b1e3d` | Primary text, map ground and strong boundaries |
| Shell | `#f3ede4` | Public ground and warm record surfaces |
| Paper | `#fffdf9` | Raised readable surfaces |
| Blue | `#2457ce` | Navigation, selected controls and neutral data emphasis |
| Electric | `#8fb7ff` | Focus on dark ground and map detail |
| Flame | `#f05b40` | Urgency, report and the single strongest next action |
| Cyan | `#66c5d5` | Care and ARV information |
| Quiet line | `#c4ccd6` / contextual alpha | Separators, never decoration |

Flame means attention or an irreversible primary action; it is not a default
accent. Purple gradients, glowing borders and glass panels are not StrayPaw.

### Type

- **DM Sans**: interface, tables and field forms.
- **Instrument Serif**: an animal name, a page question or a consequential
  number — never a dense data table.
- **DM Mono**: IDs, dates, coordinates, labels and compact metadata.
- Default readable text is 16px; operational labels are 14px or more. Mono
  may be 11–12px only when it is secondary metadata.

### Spacing and shape

Use a 4px rhythm: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72`.

- Working content has a 24px desktop gutter and 16px mobile gutter.
- A panel is a bordered surface (`12–16px` radius); a control is a compact
  object (`8–12px` radius or a capsule where it reads as a filter).
- Do not use a grid of unrelated cards when a list, table, map or chronology
  represents the information more truthfully.

## Layout rules

### Community atlas

The map owns the viewport. City, layer and filter controls remain reachable
without obscuring the map. A selection opens a contextual inspector; on mobile
it is a bottom sheet that can be dragged between a compact summary and detail.
Opening an animal should preserve city, layer, filter and map context so Back
returns a person to the same place.

### NGO work surface

Use **queue → selected record → action**. Tables are scanable, with a sticky
header, stable columns, keyboard focus and one active row. A right inspector
contains status, history and next action; opening a detail page never removes
the organisation's navigation or breadcrumbs.

### Municipal command surface

Use **place → layer → comparison → underlying record**. The city selector,
coverage/ABC/ARV/case layers and time comparison belong at map level. State
claims must use “recorded” language. Empty or thin coverage is an explicit
finding, never visualised as zero animals.

### Animal records

Lead with available photography, identity, status and locality. Make the
chronology readable as a continuous timeline: sighting, case, care,
sterilisation/vaccination and outcome. Unknown is hatched/labelled “not
recorded”; it is never converted into no.

## Surfaces and data density

- One lifted object per focal region; most structure comes from whitespace,
  rules and typographic hierarchy.
- Tables use row affordances, not card stacks. On small screens, preserve the
  record label, status and next action; move secondary columns inside the row.
- Drawers/inspectors are contextual, not a second dashboard. They must close
  with Escape, include a visible close control and retain selection state.
- Loading states use the shape of incoming content. Empty states explain the
  current scope and offer the single appropriate next action. Error states say
  no data changed and offer retry.

## Map controls and mobile rules

- Map controls have 44px minimum touch targets on coarse pointers.
- Show four high-frequency layers directly; place specialist layers under
  “More”. Never clip a control row.
- A mobile inspector has `peek` and `open` states. The grip is draggable and
  draggable distance must not accidentally pan the map.
- Phone flow is map → tap cell/density/animal → compact sheet → detail. The
  sheet hides only when an individual animal picker is intentionally opened.
- At 200% text size, controls may wrap vertically but cannot overlap or leave
  a page horizontally scrollable.

## Motion grammar

- Transition only to explain state: selected row, map camera, sheet expansion,
  filter reveal and completed submission.
- Default: 160–220ms, `cubic-bezier(.23,1,.32,1)`. Map camera may be longer
  because it communicates geographic distance.
- Do not animate decorative numbers, use infinite motion, or delay primary
  data. Honour `prefers-reduced-motion` by removing nonessential movement.

## Accessibility and trust

- Keep AA contrast for text and visible keyboard focus on every interactive
  element.
- Use semantic headings, buttons for state changes, labels for inputs and
  status regions for async feedback.
- Never expose a precise animal location where the record promises a cell.
- Preserve real source, date and status. Imported data remains identifiable as
  imported; no synthetic individual animal or operational outcome is implied.
