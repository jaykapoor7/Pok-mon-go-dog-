/* ════════════════════════════════════════════════════════════════════
   A city's ground: its honeycomb and its record, compact enough to draw
   live under any page.

   The cells are the city's own H3 cells (the rollup the map reads, the
   busiest first, capped for an SVG). The events are real dated records in
   those cells: reports (0), care (1) and an animal's first record (2), a
   bounded recent window of each, oldest first, as flat triples
   [cell index, day, kind]. Nothing here reads the register; every query is
   a bounded window over a public fact view, cached per city.
   ════════════════════════════════════════════════════════════════════ */

import { unstable_cache } from "next/cache";
import { cellToBoundary, cellToLatLng } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { canonicalCity, cityVariants, getPublicSpatialCities, getPublicSpatialCityCells } from "@/lib/spatial/server";

export type CityGround = { city: string; box: [number, number, number, number]; rings: number[][]; events: number[] };

const LIMIT = { cells: 700, cases: 900, care: 900, animals: 900 } as const;
const EPOCH_MS = Date.UTC(2000, 0, 1);
const DAY_MS = 86_400_000;
const round4 = (v: number) => Math.round(v * 1e4) / 1e4;
const dayOf = (iso: string | null) => {
  if (!iso) return -1;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((t - EPOCH_MS) / DAY_MS) : -1;
};

function ringOf(h3: string): number[] {
  const b = cellToBoundary(h3, true) as [number, number][];
  const r: number[] = [];
  for (const p of b) r.push(round4(p[0]), round4(p[1]));
  return r;
}

/* The box around the middle of the city, so one far-flung record does not
   shrink the whole plate. */
function coreBox(centers: [number, number][]): [number, number, number, number] {
  if (!centers.length) return [76.8, 10.85, 77.1, 11.15];
  const xs = centers.map((c) => c[0]).sort((a, b) => a - b);
  const ys = centers.map((c) => c[1]).sort((a, b) => a - b);
  const q = (v: number[], f: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(f * (v.length - 1))))];
  const pad = 0.01;
  return [q(xs, 0.03) - pad, q(ys, 0.03) - pad, q(xs, 0.97) + pad, q(ys, 0.97) + pad];
}

async function build(requested: string): Promise<CityGround | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const cities = await getPublicSpatialCities(200);
  if (!cities.length) return null;
  const wanted = canonicalCity(requested);
  const city = cities.find((c) => c.city === wanted)?.city
    ?? [...cities].sort((a, b) => b.open_cases - a.open_cases || b.cases - a.cases || b.animals - a.animals)[0].city;

  const cells = (await getPublicSpatialCityCells(city)).slice(0, LIMIT.cells);
  if (!cells.length) return null;
  const idx = new Map<string, number>();
  cells.forEach((c, i) => idx.set(c.h3_r8, i));
  const rings = cells.map((c) => ringOf(c.h3_r8));
  const centers = cells.map((c) => { const [lat, lng] = cellToLatLng(c.h3_r8); return [lng, lat] as [number, number]; });

  const variants = cityVariants(city);
  const [cases, care, animals] = await Promise.all([
    supa.from("public_case_facts").select("h3_r8,occurred_at").in("city", variants).not("h3_r8", "is", null)
      .order("occurred_at", { ascending: false }).limit(LIMIT.cases),
    supa.from("public_care_facts").select("h3_r8,event_date").in("city", variants).not("h3_r8", "is", null)
      .order("event_date", { ascending: false }).limit(LIMIT.care),
    supa.from("public_spatial_animals").select("h3_r8,first_seen").in("city", variants).not("h3_r8", "is", null)
      .order("first_seen", { ascending: false }).limit(LIMIT.animals),
  ]);

  const today = dayOf(new Date().toISOString());
  const raw: [number, number, number][] = [];
  const add = (rows: { h3_r8: string | null }[] | null, at: (r: any) => string | null, kind: number) => {
    for (const r of rows ?? []) {
      const i = r.h3_r8 ? idx.get(r.h3_r8) : undefined;
      const d = dayOf(at(r));
      if (i === undefined || d <= 0 || d > today) continue;
      raw.push([i, d, kind]);
    }
  };
  add(cases.data, (r) => r.occurred_at, 0);
  add(care.data, (r) => r.event_date, 1);
  add(animals.data, (r) => r.first_seen, 2);
  raw.sort((a, b) => a[1] - b[1]);

  return { city, box: coreBox(centers), rings, events: raw.flat() };
}

const cached = unstable_cache((city: string) => build(city), ["city-ground-v1"], { revalidate: 900 });

/** The ground for a city; an unknown or empty name gets the busiest city. */
export function getCityGround(city?: string | null): Promise<CityGround | null> {
  return cached(canonicalCity(city ?? ""));
}
