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

## Round 7 — dashboard frame

Every page is a set of bordered white cards on the living ground (`paper.css`, "Dashboard frame"): the page header (`.dh`) is a card, each section beside it is a card (one rule for any container whose child is `.dh`, using `:has()`), phone-tab panels are cards, insights' header/picker/findings are cards, and dashboards' header, figures, map and panels share the same edge (`--card-b`, `--card-sh`, `--card-r`). The sidebar and top bar carry the same border. The NGO workspace tab row and the sign-in notice are cards too. Verified on a production build: 41 journey checks; pages ≤ 2.4 screens on a phone.

## Round 8 — site pages in the app, descriptions, photo check

- **Site pages inside the app frame:** `/access`, `/join`, `/partner-apply`, `/explore`, `/admin`, `/contact`, `/data-governance`, `/how-to-help` and `/research-standards` render inside `AppShell` with the same header card, backdrop and section cards (`MarketingPage inApp`, `MarketingShell inApp`). Long sections become phone tabs. The public landing and marketing navigation are unchanged.
- **No hexagons left:** `HexPlate round`, the partner animal record, the embed map and the Following / report-match fallbacks now use round areas or folk portraits.
- **Descriptions from the record:** the view `public.public_spatial_animals` gained `sex` (normalised to male / female / null) and `size` (migration `public_animal_appearance`, applied to the live project; additive, existing columns and grants unchanged; `supabase/public-animal-appearance.sql`). Unnamed animals read "Female · medium · place" or "Male puppy · place"; puppies and small dogs get a smaller folk portrait. Unknown stays unstated.
- **Photo check:** `lib/photo-check.ts` asks Claude whether a street animal is visible and whether a face, plate or address is. Auto-approval in `/api/report` needs it to pass when `ANTHROPIC_API_KEY` is set; with no key the rules alone decide, as before. Any error, refusal or doubt fails closed and the report waits in `/moderate`, which shows the verdict per report. Not verified against the live API (no key in this environment); unit tests cover the fail-closed paths.
- **Phones:** every app route now measures ≤ 2.1 screens at 390 × 844 (municipality 2.1; the rest ≤ 2.0).

## Round 9 — real folk art, and no unblurred injuries

- **Sourced art** (`public/art`, `lib/art/sources.ts`, `/art-credits`): Cleveland Museum of Art Open Access (CC0) — "Dog with pups" (Rajasthan, c. 1780), the dog studies Bijantu, Hira and Sikari (1890s), a Company-school hoopoe and three Mithila paintings — and seven Gond animal paintings from Wikimedia Commons (CC BY-SA 4.0, cut out of their paper; adaptations keep the licence) plus a Durga Bai Vyam painting (CC BY 4.0). Found through Openverse and the Cleveland Open Access API. Left out on purpose: hunting scenes, a "Dog Walker" whose hounds read as starving, and photographs of Warli paintings where the painting's own copyright is unclear.
- **Portraits:** `FolkPortrait` now shows a crop of a dog painting, fixed per record (mirrored on half), with a painted pup for puppies; the profile caption credits the work and says it is not a likeness.
- **Living ground:** Gond animals stand on the hills in each space and sway, a hoopoe perches by the sun, the painted Sikari walks the hill like a paper puppet, petals fall, and the grove drifts with the scroll (scroll-driven animation where supported). Dashboard banners and empty-state vignettes use the painted dog and Gond animals; page headers carry a painted animal in the corner on desktop. Everything stops under reduced motion.
- **Sensitive photos:** `ui/SensitiveVeil` blurs a photo with "Tap to view" (stops the click reaching the card link; remembered per session). Rules in `lib/sensitive-photo.ts`. New nullable `dogs.photo_sensitive`, appended to `public_spatial_animals` and `public_animal_profiles` (migrations `public_photo_sensitive`, `public_profiles_photo_sensitive`; grants unchanged; `supabase/public-photo-sensitive.sql`). All 122 existing public cover photos were reviewed by eye: two were flagged (an open wound; a photo of faeces). Reports that describe an injury, or whose photo the photo check sees a wound in, are flagged on approval. The landing never shows a flagged photo.
- Verified on a production build: 41 journey checks, 10 regression scripts (auto-approve now also covers blur rules and portraits), tsc and eslint; reveal tested in a browser (blur applied, tap reveals without navigating, remembered on reload, reduced motion stops the grove).

## Round 10 — one calm sheet; the map

- **One sheet instead of cards** (`shell/calm.css`, loaded after every other app stylesheet): each page is a single white sheet over the folk ground; the page header, figures, panels, tabs and sections inside it are divided by whitespace and hairline rules instead of bordered, shadowed cards. Figures read as one row split by hairlines, tabs are underlined text, maps keep a thin frame, only floating elements keep a shadow. The phone findings deck keeps light card edges because swipe cards need them.
- **Map, not Atlas:** every visible label, link and the search palette say "map"; new phrases added to the Hindi, Kannada, Tamil and Telugu tables.
- **Zooming into a city:** on the India map, zooming to ≥ 8.5 near a city enters it at the same view (`?city=…&lat=…&lng=…&z=…`) instead of stopping at an "Enter city" card, so its areas and then its animal dots appear. Returning to all cities re-arms it. Verified in a browser: zoom 9.2 over Coimbatore → URL becomes the Coimbatore view at the same camera, no card, city layers on.
- Also: "I can help" buttons on /help had dark text on orange; now white.
- Verified on a production build: 41 journey checks (the nav journey now looks for "Map"), 10 regression scripts, tsc and eslint; phone pages ≤ 2.1 screens.
- **Last boxes removed:** the shared empty state (`ui/EmptyState`) is unboxed type and an icon; Feeding and Saved empty states lose their bordered/dashed boxes; Programmes filters are one row of underlined text; the record tabs on animal profiles use the same underline as every other tab row; phone Insights lists findings plainly (first two, then "Show all N findings") instead of a dark swipe deck.

## Round 11 — nothing plain, nothing generic, everything checked

- **Sidebar and More sheet:** a faint dotted ground (like the rice-paste dots of a floor painting), a painted vine on the sidebar's edge that sways slightly, and "Latest on the record": the newest real public entries (requests, care, sightings) from `/api/latest`, refreshed every minute, turning over every six seconds. Its dot pulses only when the newest entry is under a day old, so it never overstates activity.
- **One voice:** inside the app the serif variable points at DM Sans, nothing is italic, emphasised words in headings keep the heading colour, and the decorative line grounds behind site-page bands are dropped. About forty visible sentences that leaned on em dashes were rewritten with full stops, colons or commas.
- **First-visit picker** (`app/Welcome`): light navy scrim instead of 80% black for every dialog, the app's type, no spaced capitals, roles as plain rows.
- **Bugs found and fixed:** `mapDog` dropped `straypaw_id` and `photo_sensitive`, so profiles and lists showed a tag built from the database id instead of the real StrayPaw ID, and the sensitive flag only took effect through "needs help"; the public animal query now requests `straypaw_id`. `/atlas` redirects to `/map`.
- **Checked on a production build:** all 96 routes (correct 404s for unknown ids), every internal link found on them (213), all 23 redirects, every API route (no 5xx; admin routes ask for the password in production), 41 journeys, and a 30-step workflow suite: follow/unfollow, record tabs, language switch and back, Nearby list → record → back, map chips, search by StrayPaw tag, Insights city and period, programme and story filters, sign-in validation, moderation gate, partner sign-in prompt, report steps without submitting, 404, help without location permission, art credits, first-visit picker and tour, phone More sheet, phone Insights fold. Nothing was written to the live database.

## Round 12 — one continuous map, reachable spaces, a calmer landing

- **Map:** flat by default (3D columns only from the 3D button or `?view=3d`), so zooming in shows the individual dots. Zooming out of a city (below 6.5) returns to the India map; panning to another city while zoomed in switches to it. The camera is handed over in a ref instead of through the URL, which fixed a race where the view snapped back or flipped between India and the city, and a crash when the selection still indexed the previous city's data. Only moves the visitor makes (drag, wheel, pinch, zoom buttons) switch between India and a city; the map's own camera moves never do, so choosing a city from the list no longer bounces back to India. Verified in a browser: India → Coimbatore at z 9.5 → dots at z 14 → wheel out to India → Bengaluru, no errors. On a production build: 41 journeys, 30 workflow steps, 14 regression scripts, tsc, eslint, and a crawl of 96 routes and 215 links with no failures.
- **Navigation:** the space switcher (with Main site and the introduction) is in the sidebar and in the phone top bar, no longer only in More. More was hiding pages because it assumed four tab-bar items when three are shown beside Report; it now lists Stories and the space's other pages first.
- **Sign in and Sign up:** two clear choices. "Sign in" (with your email and code) and "Sign up" (new here, we email you a code; there is still no password). They appear in the header menu, the More sheet and on the sign-in page; the code-request page is headed "Sign up for StrayPaw".
- **Place search** dropdown sits above the figures instead of under them; **Insights** findings sit on one surface with hairline rules, no grey gaps.
- **Landing:** the register carousel excludes animals that need help or are injured, and a photo with a visible neck wound was removed from the reviewed set. "One report, three screens" now animates on a phone too (progress bar per step, a caption for each screen, the screen slides in). The municipality screen is a dark city view with dots sized by open requests and ripples around the new report instead of a hexagon grid, and the grounds pattern uses dots instead of hexagons.
- **Map edge cases, checked on a production build with real input** (52 checks): individual dots render at street zoom in Coimbatore, Bengaluru and Ranchi on desktop (wheel) and a 390 px touch viewport (pinch); one-finger drag, pinch into a city, deeper, pinch back to India and into a second city (Hyderabad); Animals/Care/Cases/Evidence keep the city and the exact camera (also with a place selected); 3D on shows columns at pitch 55, off restores pitch 0 and the same position and zoom; refresh, Back and Forward on city URLs never crash, bounce or show a stale selection. Known and unchanged: the camera is not kept in the URL after a view loads, so refreshing a city returns to that city's overview, not the exact zoom. A mobile viewport at the Ranchi centre can contain no data points; panning to one renders them.

## Round 13: a trust pass on what the numbers and labels claim

**Found and fixed**
- **/orgs called 19 organisations "Field partner".** The directory already knew each one's kind, but the page hard-coded the tag. Only one organisation (The Pawsome People Project, `partner_status = operational_partner`) is a partner. The page now has three groups: field partners, NGOs on StrayPaw (listed or invited; "listing is not a partnership"), and data sources (governments, researchers and platforms whose published records are imported; "not partners"). Org profiles carry the same distinction, and `record_contributor` rows are treated as sources.
- **"Kept by" on every animal profile** is now "Record from". The value is the organisation that contributed or holds the record (`dogs.ngo_id`), or "Community reports"; it never meant custody.
- **Jamshedpur's 20,915.** They are the HSI/Humane World CNVR clinic register (2013 to 2016): 20,915 animal records, each with one closed `cases` row titled "CNVR clinical care record" (category sterilisation, `status_class = no_action`) and one sterilisation `medical_events` row. There are no vaccination events and no requests for help. The city rollup counted every `cases` row, so `/explore` called them "requests for help", and the same rows put 92% of all cases in "closed without action" and gave every case a "same day" first action. Excluding Jamshedpur, the no-action share is 18%.
- **Programme tiles** printed an animal count as "vaccinated" when the programme had no vaccination figure of its own (the Jamshedpur tile showed "20,915 vaccinated"). They now say "animals on record" in that case.
- **Labels that said more than the data:** `/explore`, the municipal brief and Insights now call the rollup "case records"; org pages say "case records" and "cases closed"; the government tiles say "animals recorded sterilised/vaccinated"; the Stories median says it covers the stories shown; status notes no longer say "rescued by a partner" or "being worked".
- **Reporting does not promise intervention.** "Needs help" is "Help requested"; `/help` says "animals were reported as needing help" and that a flag may be out of date; the report page says "Adds to the shared record", "Thanks. Your report is sent for review." and "Whether one takes it on is up to them"; volunteer sign-up no longer promises contact; the homepage example is "one real request that went the whole way".
- **Metadata:** the layout no longer hard-codes `og:url`, `og:title` and `og:description` for every route, so each page's own title, description and URL drive its social card (they were the homepage's on about 50 of 57 routes). Dog and org pages get an entity title and a raster card image (org logos are often SVG). Private pages (`/following`, `/app`, `/feeder`, `/access`, `/offline`) carry `noindex`; the sitemap no longer lists the redirecting `/partnerships`; five legal pages gained descriptions; overlong and short descriptions fixed.

**Proposed, not applied (needs the owner's approval)**
- `supabase/care-register-records.sql` (rollback in `supabase/rollback/`). It adds `is_care_register_record()` and changes `public_case_facts`, `rebuild_spatial_city`, `list_public_org_impacts`, `get_public_platform_totals` and `count_public_case_stories` so the 20,915 clinic records are no longer counted as cases or requests. They stay in `cases`, and stay counted as animals and care events. Expected result: Jamshedpur cases 0 (care events 20,915 unchanged), total cases 2,285, and Insights for Jamshedpur no longer shows 100% "no action" and "same day". Until it is applied, the rollup is labelled "case records", which is true either way.

**Not verified**
- Whether Jamshedpur's "vaccinated" flag (20,915) comes from the source file or from a CNVR default; there are no vaccination events behind it. Ranchi's 6,462 "vaccinated" flags are likewise unconfirmed.
- The Jamshedpur data source has `license_status = pending` yet `publication_status = published`. That needs the owner's call.
- Insights, map and partner dashboards render client-side; their numbers were checked from code and SQL, not from a render. No authenticated partner session was available.
- Real social-card rendering in Facebook, LinkedIn or X crawlers (tags and image URL only).
