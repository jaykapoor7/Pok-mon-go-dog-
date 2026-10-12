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
| Coimbatore missed follow-ups: on confirmed-open requests · history | 1 · 216 | 1 · 216 | ✔ fix 4 |
| Coimbatore timeline: opened · closed with a recorded date · dated care | 2,156 · 1,997 · 1,541 | 2,156 · 1,997 · 1,541 | ✔ no assumed closing dates, no undated care, no future dates |
| Open requests by organisation (Coimbatore) | 172 | 172 | ✔ every open request has a responsible organisation |
| Requests placed in an area | 2,281 | 2,281 (0 without an area) | ✔ |

## Fixes made

1. **90 Lucknow requests have no status class.** The first version counted them as "requests recorded, none open". They are now their own group, *status not recorded*, which is hatched as unknown. They are never shown as closed.
2. **4 open requests have no city** (RS Puram ×3 and Nava India, Coimbatore localities, September 2026). They were missing from the map. They are now listed as *requests waiting to be placed* (`public_map_unplaced()`) in the national view and in Work next, because placing them is itself an action.

3. **"172 open, unassigned" was an import artefact.** Of Coimbatore's 172 open requests, 169 come from one Pawsome workbook imported on 16–17 Sept 2026. That register had no assignee column, none of the 169 has been status-reviewed, and none was touched after the import day. Showing them as "172 waiting, 172 nobody holds" overstated both. They are now *open in an imported register, unconfirmed* (167 of them older than 30 days), with their own Work next rule, "Review their status". Only the 3 requests confirmed in StrayPaw count as waiting. "Nobody holds" counts only requests created in StrayPaw.

4. **Missed follow-ups were history, not current work.** All 221 missed follow-ups on record came from the same September 2026 import, and 199 sit on requests already closed. Coimbatore showed 217 missed follow-ups across 72 areas as attention. Now only a recheck missed on a request confirmed open counts (`public_map_followups_live`, `org_map_followups_live`); in Coimbatore that is 1. The rest are shown as "missed before the request closed". The 27 imported "upcoming" follow-ups are due in 2024 and have no request attached, so they never reached the map.
5. **"100% sterilised" was 100% of a tiny known share.** Coimbatore's register records sterilisation only as "yes". The care figure is now the share of all animals recorded sterilised (5%), with the share not known named beside it (95%).

## Exclusions that are deliberate

- **Timeline closing dates** count only closures with a recorded date (`resolved_at_source <> 'assumed'`). An assumed date is never placed in time.
- **Care without a date** is counted in the totals but never on the timeline. When a period is selected, it is shown hatched as "recorded without dates".
- **The clinical register** (Jamshedpur, 20,915) is in the national totals table but drawn hollow. It is never added to street-animal profiles (9,373).
- **Vaccination** has no recorded "no" in the data, so a missing record is always "not recorded", never "unvaccinated".

## Classification guarantees

Each question assigns every area to exactly one class, and the legend counts are those assignments. The headline sentences read the same totals. The city reading's area counts therefore always sum to the city's number of recorded areas (254 in Coimbatore).

## Signed-in organisation map and persona tests (production, 12 Oct 2026)

These ran on www.straypaw.org. The organisation tests used a temporary member login on the "StrayPaw Production QA Demo" organisation, which is in demo mode, with four demo animals and four requests in RS Puram, Coimbatore. Demo rows never reach the public views: public totals stayed at 30,288 · 2,285 · 179 throughout. The login and fixtures were deleted afterwards.

| Check | Result |
|---|---|
| Org reads: no token · bad token · member token | 401 · 401 · 200 `private, no-store` |
| Another organisation's member sees the QA records | No (0 rows); anonymous `org_map_*` is permission denied |
| Take this case (own organisation's request) | **Was broken:** `claim_case` only took unowned reports. Fixed with `take_case` (own or unowned, only while nobody holds it, always as the signed-in user). Verified on desktop and phone. |
| Case link from the map | Opens the case file, now showing who holds it |
| Follow-ups link | Lists the demo dressing change due this week |

| Persona | Task | Result |
|---|---|---|
| Resident (phone) | What is happening near me, and how do I help? | Story figures in 1–2 s. **Was broken:** searching a neighbourhood from India found nothing. Localities are now searched nationally, and one search opens the area with all three stories and "Report an animal here". |
| Municipal official (desktop) | Which wards need attention or coverage? A list for a meeting? | **Was broken:** hotspot links passed the ward as `?q=` and it was dropped. `?place=` now opens the ward's area (1.5 s). Sterilisation coverage by locality, confirmed places, status-review list and CSV download all work. |
| NGO manager (desktop) | What is unassigned, and who holds what? | Work next in about 3 s, with holders named. "Assign them" opens the register filtered to that locality's unassigned requests. |
| NGO field worker (phone) | What is next, and can I take it now? | Work next, then area, then Take; the request shows "Held by" at once. |
