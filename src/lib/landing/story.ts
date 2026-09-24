/* ════════════════════════════════════════════════════════════════════
   The landing page's story, computed from the register.

   Every figure and every shape on the landing is derived here, on the
   server, from the same spatial dataset the map reads. The browser gets
   the compact result — a sample city's cells and events, a handful of
   counts — never the register itself.

   The sample city is whichever city holds the most records. Today that
   is Coimbatore, from one partner's rescue register; the page says so,
   and says that StrayPaw is not that city.
   ════════════════════════════════════════════════════════════════════ */

import { cellToBoundary, gridDisk } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { getPublicDataset } from "@/lib/spatial/server";
import { buildIndex, cellStats, NO_FILTERS, robustStart } from "@/lib/spatial/engine";
import { animalKnowledge, casesIn, closureReasons, conditionOutcome, firstAction, statusTotals } from "@/lib/spatial/measures";
import { A_STRIDE, C, C_STRIDE, K, K_STRIDE, countOf, type SpatialDataset } from "@/lib/spatial/types";
import type { StatusClass } from "@/lib/register/taxonomy";

export type LandingStory = Awaited<ReturnType<typeof buildStory>>;

/** The box that holds the middle of a set of cells, trimming far outliers. */
function coreBox(ds: SpatialDataset, cells: number[], lo: number, hi: number, pad: number): [number, number, number, number] {
  if (!cells.length) return [76.8, 10.85, 77.1, 11.15];
  const xs = cells.map((c) => ds.centers[c * 2]).sort((a, b) => a - b);
  const ys = cells.map((c) => ds.centers[c * 2 + 1]).sort((a, b) => a - b);
  const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  return [q(xs, lo) - pad, q(ys, lo) - pad, q(xs, hi) + pad, q(ys, hi) + pad];
}

function buildStory(ds: SpatialDataset, pinky: { id: string; straypaw_id: string | null } | null) {
  const ix = buildIndex(ds);
  const city = 0; // busiest first
  const sample = ds.cities[city];
  const all = { cells: null, from: 0, to: ds.today };
  const allCases = casesIn(ds, all);
  const cityCells = new Set<number>();
  ds.cellCity.forEach((c, i) => { if (c === city) cityCells.add(i); });
  const cityCases = casesIn(ds, { cells: cityCells, from: 0, to: ds.today });

  /* hero: the sample city filling in, one record at a time */
  const cellList = [...cityCells];
  const localIdx = new Map(cellList.map((c, i) => [c, i]));
  const events: number[] = [];
  // Records dated after today are data-entry errors in the source workbook
  // (a follow-up "due" in 2030 marked done). They are left out of anything
  // drawn over time, and counted as an evidence issue instead.
  let futureDated = 0;
  for (let i = 0; i < ix.nCases; i++) {
    const o = i * C_STRIDE, c = ds.cases[o + C.cell], d = ds.cases[o + C.day];
    if (!localIdx.has(c) || d < 0) continue;
    if (d > ds.today) { futureDated++; continue; }
    events.push(localIdx.get(c)!, d, 0);
  }
  for (let i = 0; i < ix.nCare; i++) {
    const o = i * K_STRIDE, c = ds.care[o + K.cell], d = ds.care[o + K.day];
    if (!localIdx.has(c) || d < 0) continue;
    if (d > ds.today) { futureDated++; continue; }
    events.push(localIdx.get(c)!, d, 1);
  }
  // The replay starts where the record really begins; a stray early date
  // (a 2011 vaccination in a 2024 import) joins the first frame instead of
  // stretching the replay across empty years.
  const start = robustStart(Array.from({ length: events.length / 3 }, (_, i) => events[i * 3 + 1]));
  for (let i = 1; i < events.length; i += 3) if (events[i] < start) events[i] = start;
  // sort by day
  const order = Array.from({ length: events.length / 3 }, (_, i) => i).sort((a, b) => events[a * 3 + 1] - events[b * 3 + 1]);
  const sorted: number[] = [];
  for (const i of order) sorted.push(events[i * 3], events[i * 3 + 1], events[i * 3 + 2]);

  const hero = {
    city: sample?.name ?? "",
    state: sample?.state ?? "",
    box: coreBox(ds, cellList, 0.04, 0.96, 0.012),
    rings: cellList.map((c) => ds.rings[c]),
    events: sorted,
    futureDated,
  };

  /* the flow: where the requests went */
  const status = statusTotals(ds, allCases);
  const reasons = closureReasons(ds, allCases);
  const flow = {
    requests: allCases.length,
    status: status as Record<StatusClass, number>,
    reasons: reasons.parts,
    noActionTotal: reasons.total,
    firstAction: firstAction(ds, allCases),
  };

  /* every request, a square */
  const conditions = conditionOutcome(ds, allCases).map((r) => ({ condition: r.condition, total: r.total, by: r.by }));

  /* the scale ladder: one well-recorded cell → its neighbourhood → the city.
     The cell is chosen for the richness of what surrounds it, not for the
     single tallest pile: an imported locality centroid can hold a hundred
     records at one point, which says more about geocoding than about a
     street. */
  const stats = cellStats(ds, ix, ds.today, NO_FILTERS, city);
  const statOf = new Map(stats.map((s) => [s.cell, s]));
  const byKey = new Map(ds.cells.map((k, i) => [k, i]));
  const recordedNear = (key: string, k: number) => gridDisk(key, k).reduce((a, n) => a + ((statOf.get(byKey.get(n) ?? -1)?.animals ?? 0) > 0 ? 1 : 0), 0);
  const pick = [...stats]
    .filter((s) => s.animals >= 4 && s.animals <= 60)
    .map((s) => ({ s, score: recordedNear(ds.cells[s.cell], 2) * Math.log2(1 + s.animals) }))
    .sort((a, b) => b.score - a.score)[0]?.s ?? [...stats].sort((a, b) => b.animals - a.animals)[0];
  const patch = (center: string, k: number) => gridDisk(center, k).map((key) => {
    const i = byKey.get(key);
    const st = i === undefined ? undefined : statOf.get(i);
    return {
      key,
      ring: i === undefined ? cellToBoundary(key, true).flatMap(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]) : ds.rings[i],
      animals: st?.animals ?? 0,
      open: st?.open ?? 0,
    };
  });
  const locIndex = pick ? ds.cellLocality[pick.cell] : -1;
  const locCells = stats.filter((s) => locIndex >= 0 && ds.cellLocality[s.cell] === locIndex);
  const cityPlate = cellList.map((c) => ({ key: ds.cells[c], ring: ds.rings[c], animals: statOf.get(c)?.animals ?? 0, open: statOf.get(c)?.open ?? 0 }));
  const neighbourhood = pick ? patch(ds.cells[pick.cell], 4) : [];
  const ladder = pick ? {
    street: { cell: ds.cells[pick.cell], center: [ds.centers[pick.cell * 2], ds.centers[pick.cell * 2 + 1]] as [number, number], animals: pick.animals, open: pick.open, cells: patch(ds.cells[pick.cell], 1) },
    locality: {
      name: locIndex >= 0 ? ds.localities[locIndex] : "",
      animals: neighbourhood.reduce((a, c) => a + c.animals, 0),
      recordedCells: neighbourhood.filter((c) => c.animals > 0).length,
      cellCount: neighbourhood.length,
      cells: neighbourhood,
      own: locCells.map((s) => ds.cells[s.cell]),
    },
    city: { name: sample?.name ?? "", animals: sample?.animals ?? 0, cellCount: cellList.length, cells: cityPlate, box: coreBox(ds, cellList, 0.02, 0.98, 0.01) },
  } : null;

  /* what is known, and what is not */
  const knowledge = animalKnowledge(ds, ix, null, ds.today);

  /* the register across India */
  const india = ds.cities.filter((c) => c.animals > 0).map((c) => ({ name: c.name, state: c.state, lng: c.lng, lat: c.lat, animals: c.animals }));

  return {
    totals: {
      animals: countOf(ds.animals, A_STRIDE),
      cases: countOf(ds.cases, C_STRIDE),
      care: countOf(ds.care, K_STRIDE),
      sightings: countOf(ds.sightings, 4),
      residentAnimals: knowledge.resident,
      cities: india.length,
      sampleShare: sample ? sample.animals / Math.max(1, countOf(ds.animals, A_STRIDE)) : 0,
      cityCases: cityCases.length,
    },
    hero,
    flow,
    conditions,
    ladder,
    knowledge,
    india,
    pinky,
    today: ds.today,
    built: ds.built,
  };
}

export async function getLandingStory() {
  const ds = await getPublicDataset(null);
  if (!ds || !ds.cities.length) return null;
  let pinky: { id: string; straypaw_id: string | null } | null = null;
  try {
    const supa = getSupabase();
    const { data } = await supa!.from("public_spatial_animals").select("id,straypaw_id").ilike("name", "pinky").not("cover_photo", "is", null).limit(1);
    pinky = data?.[0] ?? null;
  } catch { /* the photograph stands without its link */ }
  return buildStory(ds, pinky);
}

/** Resident photographs on the record, newest first, for the register strip. */
export async function getPhotoRegister(limit = 24) {
  const supa = getSupabase();
  if (!supa) return { rows: [], total: 0 };
  const [{ data }, { count }] = await Promise.all([
    supa.from("public_spatial_animals").select("id,name,straypaw_id,cover_photo,zone,city,last_seen").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(limit),
    supa.from("public_spatial_animals").select("id", { count: "exact", head: true }).not("cover_photo", "is", null).neq("cover_photo", ""),
  ]);
  return { rows: (data ?? []) as { id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null; last_seen: string | null }[], total: count ?? 0 };
}
