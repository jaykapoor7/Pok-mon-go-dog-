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
- Database: `public_map_cities()`, `public_map_cells(text[])`, `public_map_months(text[])`. These are security-invoker SQL functions over the public views.

The organisation map (`/partner/map`) still uses the previous component, on the organisation's own scope.
