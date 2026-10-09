# StrayPaw post-app reinvention

Branch: `claude/straypaw-reinvention`. No production deployment, no database
migration and no write to any operational record. The landing page, its hero
and its marketing navigation are unchanged.

Before/after renders of public routes (1440px and 390px, live data):
`docs/reinvention-renders/`. Private NGO renders were made against a local
harness and are deliberately not in the repository.

## Why the previous rounds felt half-baked

The app was five stylesheets stacked on top of one another (`app.css`,
`editorial.css`, `desk.css`, `institution.css`, `street-os.css`), each
overriding the last with selectors like `html .spa.spa.spa.spa-desk`, forcing
`border-radius: 0` everywhere and setting most labels in spaced mono capitals.
Two navigation bars, a breadcrumb strip and a "Switch space" control sat above
every page. And the brand faces named in `DESIGN.md` — DM Sans, Instrument
Serif, DM Mono — were never loaded: every screen rendered the device's system
font. The landing page's quality came from a different, dark, cinematic ground
that the product abandoned the moment someone pressed Open App.

## Product architecture

One shell, three audiences, purpose-built surfaces.

| Space | Destinations (bar) | Primary action |
|---|---|---|
| Community | Nearby · Atlas · Saved · Stories · Insights | Report a dog |
| NGO workspace | Today · Cases · Animals · Field · Map · Reports | New case |
| Municipality | City brief · Atlas · Analysis · Programmes · Partners | — |
| Feeder / Educator | their own home + shared record | Report a dog |

* **Shell** (`components/app/AppShell.tsx`, `components/shell/*`): a single ink
  bar continuous with the landing navigation — space switcher, destinations,
  search, primary action, account. The long tail (an NGO's 20 secondary tools,
  other spaces, language, feedback, main site) lives in a space menu on
  desktop and a More sheet on phones. Shared routes keep the space you came
  from (a municipal officer who opens the Atlas stays in the City space).
* **Search** is a command palette (⌘K, Ctrl-K or `/`) over StrayPaw IDs,
  live city registers, places, wards/districts and organisations.
* **Phone**: thumb bar with the primary action at its centre; non-destination
  pages get a back button in place of the wordmark.
* **Fonts**: DM Sans, Instrument Serif and DM Mono are loaded with `next/font`
  and applied on the app shell only, so the landing renders exactly as before.

## Surfaces

| Route | What changed |
|---|---|
| `/app` Nearby | No more empty "Where do you walk?" gate. Opens on your saved place, or on the most recently active city (labelled as such), with its streets at night and recorded animals lit within their cells. Then: who needs someone, who is on the record nearby, the one useful ask, what was followed through, and a bridge to the Atlas. |
| Animal tiles | New `AnimalTile`: fewer than 1 in 200 profiles has a photograph, so a missing photo is a typographic record plate (place known by, ID) instead of a repeated placeholder. Real photographs always lead. |
| `/map` Atlas | Night cartography continuous with the landing plate. One rail that changes with scale — national index → city Lens readout → cell inspector — replacing five floating panels and a bottom register. India is source-aware: each city is coloured by the kind of record it holds (rescue, campaign, clinical, photo, place register) and hollow where every record shares one city location. Scale ladder, city finder, four Lenses, representation and Time & filters in the rail; tools on the map edge; a peek/open sheet on phones that never sits under the tab bar. At cell scale the animals are listed first. |
| `/dog/[id]` | Dossier: portrait or record plate on night ground, identity and status, four care facts hatched where unknown, history as a year-grouped spine, "not yet on the record" gaps each with the action that fills it, recorded area and provenance alongside. |
| `/partner` Today | Live summary sentence, queue with triage marks and Critical / Overdue filters beside the open-work map, decisions waiting (stale cases → review), tasks, camps, what changed. Signed-out and day-one states explain queue → record → action. |
| `/municipality` | Was the Atlas behind a sidebar. Now a City Brief: evidence kind and precision, qualified citywide totals, where recorded activity concentrates by locality (from full cell totals), what requests are about, monthly change, where the record is thin, a sortable comparison of every city register, and an explicit "what this brief cannot tell you". |
| `/insights` | Place header with scoped measures, period control, findings register with the lead finding raised. |
| `/report` | A live draft receipt beside one question at a time, with labelled progress. The existing five-step logic and submission path are untouched. |
| Secondary routes | `DeskHeader` (used by ~40 pages) is now a paper header in the brand type; legacy buttons are capsules; mono capitals are sentence case; NGO sub-views are an underline register; case file, case desk and intake use the working face with a sticky decision column. |

## Evidence contract (unchanged, re-applied)

Counts come from live responses. Recorded profiles are never called a
population; imported `no_action` is not a verified gap; unknown is hatched,
never "no"; Jamshedpur is a single city location with no street detail;
Ranchi is a campaign footprint; H3 cells are not wards; public positions are
never finer than a cell; sample-derived figures say they are loaded detail.

## Verification

* `tsc --noEmit`, `eslint src`: clean. `npm run build`: passes.
* Regression scripts pass: spatial, no-full-register, public-map-footprint,
  bounded-supabase-fetch, record-dates, location-cell, case-input-validation.
* Production server renders of 12 public routes at 1440 and 390px: HTTP 200,
  zero document overflow. 320 and 360px overflow checks on Nearby, City brief,
  animal profile, Report and Insights: zero.
* Scripted journeys (desktop + phone, production build, no page errors):
  India index → city; Cases and Care Lenses update representation and URL;
  filters open and close with Escape; ladder back to India; browser back
  restores the city; cell lists animals → animal dossier; ⌘K palette finds a
  city and closes on Escape; space switcher → City brief and the space persists
  onto the Atlas; report advances a step without submitting; phone rail peeks,
  expands from its grip and sits above the tab bar; Atlas and tab-bar targets
  are ≥ 40px; More sheet opens and closes.
* NGO screens (Today, cases, case file, intake, animals, field, drives,
  projects, quality, records, review, import, team, settings, reports, map)
  were rendered with a local-only Playwright harness: an injected fake session
  whose Supabase REST calls are answered from a compact fixture of real
  Pawsome rows read with admin SQL. Nothing was written. Screenshots stay in
  the session scratchpad.

## Not verified, or not finished

* **No real member sign-in.** NGO layouts were checked with the harness above,
  so membership checks, RLS-scoped reads, `/partner/map` and organisation
  Reports (server-side org reads the harness cannot answer) and every write
  path (new case, treatment, follow-up, close, import, invite) were **not**
  exercised end to end. They need an authorised test account before release.
* Animal list (`/partner/animals`) and several NGO tools were restyled through
  the shared system rather than recomposed; their internal layouts are the
  previous ones.
* Screen-reader passes and 200% text zoom were not run; keyboard paths were
  spot-checked (palette, menus, Escape, focus outlines), not audited.
* The night Atlas palette was tuned on swiftshader renders; it should be
  checked on a real phone outdoors.
* First-load JS is flat within ±2 kB on rebuilt routes (`/municipality` fell from 376 kB to 281 kB because it no longer ships the map engine). The three brand fonts add woff2 downloads on app routes, not JS.
* Older stylesheets are still imported for component classes the remaining
  pages use; their `.spa`-scoped overrides no longer match anything and can be
  deleted in a follow-up once every page has been recomposed.

## Round 3 — paper palette and folk illustration (supersedes the all-dark look)

- **Palette.** `src/components/shell/paper.css` (loaded after `dark.css`) re-points the shared `--d-*` palette to warm cream ground (#f7f2ea), white paper, ink-navy type (#0b1e3d), StrayPaw blue (#2457ce) for data and links, and coral (#f05b40) for actions and urgency. Teal is kept only for care measures.
- **Night windows.** Maps stay deep navy: `.db-map` and the Atlas `.sm.ax` re-declare the dark palette locally, so the 3D columns keep their glow. Column ramps now run through StrayPaw blue (`LiveMap` blue ramp, `ATLAS_NIGHT.seq`). The Atlas rail is paper over the night map.
- **Illustration.** `src/components/art/Folk.tsx` holds hand-drawn SVG pieces in brand colours only: `FolkScene` (dashboard banner; `home` for community, `care` for NGO, `city` for municipality), `FolkVignette` (sidebar foot, empty states), `FolkSprig`. All decorative and `aria-hidden`; none carries data.
- **Verified** on a production build: 38 journey checks pass (KPIs carry live numbers, map measure switching, clicking a column opens its cell card, desktop + phone, no page errors), tsc and eslint clean.
- **Not verified:** real NGO member sign-in and write paths (only the signed-out workspace and the fixture harness were rendered).

## Round 4 — the daylight live map

- `LiveMap` is now a light paper map (cream land, blue water, street and place names) and flat by default; 3D columns stay one press away. Rotation is off in 2D so a drag never tilts the map by accident.
- **Zoom ladder:** city level shows a choropleth of the role's measure; from z≈10.6 each area shows its count; from z≈12.6 areas fade to outlines and each recorded animal appears as a dot (coral = needs help, blue = on record; for NGOs, critical / open case). Dot size grows with zoom. A "Zoom in to see each…" button flies to the busiest area.
- **Dots are read by area, not by coordinates:** at street level the map reads `/api/spatial/patch?cells=…` for the cells in view (4 cells per request, nearest first, each cell read once, retried on the next move after a failure). Each dot sits at a stable, illustrative spot inside its own H3 cell (seeded by the animal id); the legend says "Dots sit inside their area, not at an exact spot". No finer coordinate is drawn.
- **Select:** hover reads an area or a dot; clicking either glides in and opens `CellCard`, which shows the area's published animals with photos. A clicked dot leads the card and offers a direct link to that animal's record. Escape or × clears it.
- The Atlas now defaults to the daylight ground (stored preference key bumped to `sp.atlas.ground.v2` so earlier automatic "night" saves don't stick).
- Verified on a production build: 38 journey checks, 7 regression scripts, tsc and eslint clean; interaction sequence rendered on desktop and phone (city → zoom → dots → hover → card).

## Round 5 — the Atlas without a panel, and phones

- **Atlas:** the standing left rail is gone. The place name is set on the map itself (large type with a paper halo, breadcrumbs above it), a floating dock at the bottom holds the four lenses, the representation select and Time & filters. The details card (`.ax-rail`, now a compact floating card on the right / a sheet on phones) appears only for a picked area or locality, or when "About this place" / "All cities" is pressed. All previous capabilities stay reachable: national index, legend, inspector, city evidence, filters, timeline.
- **Dashboard maps:** the selection card is pinned above the clicked area with a pointer and follows the map as it pans; on phones it docks to the bottom of the map.
- **No dark maps left in the app:** the NGO field map (`BoundedSpatialMap`), Stories map, partner footprint map, Help map and the city "lights" map all use the daylight palette. (The animal dossier's dark hero is unchanged.)
- **Phone pass over every app route:** fixed buttons that had turned white-on-cream (tinted/quiet variants), white inputs, night-text tokens inside page headers, missing side gutters on ten pages built for the old shell, the NGO map sliding under the top bar, an empty strip above the tab bar on full-screen pages, map credits auto-expanding, 40px breadcrumb targets.
- Verified on a production build: 41 journey checks, 7 regression scripts, tsc and eslint; phone screenshots of 41 routes scanned for edge-touching text.

## Round 6 — faces, names, round areas, a living ground, phones, moderation

- **One voice:** DM Sans only, upright, no mono labels or serif italics (`paper.css`, `fonts.ts`).
- **Names** (`lib/animal-name.ts`): a name a person gave is shown as the name; filing labels ("Dog · X · date", "Jamshedpur dog 2482", "Unknown") are not names. Unnamed animals are called by their StrayPaw tag (e.g. `PK0UBR`) with "Unnamed · place" beneath. No "Dog near …" anywhere; nothing invents a name.
- **Portraits** (`art/FolkPortrait.tsx`): an animal without a photograph gets its own folk illustration, varied from its id (pose, ears, markings, collar, ground, sky) in brand colours only. Always labelled "Illustration"; a real photo always wins.
- **Card and profile:** new portrait-first `AnimalTile`; the profile is a light hero (portrait, tag, name, place, status, dates, actions), one row of four care facts, and tabs (History · Area · Add to record · All entries; Organisation for orgs).
- **Round areas** (`lib/spatial/round.ts`): every H3 cell is drawn as a circle inscribed in its hexagon and inset, on every map. The unit of place is unchanged; nothing extends beyond its cell.
- **Living ground** (`art/FolkBackdrop.tsx`): drifting clouds, a turning sun, birds, a sprig scatter and hills where a small dog trots past; the far hill changes by space. Static under reduced motion.
- **Phones:** "More" is one screen (space row, tile grid, you, language). Sections become tabs (`shell/PhoneTabs.tsx`), long lists fold, dashboards show one swipeable figure strip and a swipeable deck of lists, insights are a deck of findings. Every app route measures ≤ 2.2 screens at 390 × 844.
- **Moderation:** `/moderate` is a focused queue (photo, what was reported, the checks, Approve / Reject / Skip with A / R / →, approve-all-that-pass). `/admin` keeps every other tool.
- **Automatic approval** (`lib/auto-approve.ts`, used in `/api/report`): a report goes live without review only when it has a photo, is inside India, has no phone numbers / emails / links, does not claim an existing animal, and comes from a signed-in reporter, an organisation volunteer or a reporter with trust ≥ 80. Set `AUTO_APPROVE_SIGHTINGS=off` to disable. Covered by `npm run test:auto-approve`.
- Verified on a production build: 41 journey checks, 8 regression scripts, tsc and eslint. Not verified: the auto-approval path against the live database (no report was submitted), real moderator sign-in, real NGO member sessions.
