"use client";

/* Loading the spatial dataset in the browser, and the small pieces of
   geometry the map derives from it. */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { buildIndex, type Index } from "@/lib/spatial/engine";
import type { SpatialDataset } from "@/lib/spatial/types";

export type Scope = "public" | "org";

type City = { city: string; state: string | null; animals: number; cases: number; cells: number; latest_seen: string | null; needs_help?: number; sterilised?: number; vaccinated?: number; open_cases?: number; care_events?: number };
type State = { ds: SpatialDataset | null; error: string | null; loading: boolean; city: string | null; cities: City[] };

const cache = new Map<string, Promise<{ ds: SpatialDataset; city: string; cities: City[] }>>();

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function readJson(url: string, headers: HeadersInit) {
  /* A serverless cold start or stale-while-revalidate race must not strand
   * the map on an error screen. Retry only transient failures; a real 4xx is
   * still surfaced immediately. */
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, { headers });
      if (response.ok || response.status < 500 || attempt === 2) break;
    } catch (error) {
      if (attempt === 2) throw error;
    }
    await pause(350 * (attempt + 1));
  }
  if (!response) throw new Error("Could not reach the map data service.");
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not load this city map.");
  return response.json();
}

async function load(scope: Scope, requestedCity?: string | null) {
  const headers: HeadersInit = {};
  if (scope === "org") {
    const supa = getSupabase();
    const { data } = (await supa?.auth.getSession()) ?? { data: { session: null } };
    if (!data.session?.access_token) throw new Error("Sign in with your organisation to see its register.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const scopeParam = scope === "org" ? "&scope=org" : "";
  const cityPayload = await readJson(`/api/spatial?kind=cities${scopeParam}&v=2`, headers);
  const cities = (cityPayload.cities ?? []) as City[];
  const requested = requestedCity === "New Delhi" ? "Delhi" : requestedCity === "Secunderabad" ? "Hyderabad" : requestedCity;
  /* Start with a fresh multi-cell city, not the largest historical import
   * collapsed to one centroid. Direct city links always win. */
  const defaultCity = [...cities].filter((item) => item.cells > 1).sort((a, b) => (b.latest_seen ?? "").localeCompare(a.latest_seen ?? "") || b.animals - a.animals)[0]?.city ?? cities[0]?.city;
  const city = cities.find((item) => item.city === requested)?.city ?? defaultCity;
  if (!city) throw new Error("No mapped city is available for this view yet.");
  const ds = await readJson(`/api/spatial?kind=dataset&city=${encodeURIComponent(city)}${scopeParam}&v=2`, headers) as SpatialDataset;
  return { ds, city, cities };
}

/** The dataset for a scope. `enabled: false` loads nothing — for a screen
    that only needs it once someone is signed in as a member. */
export function useSpatialDataset(scope: Scope, userKey?: string | null, enabled = true) {
  /* Subscribe to the URL through the router, not a one-off read of
     window.location.search — so choosing a city (which pushes ?city=) actually
     re-runs the load instead of leaving a stale city on screen. */
  const requestedCity = useSearchParams().get("city");
  const [s, setS] = useState<State>({ ds: null, error: null, loading: enabled, city: null, cities: [] });
  useEffect(() => {
    if (!enabled) { setS({ ds: null, error: null, loading: false, city: null, cities: [] }); return; }
    let live = true;
    const key = `${scope}:${userKey ?? ""}:${requestedCity ?? ""}`;
    if (!cache.has(key)) cache.set(key, load(scope, requestedCity));
    cache.get(key)!
      .then((result) => { if (live) setS({ ...result, error: null, loading: false }); })
      .catch((e: Error) => { cache.delete(key); if (live) setS((prev) => ({ ...prev, error: prev.ds ? null : e.message, loading: false })); });
    return () => { live = false; };
  }, [scope, userKey, enabled, requestedCity]);
  const ix: Index | null = useMemo(() => (s.ds ? buildIndex(s.ds) : null), [s.ds]);
  return { ...s, ix };
}

/* ── geometry ─────────────────────────────────────────────────────── */

export const ringOf = (ds: SpatialDataset, c: number): [number, number][] => {
  const r = ds.rings[c], out: [number, number][] = [];
  for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]);
  return out;
};
export const flatRing = (r: number[]): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < r.length; i += 2) out.push([r[i], r[i + 1]]);
  return out;
};

function inside(poly: [number, number][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** A point inside a cell, fixed for a given seed: where a record is drawn when
    all the register knows is its cell. */
export function pointInCell(poly: [number, number][], seed: number): [number, number] {
  let s = (seed * 2654435761) % 2147483647 || 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // Keep points off the edges, so a dot never reads as belonging to the next cell.
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (let k = 0; k < 40; k++) {
    const x = cx + (x0 + rnd() * (x1 - x0) - cx) * 0.86, y = cy + (y0 + rnd() * (y1 - y0) - cy) * 0.86;
    if (inside(poly, x, y)) return [x, y];
  }
  return [cx, cy];
}

export const scaleRing = (ring: [number, number][], k: number): [number, number][] => {
  const n = ring.length - 1;
  let cx = 0, cy = 0;
  for (let i = 0; i < n; i++) { cx += ring[i][0]; cy += ring[i][1]; }
  cx /= n; cy /= n;
  return ring.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};

export const boxOfRings = (rings: [number, number][][], pad = 0.004): [number, number, number, number] => {
  let w = 180, s = 90, e = -180, n = -90;
  for (const r of rings) for (const [x, y] of r) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w - pad, s - pad, e + pad, n + pad];
};

export const INDIA_BOX: [number, number, number, number] = [68, 6.5, 97.5, 36];
