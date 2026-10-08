"use client";

import { useEffect, useMemo, useState } from "react";
import type { SpatialDataset } from "@/lib/spatial/types";

export type CityCell = { h3_r8: string; animals: number; sterilised: number; vaccinated: number; cases: number; open_cases: number; needs_help: number; care_events?: number };
export type Measure = "animals" | "needs_help" | "open_cases" | "sterilised" | "vaccinated" | "care_events" | "cases";

/** Authoritative per-cell totals for a city (full register, not the bounded
 *  sample), named by the loaded geometry's recorded localities. */
export function useCityCells(city: string | null, ds: SpatialDataset | null, scopeHeaders?: HeadersInit, scope: "public" | "org" = "public") {
  const [cells, setCells] = useState<CityCell[] | null>(null);
  useEffect(() => {
    if (!city) { setCells(null); return; }
    let live = true;
    setCells(null);
    fetch(`/api/spatial?kind=cells&city=${encodeURIComponent(city)}${scope === "org" ? "&scope=org" : ""}&v=3`, { headers: scopeHeaders })
      .then((r) => (r.ok ? r.json() : { cells: [] }))
      .then((j) => { if (live) setCells(j.cells ?? []); })
      .catch(() => { if (live) setCells([]); });
    return () => { live = false; };
  }, [city, scope, scopeHeaders]);
  const names = useMemo(() => {
    const m = new Map<string, string>();
    if (!ds) return m;
    ds.cells.forEach((c, i) => { const l = ds.cellLocality[i]; if (l >= 0) m.set(c, ds.localities[l]); });
    return m;
  }, [ds]);
  return { cells, names };
}

export const MEASURE_LABEL: Record<Measure, string> = {
  animals: "recorded animals", needs_help: "flagged for help", open_cases: "open requests", sterilised: "sterilisation records",
  vaccinated: "vaccination records", care_events: "care events", cases: "requests recorded",
};

export function localityRanking(cells: CityCell[], names: Map<string, string>, m: Measure) {
  const by = new Map<string, { name: string; v: number; cells: number; h3: string }>();
  for (const c of cells) {
    const name = names.get(c.h3_r8);
    if (!name) continue;
    const v = (c[m] as number | undefined) ?? 0;
    const e = by.get(name) ?? { name, v: 0, cells: 0, h3: c.h3_r8 };
    e.v += v; e.cells++;
    by.set(name, e);
  }
  return [...by.values()].filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
}

export const fmtN = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-IN"));
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function ago(iso: string | null | undefined) {
  if (!iso) return "";
  const t = Date.parse(iso); if (!Number.isFinite(t)) return "";
  const d = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (d < 1) return "today"; if (d === 1) return "yesterday"; if (d < 31) return `${d}d ago`;
  const date = new Date(t); return `${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
