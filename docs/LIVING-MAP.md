# The Living Map (`/map`)

One map, four scales, five questions. It is designed around what the record can honestly say, not around layers.

## Scales

| Scale | What you see | Source |
|---|---|---|
| India | One mark per city register, coloured by the kind of record (rescue & care, campaign, clinical register, photo observations, place registers). A clinical register is drawn hollow and is never counted with street profiles. | `public_map_cities()` |
| City | Every recorded area (H3 r8, ≈0.74 km²) as a round mark, classed by the question. Areas bordering the record with nothing in it are hatched dashed rings, showing the edge of reporting. | `public_map_cells(cities)` |
| Area | The disc opens into a seed head: one dot per recorded animal, at **schematic** positions (a sunflower spiral), never locations. The panel lists the area's animals (photos veiled when they may show injury), requests, organisations, its timeline and a comparison. | `public_map_cells`, `public_spatial_animals`, `public_case_facts` for one area |
| Animal | The animal, its status chips and the link to its full history. | the area read |

Marks grow continuously with zoom: at least a legible dot when zoomed out, and exact ground size from z12 on, so the seed head always fits its area.

## Questions

Each question sorts every area into named classes, and each class is one of three kinds:

| Kind | Drawn as | Means |
|---|---|---|
| value | solid colour | something of this kind is recorded here |
| zero | empty ring | the place is on the record and the answer is none |
| unknown | hatched | the record does not say |

| Question | Facets | The care taken |
|---|---|---|
| Animals | all · with photos · resident reports | Thresholds (1–3 … 60+) are fixed, not quantiles, so a class means the same thing in every city. |
| Needs now | open requests · follow-ups | An area with no requests is hatched ("no request is not the same as no need"), never shown as clear. Over 30 days waiting is its own class. |
| Care given | sterilisation · vaccination · treatment | Sterilisation has a real recorded "no". When status is unknown for most animals, the area is hatched rather than counted as unsterilised. Vaccination has no recorded "no", so missing records are always "not recorded", never "unvaccinated". |
| Gaps | — | Stale (nothing in 12 months), status mostly unknown, placed by locality name only, or recent and specific; plus the hatched border of unreported areas. |
| Who's working | — | The leading organisation per area (top six coloured). Areas with two or more organisations are ringed: that is where an animal's history continues across organisations. |

The same classification drives the map colours, the legend (tap a row to show only those areas), the counts, the headline sentences, the locality ranking and the hover labels. The picture and the words cannot disagree.

## Work next: what needs attention, who holds it, what can be done

Work next is the first question. It is a short list of plain rules, not a score, and each rule is one a person could check against the record:

| Rule | Means |
|---|---|
| Requests waiting over 30 days | An animal was reported for help and the request is still open after a month. |
| Open requests nobody holds | Open requests with no one assigned. Organisation map only. |
| Follow-ups missed | Treatment that needed a return visit, recorded as missed. |
| Flagged, no request open | Animals marked as needing help with no request open for them. |
| Requests waiting to be placed | Requests whose place has no city, so they are on no map. |
| Outcome not recorded | Requests with no status at all. |
| Sterilisation status unknown | A well-recorded area where most animals have no recorded status. |
| Nothing new in over a year | Animals are on the record, but nothing has been recorded for a year. |

The list is ordered by rule first, so an animal waiting on someone always comes before a gap in the paperwork, and then by size. Every item says:

- **why:** the rule, with its numbers;
- **who holds the record:** the organisation with the open requests, or on the organisation map the named people who hold them;
- **what can be done:** reporting what you see, sharing the area, and for members links straight into the right workflow (cases in that locality sorted oldest first, unassigned cases, follow-ups, surveys, field visits, a new request).

The list downloads as CSV for a ward meeting or a coordinator's sheet. Every area's panel has a "What needs doing here" block, whatever question is active.

## The organisation's map (`/partner/map`)

This is the same Living Map, opening on Work next and read from the organisation's own records, including those that are not public. It uses `org_map_cities` / `org_map_cells` / `org_map_months`: security definer, filtered to `my_ngo()`, and not executable anonymously. API reads carry the member's token and are never cached.

Members also see:

- who holds each open request;
- the "Open requests nobody holds" rule;
- each request's code, which opens its case file;
- **Take this case** right in the area panel.

## Animals without photographs

99.6% of records have no photo. Each area lists its animals as a register: the photo, or a labelled crop of a public-domain Indian dog painting (never presented as the animal), then what the animal is, when it was last seen, and its own record of care (requests and how many are open, care records, sterilisation, years on the record).

## Speed

- **Snapshots:** `map_snapshots` holds the nation's and every city's read. `refresh_map_snapshots()` rebuilds it every 15 minutes with pg_cron, in about 12 s of database time, from the same public functions. A visitor's read is one row (about 30 ms server-side, against 2–6 s for live aggregation). Live computation is the fallback.
- **No request for the India view:** it is rendered into the page from the server.
- **CDN:** may serve a stale copy for up to a day while it refreshes in the background.
- **Prefetching:** a city starts loading when the pointer rests on it or it takes focus, and is kept in memory for the visit.

## Time

The mirrored timeline shows requests opened above the axis and dated care below it, one column per month. Drag across it, or pick a preset, to read **Needs now → open requests** and **Care given** for that period only.

Care noted on an animal without a date (Ranchi's campaign, for example) can't be placed in time. When a period is selected, those areas are hatched "Care recorded without dates", not shown as zero.

## Integrity rules

- **Complete, uncapped totals.** The previous map read a capped sample of each city (800 animals, 1,200 cases). Coimbatore has 2,242 animals and 2,156 requests, and every figure here counts all of them.
- **One set of definitions.** The national view and every city view use the same SQL definitions, so they agree (for example, Coimbatore's 172 open requests).
- **Nothing finer than an H3 area** reaches the browser. Individual animals are read for one chosen area only, and are drawn at schematic positions.
- **Recorded profiles are not a population estimate.** The panel says so wherever a count appears.
- **Missing city data:** a city with no record shows "no mapped record yet", not an outage message.

## Links

These URLs are shareable: `?city=`, `?q=animals|needs|care|gaps|orgs`, `?f=` (facet), `?area=<h3>`, `?animal=<id>`, `?t=<fromMonth>-<toMonth>`. Month indices count from Jan 2000 = 0.

Older links still work:

- `?mode=coverage|cases|abc|arv|medical|…` opens the matching question.
- `?cell=` opens that area.
- `?lat=&lng=` opens the nearest city and the area containing the point.

## Accessibility and performance

- The panel is the map's accessible form: every place and figure is listed as text and buttons.
- Questions and facets are radio groups; the legend uses toggle buttons; search is a combobox with arrow keys.
- Escape goes up one scale.
- Reduced motion makes camera moves instant.
- Area aggregates run in about 0.2–0.9s in the database and are cached for 10 minutes on the server and the CDN.

## Code

- `src/lib/livingmap/`: `types.ts`, `questions.ts` (the classifications), `reading.ts` (sentences, tallies, localities), `server.ts` (cached reads).
- `src/components/livingmap/`: `LivingMap.tsx` (state, URL, cartography), `Panel.tsx`, `Timeline.tsx`, `Search.tsx`, `geo.ts`, `livingmap.css`.
- `src/app/api/livingmap/route.ts`: `kind=cities | (city) | area | find`.
- Database: `public_map_cities_v2()`, `public_map_cells_v2(text[])`, `public_map_months(text[])`, `public_map_unplaced()` (security invoker, over the public views), `org_map_*` (organisation map) and `map_snapshots` / `refresh_map_snapshots()`. See `supabase/living-map.sql`, `supabase/living-map-org-and-snapshots.sql` and the integrity audit in `docs/LIVING-MAP-AUDIT.md`.
- `src/lib/livingmap/work.ts`: the Work-next rules.

