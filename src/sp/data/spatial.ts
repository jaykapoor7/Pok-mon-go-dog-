"use client";

/* The bounded spatial dataset for one city (public scope), read from the
   existing /api/spatial service and indexed in the browser. Moved here
   from the 1.0 UI so the pure measures in lib/spatial keep a loader when
   the old screens are removed. Never the whole national register: one
   city's projection at a time. */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { buildIndex, type Index } from "@/lib/spatial/engine";
import { dayOf, type SpatialDataset } from "@/lib/spatial/types";
import { CITIES } from "@/lib/geo/cities";

export type Scope = "public" | "org";
export type SpatialCity = { city: string; state: string | null; animals: number; cases: number; cells: number; latest_seen: string | null; needs_help?: number; sterilised?: number; vaccinated?: number; open_cases?: number; care_events?: number; lng?: number; lat?: number };
type City = SpatialCity;
type State = { ds: SpatialDataset | null; error: string | null; loading: boolean; city: string | null; cities: City[] };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function readJson(url: string, headers: HeadersInit) {
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
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not load this city.");
  return response.json();
}

const cache = new Map<string, { at: number; value: Promise<{ ds: SpatialDataset; city: string | null; cities: City[] }> }>();

async function load(scope: Scope, requestedCity?: string | null, overviewOnly = false) {
  const headers: HeadersInit = {};
  if (scope === "org") {
    const supa = getSupabase();
    const { data } = (await supa?.auth.getSession()) ?? { data: { session: null } };
    if (!data.session?.access_token) throw new Error("Sign in with your organisation to see its register.");
    headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  const scopeParam = scope === "org" ? "&scope=org" : "";
  const cityPayload = await readJson(`/api/spatial?kind=cities${scopeParam}&v=4`, headers);
  const cities = (cityPayload.cities ?? []) as City[];
  if (scope === "public" && overviewOnly) {
    const built = new Date().toISOString();
    const ds: SpatialDataset = {
      v: 1, scope, built, today: dayOf(built),
      cities: cities.flatMap((item) => {
        const fallback = CITIES.find((city) => city.name === item.city);
        const lng = item.lng ?? fallback?.lng, lat = item.lat ?? fallback?.lat;
        return lng == null || lat == null ? [] : [{ name: item.city, state: item.state ?? "", lng, lat, box: [lng, lat, lng, lat] as [number, number, number, number], animals: item.animals, cases: item.cases }];
      }),
      cells: [], centers: [], rings: [], cellCity: [], cellLocality: [], localities: [],
      animals: [], cases: [], care: [], sightings: [], frontier: [], next: [],
      dict: { condition: [], status: [], closure: [], intake: [], care: [], severity: [], org: [] },
    };
    return { ds, city: null, cities };
  }
  const requested = requestedCity === "New Delhi" ? "Delhi" : requestedCity === "Secunderabad" ? "Hyderabad" : requestedCity;
  /* Start with a fresh multi-cell city, not the largest historical import
   * collapsed to one centroid. Direct city links always win. */
  const defaultCity = [...cities].filter((item) => item.cells > 1).sort((a, b) => (b.latest_seen ?? "").localeCompare(a.latest_seen ?? "") || b.animals - a.animals)[0]?.city ?? cities[0]?.city;
  const city = cities.find((item) => item.city === requested)?.city ?? defaultCity;
  if (!city) throw new Error("No mapped city is available for this view yet.");
  const ds = await readJson(`/api/spatial?kind=dataset&city=${encodeURIComponent(city)}${scopeParam}&v=4`, headers) as SpatialDataset;
  return { ds, city, cities };
}

/** The dataset for a scope. `enabled: false` loads nothing — for a screen
    that only needs it once someone is signed in as a member. */
export function useSpatialDataset(scope: Scope, userKey?: string | null, enabled = true, overviewOnly = false) {
  /* Subscribe to the URL through the router, not a one-off read of
     window.location.search — so choosing a city (which pushes ?city=) actually
     re-runs the load instead of leaving a stale city on screen. */
  const requestedCity = useSearchParams().get("city");
  const [s, setS] = useState<State>({ ds: null, error: null, loading: enabled, city: null, cities: [] });
  useEffect(() => {
    if (!enabled) { setS({ ds: null, error: null, loading: false, city: null, cities: [] }); return; }
    let live = true;
    const key = `${scope}:${userKey ?? ""}:${requestedCity ?? ""}:${overviewOnly ? "overview" : "detail"}`;
    setS((prev) => ({ ...prev, ds: null, city: null, error: null, loading: true }));
    if (scope === "org" || !cache.has(key) || Date.now() - cache.get(key)!.at > 60_000) {
      cache.set(key, { at: Date.now(), value: load(scope, requestedCity, overviewOnly) });
    }
    cache.get(key)!.value
      .then((result) => { if (live) setS({ ...result, error: null, loading: false }); })
      .catch((e: Error) => { cache.delete(key); if (live) setS((prev) => ({ ...prev, ds: null, city: null, error: e.message, loading: false })); });
    return () => { live = false; };
  }, [scope, userKey, enabled, requestedCity, overviewOnly]);
  const ix: Index | null = useMemo(() => (s.ds ? buildIndex(s.ds) : null), [s.ds]);
  return { ...s, ix };
}
