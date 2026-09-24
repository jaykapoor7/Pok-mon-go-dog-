---
name: straypaw-design
description: The permanent frontend design system and visual judgment for StrayPaw — tokens, shape, type, colour, motion, responsive rules, and a hard list of what this product never does. Use for ANY visual or frontend work on this repo: new pages or components, restyling, layout, spacing, "make this look better", design review of a diff, or deciding what a screen should look like before writing it.
---

# StrayPaw Design

StrayPaw is a shared record of India's street animals. Residents report what they
see, NGO field teams work those reports into cases, drives and care history, and
the map shows which roads have actually been covered. NGO staff use it on a phone,
outdoors, one-handed, often on a bad connection.

That sentence is the whole design brief. The product is **civic infrastructure for
field work**, not a SaaS dashboard. It should feel closer to a well-made survey
instrument, a transit map, or a census form than to a startup landing page.

## Rule 1 — simplify before you decorate

**Always establish hierarchy first. Decoration is the last step and is usually
unnecessary.**

When a screen looks wrong, the cause is almost never a missing gradient. In this
codebase it has been, in order of frequency:

1. Too many competing surfaces — everything is a card, so nothing reads as primary.
2. No type hierarchy — three sizes doing one job, or one size doing three.
3. Inconsistent spacing — values typed per-component instead of taken from the scale.
4. Inconsistent shape — measured once at ten different corner radii across 107 controls.
5. Only then: the thing actually lacks visual interest.

So the order of work is fixed:

**remove → group → set hierarchy → align to the scales → only now consider adding.**

If a change adds a visual element without removing or subordinating something else,
stop and re-read this rule. A page that got quieter and clearer is a successful
change even if nothing was added.

## The visual language

Everything on screen should trace back to the subject: **animals, location, mapping,
field work, evidence, population data, outcomes, infrastructure.**

Draw from cartography and civic record-keeping:

- **Coordinates, wards, localities, routes, coverage.** Place is the product's
  organising idea. Prefer a locality name, a ward, a distance, a route over an
  abstract label.
- **The register.** Rows, ledgers, record numbers, dates, "who filed it". The
  aesthetic of a thing that is kept rather than published.
- **Survey and census instruments.** Tick boxes, counts, sample sizes, confidence,
  "not examined" as a real category distinct from zero.
- **Field signage and instruments.** Legible at arm's length in sunlight, high
  contrast, monospace where a figure must be read exactly.
- **Absence as information.** A ward with no data is not a ward without need.
  Unknowns are drawn, labelled and never silently counted as zero — this is a design
  rule, not just a data rule, and it is one of the few things that makes this product
  trustworthy.

Illustration, when it is needed at all, is **drawn or photographic, never stock**:
real photographs of real recorded animals, contour fields, simplified ward geometry,
hand-drawn diagrams of a real workflow.

## Tokens — the single source

Everything lives in `src/app/tokens.css`. **Never type a raw hex, spacing value,
duration or radius into a component.** If a value you need is missing, add it to
`tokens.css` with a comment explaining what it is for, then use it.

### Colour

```
--sp-ink #0b1e3d   headings, and the dark ground
--sp-deep #071630   one step darker: the footer
--sp-body #42526b   running text on light
--sp-muted #5d6b7c   labels, captions, secondary
--sp-paper #fffdf9   panels and cards (warm white, never #fff)
--sp-bone #f4eee5   the warm light section ground
--sp-shell #eae0d2   one step down, for alternating sections
--sp-ground #f3ede4   the console's page ground
--sp-line #e3d9ca
--sp-flame #f05b40   restrained orange, on dark grounds
--sp-flame-deep #d4421f   headlines and figures on light
--sp-ember #a8300f   small text on light — 4.5:1 on bone
--sp-blue #2457ce   THE action colour
--sp-blue-deep #1b46b0   pressed, heavy weights
--sp-sky #8fb7ff   cool support on dark
--sp-deepsky #2f57a4   cool support on light
```

**Discipline.** Warm white is the ground, blue is the action, orange is the accent —
and orange is *restrained*, which means it marks one thing per view, usually the
single most important action or figure. Orange everywhere is the fastest way to make
this look like a generic product. Two hues plus neutrals is the working limit.

**Never pure white and never pure black.** The ground is warm; `#fff` reads as a hole
in it.

### Space

`--sp-1 4` · `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 22` · `--sp-6 30` ·
`--sp-7 42` · `--sp-8 58` · `--sp-9 80`

Plus `--sp-gutter: clamp(20px,5vw,64px)` (the page edge, one value everywhere),
`--sp-section: clamp(56px,8vw,118px)` (between sections), `--sp-measure: 62ch`
(running text).

Whitespace is the primary design tool here. When something feels cheap, the answer
is usually more space around less content, not more content.

### Shape — two shapes, and the difference means something

```
--ctl-r 980px      an object you PRESS is a capsule
--ctl-r-row 10px   a ROW you SELECT is a rounded rectangle
--sp-radius 10px / --sp-radius-sm 7px / --sp-radius-lg 16px   containers
```

A capsule row reads as a lozenge floating in a column; a filed-off rectangle reads as
a rectangle. Keep the two apart and do not invent a third.

### Controls

```
--ctl-h-sm 36  --ctl-h 44  --ctl-h-lg 52     (44 is the touch floor)
--ctl-pad-sm 0 15px  --ctl-pad 0 20px  --ctl-pad-lg 0 26px
--ctl-fs-sm 13  --ctl-fs 14  --ctl-fs-lg 15  --ctl-fw 600
--ctl-press scale(0.96)
--ctl-tint rgba(36,87,206,.10)  --ctl-tint-hover rgba(36,87,206,.16)
```

Three button kinds, and no others: **primary** (solid blue, white label), **secondary**
(`--ctl-tint` fill with a blue label — *not* a white box with a grey outline, which
reads as disabled), **plain** (text only, for tertiary actions).

### Motion

```
--sp-ease cubic-bezier(.23,1,.32,1)      arriving, settling
--sp-ease-out cubic-bezier(.32,.72,0,1)  larger travel
--sp-ease-io cubic-bezier(.4,0,.2,1)     anything reversible
--sp-fast .16s  --sp-base .28s  --sp-slow .5s  --sp-scene .85s
```

## Typography

Three faces, already wired: **DM Sans** (`--font-sans`, the interface — everything
that is not one of the two jobs below), **Newsreader** (`--font-serif-stack`, the
editorial face, with exactly two jobs: the large figure a section is about, and the
one emphasis line under a headline — often italic), and **DM Mono** (`--font-mono`,
for data that must be read exactly — counts in a table, coordinates, cell codes,
dates, record IDs). `--font-display` is a name, not a face: it resolves to DM Sans.

- Monospace is **information, not decoration**. Use it where the reader needs to
  compare or transcribe a value. Never as a stylistic flourish.
- `font-variant-numeric: tabular-nums` on any column of figures, and on any number
  that updates in place, so nothing shifts sideways.
- One display face per view. The serif italic is a highlight; two of them on a screen
  cancel each other out.
- Headings get `text-wrap: balance`. Bind a short trailing phrase with `&nbsp;` when
  it would otherwise orphan under a large headline — this has bitten twice.
- Running text stays near `--sp-measure`.

## Surfaces — minimal, and earned

Border, fill, radius and shadow each say "this is a separate object". Spend them by
role. The failure mode is one radius and one shadow stamped on every block, which
flattens hierarchy and produces the floating-card look this product avoids.

- Prefer **rules, spacing and grouping** to boxes. A horizontal rule and 30px of
  space separates two ideas as well as two cards do, and costs no visual weight.
- **Lift one thing per view.** If three things have a shadow, none of them is
  prominent.
- A list is a list. Flush rows with a hairline between them beat a stack of cards.
- Lead with a big-figure tile only when that figure is the actual point of the screen.

## Motion — subtle and purposeful

Motion exists to explain a change of state, never to entertain.

- Every control gets exactly one press response: `--ctl-press` on `--sp-ease-io`.
- Things that arrive use `--sp-ease`/`--sp-slow`. Things that reverse use `--sp-ease-io`.
- Never animate a high-frequency action. Never animate on a keyboard action.
- Respect `prefers-reduced-motion`. framer-motion writes inline transforms via rAF, so
  a CSS media query never reaches it — `<MotionConfig reducedMotion="user">` in
  `MotionRoot` is what actually does this; keep new motion inside that boundary.
- If motion is the most noticeable thing about a screen, it is wrong.

## Responsive — phone is the primary target

NGO field staff use this on a phone, vertically, outdoors, one-handed. **Design the
390px view first and let the desktop view be the one that gets extra room.**

- Verify at **320, 360, 390 and 1280**. 320 is not optional; it is where headlines
  break badly.
- **Zero horizontal page overflow, ever.** Tables, code and wide diagrams each get
  their own `overflow-x: auto` container; the body never scrolls sideways.
- **44px minimum touch target** (`--ctl-h`). The global floor lives in the
  `@media (pointer: coarse)` blocks in `globals.css` — that rule out-ranks most
  per-component CSS, so it is the number that actually decides control size on a
  phone. Inline links inside a sentence are deliberately exempt (WCAG 2.5.8): padding
  a word out to 44px wrecks the line spacing around it.
- Side gutter of at least 16px at every width, set once on one wrapper.
- A table that cannot be read at 390px should become a list of records, not a
  horizontally-scrolling table with eleven columns.

## Never do these

Not style preferences — these are the specific things that would make StrayPaw look
like every other AI-generated product, and they are out of bounds:

- Generic AI-SaaS layout: centred hero, three feature cards, gradient headline.
- **Grid or dot-pattern backgrounds.**
- **Glowing blobs, aurora, radial glows.**
- **Excessive gradients.** Illustrative gradients *inside* drawn SVG artwork are fine;
  gradients on UI chrome are not.
- **Glassmorphism**, backdrop-blur panels, frosted overlays.
- **Floating cards everywhere.** See "Surfaces".
- **Excessive rounded rectangles.** Two shapes only.
- **Random decorative icons.** An icon must name a real thing in the workflow. An icon
  beside a heading purely for texture is decoration — cut it.
- **Stock SaaS illustration** — the isometric-people, blob-character, undraw look.
- **Over-animation.** Scroll-triggered everything, parallax for its own sake,
  staggered reveals on every list.
- Emoji as section markers. Everything centred. `rounded-lg` on everything.
- Copy that undersells the organisation: team size, apologies, "beta", "work in
  progress". Professional organisational tone throughout.

## Data and honesty are design constraints

- **No invented data anywhere**, with one standing exception: the landing page's
  illustrative console mock, which must be labelled as sample. Everything else reads
  the live register and draws thin when the register is thin.
- Any figure in a graphic needs a real, citable source.
- Sparse data is the normal case. Design the empty and near-empty state *first* — a
  new NGO partner's day one is an empty workspace, and that screen is the first
  impression the product makes. An empty state should say what to do next, not shout
  the absence.
- "Not examined" is drawn as the unfilled part of a shape, never as a third colour and
  never as a bare integer beside two others, which reads as a scoreboard.

## Data and space

The register is drawn in one visual language wherever it appears — the landing
plate, the map, analytics, a profile, a dashboard — so a reader learns each
encoding once. The code for it lives in `src/lib/spatial` (dataset, builder,
engine, measures) and `src/components/system` (Hatch, ShareBand, Figure, Spark,
ScaleLadder, HexPlate); reuse them rather than drawing a second version.

**The unit of place is one H3 cell at resolution 8 (≈0.74 km²).** The same cell
appears on the landing plate, the map, in analytics filters and on a profile.
In public, nothing is placed finer than its cell: a record's dot is drawn at a
fixed point *inside* its cell, never at an address.

**One dataset, never rows.** Screens read the compact dataset from
`/api/spatial` (cached, flat integer tuples, ≈90 KB gzipped for the whole
register) and compute with the pure functions in `engine.ts`/`measures.ts`.
Never ship every animal row to the browser. An organisation's view is the same
dataset built with the member's own token, so RLS decides what it holds.

Encodings — these meanings are fixed:

- **Recorded density: sequential blue**, light to deep (`--sp-seq-*`, `--sp-nseq-*`
  on night). More is always darker. Nothing else uses this ramp.
- **Attention: flame** (`--sp-flame`, `pal.att`) — injured, open, critical. It
  marks what needs someone, never decoration.
- **Not recorded is hatched** (`<Hatch>`, ShareBand `hatch: true`, the map's
  `hatch-*` pattern). Never a colour, never zero, never omitted. A share is drawn
  as the recorded part *inside* the whole, at its real size, with the rest hatched.
- **Not mapped is a dashed edge.** The honeycomb carries on one ring past the last
  record, so the end of the data never reads as the end of the city.
- **Coverage is ink weight, not hue** — well / partly / weakly mapped, too few
  records, not mapped — so it can never be read as density. Thresholds live in
  `coverageOf()`; use `COVERAGE_TEXT` for the words.
- ARV is teal (`--sp-arv`), feeding points ochre (`pal.feed`). Neither is a warning.

Words that go with them, always: **"Recorded animals, not population."** A light or
empty place is "not recorded" or "not mapped", never "no dogs", "low need" or "safe".

**Sparse public places read "few".** On public screens, a count of one or two for a
cell or locality prints as *few* (`fewOr(n, isPublic)`, `FEW = 3`). A share over
one or two animals is not drawn; a fixed small mark says "recorded here" instead.
Members of the organisation that holds the records see exact numbers.

**Time.** Day zero is 2000-01-01 and `-1` means "no date". Every clock starts at
`robustStart()`, where the record really begins. Stray early dates are folded
into the first month and never dropped. Future-dated records are left out of
anything drawn over time and counted as an evidence issue. Time-to-resolution
uses recorded resolution dates on cases closed after field work only. An
imported date that had to be assumed is counted and excluded, never averaged in.

**Map ↔ analytics contract.** Both read the same URL state, so a place chosen in
one opens in the other: `/map?mode=&city=&q=<locality>&cell=<h3>&m=<month>&lens=`
and `/insights?city=&q=&cell=` (`/partner/reports` for an organisation).

**Grounds.** `NIGHT` (the map and landing plate), `PAPER` (daylight), `PLATE` (night
with no borrowed lettering) in `components/map/basemap.ts`. Data draws first; the
streets are slid in underneath and may never block it. A graticule on a map is
information; a grid behind a page is decoration.

`npm run test:spatial` runs the builder and engine on a synthetic city; extend it
when a rule above changes.

## Verify by measuring, not by eyeballing

This is the habit that has caught every real bug in this codebase. Claims about the
rendered result must come from the rendered result.

- Run the **production** build (`npx next build && npx next start`), not just dev — dev
  and prod have diverged here before. Never run a build while a dev server is using
  the same `.next`; it corrupts the output and every route 500s.
- Drive it with Playwright: `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"`.
- Read **computed styles and bounding boxes**, not the CSS you just wrote. When a rule
  does not take effect, enumerate `document.styleSheets` and find which selector
  actually wins — a global `button:not(.skip-link)` has silently out-ranked
  per-component rules here.
- `scripts/contrast-audit.mjs` for contrast. A white card on a white ground measured
  1.00 and shipped, because it looked fine in a screenshot.
- Check overflow at all four widths and count undersized tap targets before claiming a
  phone layout is done.

### Known traps in this codebase

- **CSS custom-property cycles** (`--x: var(--x)`) are invalid at computed-value time
  and discard the *entire declaration* — not a fallback. One killed six transitions.
- **Specificity**: `html .spa.spa .spa-side a` (0-4-2) beats almost anything you will
  write. Check before assuming your rule applies.
- `height` beats `min-height`; raising a touch target sometimes means changing the
  explicit height.
- An absolutely-positioned pseudo-element with `right:auto;bottom:auto;width:auto`
  collapses to 0×0 and paints nothing while its computed styles look correct.
- `useSearchParams()` needs a `<Suspense>` boundary or `/_not-found` prerender fails
  **intermittently**.

## Definition of done

- [ ] Something was removed, grouped or subordinated — not only added.
- [ ] Every colour, space, radius, duration comes from a token.
- [ ] Two shapes only: capsule for press, `--ctl-r-row` for select.
- [ ] One primary action per view; orange marks at most one thing.
- [ ] Verified at 320 / 360 / 390 / 1280, zero horizontal overflow.
- [ ] Every control ≥ 44px on a coarse pointer.
- [ ] Motion is reversible, tokenised, and inside the reduced-motion boundary.
- [ ] Nothing from the "Never do these" list appeared.
- [ ] Empty and sparse states designed, not just the full one.
- [ ] Every visual element traces to animals, location, field work, evidence or
      outcomes. If it traces to nothing, it is decoration — cut it.
