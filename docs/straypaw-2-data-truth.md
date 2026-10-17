# StrayPaw 2.0 — data truth

What 2.0 reads, how much of it, and what it refuses to claim. No migration was
written or run; 2.0 reads the same views and RPCs as 1.0.

## Bounded reads

| Surface | Read | Bound |
|---|---|---|
| Atlas, national | `/api/livingmap?kind=cities` (`getMapCities`) | city rollups only |
| Atlas, city | `/api/livingmap?city=` | one city's H3 area aggregates |
| Atlas, area | `/api/livingmap?kind=area&h3=` | one area's animals and requests |
| NGO map | same endpoints with `scope=org` and the member's bearer token | the organisation's own records, `no-store` |
| Insights, City report | `/api/spatial?kind=dataset&city=` via `src/sp/data/spatial.ts` | **capped**: the latest 800 animal profiles, 1,200 requests, 900 care events, 900 sightings per city |
| NGO register | `org_animals` RPC | 100 per page |
| Work | `openCases`, `dueFollowups`, `orgOpenWorkCells` | organisation scope under RLS |
| Stories | `public_case_stories` | 24 per page, cursor pagination |
| Programmes | `public_programme_cards` | 250 |

No page fetches the whole register.

## The capped dataset is disclosed

Insights and the City report compute from the bounded city dataset. When it
holds fewer requests or profiles than the city's authoritative totals (from the
city index), every finding says so in its method ("Loaded: the most recent
1,000 of 2,160 requests…"), the page shows a hatched **Loaded scope** note, the
period control reads "Loaded record" instead of "Whole record", and claims say
"of the 1,000 most recent requests loaded". Example verified: Coimbatore
(1,000 of 2,160 requests; 800 of 2,242 profiles).

## Units are never added together

Animal profiles, requests (cases), sightings and care events are different
units. Organisation pages, programme pages and findings name the unit beside
every figure; the Academy teaches it ("Count the right thing"). A programme's
headline figure says "vaccinated" or "sterilised" only when that was recorded,
otherwise "animals on record" or "records".

## Unknown is not no

Sterilisation, vaccination, outcome, first-action date and closure reason are
each shown as yes / no / **not recorded**, the last hatched. Filters keep
"Not recorded" separate from "Recorded not". Nothing unknown is drawn as zero;
a failed read is shown as "Not read", never as an empty list.

## Places

- Public pages show an **area** (H3 res 8, ≈0.74 km²) or a **locality**, never a
  spot. `publicLocality()` drops address fragments with digits or street words.
- Jamshedpur's clinical register sits at a city centroid: drawn hollow at city
  level, never as areas, excluded from locality findings.
- Ranchi campaign GPS describes the campaign footprint, not a census.
- Coimbatore rescue places are mostly approximate localities; dots inside an
  area are schematic.
- Feeding spots: the pin stays on the server; public pages receive the H3 area
  only (`src/sp/community/more/spots.ts`).
- Counts of one or two in a public locality table read "few" (`fewOr`).

## Identity

One StrayPaw ID per animal. Matches between records are made by people (import
row decisions, moderation "approve as that animal"), with a warning that a
likeness alone never merges two animals. A reviewed, reversible identity-merge
tool needs backend support that does not exist; it is not offered.

## Clinical claims

Care events are labelled "recorded by an organisation". A vet named in a note
is not an authenticated sign-off; clinician sign-off is not offered because no
backend supports it.

## Writes

All writes go through existing, server-authorised RPCs and routes, wrapped by
`src/sp/data/work.ts`, which returns a receipt only from the database's answer.
With no database connection the receipt is a failure ("Not connected… Nothing
was saved"); demo ids such as `demo-event`, `demo-case`, `demo-zone` are treated
as **not saved**.

## Sensitive photographs

Case, medical, incoming-report and needs-help photographs start covered by a
veil ("This photo may show an injury · Tap to view"), remembered for the session.
