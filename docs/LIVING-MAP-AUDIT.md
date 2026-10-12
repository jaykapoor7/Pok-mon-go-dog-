# Living Map: data-integrity audit (12 Oct 2026)

Every figure the map shows was checked against direct counts on the public views (`public_spatial_animals`, `public_case_facts`, `public_care_facts`). The checks ran as the anonymous role, so they see exactly what a visitor's map sees. The SQL is in the session log, and each check can be re-run in the Supabase SQL editor under `set local role anon`.

| Check | Map | Direct count | Result |
|---|---|---|---|
| Animals on the record (all cities) | 30,288 | 30,288 (0 without an area) | ✔ |
| Sterilised · recorded not sterilised · unknown | 24,531 · 2,945 · 2,812 | 24,531 · 2,945 · 2,812 | ✔ sums to 30,288 |
| Vaccinated (recorded) | 27,444 | 27,444 | ✔ |
| Flagged needing help | 126 | 126 (no "injured" animal is unflagged) | ✔ |
| Care events | 22,528 (1,427 treatments) | 22,528 | ✔ |
| Requests for help with a city | 2,281 | 2,281 | ✔ |
| Each request in exactly one status group (open · closed · handed on · no action · not recorded) | 2,281 | 2,281 | ✔ after fix 1 |
| Open requests | 175 placed + 4 unplaced | 179 | ✔ after fix 2 |
| Coimbatore: animals · requests · open | 2,242 · 2,156 · 172 | 2,242 · 2,156 · 172 | ✔ national = city |
| Coimbatore open: confirmed · imported, unconfirmed | 3 · 169 | 3 · 169 | ✔ fix 3 |
| Coimbatore timeline: opened · closed with a recorded date · dated care | 2,156 · 1,997 · 1,541 | 2,156 · 1,997 · 1,541 | ✔ no assumed closing dates, no undated care, no future dates |
| Open requests by organisation (Coimbatore) | 172 | 172 | ✔ every open request has a responsible organisation |
| Requests placed in an area | 2,281 | 2,281 (0 without an area) | ✔ |

## Fixes made

1. **90 Lucknow requests have no status class.** The first version counted them as "requests recorded, none open". They are now their own group, *status not recorded*, which is hatched as unknown. They are never shown as closed.
2. **4 open requests have no city** (RS Puram ×3 and Nava India, Coimbatore localities, September 2026). They were missing from the map. They are now listed as *requests waiting to be placed* (`public_map_unplaced()`) in the national view and in Work next, because placing them is itself an action.

3. **"172 open, unassigned" was an import artefact.** Of Coimbatore's 172 open requests, 169 come from one Pawsome workbook imported on 16–17 Sept 2026. That register had no assignee column, none of the 169 has been status-reviewed, and none was touched after the import day. Showing them as "172 waiting, 172 nobody holds" overstated both. They are now *open in an imported register, unconfirmed* (167 of them older than 30 days), with their own Work next rule, "Review their status". Only the 3 requests confirmed in StrayPaw count as waiting. "Nobody holds" counts only requests created in StrayPaw.

## Exclusions that are deliberate

- **Timeline closing dates** count only closures with a recorded date (`resolved_at_source <> 'assumed'`). An assumed date is never placed in time.
- **Care without a date** is counted in the totals but never on the timeline. When a period is selected, it is shown hatched as "recorded without dates".
- **The clinical register** (Jamshedpur, 20,915) is in the national totals table but drawn hollow. It is never added to street-animal profiles (9,373).
- **Vaccination** has no recorded "no" in the data, so a missing record is always "not recorded", never "unvaccinated".

## Classification guarantees

Each question assigns every area to exactly one class, and the legend counts are those assignments. The headline sentences read the same totals. The city reading's area counts therefore always sum to the city's number of recorded areas (254 in Coimbatore).
