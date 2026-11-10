# StrayPaw product design system

## StrayPaw 4.0: the authoritative specification (3 November 2026)

This section governs every surface after the homepage hero. Where any older
note below conflicts with it, this section wins; the older notes are kept as
history only. The homepage hero, landing sections and scripted hero demo are
out of scope for this system and are not to be redesigned.

**Benchmark.** GovDash for composition, density, hierarchy and polish. We adopt
its principles, never its branding or code. StrayPaw's identity is the
white-and-blue ground, Kaju, and an institutional, evidence-first voice.

### 0. StrayPaw 5 amendments (9 November 2026)

These replace the matching lines of 4.0 below. Evidence and reasoning:
`docs/sp5/REDESIGN-2026-11-09.md`.

- **Homepage is in scope.** It tells the platform story in this order:
  what StrayPaw is, who works with it, the problem, the five steps, the
  package from both sides, the audit trail, Kaju, results, the pilot.
  StrayPaw is the platform; Kaju is its agent. No pop-over may cover the
  product window.
- **One frame.** Every workspace page shares one column: 32px gutter
  (16px phone), up to 1240px, title on the same edge as its tabs and
  table. Page wrappers never add a second gutter. Full-bleed pages (work
  queue, maps) align their header to the same gutter.
- **No glow.** The app ground is plain white. No drifting gradient and no
  pointer light behind pages; depth is for things that float.
- **One name per place.** The sidebar label, breadcrumb and page title of
  a place are the same words (Work queue, Intake, Animals, Treatment &
  sign-off, Release evidence, Data quality). Phone tabs use the same
  names.
- **Sidebar icons** are one family: 16px line icons at 1.75 stroke. No
  coloured tiles. Section labels are quiet text without rules.
- **Back** appears only on a record or form (a page below a named place).
  Named places are reached from the sidebar, tabs and breadcrumb. Section
  tabs do not appear on a record.
- **The record line** is StrayPaw's motif: one thin blue line with a node
  per step. It is the homepage's chapter rail and reading bar and the
  pipeline on NGO Today. Use it for sequence; do not decorate with it.
- **One object per idea.** A section or dashboard is one framed surface
  (hairline `#dfe5f1`, radius 16 in the app and 20 on the site, ground
  `#f5f7fb` where a product screen sits) divided by hairlines. Do not set
  related things as separate floating cards.
- **Phone shell.** Top bar: workspace name, search, account. Thumb bar: at
  most three places, one action, Kaju, More. Never a second menu button.
- **Entry.** Sign-in is one column with three plain doors; the side panel
  shows the record line and the four roles, never product news.
- **First run.** One sheet per role with three jobs in order; once per
  person, workspace and device; reopen from the account menu.
- **Stat strips on a phone** are a list (label left, count right, 48px
  rows), never five squeezed tiles. An unread count says "not read" at
  text size, never at figure size.

### 1. The one test
On any dashboard a person must see within five seconds: where they are (title
and breadcrumb), what matters now (the few numbers that need a decision),
what they can do (one primary action, verbs on rows) and what happens next
(the next step named on each record).

### 2. Foundations
- **Colour.** Ground and surfaces pure white `#ffffff`; quiet fill `#f5f7fb`;
  hairline `#e4e8f0`. Ink `#0b1e3d`, body `#4a5568`, muted `#6b7486`. Blue
  `#2457ce` is selection, primary action and neutral data. Flame `#f05b40`
  only for urgency and Report. Green `#1f7a4d` only for accepted/complete.
  Amber `#d08a1d` only for waiting/overdue. No cream, no paper, no dark
  page grounds. A faint drifting blue glow sits behind app pages (off under
  reduced motion and on map pages).
- **Type.** One family in the app: Inter, the face of the app shell and the
  website's product window (`--s3-sans` in `src/sp/shell/app4.css`); DM Sans
  remains on public pages. No serif, no italics.
  App page title 28-32px/500; section title 15-16px/500; body 14px;
  meta 12-12.5px. Numbers use tabular figures.
- **Space.** 4px grid. Page gutter 32px desktop, 16px phone, identical for
  tabs, headers and tables so everything lines up with the sidebar edge.
- **Shape.** Radius 8 (controls), 12 (cards), 999 (chips). Hairline
  borders, shadow only on things that float (menus, drawers, toasts).

### 3. Components (fewer, better)
- **Page header:** title, one-line purpose, at most one primary and one
  secondary action on the right. Never a second "New case" when the top
  bar has one.
- **Stat strip:** 3-5 real, permission-scoped counts that open the filtered
  list they count. Unknown shows "not read", never zero.
- **Table/list:** one row per record, primary label, short code
  (`shortCode()`), status chip, owner, age, row verb. Max 20 rows per page,
  pager top-right of the footer.
- **Tabs:** underlined text, sub-pages of the current sidebar place only.
- **Chips:** filters and status only.
- **Empty / loading / error:** one sentence of fact plus one action;
  skeletons match the final layout; errors never show zero.
- **Destructive actions:** a visible Delete on anything a person or Kaju
  added, with a confirmation that states the consequence; deletions are
  archived and can be restored by an admin.

### 4. Navigation
- **Site header:** at most five groups (Product, Solutions, Proof, Research,
  Learn & Community) plus Sign in/Open app and one CTA (Book a demo).
- **NGO sidebar:** Today, Work queue, then the five steps numbered
  (1 Receive, 2 Register, 3 Treat, 4 Release, 5 Submit), then Organisation
  and one "More". Advanced tools live in tabs and on records, not in the
  sidebar.
- **Government sidebar:** From NGOs (Review submissions, Contracts & rates),
  then Oversight (Wards & map, Overview, Programmes, Reports).
- **Phone:** thumb bar of four places plus Kaju; everything else in the
  sections sheet. Touch targets 44px.

### 5. Kaju
Kaju is the Explorer puppy (KAJU_CHARACTER.md), never redrawn. One "Ask Kaju"
button in the top bar, his corner in the sidebar, the docked panel on any
page. He prepares; people confirm. Every action card says exactly what will
change and is saved through the normal audited RPCs. No paid inference
unless the owner enables it; no automatic clinical approval.

### 6. Motion
Motion explains a state change: panels slide 200-260ms on
cubic-bezier(.2,.7,.2,1); lists rise in with 40-50ms stagger; hover lifts 1px;
selection fills blue. Kaju's sequences come from `src/kaju/poses.ts`. No
typed tricks or joke copy; this is professional software. Everything
respects `prefers-reduced-motion`.

### 7. Voice
Plain English for low tech- and AI-literacy users in India. Verbs on
buttons ("Prepare the October package"), facts in sentences ("2 animals are
missing a release photo"). Never developer words (backend, RPC, migration,
schema), never "Lorem", never placeholder descriptions. Honest labels:
"Product demo", "Not connected", "imported record", "illustrative contract".
Acceptance is not payment; never imply a claim was paid.

---

## History (superseded where it conflicts with 4.0)


> **StrayPaw 3.0 (31 October 2026) supersedes the notes below where they
> conflict.** One system across the site, sign-in and app
> (`src/sp3/sp3.css`; app tokens re-pointed in `src/sp/shell/app3.css`).
>
> * **Ground** warm off-white `#fbf9f4`, white surfaces, hairline rules
>   `rgba(11,30,61,.09)`. No folk backdrop, paper fibre or night posters in
>   working screens; museum art stays for empty states and portraits.
> * **Colour** ink `#0b1e3d` text; blue `#2457ce` is the primary action and
>   selection; flame `#f05b40` only for urgency and Report; teal for care.
> * **Type** DM Sans only. Page titles are product-sized (26–34px in the app,
>   up to 76px on the marketing hero). No serif, no italics.
> * **App shell** (`src/sp/shell/Shell.tsx`): sidebar with workspace
>   switcher, Quick actions (⌘K), Ask StrayPaw AI (⌘J), workspace nav, other
>   pages in collapsible groups, account at the foot; thin top bar with
>   breadcrumb, search, AI and the one primary action. Phones keep the thumb
>   bar plus an AI tab. Workspace order: Municipality, NGO, Community,
>   Education.
> * **StrayPaw AI** docks on the right or runs full screen at `/assistant`;
>   answers carry tool runs and source links; changes are cards with
>   Confirm, saved through the normal RPCs.
> * **Honesty labels**: demos say "Product demo", integrations show live
>   status, imported data is labelled as imported.
>
> Route-by-route status: `docs/sp3/ROUTE-MATRIX.md`.

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
  static under reduced motion. Do not delay primary data: an app figure
  appears at its true value; it may only travel when its value *changes*
  (`Tally`, retarget). Count-up from zero is for marketing and reels only.
  Honour `prefers-reduced-motion` by removing nonessential movement.
- The full system (tokens, the techniques taken from awesome-ai-motion and
  where, what was refused, and the Instagram reel pipeline) is in
  [docs/MOTION.md](docs/MOTION.md).

## Accessibility and trust

- Keep AA contrast for text and visible keyboard focus on every interactive
  element.
- Use semantic headings, buttons for state changes, labels for inputs and
  status regions for async feedback.
- Never expose a precise animal location where the record promises a cell.
- Preserve real source, date and status. Imported data remains identifiable as
  imported; no synthetic individual animal or operational outcome is implied.
