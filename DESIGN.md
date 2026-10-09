# StrayPaw product design system

> **Current system (October 2026).** Everything after "Open App" runs in one
> shell (`AppShell`, `.sx.sd` root) with its styles layered
> `shell.css` → `dark.css` → `paper.css` → `record.css`. `paper.css` is the
> live palette: it re-points the `--d-*` tokens to a light ground, so new work
> uses those tokens rather than literal colours. See `docs/REINVENTION.md` for
> the architecture and verification notes. Where this file and the code
> disagree, the code wins.
>
> * **Ground.** Cream paper (`#f4efe6`) under white cards. The ground is never
>   plain: `FolkBackdrop` paints slow clouds, a sun, birds, hills and a
>   trotting dog behind every app page (static under reduced motion).
> * **Cards.** Any container with a `.dh` header gets a full dashboard frame:
>   white sections with `--card-b` borders, `--card-r` radius and `--card-sh`
>   shadow. One frame language across Community, NGO, municipality, admin and
>   the in-app site pages (`MarketingPage inApp`, `MarketingShell inApp`).
> * **Colour.** Ink `#0b1e3d` for text, blue `#2457ce` for selection and
>   neutral data, flame `#f05b40` for urgency and the one primary action
>   (Report). Dark blue grounds are kept for small accents, never whole pages.
> * **Type.** One face: DM Sans. No italics, no serif, no spaced mono
>   capitals. Weight and size carry hierarchy.
> * **Areas are round.** H3 cells are drawn as inset circles
>   (`lib/spatial/round.ts`: `roundRing`, `roundCell`); no hexagons anywhere
>   in the app, including fallbacks (`HexPlate round`).
> * **Map.** `LiveMap` on a daylight basemap with an easy zoom ladder:
>   choropleth → counts per area → one dot per recorded animal from z 12.6
>   (fetched per visible area from `/api/spatial/patch`). Selection is a
>   small card pinned to the map, not a side panel.
> * **No photograph.** `FolkPortrait` draws a seeded folk illustration per
>   animal (pose, ears, markings, sky), smaller for puppies and small dogs,
>   always labelled as an illustration. A real photograph always replaces it.
> * **Names.** `lib/animal-name.ts`: a given name if a person gave one,
>   otherwise the short StrayPaw tag; the subtitle describes the record
>   ("Female · medium", "Male puppy") and the short place. Never "Dog near…".
> * **Phone.** Thumb bar with Report at the centre and a short, settings-style
>   More sheet. Pages stay within about two screens: `PhoneTabs` and
>   `PhoneFold` split long content, dashboards and insights become swipe
>   decks, long lists cap or slide sideways.
> * **Moderation.** `/moderate` shows one report at a time with its automatic
>   checks. Reports that pass every rule in `lib/auto-approve.ts` and, when an
>   Anthropic key is set, the photo check in `lib/photo-check.ts` (an animal
>   is visible, no face, plate or address) go live on their own. Anything
>   else waits for a person. The photo check fails closed.

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
| Ink | `#0b1e3d` | Primary text and strong boundaries |
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

- **DM Sans** for everything in the app: titles, interface, tables, IDs and
  dates (tabular numerals for comparisons). No italics and no second family.
- Default readable text is 16px; operational labels are 14px or more.
  Small text (11–12px) is only for secondary metadata.

### Spacing and shape

Use a 4px rhythm: `4, 8, 12, 16, 20, 24, 32, 40, 56, 72`.

- Working content has a 24px desktop gutter and 16px mobile gutter.
- A panel is a bordered surface (`12–16px` radius); a control is a compact
  object (`8–12px` radius or a capsule where it reads as a filter).
- Do not use a grid of unrelated cards when a list, table, map or chronology
  represents the information more truthfully.

## Layout rules

### Community atlas

The map owns the viewport. It is light and quiet, areas are round, and
individual animals appear as dots only once a person zooms into a
neighbourhood. City, layer and filter controls remain reachable
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
recorded”; it is never converted into no. Without a photograph the record
shows its `FolkPortrait`, labelled as an illustration.

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
- A phone page stays within about two screens; split it with `PhoneTabs`
  or `PhoneFold` rather than stacking.
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
- The folk backdrop is the one ambient motion: slow, behind content, and
  static under reduced motion. Do not animate numbers or delay primary data. Honour `prefers-reduced-motion` by removing nonessential movement.

## Accessibility and trust

- Keep AA contrast for text and visible keyboard focus on every interactive
  element.
- Use semantic headings, buttons for state changes, labels for inputs and
  status regions for async feedback.
- Never expose a precise animal location where the record promises a cell.
- Preserve real source, date and status. Imported data remains identifiable as
  imported; no synthetic individual animal or operational outcome is implied.
