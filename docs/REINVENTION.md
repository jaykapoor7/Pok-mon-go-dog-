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
