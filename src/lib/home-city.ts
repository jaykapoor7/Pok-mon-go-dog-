"use client";

/* ════════════════════════════════════════════════════════════════════
   Where a dashboard opens. India-wide figures belong to the landing and
   to someone who chooses India; everyone else opens on their own city.

     1. a city or India the person chose before (kept on this device)
     2. the place they set (their location, or a place they picked)
     3. roughly where their network is (inside India only)
     4. otherwise India

   A city is only used when the record has reached it: the nearest city
   with records within HOME_KM. A place with no records nearby opens India
   rather than another city.
   ════════════════════════════════════════════════════════════════════ */

import { kmBetween, readPlace } from "./place";

const KEY = "sp.home.city.v1";
export const HOME_KM = 60;
export const INDIA = "india";

type Placed = { city: string; lat?: number; lng?: number; animals?: number };

export function rememberHome(city: string | null) {
  try { localStorage.setItem(KEY, city ?? INDIA); } catch { /* storage blocked: this visit only */ }
}
export function readHome(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function nearest(cities: Placed[], at: { lat: number; lng: number }): string | null {
  let best: string | null = null, km = Infinity;
  for (const c of cities) {
    if (typeof c.lat !== "number" || typeof c.lng !== "number" || !(c.animals ?? 1)) continue;
    const d = kmBetween([at.lng, at.lat], [c.lng, c.lat]);
    if (d < km) { km = d; best = c.city; }
  }
  return km <= HOME_KM ? best : null;
}

let network: Promise<{ lat: number; lng: number } | null> | null = null;
const whereami = () => (network ??= fetch("/api/whereami", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => j?.at ?? null).catch(() => null));

/** The city a dashboard should open on, or null for India. */
export async function resolveHome(cities: Placed[]): Promise<string | null> {
  const saved = readHome();
  if (saved === INDIA) return null;
  if (saved && cities.some((c) => c.city === saved)) return saved;
  const place = readPlace();
  if (place) { const c = nearest(cities, place); if (c) return c; }
  const at = await whereami();
  return at ? nearest(cities, at) : null;
}
