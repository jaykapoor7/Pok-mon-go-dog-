# StrayPaw production redesign — the plan

- **Status**: PLAN FOR REVIEW. No production code has been changed.
- **Base**: `main` at `fdf8464`
- **Lab source**: `claude/straypaw-delhi-app-toifso` at `1f8a27b` (Atlas / Civic / Journal directions, `/lab/system`, `/lab/system/spatial`). Not merged into `main`.
- **Data**: the live Supabase register, read with aggregate queries only. No names, contacts or free text were copied into this document.

The target: **today's StrayPaw, with the same features and flows, redesigned with the creative ambition the lab showed.** Nothing here swaps a production screen for a lab template. Every lab idea below is adapted into a screen that already exists, at the URL it already has.

---

## Contents

0. [What was audited](#0-what-was-audited)
1. [What the real data says (this shapes everything)](#1-what-the-real-data-says)
2. [Seven rules for the redesign](#2-seven-rules-for-the-redesign)
3. [Unified production design system](#3-unified-production-design-system)
4. [Hero + landing](#4-hero--landing)
5. [Community home](#5-community-home)
6. [NGO dashboard](#6-ngo-dashboard)
7. [Map / spatial architecture](#7-map--spatial-architecture)
8. [Analytics architecture](#8-analytics-architecture)
9. [Dog / animal profile](#9-dog--animal-profile)
10. [Cases, organisations, projects, navigation](#10-cases-organisations-projects-navigation)
11. [Data / schema changes](#11-data--schema-changes)
12. [Migration order](#12-migration-order)
13. [Testing strategy](#13-testing-strategy)
14. [What will NOT change](#14-what-will-not-change)
15. [Decisions needed from you](#15-decisions-needed-from-you)

---

## 0. What was audited

| Area | What I read |
|---|---|
| Routes | All 109 `page.tsx` routes on `main`: public site, community space (`/app`, `/map`, `/stories`, `/orgs`, `/dog/[id]`, `/following`, `/report`), NGO space (`/partner/*`, 28 routes), and the data pages (`/insights`, `/explore`, `/gaps`, `/wards`, `/the-data`) |
| Shell and navigation | `AppShell` (community and NGO spaces, search, phone tab bar), `PartnerTabs` groups, `SiteHeader` |
| Landing | `Hero`, `HeroRail`, `TrustStrip`, `CaseStory`, `WhereTheyAre`, `ConsoleShowcase`, `LandingMotion` |
| Dashboards | `CommunityHome`, `PartnerRecordHome`, `TasksSection`, `ReportsClient`, `OperationalInsights`, `PartnerMap`, `/partner/field` |
| Map | `MapView`, `MapLibreMap` (1,093 lines), `MapCanvas`, `MapAnimalDetails`, ward choropleth, lenses |
| Profiles | `UnifiedAnimalProfile` (live), `AnimalStoryProfile` (not rendered anywhere), `AnimalRecord` (NGO) |
| Cases, orgs, projects | `CaseWorkspace`, `CasesTable`, `/org/[slug]`, `ProjectRegisters`, `OperationsRegister` |
| Design system | `tokens.css`, the `straypaw-design` skill, 13,300 lines of CSS across 14 files, Tailwind's legacy `bark`/`paw` palette |
| Lab | All three directions, the integrated system (10 screens), spatial engine (`engine.ts`), `Spatial.tsx`, `City3D.tsx`, the lab's aggregates of the rescue register |
| Database | 48 tables, 22 views. Row counts, field completeness, status and condition vocabularies, timing, geography, stacking, follow-up adherence, import provenance |
| Import pipeline | `lib/master-import/*`, `rescue-taxonomy.ts`, the workbook's real sheet headers |

---

## 1. What the real data says

StrayPaw now holds a real rescue register imported from one partner's workbooks (Coimbatore): three yearly rescue-request sheets (2024, 2025, 2026 to date), a sterilisation-drive ledger, a TVT dose sheet, a review-and-appointment sheet and an adoption/foster sheet. There are also 107 resident reports from the pilot cities. The lab already chose not to name the partner organisation on its screens, and this plan keeps to that.

**This data is the product blueprint.** Below is what it contains and what each fact means for design.

### 1.1 What rescuers actually record

The workbook's own column headers, and how often each is filled across the three rescue-request sheets (~2,200 rows):

| Field in the workbook | Filled | What it tells us |
|---|---|---|
| Date, Location, Case detail, Injury type, Status | ~99% | The core of a rescue record. Every screen should lead with these. |
| **Call via** (who took the call) | ~99% | Intake channel. About 65% came through the organisation's own line, about 15% through one partner group, and the rest through named volunteers. This is a real referral network that StrayPaw does not model yet. |
| Detailed status (progress notes) | ~95% | Free-text chronology, and the source of the outcomes: died, healed, could not locate. |
| **Rescue plan** (a date) | 86% | Time to first action. It is the only honest response-time measure in the data. |
| Review date | 29% | Follow-up is the weakest-recorded stage of the work. |
| Animal ID or code | **0%** | Rescuers do not identify individual animals. Each request created a new animal record. |
| Sex, colour | ~0% in rescues. 79% and 64% in the ABC drive | Identity data exists only where a programme needs it. |
| Photograph | **0%** of imported records | Only the 88 animals reported by residents have photos (3.7% of the register). |

### 1.2 What happens to requests

| Status (as the register writes it) | Rows | Share |
|---|---|---|
| Closed | 1,552 | 71% |
| **Closed with no action** | 420 | **19%** |
| In progress | 161 | 7% |
| Rescued by another NGO | 36 | 1.6% |
| Open, or not attended | 18 | 0.8% |

**Why requests close without action** (parsed from the progress notes of those 420): the animal **could not be located or caught** in 161 (38%), the animal had died in 38 (9%), the caller could not be reached in 14, and 198 give no reason. This is the most important product insight in the dataset: *one request in five never becomes a rescue, and the most common named reason is that the animal could not be found.* A precise place, a photograph and repeat sightings are exactly what StrayPaw adds. The landing page, the NGO dashboard and analytics should all make this argument with the real figure.

### 1.3 What the problems are

Injury type, normalised: **road accident 519 (24%)**, maggot wound ~261 (12%), **unknown ~324 (15%)**, TVT 243 (11%), skin and mange ~195 (9%), dog bite 112 (5%), tumour ~81, distemper 68, minor injury 61, eye and ear ~84, human abuse ~45, **entrapment (plastic bottle or rim, wire trap, metal wire) ~41**, ticks and tick fever 38, **suspected rabies 12**, parvo 12.

These become the triage classes the lab proposed. **Critical**: road accident, maggot, abuse, bite, entrapment, suspected rabies. **Priority**: TVT, tumour, distemper. **Routine**: the rest. **Unclassified**: unknown. Each organisation can edit the mapping. Suspected rabies also gets a public-health flag.

### 1.4 Time

- **Seasonality is strong.** November 2024 had 229 requests and October 182, against 20–50 a month in mid-year. October and November are the peak again in 2025. An annotated timeline should show this, and the NGO dashboard can warn ahead of the season.
- **Annual totals fall**: 1,104 (2024), 665 (2025), 425 (2026 to September). *That may be a change in recording, not fewer injuries*, and every chart must say so.
- **Response**: from request to rescue-plan date, the median is 1 day (404 on the same day, 1,148 within 1–3 days, 183 within 4–7, 82 over a week, 331 with no plan date).
- **`cases.resolved_at` is an import artefact.** 72% of imported cases "resolve" on the day they were opened. Time to resolve **must not be shown** for imported records (see §11).
- **Follow-up**: 1,630 follow-ups, of which 1,381 were done, **221 missed (14%)** and 27 are upcoming. The median follow-up falls 10 days after the rescue.

### 1.5 Unfinished work is mostly stale bookkeeping

Of the 161 cases still "in progress", **57 date from 2024 and 35 from 2025**. That makes 92 (57%) older than nine months. These are almost certainly finished rescues that were never marked closed. The NGO dashboard should show open work by **age**, and offer a review-and-close tool. It must never close them automatically.

### 1.6 Programmes

- **ABC drive**: 76 enrolled (45 female, 15 male, 16 sex not recorded). 44 have an admission date but only **22 have a release date**. The median stay is about 7 days, with two outliers of 58 and 99 days. This is a drive-progress band: enrolled → admitted → released, with "release not recorded" hatched.
- **TVT**: 13 dose courses, and 12 have no recorded completion. Missed doses are noted on 3. This is a dose-course lane with the next expected dose drawn dashed.
- **Care events**: 1,564 in total (treatment 974, diagnostic 155, surgery 116, sterilisation 102, vaccination 83, wound care 72, chemotherapy 17).

### 1.7 Geography: the most important technical finding

- 2,247 of 2,363 animals are in **Coimbatore** (imported). Of the 88 resident-reported animals, 79 are in Delhi and 7 in Bengaluru.
- Imported positions are **geocoded locality names, not places where an animal stood**. The 2,247 Coimbatore animals sit on just **477 distinct points**. 51 of those points carry 10 or more animals, and **one carries 146**. There are 1,004 distinct locality names.
- **`dogs.city` is empty on all 2,363 rows.** The ladder "street → locality → city" has no city to climb to without a backfill.
- Public views round positions to **0.01° (about 1.1 km)**.
- Ward polygons exist only for Chennai (200 wards) and for India's districts (641). Coimbatore and Delhi have none. **H3 hexagons have to be the universal unit of place**, with wards as an overlay where they exist.
- Postgres has PostGIS, but the **`h3` extension is not available**. H3 has to be computed in the application (`h3-js`).

**Design consequence:** a pin per animal is the wrong picture for imported records. It draws 146 dogs as a single dot, or as a fake scatter. The map has to aggregate, and it has to state its precision: *"146 records at the Gandhipuram locality centroid"*, not 146 pins.

### 1.8 What is not known is most of the register

| Field | Known | Not recorded |
|---|---|---|
| Sterilisation status | 102 (4.3%) | 96% |
| Vaccination status | 67 (2.8%) | 97% |
| Sex | 60 (2.5%) | 97% |
| Photograph | 88 (3.7%) | 96% |

**Low recorded ≠ low actual.** This is the Civic idea made unavoidable: the "not recorded" share has to be drawn as a hatched remainder everywhere, never as zero and never as a gap to fill in. This is also a product opportunity. **0 of the 107 resident reports** answered the existing "is the ear notched?" or "is there a vaccination collar?" question, because it defaults to "unknown". A photo-cued, one-tap version could turn residents into the largest source of ABC and ARV evidence.

### 1.9 "Repeat dogs" do not exist yet. Repeat places do.

Because the register has no animal IDs, only **1** animal has more than one case. The current "repeat animals" metric on `/partner/reports` is therefore meaningless for this data. What *does* repeat is places: **98 localities had rescues in more than one year, and 78 localities have 5 or more cases.** "Repeat" should mean repeat places first. Repeat animals come second, through human-confirmed identity suggestions (same locality, same condition, within N days), in line with the product's explicit no-auto-merge policy. Among residents, 20 of 87 animals have been sighted twice.

### 1.10 Empty tables: design the empty state first

`vaccinations`, `sterilisations` (legacy), `feeding_zones`, `surveys`, `tasks`, `fundraisers`, `vet_camps`, `case_stories`, `evidence_items`, `adoption_listings` and `documents` all hold **0 rows**. None of these features should get prime space on a dashboard until it has data. Each needs a designed empty state that says what to do next.

### 1.11 Codebase findings that matter for the plan

- **The live public profile lost features.** `Follow`, `Share`, `Add comment` and `Export` live only in `AnimalStoryProfile`, which nothing renders. `UnifiedAnimalProfile`, the live one, has none of them. `/following` exists, but a visitor cannot follow an animal from its profile.
- `/`, `/app` and `/map` each load **every** public animal row (`getAllDogs`, `select *`) and send it to the client. `/app` also fetches 100 sightings that `CommunityHome` ignores.
- The map's "ABC gaps" and "ARV gaps" lenses count animals *without a record* as gaps. That treats unknown as not done, which breaks the product's own core rule.
- `MapView` uses inline style objects and `backdrop-filter: blur`. Both are forbidden by the design skill.
- There are two separate map implementations (`MapView` and `PartnerMap`), each with its own square-degree "hotspot" bins (0.03° and 0.025°). These are not equal-area, not comparable, and not H3.
- There are two separate profile designs (`/dog/[id]` and `/partner/animals/[id]`), and two case route families (`/cases/*` and `/partner/cases/*`).
- "Projects" are stored as surveys with a `PROJECT_MARKER` string in the description.
- There is dead code: `AnimalStoryProfile`, `DogStatusEditor`, `DogActions`, `SightingTimeline`, `DogLocation`, `PartnerOverview`, `DashboardClient`, `ChipScroll`, `MapConsole`.
- There are five CSS systems: `tokens.css` (`--sp-*`), the console's own `app.css` (4,404 lines), `site.css` and `field-site.css` (4,240 lines), `product.css` and `design-system.css`, and the legacy Tailwind `bark`/`paw` classes in 130 files.
- Security advisor: `spatial_ref_sys` is flagged as having RLS disabled. This is already mitigated by the client-write guard (`supabase/spatial-ref-sys-client-guard.sql`). The advisor will keep flagging it because it only checks the RLS flag, and nothing more is needed here.

---

## 2. Seven rules for the redesign

1. **Map = where. Analytics = why, how many and how it changes.** The map surface carries almost no numbers. Numbers appear when you select a city, locality, cell, cluster or dog.
2. **Recorded ≠ real.** Observed density, mapping coverage and the unknown are always three different encodings. "Not recorded" is a hatched remainder. "Unmapped" is a dashed frontier. Neither is ever zero.
3. **One unit of place.** An H3 cell, at the same resolution on every screen. Street → locality → city is a zoom ladder over those cells, shown as a breadcrumb.
4. **One line of work.** Report → Record → Case → Outcome. Every item shows its position on that line.
5. **Precision is stated.** An imported record sits at a locality centroid, and the map says so instead of inventing a pin.
6. **No invented data.** The fixture guard already enforces this. Sample framing (for example "sample city: Coimbatore") is labelled where it applies.
7. **Adapt, never transplant.** Lab components become production primitives inside existing routes. No `/lab` code ships.

---

## 3. Unified production design system

**Keep:** the `straypaw-design` skill as the permanent rulebook, `tokens.css` as the only source of values, DM Sans / Instrument Serif / DM Mono, the two shapes (capsule to press, `--ctl-r-row` to select), warm-white ground, blue for action, flame used sparingly.

**Extend.** These are all additions, and nothing is renamed:

| Addition | Purpose |
|---|---|
| **Type scale tokens**: `--sp-t-display`, `-headline`, `-title`, `-body`, `-label`, `-mono-s` | Replace 429 hand-typed sizes (`text-[11px]`, `text-[clamp(2.5rem,6vw,4.5rem)]`). This is the single biggest source of inconsistency. |
| **Data-viz tokens**: a 5-step sequential blue ramp, a 2-step attention (flame) ramp, a neutral scale | Every chart and map uses the same ramp, so "darker = more" means one thing everywhere. |
| **Coverage tokens**: `--sp-cov-strong / partial / weak / insufficient / unmapped` | The coverage classes from the lab engine, in the same colours on the map, in analytics and on the landing page. |
| **Hatch**: `--sp-hatch` (an SVG pattern plus a CSS `repeating-linear-gradient` twin) | "Not recorded", drawn the same way in every band, hex and lane. |
| **Status-line tokens** | The four stations: Report, Record, Case, Outcome. Open is flame, closed is blue, no-action is ink-3, and not recorded is hatched. These are the lab's `STATUS_STYLE`, rebased onto `--sp-*`. |
| **Cartography palettes**: `paper` (default for workspace maps) and `night` (landing plate, 3D City) | The basemap is restyled from OpenFreeMap vector tiles using the lab's `restyle()` approach. Paper is the default because field staff read maps outdoors in sunlight. |

**New shared primitives** go in `src/components/system/`. Each is small, SVG-first, token-only, and each has a designed empty state:

| Primitive | From | Used by |
|---|---|---|
| `RecordLine`: the four stations with a position marker; the last leg is dashed while open | Civic `Machine` / system `LineStory` | Landing, profile, case, dashboard rows |
| `ShareBand`: 100% band of outcomes with a hatched not-recorded remainder | Civic / system `Band100` | Analytics, landing, org, project |
| `CellGlyph`: a small hex with fill and recorded-share inset | System `CellSVG` | Lists, legends, profile, community home |
| `Register`: flush ledger rows (mono date, entry, provenance) | Civic registers | Profile chronology, case timeline, changes feed |
| `Lanes`: care lanes on a day axis; open case bar, dose dots, dashed "expected" | System `Lanes` | Profile, case, TVT/ABC courses |
| `ScaleLadder`: India › State › City › Locality › Cell › Animal | System `Band` crumbs | Map, analytics, profile, community home |
| `Spark`, `SmallMultiples`, `DotPlot`, `AgeBars`, `Timeline` (annotated) | New, per the dataviz method | Dashboard, analytics |
| `Inspector`: side panel on desktop, bottom sheet on phone | System spatial register | Map, dashboard map, community patch |
| `PlacePlate`: the locality micro-map shown when there is no photograph | New | Profile, lists, rail |

**Consolidation** is incremental, never a big bang. New and redesigned surfaces use `system.css` plus tokens only. Legacy stylesheets shrink as each surface migrates. No inline style objects, no `backdrop-filter`, no Tailwind `bark`/`paw` on touched files. When a surface is finished, its dead CSS is deleted in the same PR.

**Motion** follows the skill. Three purposeful motions: (1) the landing plate fills in chronologically, once; (2) the camera eases to a selection; (3) lanes draw in on first view. Under reduced motion, everything shows its final state.

**The skill document gets a new "Data and space" chapter** covering the hatch rule, coverage classes, map = where / analytics = why, precision statements, triage colours, and chart forms that are allowed or banned (no pies, no gauges, no 3D charts, no KPI tile rows).

---

## 4. Hero + landing

**Route:** `/` · **Priority:** 1 · **Complexity:** L · **Risk:** medium (performance, framing)

### What exists now
Pinky's photograph plus the headline "Every stray animal in India. *Seen, tracked, cared for.*", two actions and a live tally, with a photo rail below. Then a trust strip (counts and the named partner), a case story (usually empty), "Where they actually are" (a pin preview of the densest cell), a six-station console explainer with icons, four role cards, and a closing call to action.

### What is weak
- The first screen is the pattern you want to avoid: headline, buttons, a picture and a rail.
- The real register is invisible: 2,200 rescue requests, conditions, outcomes and the one-in-five no-action finding.
- The map section is pins. The console section is icon cards with no data.
- The role cards are generic. Nothing speaks to governments, researchers or funders.
- It loads all 2,363 animal rows to draw a small preview.

### What must stay
The headline wording (its derivation is documented in `Hero.tsx`), Report as the primary action, Map as the secondary one, the live tally, real photographs only (Pinky stays), the named partner in the trust line, the four ways in, the closing call to action, and SEO metadata.

### What changes: "the register, at three scales"

1. **Hero plate: the city fills in.** A full-bleed navy plate of the sample city, drawn from real geometry: coastline, water, major roads and H3 cells, as server-rendered SVG with no map library on the landing page. The cells fill in month by month from real field activity (2024 → now). A new case flares flame until care is recorded near it (lab `HeroCells`). The headline sits on the city it describes. **Pinky's photograph is not beside the map. It is pinned into it**: a framed photograph attached to its place with a leader line, captioned with the StrayPaw ID in mono and the locality. The live tally sits as a caption line: "2,363 animals · 3 cities · the plate is Coimbatore, the sample city". On a phone the plate takes the top 55vh and the headline goes below it. Under reduced motion the plate is shown complete.
2. **One animal, four stations.** The `RecordLine` told with one real published journey: resident report → record → case → outcome, with the last leg dashed if it is still open. Under each station are the register's totals (107 resident reports · 2,363 records · 2,194 cases · 1,552 closed). This **replaces** `ConsoleShowcase` and `CaseStory` and makes the same argument with real data.
3. **Street → locality → city.** Three plates of the same place at 0.5 km, 2 km and 5 km, each with its record count, ending on "Open this place on the map" (`/map?cell=…`). This replaces the `WhereTheyAre` pin preview.
4. **What rescuers actually record.** A compact condition × outcome explorer: road accident 24%, maggot, TVT… each with its outcome band, the no-action share in ink and not recorded hatched. One sentence carries the finding: *"One request in five closes without field action, most often because the animal could not be found."* The copy then states what StrayPaw changes: a place, a photograph, repeat sightings.
5. **What is not known.** Two hatched bands: "Sterilisation status is recorded for 4% of animals on the register. The other 96% is unknown, not zero." It links to `/insights`. This is the institutional message for governments and funders.
6. **Also on the record.** The photo rail stays, restyled as a register strip: photograph, mono StrayPaw ID, locality, last seen. Records without a photograph get a `PlacePlate` instead of a flat colour block.
7. **Who uses the record.** The four ways in (Neighbour, Feeder, Educator, Organisation) become a resident → NGO → institution ladder, with a fifth row for government, funders and researchers linking to the existing `/for-governments`, `/for-funders` and `/research-standards`.
8. Trust line and closing call to action are kept.

### Lab ideas reused
System `HeroCells`, `LineStory`, the Landing scale plates, `ConditionExplorer`, `Band100`, Atlas photograph-in-cartography composition, the Civic unknown-as-hatch. **Not reused:** the lab fonts, the lab nav band, the Journal direction.

### Real data surfaced
`public_field_activity` (3,754 events) → monthly cell fills; `public_case_stories` → the journey; register totals; condition × outcome matrix; no-action reasons; ABC/ARV recorded share; 88 photographs.

### Interactions
The plate replays once; a small "2024 → 2026" scrubber lets you replay it; clicking a cell opens `/map` at that cell. Stations link to `/report`, `/map`, `/stories` and the outcome record. The condition explorer: select a row to see the same condition year by year.

### Implementation notes
Cells are computed server-side (§7) and embedded as compact SVG paths, around 1–2k paths gzipped. The `revalidate` is 1 hour, so there is no per-request aggregation. The landing page stops calling `getAllDogs()`. The photograph is a direct asset as today.

### Risks
- Framing a single city nationally: every plate is labelled "sample city".
- LCP must stay under 2.5 s on a mid-range phone on 4G; the plate is SVG and the photo is prioritised.
- Case-journey consent: only intentionally published stories are used.

### Files
`src/app/page.tsx`; `components/site/{Hero,HeroRail,TrustStrip,WhereTheyAre,ConsoleShowcase,CaseStory,LandingMotion}.tsx`; new `components/landing/{HeroPlate,StationsStory,ScalePlates,ConditionBands,UnknownBands,RoleLadder}.tsx`; `lib/spatial/*`; `site.css` and `field-site.css` shrink.

---

## 5. Community home

**Route:** `/app` · **Priority:** 2 · **Complexity:** M · **Risk:** low–medium

### What exists now
"Animals in your area" with a count and "need help", a pin map with "Use my location", seven nearby animals (needs help first, then most recent), recently completed stories, and a privacy footnote. Distance is a fixed 12 km.

### What is weak
- It does not answer *what changed*, *which animals I've interacted with*, or *where help is needed*.
- The map is pins, and imported animals stack on locality centroids.
- There is no place name, only "Around you".
- `/following` is a separate page.
- The sightings it fetches are unused, and it loads every animal row.

### What must stay
Report as the primary action, use my location, the nearby register → profile, recently completed outcomes, the full-map link, the privacy footnote, and the phone rule of a map at under half the viewport with the list starting immediately below it.

### What changes: "your patch", one composed surface

- **Place bar**: `ScaleLadder`, e.g. "Around you · RS Puram, Coimbatore · 1 km", plus a Report button. Without geolocation, pick a locality from search. It defaults to the last place used.
- **Patch map**: your cell plus two rings (19 H3 cells). Cells are shaded by recorded animals, open cases are marked in flame, and rings with no records are **hatched "not mapped yet"**, never blank. Tapping a cell filters the lists below.
- **Needs attention nearby**: animals with an open case or `needs_help` in the patch, ordered by urgency and then distance. Each row: photograph or `PlacePlate`, name/ID, *what is needed* ("Open case · road accident · 3 days"), distance.
- **Changed this week**: a dated `Register` of events in the patch (new sightings, cases opened, treatment recorded, closed), built from `public_field_activity` and `public_live_sightings`. This uses the sightings the page already fetches.
- **Your animals**: animals you have reported or followed, each with its latest state change. `/following` keeps its page, and its content surfaces here.
- **Where help is needed**: one quiet line driven by data, e.g. "4 animals near you have no sterilisation record. If you see an ear notch, add it." Tapping opens the animal and a one-tap observation. This is how residents start to fill the 96% unknown.
- **Recently completed nearby**: kept.

### Empty and sparse states (the common case)
"No animals recorded within 1 km. That means not mapped yet, not no dogs." Hatched rings, and "Report the first".

### Lab ideas reused
System `Home` / `NearbyMap`, coverage frontier, `Register`, `CellGlyph`.

### Real data surfaced
Resident sightings (107), public animal profiles, field activity, case stories, follows, `needs_help`, open cases, ABC/ARV recorded state.

### Files
`app/app/page.tsx`, `components/app/CommunityHome.tsx` (rewrite), `FollowingClient` (reuse its data), `site/FieldMapPreview` → `spatial/PatchMap`, `lib/data.ts` (patch query by cell ring instead of all rows).

---

## 6. NGO dashboard

**Route:** `/partner` · **Priority:** 3 · **Complexity:** XL · **Risk:** medium–high (a lot of logic, and it must be correct)

### What exists now
Organisation name and date, "What needs attention", a strip of four counts (overdue follow-ups, open rescues, due within 7 days, animals), a queue (overdue first, then open, oldest first), a pin map (the first 400 animals), a top-5 places list ranked by a hidden score, tasks, category bars, "what changed" (the latest closures), a footer summary, and an import-first setup state. All rows are read client-side.

### What is weak
- The queue does not triage by condition severity.
- There is no **age** of open work, even though 92 cases older than nine months are really bookkeeping debt.
- The map is pins stacked on locality centroids.
- Nothing shows no-action reasons, follow-up adherence, TVT or ABC course progress, data completeness, seasonality, projects or intake channels.
- The places score is opaque. The category bars are generic.

### What must stay
New rescue case, find a record, overdue / open / due counts and their deep links, queue → record links, the field map link, tasks, the setup state (import workbook), the signed-out state, and the phone ordering fix (map not buried).

### What changes: the operations room, three bands, one surface

**Band A · Now: the queue and the map, linked** (lab `OpsBoard`)
- **Status sentence**, not tiles: "12 follow-ups overdue · 31 rescues open (9 critical) · 92 open longer than 90 days · 27 reviews due this week". Each clause is a link.
- **Triage queue**: Critical → Priority → Routine → Unclassified. Within each class, oldest first, with overdue follow-ups interleaved. A row shows condition, locality, an age bar in days, assignee, and the last entry. Hovering or tapping a row highlights its cell.
- **Ops map**: H3 cells of open work. Flame intensity is the open count, a ring marks critical, and there are no pins. Clicking a cell filters the queue, and the queue filter highlights cells.

**Band B · Unfinished: what remains**
- **Open work by age**: `AgeBars` (0–7, 8–30, 31–90, 90+ days) plus a **Review stale cases** tool. It is a list with bulk "mark closed / still open / closed without action + reason". It never closes anything automatically.
- **Follow-up adherence**: a `ShareBand` of done / missed / upcoming (1,381 / 221 / 27), with missed follow-ups by locality.
- **Courses in progress**: TVT courses as dose dots (weekly cadence, missed marked, next dose dashed), and the ABC drive as enrolled → admitted → released (76 → 44 → 22, release not recorded hatched).
- **Evidence gaps**: completeness per field (photo, sex, ABC status, ARV status, outcome note, review date). Each gap links to a fix-up queue in `/partner/quality`.

**Band C · Where and what is changing**
- **Outcomes**: small multiples by month for closed, transferred, no-action and died, with sparklines. No-action reasons as a band, where "could not locate" links to the map of where that happens.
- **Underserved places**: localities with demand but a high no-action rate, or a long gap since the last field visit, plus the engine's **map next** candidates, *each with its reasons, never a score*.
- **Season**: an annotated sparkline, e.g. "Requests rose to 229 in Nov 2024 and 71 in Nov 2025. Plan for Oct–Nov."
- **Projects needing attention**: each project's progress band, last entry date and next action (§10).
- **Where requests come from**: intake mix (own line, partner group, volunteers, found by team) and the no-action rate per channel. No personal names.

### Day one
The import setup is kept, followed by the dashboard's structure drawn empty and hatched ("Your queue appears here"). No fake numbers.

### Performance
Aggregation moves server-side, run as the signed-in user so RLS applies. The existing `org_operations_snapshot` and `org_followup_snapshot` views are extended (§11) instead of reading every row into the browser.

### Lab ideas reused
System `Ngo`, `OpsBoard`, `Lanes`, `Band100`, triage defaults, `mapNext` with reasons.

### Real data surfaced
Status vocabulary, conditions → triage, open-case ages, follow-up statuses, TVT and ABC sheets, completeness, monthly series, no-action reasons, intake channel, projects/campaigns.

### Files
`components/partner/PartnerRecordHome.tsx` (rewrite), `TasksSection`, `lib/partner-record-explorer.ts`, `lib/partner-operational-analytics.ts`, new `lib/ops/{triage,aging,adherence,courses,completeness}.ts`, new `components/ops/*`, SQL view extensions.

---

## 7. Map / spatial architecture

**Routes:** `/map` (public and community) and `/partner/map` (NGO), one engine · **Priority:** 4, the signature feature · **Complexity:** XL · **Risk:** the highest in the plan

### What exists now
MapLibre on OpenFreeMap (with a CARTO fallback), GL clustering with photo icons, the India mask, the Chennai ward choropleth, state coverage dots, feeding zones, field-activity dots, a 3D tilt toggle, filters (all / needs help / sterilised / vaccinated), four lenses with top-5 square-bin hotspots, an animal drawer, and "Report here". `/partner/map` separately has case and animal layers, eight lenses, a category filter and a hotspot list.

### What is weak
- Pins, where most records are locality centroids (146 on one point).
- Square-degree bins are not equal-area and are not the same on the two maps.
- "ABC/ARV gaps" treat unknown as not done.
- There is no concept of coverage, the unmapped or the frontier, no time, and no link to analytics.
- Inline styles and blur panels.
- Two implementations.
- Every row is loaded to the client.

### What must stay
MapLibre with the keyless OpenFreeMap basemap and CARTO fallback, GL clustering for exact points, select → detail → profile, Report here, URL `lat/lng/bbox`, search → area framing, ward choropleth where wards exist, the India fit and mask, feeding-zone and field-activity layers, geolocate, Escape handling, phone layout.

### The new architecture

**7.1 One spatial engine** in `src/lib/spatial/`. The lab's `engine.ts` is ported, tested and hardened:
- `cellOf` (H3 via `h3-js`), coverage classes (strong / partial / weak / insufficient / unmapped, using the lab's thresholds, made configurable), `frontier` (two rings beyond recorded cells), `mapNext` (candidates with **reasons**), time slicing (`what was true at month t`), and filters.
- **Resolution**: res 8 (≈0.74 km²) for the unit of place, res 7 for city overviews, res 6 for national views.

**7.2 A server-side index.** The client never receives every row.
- **Phase 1** (now, ~2.4k animals): `/api/spatial/cells` computes cell stats with `h3-js` from exact coordinates, server-side. It is cached with `unstable_cache` and revalidated on write (report, case, import) and every 10 minutes. **The public scope** returns aggregates only; cells with 1–2 animals are classed "few records" without an exact count; pins stay at today's 0.01° rounding. **The org scope** runs under the member's RLS.
- **Phase 2** (from ~50k rows): persist `h3_r8` on `dogs`, `cases` and `sightings`, filled in the application on write plus a backfill, and move aggregation into SQL views (§11).
- `/api/spatial/points?cell=` returns the animals in a cell, rounded publicly.

**7.3 Modes: one question each** (from the lab), with the question printed under the mode name:

| Mode | The question | Encoding |
|---|---|---|
| Animals | Which animals are recorded here? | Clusters for exact records, locality stacks for approximate ones, individual animals at street zoom |
| Density | Where are the most animals *recorded*? | Sequential blue fill; optional subtle extrusion in tilt |
| Coverage | How well do we know each place? | Coverage classes plus a dashed frontier, "not mapped ≠ no dogs" |
| ABC | Where is sterilisation recorded, and where is it unknown? | Inner hex scaled by recorded share; remainder hatched |
| ARV | Where is vaccination recorded, and where is it due? | As ABC, plus "due" (more than 12 months since the last dose) |
| Medical | Where are injured and sick animals? | Flame intensity for injured, needs help and medical |
| Cases | Where is open and urgent work? | Open cases in flame, critical ringed, age as opacity |
| Projects (org) | Where are our projects, and how far along? | Project areas outlined, with progress |

A line under every legend reads: **"Recorded animals, not population."**

**7.4 Progressive disclosure**
- The surface shows shapes and colour only.
- Selecting a **city / locality / cell / cluster / dog** opens the `Inspector` (side panel on desktop, bottom sheet on phone). It holds the numbers, a sparkline, the coverage class and reasons, "Open in analytics", and "Report here".
- `ScaleLadder` breadcrumbs move between levels.

**7.5 Time**
- A month scrubber (Jan 2024 → now) replays the index.
- A **compare** toggle draws period A against period B (before/after).

**7.6 Linked to analytics**
- The URL state `?mode=&cell=&t=&from=&to=&f=` is shared with `/insights` and `/partner/reports`.
- Selecting an area on the map recomputes analytics. Changing an analytics filter recolours the map.

**7.7 2D Intelligence | 3D City**
- A segmented toggle. 3D is lazy-loaded.
- **3D City (a)**: Google Photorealistic 3D Tiles in CesiumJS, loaded from the CDN only when opened, *if* a key is configured and photogrammetry exists near the focus. The lab's coverage test is reused.
- **3D City (b)**, the fallback: satellite imagery plus **OpenStreetMap building footprints**. **Only buildings with a recorded height are extruded; the rest are drawn flat as footprints.** Nothing is generated. Each view states its source.
- A camera ladder: **Dog → Cluster → Locality → City**.

**7.8 View in City**
- Profile → `/map?focus=animal:<id>&view=3d` opens on the city, travels to the dog, and highlights its cell and neighbours.

**7.9 Rendering**
- MapLibre-native layers: `fill`, `line`, `fill-extrusion` from GeoJSON hex rings supplied by the server.
- **No deck.gl in production.** The lab needed a separate overlay canvas, which breaks occlusion in tilt and adds roughly 300 KB. `h3-js` stays server-side, so the client bundle does not grow by it.

**7.10 One component, two scopes**
- `<SpatialMap scope="public" | "org">` replaces both `MapView` and `PartnerMap`. `MapLibreMap.tsx` is split into layer modules (`layers/cells`, `layers/points`, `layers/wards`, `layers/feeding`, `layers/activity`).

### Risks and mitigation
The whole rebuild lands on `/map?v=2` first, with a parity checklist (every current control, filter and link still reachable). The switch happens only after the parity checks and the performance check both pass.

**Boundary depiction**: the national view keeps the existing India mask and its source, because government readers are sensitive to boundary depiction.

### Files
`components/map/*` (split and rewritten), `components/partner/PartnerMap.tsx` (replaced), new `lib/spatial/{engine,index,coverage,next,time,server}.ts`, `app/api/spatial/{cells,points}/route.ts`, `app/map/page.tsx`, `app/partner/map/page.tsx`, `map.css`. Dependency: `h3-js`. Optional and lazy: Cesium from the CDN.

---

## 8. Analytics architecture

**Routes:** `/insights` (public) and `/partner/reports` (NGO) · **Priority:** 5 · **Complexity:** L · **Risk:** medium (correctness and honesty)

### What exists now
- `/insights`: sourced national cards (rabies reported vs modelled, livestock-census population, ABC coverage places, data-gap meters).
- `/partner/reports`: four metric tiles, recurring-problem bars, concentrations, no-action places, follow-up workload, "repeat animals", care delivered, missing/escaped, exports.
- `OperationalInsights`: six bar lists.
- `/explore`, `/gaps`, `/wards` and `/the-data` hold national and ward material.

### What is weak
- Everything is a bar list: no time, no map link, no cross-filtering.
- "Repeat animals" is meaningless for this data (§1.9).
- There is nothing on response, adherence, seasonality or completeness.
- The national context is disconnected from StrayPaw's own register.

### What must stay
Every national card on `/insights` (it becomes a chapter), `ExportStudio`, the evidence workbook, the government report, story packs, the note "signals from your records, not population estimates", and `/explore` / `/gaps` / `/wards` as they are.

### What changes: a question-led report, the same chapters in both scopes

Each chapter opens with its question and ends with "See on the map". The public scope is city and locality aggregates with minimum-count suppression; the org scope is the organisation's own records with drill-through.

| # | Chapter | The question | Visual form (real data) |
|---|---|---|---|
| 1 | **What happens** | Which conditions end without action? | Condition × outcome explorer: rows are conditions, each a `ShareBand` with no-action in ink and not recorded hatched. Select a row → small multiples by year |
| 2 | **When** | When does demand rise? | Annotated monthly timeline (Oct–Nov peaks marked); year-over-year small multiples; caveat on falling totals |
| 3 | **Response** | How fast does work start, and is it followed up? | Request → rescue-plan distribution (same day / 1–3 / 4–7 / 8–30 / 31+); rescue → review interval; follow-up adherence band. **No time-to-resolve for imported records** |
| 4 | **Where** | Where does demand concentrate, and where does it fail? | Linked hex mini-maps: the footprint of field work per year on the same cells; a no-action map; a could-not-locate map; a locality dot plot (records vs coverage class) |
| 5 | **Intervention** | How much ABC and ARV is recorded, and are programmes finishing? | Recorded-share bands; ABC drive funnel; TVT course completion; before/after for project areas |
| 6 | **Evidence quality** | What don't we know? | Field completeness bars with hatch; "record next" suggestions |
| 7 | **Who works where** (public) | Which organisations are active in which places? | Organisation footprints as cells; activity sparklines |
| 8 | **National context** (public) | How does this compare with what India publishes? | The existing sourced cards, preserved |

**Interactions**
- A **global filter bar** (place via `ScaleLadder`, period, condition, source, organisation) synced to the URL.
- Brushing the timeline filters every chapter and the linked map.
- Selecting a cell or locality on any mini-map cross-filters the page.
- Every chart has an accessible table alternative, and a CSV/PNG export for funders.

**Rendering**
- Hand-built SVG components in `components/viz/`. Only `d3-scale` and `d3-shape` are allowed as small helpers. No charting framework, so everything matches the tokens.

**Measure functions**
- Measures live in `lib/analytics/measures.ts`. They are pure and tested, and every one returns `{ known, unknown, total }`, never a bare number, so the hatch is always possible.

### Lab ideas reused
System `Analytics` (the chapter index: what happens / when / response / where / intervention / evidence), `ConditionExplorer`, `Coverage` ↔ map, per-year footprint cells.

### Files
`app/insights/page.tsx`, `app/partner/reports/page.tsx`, `components/partner/{ReportsClient,OperationalInsights}.tsx` (replaced), `lib/case-insights.ts`, `lib/partner-operational-analytics.ts`, new `lib/analytics/*`, new `components/viz/*`, SQL aggregate views (§11).

---

## 9. Dog / animal profile

**Routes:** `/dog/[id]` (public) and `/partner/animals/[id]` (NGO), one layout · **Priority:** 6 · **Complexity:** L · **Risk:** low–medium

### What exists now
- **Public**: a rounded white card with a photograph (or a flat colour when there is none, which is 96% of records), a status pill, name, locality, intro text, three stats (Rescue / Care / Outcome), a vertical "What happened" list of the latest 7 events, and IDs. Its JSON-LD is good.
- **NGO**: `AnimalRecord` in tabs (overview / medical / cases / timeline / photos) with editing.

### What is weak
- A stack of cards: no place, no map, no ABC/ARV state, no sightings, no unresolved work.
- The flat colour block is the dominant visual for 96% of animals.
- **Follow, share, comment and export are missing** from the live page (§1.11).
- Two unrelated designs for the same animal.

### What must stay
The JSON-LD with no coordinates, the privacy stance (locality only), the StrayPaw ID and source ID, the full event history (cases, medical events, follow-ups, timeline, imported rows), `/stories` as the back link, and every NGO edit action (status, medical event, owner, assignee).

### What changes: a living record, one composition, two scopes

1. **Identity masthead**
   - The photograph. With no photograph, a **`PlacePlate`**: the animal's cell and locality drawn from real geometry, with "No photograph on record · add one".
   - Name or label, **StrayPaw ID** in mono, source ID, and species / sex / colour, each showing "not recorded" where it is.
   - A `RecordLine` showing where this animal stands: Reported → Recorded → Case open → Outcome.
2. **What is known**: one row of four cells.
   - **ABC**: date and by whom, or hatched "not recorded".
   - **ARV**: last dose and when the next is due.
   - **Health**: open case or last treatment.
   - **Last seen**: date, place, and whether it was a resident or a field team.
   - Each cell carries its provenance.
3. **Where**: a micro-map of the cell and its neighbours, a precision statement ("locality-level, from an imported register" or "reported at this spot"), `ScaleLadder`, and **View in City** → `/map?focus=animal:<id>&view=3d`. Also "N other animals recorded in this cell".
4. **Care lanes** (lab `Lanes`): sightings, case, treatment / TVT doses, ABC, ARV and follow-ups on a single time axis. The case bar runs flame while open and blue once closed. Expected items (next dose, review) are dashed.
5. **Unresolved**: an overdue follow-up, an open case, a dose due, missing evidence (no photo, sex, release date), each with its action.
6. **Chronology register**: every entry dated, with its **provenance**, e.g. "resident report", "field team", "imported register · Rescue Requests 2025, row 812". This makes the record citable.
7. **Organisations involved**, evidence (photos and documents), community comments.
8. **Actions**: *Follow* and *Share* (restored), *Report a sighting of this animal* (pre-filled), *Add a photo*, *Add an observation* (ear notch / collar, one tap), *Export record*. The NGO scope adds edit, add medical event, open case, schedule follow-up, and **"possible same animal"** suggestions (human-confirmed).

**Phone**: masthead, then state row, then unresolved, then lanes (horizontally scrollable inside their own container), then the register.

### Lab ideas reused
System `Animal`, `Lanes`, `LineStory`, spatial "View in City"; the Atlas photograph and place composition; Civic's explicit not-recorded states.

### Real data surfaced
`getDogProfile`, `getCasesForDog`, `getProfileOperationalRecord` (medical, follow-ups, timeline, imported rows), `getPublicAnimalIdentity`, sightings, cell neighbours, organisation.

### Files
`app/dog/[id]/page.tsx`, `components/dog/UnifiedAnimalProfile.tsx` → `components/record/AnimalRecord*`, reusing `FollowButton`, `ShareDog`, `AddComment`, `RecordExportActions` and `AnimalDocuments`; `app/partner/animals/[id]/page.tsx` and `components/partner/AnimalRecord.tsx` (they share the new layout with an editing layer); `lib/animal-profile-record.ts`. Deleted: `AnimalStoryProfile`, `DogStatusEditor`, `DogActions`, `SightingTimeline`, `DogLocation` (their live parts are absorbed).

---

## 10. Cases, organisations, projects, navigation

### Cases
**Complexity:** M.
- **One case record** (`CaseWorkspace` redesigned), rendered by both route families. The URLs stay.
- The record shows its `RecordLine` stage, triage class, age, condition (raw and normalised), a place micro-map, the animal identity link, a `Register` timeline, a follow-up lane, before/after evidence and cost.
- **A closure reason is required** when closing without action (could not locate / died before arrival / recovered / caller unreachable / other NGO / not attended / other).
- **Case list**: a register grouped by triage class with age bars. Filters mirror the map's. There is a bulk stale-case review.

### Organisations
**Complexity:** M.
- `/org/[slug]` gains the organisation's **footprint**: the cells it has worked in (public aggregates), an activity sparkline, programmes and projects with progress bands, verified status and partners.
- `/orgs` becomes a register with a footprint glyph per organisation.

### Projects
**Complexity:** L (needs schema).
- Today, projects are surveys carrying a `PROJECT_MARKER`, programmes are `campaigns`, drives are `vet_camps`, and surveys are separate.
- The plan: one `projects` model with **type templates** drawn from the real sheets: ABC drive (enrolled / admitted / released / re-appointment), ARV drive, TVT dose programme, census survey, feeding programme, custom register.
- Each project gets an **area** (a set of cells), targets, fields and a status.
- The project page has an area map, progress band, register, before/after for its area, and export.
- Existing marker-surveys and campaigns are migrated without loss. `ProjectTabs` and `Project` from the lab inform the layout.

### Navigation
**Complexity:** S.
- Both spaces keep their current nav items. The NGO nav's "Reports" label becomes **"Analysis"** (the URL stays `/partner/reports`).
- `ScaleLadder` becomes the place context on the map, analytics, profile and community home.
- The public header gains **"Map"**, since the signature feature is currently only linked from the hero.
- `/following` content surfaces on the community home.
- The phone tab bar is unchanged.

### Visual consistency across the rest of the app
Every remaining page gets the token pass (type scale, no inline hex, no `bark`/`paw`), but no redesign. This covers `/report`, `/stories`, `/feed`, the marketing pages and `/partner/*` subviews.

---

## 11. Data / schema changes

All changes are **additive and idempotent**, which keeps the promise in `REVERT.md`. Every one is reviewed with `db:security:matrix` and `db:security:audit`, and none exposes intake names, reporter identity, or exact coordinates for approximate records.

| # | Change | Why (data finding) |
|---|---|---|
| 1 | **Backfill `dogs.city` / `dogs.state` and `cases.city`** from `import_location_cache`, with a fallback of coordinates → city | The ladder needs a city, and it is empty on 2,363 rows (§1.7) |
| 2 | `cases.location_precision` and `sightings.location_precision` (`dogs` already has it) | Map and profile precision statements (§1.7) |
| 3 | **`cases.first_action_at`**, backfilled from the workbook's Rescue Plan date via `source_metadata.normalized` | The only honest response measure (§1.4) |
| 4 | **`cases.resolved_at_source`** (`recorded` / `import_assumed`) | Hides the fake time-to-resolve for imports without deleting data (§1.4) |
| 5 | **`cases.closure_reason`** (text enum), backfilled by parsing progress notes; unparsed rows stay `unspecified` | No-action analysis (§1.2) |
| 6 | **`cases.intake_channel`** (`own_line` / `partner_group` / `volunteer` / `team_found` / `other`). The raw name stays private in `source_metadata` | Referral-network analytics (§1.1) |
| 7 | **Triage mapping** in `ngos.config.triage` (defaults from §1.3). Derived at read time, not stored per case | An editable default, not a hard-coded rule |
| 8 | **Courses**: `animal_followups.course_id` / `course_kind` / `expected_at` for TVT and ARV dose series | Dose lanes and missed-dose tracking (§1.6) |
| 9 | **Drive enrolment**: `project_enrolments` (`project_id`, `dog_id`, `admitted_at`, `released_at`, `reappointment_at`) | ABC drive funnel (§1.6) |
| 10 | **`projects`** + `project_entries` (`kind`, `area_cells`, `targets`, `fields`, `status`, `public_visibility`). Marker-surveys and `campaigns` are migrated | Real projects (§10) |
| 11 | **`identity_candidates`** (`dog_a`, `dog_b`, `reasons`, `status`: suggested / confirmed / rejected). A human always confirms | Repeat animals without auto-merge (§1.9) |
| 12 | Sighting observation: `ear_notch_seen` and `collar_seen` (`yes` / `no` / `didn't look`) alongside the existing statuses | Residents as ABC/ARV evidence (§1.8) |
| 13 | View **`public_spatial_points`** (id, rounded lat/lng, precision, flags, first/last dates, city) for the spatial API | Server aggregation without `select *` |
| 14 | Extend **`org_operations_snapshot`**: age buckets, triage counts, adherence, completeness | Server-side dashboard (§6) |
| 15 | Public aggregate views, `public_condition_outcome_month` and `public_completeness`, with minimum-count suppression | Public analytics (§8) |
| 16 | **Phase 2 only**: `h3_r8` columns on `dogs`, `cases` and `sightings` plus index, filled by the app and backfilled | Scale beyond ~50k rows (§7.2) |

The importer (`lib/master-import/*`) learns items 3, 5, 6, 8 and 9, so future workbooks arrive complete. Its classification and identity rules are not changed.

---

## 12. Migration order

Each phase is one or more PRs, each shippable and verified on the production build. Nothing lands as a big bang. The order puts the priorities you named early while respecting dependencies.

| Phase | Work | Depends on | Size |
|---|---|---|---|
| **P0 · Foundations** (no visual change) | Tokens (type scale, data-viz, coverage, hatch, cartography); `components/system/*` primitives; `lib/spatial` engine port plus tests; `/api/spatial/*`; schema items 1–6, 12–13 with backfills; the skill's "Data and space" chapter | none | L |
| **P1 · Hero + landing** | §4. Uses server-computed cells as SVG, so it does not need the new map | P0 | L |
| **P2 · Map v2** | §7 behind `/map?v=2`; parity, then switch `/map` and `/partner/map` | P0 | XL |
| **P3 · NGO dashboard** | §6; schema items 7, 14; stale-case review tool | P0, P2 (ops map) | XL |
| **P4 · Dog profile** | §9; restores follow/share/comment; View in City (2D until P7) | P0, P2 | L |
| **P5 · Analytics** | §8, partner first, then public `/insights`; schema item 15; map ↔ analytics linking | P2, P3 measures | L |
| **P6 · Community home** | §5; patch map; your animals; observations | P2, P4 | M |
| **P7 · 3D City** | §7.7; OSM fallback first, Photorealistic if you approve a key | P2 | M |
| **P8 · Secondary** | Cases (closure reason, register), orgs (footprints), projects (schema items 8–11, migration), nav | P0–P5 | L |
| **P9 · Clean-up** | Delete dead components; shrink `app.css`, `site.css` and `field-site.css`; remove `bark`/`paw` from touched files; token pass on remaining pages | all | M |

---

## 13. Testing strategy

- **Unit tests**, in the repo's existing `scripts/test-*.ts` pattern with new npm scripts:
  - `test:spatial`: cell assignment, coverage classes, frontier, map-next reasons, time slicing, public suppression.
  - `test:ops`: triage mapping, age buckets, adherence, course expectations.
  - `test:analytics`: every measure returns `{known, unknown, total}`, and **unknown is never counted as zero**.
  - `test:taxonomy`: closure-reason and intake-channel parsers, run against the real vocabulary lists in §1.
- **SQL**: migrations re-run idempotently; `test:sql-rpc-mapping` for new RPCs; `db:security:matrix` asserts that anon cannot read intake names, reporter identity or unrounded coordinates, and that every public aggregate view suppresses small counts.
- **Parity checklists**: one per rewritten surface, listing every current control and link. A reviewer ticks each one on the preview build before the switch.
- **Playwright** (extending `e2e/design.spec.ts`):
  - Each priority route at **320 / 360 / 390 / 1280**: zero horizontal overflow, ≥44 px coarse-pointer targets.
  - Map: mode switch, cell selection opens the Inspector, URL state round-trips, map ↔ analytics linking.
  - Profile → View in City lands focused on the animal.
  - Dashboard: queue ↔ cell highlighting.
  - A reduced-motion pass.
- **Visual snapshots**: per surface per width, stored as CI artefacts and reviewed by a person (not auto-failing at first).
- **Performance budgets**: `/` LCP < 2.5 s on throttled mobile with no map library in the landing bundle; the `/map` chunk is budgeted and checked in CI; the `/api/spatial/cells` payload stays under 150 KB gzipped for a city.
- **Accessibility**: axe on every surface; each chart has a table alternative; the map has a keyboard-reachable list of cells; `audit:contrast` runs on the new tokens.
- **Build**: verified on `next build && next start`, never only dev, per the design skill. `check:fixtures` still gates the build.

---

## 14. What will NOT change

- **Flows**: the report flow (steps, optional photo, location picker, animal matching); access codes and sign-in; `PartnerGate`; the separate community and NGO spaces with Switch space; the entry tour; moderation; admin.
- **The import pipeline's semantics**: classification, identity rules, staging, resume, rollback. It gains fields and changes no behaviour.
- **Case lifecycle statuses** and the enum values stored today.
- **Security and privacy**: the RLS model, public rounding to 0.01°, no coordinates in JSON-LD, reporter identity never public, the **no-auto-merge** policy.
- **URLs**: every existing route keeps working. Any merge uses redirects only.
- **Brand**: name, mark, headline wording, fonts (DM Sans / Instrument Serif / DM Mono), colour tokens (extended, never recoloured).
- **Map stack**: MapLibre with the keyless OpenFreeMap and CARTO fallback (restyled, not replaced).
- **i18n**: the five languages and the dictionary structure.
- **Out of scope beyond a token pass**: fundraisers, education, feeding, surveys, volunteers, stories, feed, and the marketing and legal pages.
- **The lab**: no `/lab` route or lab component ships. The lab branch stays unmerged as a reference. The Journal direction is not used.
- **The database**: no drops or renames, only additions.

---

## 15. Decisions needed from you

1. **Sample-city framing.** Depth exists only for Coimbatore. May the landing page and public analytics name Coimbatore as the sample city, while keeping the partner organisation unnamed as the lab did? (Recommended: yes.)
2. **3D City source.** Google Photorealistic 3D Tiles needs a Google Maps Platform key with billing and Google's attribution. Approve it, or ship the OpenStreetMap-footprint 3D only? (Recommended: ship OSM first and add Google once the lab's coverage test passes for Coimbatore and Delhi.)
3. **Stale open cases.** 92 "in progress" cases are older than nine months. Build the review-and-close tool for the organisation to use? (Recommended: yes, and never close automatically.)
4. **Imported `resolved_at`.** Flag it as `import_assumed` and hide time-to-resolve for those records? (Recommended: yes. The data is not deleted.)
5. **Public cell detail.** Should cells with 1–2 animals show publicly as "few records" without an exact count? (Recommended: yes.)
6. **Order.** Hero first (P1) and then Map (P2)? Or Map first, since the hero, dashboard and profile all reuse it? (Recommended: as written. The hero does not need the new map, so it can go first.)
