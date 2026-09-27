"use client";

/* ════════════════════════════════════════════════════════════════════
   The person's place: where they walk, set by their location or a place
   they chose, kept on this device only. Every screen that is about "near
   you" reads it from here, and none of them invents one. Until it is set
   those screens ask for it; outside India they say so; where the record
   has not reached yet they say that, instead of showing another city.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import type { SpatialDataset } from "@/lib/spatial/types";

export type SavedPlace = { lng: number; lat: number; label: string };

const KEY = "sp.patch.v1";
const EVT = "sp:place";
/** How far the nearest recorded cell may be for the record to count as
    having reached a place. */
export const REACH_KM = 20;

export const inIndia = (lat: number, lng: number) => lat > 6 && lat < 37.2 && lng > 68 && lng < 97.5;

export function readPlace(): SavedPlace | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    return p && Number.isFinite(p.lng) && Number.isFinite(p.lat) ? { lng: p.lng, lat: p.lat, label: String(p.label ?? "Your place") } : null;
  } catch { return null; }
}
export function savePlace(p: SavedPlace) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked: kept for this visit only */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: p }));
}

export const kmBetween = (a: [number, number], b: [number, number]) => {
  const r = (v: number) => (v * Math.PI) / 180, dLat = r(b[1] - a[1]), dLng = r(b[0] - a[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** Whether the record has reached a place: the nearest recorded cell, and
    the city it belongs to. */
export function reachOf(ds: SpatialDataset, lng: number, lat: number) {
  let best = Infinity, cell = -1;
  for (let i = 0; i < ds.cells.length; i++) {
    const d = kmBetween([lng, lat], [ds.centers[i * 2], ds.centers[i * 2 + 1]]);
    if (d < best) { best = d; cell = i; }
  }
  return { km: best, cell, city: cell >= 0 ? ds.cellCity[cell] : -1, reached: best <= REACH_KM };
}

export type LocateResult = { ok: true; place: SavedPlace } | { ok: false; why: "unavailable" | "denied" | "abroad" };

/** The person's place, and the two ways to set it. */
export function usePlace() {
  const [place, setPlace] = useState<SavedPlace | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  useEffect(() => {
    setPlace(readPlace()); setReady(true);
    const on = (e: Event) => setPlace((e as CustomEvent<SavedPlace>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);
  const choose = useCallback((p: SavedPlace) => { setPlace(p); savePlace(p); }, []);
  const locate = useCallback(() => new Promise<LocateResult>((resolve) => {
    if (!navigator.geolocation) { resolve({ ok: false, why: "unavailable" }); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocating(false);
      if (!inIndia(coords.latitude, coords.longitude)) { resolve({ ok: false, why: "abroad" }); return; }
      const p = { lng: coords.longitude, lat: coords.latitude, label: "Around you" };
      choose(p); resolve({ ok: true, place: p });
    }, () => { setLocating(false); resolve({ ok: false, why: "denied" }); }, { timeout: 10000, maximumAge: 300000 });
  }), [choose]);
  return { place, ready, locating, choose, locate };
}
