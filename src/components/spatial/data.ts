"use client";

/* Loading the spatial dataset in the browser, and the small pieces of
   geometry the map derives from it. */

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { buildIndex, type Index } from "@/lib/spatial/engine";
import type { SpatialDataset } from "@/lib/spatial/types";

export type Scope = "public" | "org";

type State = { ds: SpatialDataset | null; error: string | null; loading: boolean };

const cache = new Map<string, Promise<SpatialDataset>>();

async function load(scope: Scope): Promise<SpatialDataset> {
  if (scope === "org") {
    const supa = getSupabase();
    const { data } = (await supa?.auth.getSession()) ?? { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) throw new Error("Sign in with your organisation to see its register.");
    const r = await fetch("/api/spatial?scope=org", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Could not read your organisation's register.");
    return r.json();
  }
  const r = await fetch("/api/spatial");
  if (!r.ok) throw new Error("The register is unavailable right now.");
  return r.json();
}

export function useSpatialDataset(scope: Scope, userKey?: string | null) {
  const [s, setS] = useState<State>({ ds: null, error: null, loading: true });
  useEffect(() => {
    let live = true;
    const key = `${scope}:${userKey ?? ""}`;
    if (!cache.has(key)) cache.set(key, load(scope));
    cache.get(key)!
      .then((ds) => { if (live) setS({ ds, error: null, loading: false }); })
      .catch((e: Error) => { cache.delete(key); if (live) setS({ ds: null, error: e.message, loading: false }); });
    return () => { live = false; };
  }, [scope, userKey]);
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
