/* ════════════════════════════════════════════════════════════════════
   Municipal findings, read in place (references 09 GFW, 10 City Layers).

   Each finding is a sentence about the city's own complete area
   aggregates (not the capped sample), with its method and the exact
   areas it rests on, so "Show on the map" can light those areas and
   nothing else. Nothing here estimates a population or a coverage
   share; every count is of records.
   ════════════════════════════════════════════════════════════════════ */

import type { MapCell } from "@/lib/livingmap/types";
import { lastRecorded } from "./recency";

export type CityFinding = { id: string; n: number; lead: string; detail: string; method: string; cells: string[]; tone: "act" | "gap" | "care" | "quiet" };

const f = (n: number) => n.toLocaleString("en-IN");
const DAY = 86_400_000;
const pl = (n: number, one: string, many = `${one}s`) => `${f(n)} ${n === 1 ? one : many}`;

export function cityFindings(cells: MapCell[], now = Date.now()): CityFinding[] {
  const out: CityFinding[] = [];
  const pick = (pred: (c: MapCell) => boolean) => cells.filter(pred);
  const sum = (xs: MapCell[], k: (c: MapCell) => number) => xs.reduce((s, c) => s + k(c), 0);

  const open = pick((c) => c.open_cases - (c.open_unconfirmed ?? 0) > 0);
  const openNoCare = open.filter((c) => c.care_12m === 0);
  if (open.length) out.push({ id: "open-no-care", n: openNoCare.length, tone: "act",
    lead: `${f(openNoCare.length)} of ${f(open.length)} areas with a confirmed open request have no care recorded in the last 12 months.`,
    detail: `${pl(sum(openNoCare, (c) => c.open_cases - (c.open_unconfirmed ?? 0)), "confirmed open request sits", "confirmed open requests sit")} in these areas. No care recorded is not the same as no care given: it may not have been entered.`,
    method: "Confirmed open requests (imported-and-unconfirmed excluded) · dated care events, 12 months · H3 areas ≈0.74 km²", cells: openNoCare.map((c) => c.h3) });

  const missed = pick((c) => (c.fu_missed_live ?? 0) > 0);
  if (missed.length) out.push({ id: "missed", n: missed.length, tone: "act",
    lead: `${pl(sum(missed, (c) => c.fu_missed_live ?? 0), "recheck was", "rechecks were")} missed on requests that are still open, across ${pl(missed.length, "area")}.`,
    detail: "Missed while the request is open is current work. Missed before a request closed is history and is not counted here.",
    method: "Follow-ups past due without a recorded visit, on open requests · H3 areas", cells: missed.map((c) => c.h3) });

  const known = pick((c) => c.animals >= 5);
  const unknownHeavy = known.filter((c) => c.ster_unknown / c.animals >= 0.8);
  if (known.length) out.push({ id: "ster-unknown", n: unknownHeavy.length, tone: "gap",
    lead: `In ${f(unknownHeavy.length)} of ${f(known.length)} areas with five or more animals, at least 8 in 10 have no sterilisation status recorded.`,
    detail: "These are gaps in the record, not unsterilised animals. ABC figures for these areas cannot be read either way until status is recorded.",
    method: "Animal profiles with sterilisation status 'not recorded' · areas with ≥5 profiles", cells: unknownHeavy.map((c) => c.h3) });

  const quiet = pick((c) => { const l = lastRecorded(c); return !!l && now - Date.parse(l) > 2 * 365 * DAY && c.animals >= 3; });
  if (quiet.length) out.push({ id: "quiet", n: quiet.length, tone: "quiet",
    lead: `${pl(quiet.length, "area")} with three or more animals have had nothing recorded for over two years.`,
    detail: `${f(sum(quiet, (c) => c.animals))} animal profiles there have not been seen, treated or reported since. Quiet records are not absent animals: these are places to revisit.`,
    method: "Latest of sighting, request or care date per area · areas with ≥3 profiles", cells: quiet.map((c) => c.h3) });

  const careAreas = pick((c) => c.care_12m > 0);
  if (careAreas.length) out.push({ id: "care", n: careAreas.length, tone: "care",
    lead: `Care was recorded in ${pl(careAreas.length, "area")} in the last 12 months: ${pl(sum(careAreas, (c) => c.care_12m), "dated care event")}.`,
    detail: "Where care work actually reached, by record. A count of care given, never coverage of a population.",
    method: "Dated care events (sterilisation, vaccination, treatment), 12 months · H3 areas", cells: careAreas.map((c) => c.h3) });

  return out;
}
