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
> * **One sheet, not cards.** Every page sits on a single white sheet over
>   the folk ground (`shell/calm.css`, loaded last). Inside it nothing is
>   boxed: the header, figures, panels, tabs and sections are separated by
>   whitespace and hairline rules (`--hair`); figures are one row divided by
>   hairlines; tabs are underlined text. Only things that float (map
>   pop-ups, sheets, menus) keep a shadow, maps keep a thin frame, and a
>   phone swipe deck keeps light card edges. Do not add bordered cards.
> * **No plain panels, no AI tells.** The sidebar and More sheet carry a
>   dotted paper ground, a painted vine and "Latest on the record" (real
>   entries, honest pulse). No serif, italics, coloured emphasis words,
>   decorative line grounds, glows or 80%-black scrims; copy avoids em-dash
>   asides and template phrasing.
> * **Colour.** Ink `#0b1e3d` for text, blue `#2457ce` for selection and
>   neutral data, flame `#f05b40` for urgency and the one primary action
>   (Report). Dark blue grounds are kept for small accents, never whole pages.
> * **Type.** One face: DM Sans. No italics, no serif, no spaced mono
>   capitals. Weight and size carry hierarchy.
> * **Space and main site are always one tap away.** The space switcher sits
>   at the top of the sidebar and, on a phone, in the top bar; its menu also
>   holds "Main site" and the introduction. The More sheet lists the space's
>   own pages that do not fit on the tab bar first.
> * **Areas are round.** H3 cells are drawn as inset circles
>   (`lib/spatial/round.ts`: `roundRing`, `roundCell`); no hexagons anywhere
>   in the app, including fallbacks (`HexPlate round`).
> * **Map.** It is called the map, never "Atlas", in every label. On the
>   India map, zooming in near a city (zoom ≥ 8.5) enters that city at the
>   same view, so its areas and then its animals appear without a click;
>   zooming back out (below 6.5) returns to all of India, and panning to
>   another city while zoomed in switches to it. One continuous map, never a
>   locked city. The map is flat by default; 3D columns appear only when the
>   3D button is pressed (`?view=3d`).
>   `LiveMap` on a daylight basemap with an easy zoom ladder:
>   choropleth → counts per area → one dot per recorded animal from z 12.6
>   (fetched per visible area from `/api/spatial/patch`). Selection is a
>   small card pinned to the map, not a side panel.
> * **No photograph.** `FolkPortrait` shows a crop of a real Indian dog
>   painting (Cleveland Museum of Art Open Access, CC0): the Rajasthani "Dog
>   with pups" (c. 1780) and three 1890s dog studies. Fixed per record id,
>   puppies get a painted pup, captions credit the work and say it is not a
>   likeness. A real photograph always replaces it.
> * **Sourced art.** Every image under `public/art` is a real, openly
>   licensed artwork listed in `lib/art/sources.ts` and on `/art-credits`:
>   CC0 museum works and Gond paintings from Wikimedia Commons (CC BY-SA /
>   CC BY, cut out of their paper and shared under the same licence). It
>   appears in the backdrop (animals on the hills, a hoopoe by the sun, a
>   painted dog walking like a paper puppet, falling petals), dashboard
>   banners, empty states and the corner of page headers on desktop. Never
>   generated art, never a photo whose painting's own copyright is unclear.
> * **Sensitive photos.** A photo that may show an injured animal starts
>   blurred with "Tap to view" (`ui/SensitiveVeil`, rules in
>   `lib/sensitive-photo.ts`): reviewed/flagged photos (`photo_sensitive`),
>   animals needing help, and every case, fundraiser and incoming-report
>   photo. Reports describing an injury, or a photo the photo check sees a
>   wound in, are flagged on approval. The landing never shows one.
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
