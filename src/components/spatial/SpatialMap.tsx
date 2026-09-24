"use client";

/* ════════════════════════════════════════════════════════════════════
   StrayPaw spatial intelligence: one map, one question at a time.

   The unit of place is an H3 cell (≈0.74 km²), the same cell on the
   landing page, in analytics and on a profile. Each mode asks the cells
   one question — where are animals recorded, how densely, how well is the
   place known, where is sterilisation or vaccination recorded and where is
   it unknown, where is work open, where did it change — and colours them
   by the answer. Nothing else competes: the streets are a quiet ground,
   there is no text on the map, and the numbers wait in the inspector until
   a place is chosen.

   THREE RULES THE MAP KEEPS
   • Recorded is not real. A light or empty cell is "not recorded", and the
     edge of the record is drawn as a dashed honeycomb that carries on into
     the unknown rather than stopping at the last dot.
   • Unknown is hatched. In ABC and ARV the cell is hatched and the recorded
     share is drawn solid inside it, at its real size.
   • Positions are honest. A record is known to its cell, so its dot is
     drawn inside its cell — never at an address the register does not hold.

   The same component serves the public map (/map) and an organisation's
   field map (/partner/map); only where the data comes from differs.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification, MapMouseEvent } from "maplibre-gl";
import { Crosshair, Layers, Minus, Mountain, Plus, SlidersHorizontal } from "lucide-react";
import { ScaleLadder, type Rung } from "@/components/system/ScaleLadder";
import { NIGHT, PAPER, groundStyle, underlay, restyle, type Palette } from "@/components/map/basemap";
import {
  animalVisible, breaks, cellStats, COVERAGE_TEXT, fewOr, firstDay, isSparse, monthEndDay, monthLabel, monthOfDay, NO_FILTERS, openOn, rankOf,
  type CellStat, type Filters, type Mode,
} from "@/lib/spatial/engine";
import { A, A_STRIDE, AF, C, C_STRIDE, type NextCell, type SpatialDataset } from "@/lib/spatial/types";
import { CONDITIONS, DEFAULT_TRIAGE, STATUSES, type Condition } from "@/lib/register/taxonomy";
import { getSupabase } from "@/lib/supabase";
import { useSpatialDataset, ringOf, flatRing, pointInCell, scaleRing, boxOfRings, INDIA_BOX, type Scope } from "./data";
import { Inspector, type Sel } from "./Inspector";
import { Timeline } from "./Timeline";
import "./spatial.css";

type ModeDef = { id: Mode | "change"; label: string; q: string };
const MODES: ModeDef[] = [
  { id: "animals", label: "Animals", q: "Where animals are recorded — one dot each, inside its cell" },
  { id: "density", label: "Density", q: "Where recorded animals cluster" },
  { id: "coverage", label: "Coverage", q: "How well each place is mapped, and where the record stops" },
  { id: "abc", label: "ABC", q: "Where sterilisation is recorded — and where it is unknown" },
  { id: "arv", label: "ARV", q: "Where vaccination is recorded, and where boosters are due" },
  { id: "medical", label: "Medical", q: "Where injured and sick animals are recorded" },
  { id: "cases", label: "Cases", q: "Where work is open, and how long it has waited" },
  { id: "activity", label: "Field work", q: "Where field teams worked in the twelve months before this date" },
  { id: "change", label: "Change", q: "Where work began, grew, slowed or stopped this year" },
];
type AnyMode = Mode | "change";

/* Cases mode asks one of the field map's working questions. */
type CaseLens = "open" | "critical" | "followup" | "noaction" | "repeat" | "resolved";
const LENSES: { id: CaseLens; label: string; q: string; unit: string }[] = [
  { id: "open", label: "Open", q: "Where work is open, and how long it has waited", unit: "open" },
  { id: "critical", label: "Critical", q: "Where critical cases are still open", unit: "critical, open" },
  { id: "followup", label: "Follow-up", q: "Where a follow-up is due or was missed", unit: "with a follow-up due or missed" },
  { id: "noaction", label: "No action", q: "Where requests closed without field action", unit: "closed without action" },
  { id: "repeat", label: "Repeat animals", q: "Where the same animal keeps coming back", unit: "for animals seen before" },
  { id: "resolved", label: "Resolved", q: "Where cases were resolved", unit: "resolved" },
];

const EMPTY = { type: "FeatureCollection" as const, features: [] as GeoJSON.Feature[] };
const T = "rgba(0,0,0,0)";

function hatchImage(color: string) {
  const s = 8, c = document.createElement("canvas");
  c.width = s; c.height = s;
  const g = c.getContext("2d")!;
  g.strokeStyle = color; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(0, s); g.lineTo(s, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(s - 2, s + 2); g.lineTo(s + 2, s - 2); g.stroke();
  return g.getImageData(0, 0, s, s);
}

export function SpatialMap({ scope = "public", userKey = null, notice = null }: { scope?: Scope; userKey?: string | null; notice?: React.ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const { ds, ix, error, loading } = useSpatialDataset(scope, userKey);

  const [ground, setGround] = useState<"night" | "paper">("night");
  useEffect(() => { try { const g = localStorage.getItem("sp.map.ground"); if (g === "paper" || g === "night") setGround(g); } catch { /* storage blocked */ } }, []);
  const pal: Palette = ground === "night" ? NIGHT : PAPER;

  const initialMode = (MODES.find((m) => m.id === params.get("mode"))?.id ?? "density") as AnyMode;
  const [mode, setMode] = useState<AnyMode>(initialMode);
  const [lens, setLens] = useState<CaseLens>((LENSES.find((l) => l.id === params.get("lens"))?.id ?? "open") as CaseLens);
  const [month, setMonth] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [relief, setRelief] = useState(false);
  const [sheet, setSheet] = useState<"peek" | "open">("peek");
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [phone, setPhone] = useState(false);
  const [feeding, setFeeding] = useState<{ id: string; name: string; lat: number; lng: number }[]>([]);
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const layersDone = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const f = () => setPhone(mq.matches);
    f(); mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  /* Feeding points are few and already public; they ride along in Animals. */
  useEffect(() => {
    let live = true;
    getSupabase()?.from("feeding_zone_public").select("id,name,lat,lng").limit(300)
      .then(({ data }) => { if (live && data) setFeeding((data as { id: string; name: string; lat: number; lng: number }[]).filter((z) => Number.isFinite(z.lat) && Number.isFinite(z.lng))); });
    return () => { live = false; };
  }, []);

  /* ── the clock ─────────────────────────────────────────────────────── */
  const m0 = useMemo(() => (ds ? monthOfDay(firstDay(ds)) : 0), [ds]);
  const mNow = ds ? monthOfDay(ds.today) : 0;
  const m = month ?? mNow;
  const t = ds ? Math.min(monthEndDay(m), ds.today) : 0;
  const series = useMemo(() => {
    if (!ds) return [] as number[];
    const s = new Array(mNow - m0 + 1).fill(0);
    // Records dated before the clock starts are folded into its first month.
    for (let i = 0; i < ds.cases.length; i += C_STRIDE) { const d = ds.cases[i + C.day]; if (d >= 0 && d <= ds.today) s[Math.max(0, monthOfDay(d) - m0)]++; }
    for (let i = 0; i < ds.care.length; i += 4) { const d = ds.care[i + 2]; if (d >= 0 && d <= ds.today) s[Math.max(0, monthOfDay(d) - m0)]++; }
    return s;
  }, [ds, mNow, m0]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMonth((x) => {
      const cur = x ?? mNow;
      if (cur >= mNow) { setPlaying(false); return mNow; }
      return cur + 1;
    }), 520);
    return () => clearInterval(id);
  }, [playing, mNow]);
  const play = () => {
    if (playing) { setPlaying(false); return; }
    if ((month ?? mNow) >= mNow) setMonth(m0);
    setPlaying(true);
  };

  /* ── what each cell holds, now and a year earlier ─────────────────── */
  const stats = useMemo(() => (ds && ix ? cellStats(ds, ix, t, filters) : []), [ds, ix, t, filters]);
  const prev = useMemo(() => (ds && ix && mode === "change" ? cellStats(ds, ix, t - 365, NO_FILTERS) : []), [ds, ix, t, mode]);
  const statOf = useMemo(() => new Map(stats.map((s) => [s.cell, s])), [stats]);

  /* Which cases the Cases mode is asking about, on day t. */
  const caseMatch = useCallback((i: number): boolean => {
    if (!ds || !ix) return false;
    const o = i * C_STRIDE, day = ds.cases[o + C.day];
    if (day < 0 || day > t) return false;
    if (filters.condition >= 0 && ds.cases[o + C.cond] !== filters.condition) return false;
    if (filters.source === "field" && ds.cases[o + C.source] === 1) return false;
    if (filters.source === "resident" && ds.cases[o + C.source] !== 1) return false;
    const st = STATUSES[ds.cases[o + C.status]];
    switch (lens) {
      case "open": return openOn(ds, i, t);
      case "critical": return openOn(ds, i, t) && DEFAULT_TRIAGE[(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition] === "Critical";
      case "followup": return ds.cases[o + C.fuUp] > 0 || ds.cases[o + C.fuMissed] > 0;
      case "noaction": return st === "no_action" || st === "not_attended";
      case "repeat": { const a = ds.cases[o + C.animal]; return a >= 0 && ix.casesByAnimal[a].length > 1; }
      case "resolved": { const cd = ds.cases[o + C.closedDay]; return cd >= 0 && cd <= t && st !== "no_action" && st !== "not_attended"; }
    }
  }, [ds, ix, t, lens, filters.condition, filters.source]);
  const lensCounts = useMemo(() => {
    if (!ds || !ix || mode !== "cases") return null;
    const m = new Int32Array(ds.cells.length);
    for (let i = 0; i < ix.nCases; i++) if (caseMatch(i)) m[ds.cases[i * C_STRIDE + C.cell]]++;
    return m;
  }, [ds, ix, mode, caseMatch]);

  const value = useCallback((s: CellStat): number => {
    switch (mode) {
      case "animals": case "density": case "coverage": case "abc": case "arv": return s.animals;
      case "medical": return s.injured + s.help;
      case "cases": return lensCounts ? lensCounts[s.cell] : s.open;
      case "activity": return s.recentEvents;
      case "change": return s.recentEvents;
    }
  }, [mode, lensCounts]);
  const br = useMemo(() => breaks(stats.map(value), 5), [stats, value]);

  type ChangeClass = "new" | "up" | "steady" | "down" | "stopped" | null;
  const changeOf = useCallback((s: CellStat): ChangeClass => {
    const before = prev[s.cell]?.recentEvents ?? 0, now = s.recentEvents;
    if (!before && !now) return null;
    if (!before) return "new";
    if (!now) return "stopped";
    if (now > before * 1.25) return "up";
    if (now < before * 0.75) return "down";
    return "steady";
  }, [prev]);

  const cellPaint = useCallback((s: CellStat): { c: string; o: number; line?: string; hatch?: 0 | 1; h?: number } => {
    const r = rankOf(value(s), br);
    const seq = pal.seq, att = pal.att;
    switch (mode) {
      case "animals": return s.animals ? { c: seq[1], o: ground === "night" ? 0.45 : 0.35 } : { c: T, o: 0 };
      case "density": return r < 0 ? { c: T, o: 0 } : { c: seq[Math.min(4, r)], o: 0.9, h: (r + 1) * 260 };
      case "coverage": {
        const ink = ground === "night" ? "239,231,218" : "11,30,61";
        const a = { strong: 0.78, partial: 0.5, weak: 0.28, insufficient: 0.13, unmapped: 0 }[s.coverage];
        return a ? { c: `rgba(${ink},${a})`, o: 1 } : { c: T, o: 0 };
      }
      case "abc": case "arv": return s.animals ? { c: T, o: 0, hatch: 1 } : { c: T, o: 0 };
      case "medical": return r < 0 ? (s.animals ? { c: T, o: 0, line: pal.dim } : { c: T, o: 0 }) : { c: att[Math.min(4, r)], o: 0.9, h: (r + 1) * 260 };
      case "cases": return r < 0 ? (s.cases ? { c: seq[0], o: 0.35 } : { c: T, o: 0 }) : { c: att[Math.min(4, r)], o: 0.85, h: (r + 1) * 260 };
      case "activity": return r < 0 ? (s.events ? { c: T, o: 0, line: pal.dim } : { c: T, o: 0 }) : { c: seq[Math.min(4, r)], o: 0.9, h: (r + 1) * 260 };
      case "change": {
        const k = changeOf(s);
        if (!k) return { c: T, o: 0 };
        if (k === "new") return { c: seq[4], o: 0.95, h: 900 };
        if (k === "up") return { c: seq[3], o: 0.9, h: 620 };
        if (k === "steady") return { c: seq[1], o: 0.8, h: 300 };
        if (k === "down") return { c: ground === "night" ? "rgba(239,231,218,0.28)" : "rgba(11,30,61,0.18)", o: 1, h: 120 };
        return { c: ground === "night" ? "rgba(240,91,64,0.18)" : "rgba(240,91,64,0.14)", o: 1, line: att[3], h: 40 };
      }
    }
  }, [mode, br, pal, ground, value, changeOf]);

  /* ── dots: one per animal, inside its cell ───────────────────────── */
  const animalPts = useMemo(() => {
    if (!ds || !ix) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < ix.nAnimals; i++) {
      if (!animalVisible(ds, i, t, filters)) continue;
      const o = i * A_STRIDE, c = ds.animals[o + A.cell], f = ds.animals[o + A.flags];
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      const k = f & (AF.help | AF.injured) ? 1 : f & AF.resident ? 2 : 0;
      feats.push({ type: "Feature", properties: { k, c }, geometry: { type: "Point", coordinates: pointInCell(r, i + 1) } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, ix, t, filters]);

  const casePts = useMemo(() => {
    if (!ds || !ix || (mode !== "cases" && mode !== "medical")) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < ix.nCases; i++) {
      if (mode === "cases" ? !caseMatch(i) : !openOn(ds, i, t)) continue;
      const o = i * C_STRIDE, c = ds.cases[o + C.cell];
      if (filters.condition >= 0 && ds.cases[o + C.cond] !== filters.condition) continue;
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      const cond = (CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition;
      feats.push({ type: "Feature", properties: { age: t - ds.cases[o + C.day], crit: DEFAULT_TRIAGE[cond] === "Critical" ? 1 : 0, c }, geometry: { type: "Point", coordinates: pointInCell(r, i * 7 + 3) } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, ix, t, mode, filters.condition, caseMatch]);

  const inner = useMemo(() => {
    if (!ds || (mode !== "abc" && mode !== "arv")) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    for (const s of stats) {
      if (!s.animals) continue;
      const yes = mode === "abc" ? s.sterYes : s.vaccYes;
      const r = ringOf(ds, s.cell);
      /* One or two animals make no share: on the public map such a cell gets
         a fixed small mark that says "recorded here", not a proportion. */
      if (yes > 0 && scope === "public" && isSparse(s.animals)) feats.push({ type: "Feature", properties: { k: 2 }, geometry: { type: "Polygon", coordinates: [scaleRing(r, 0.3)] } });
      else if (yes > 0) feats.push({ type: "Feature", properties: { k: 0 }, geometry: { type: "Polygon", coordinates: [scaleRing(r, 0.94 * Math.sqrt(yes / s.animals))] } });
      if (mode === "arv" && s.due > 0) feats.push({ type: "Feature", properties: { k: 1 }, geometry: { type: "Polygon", coordinates: [scaleRing(r, 0.2)] } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, stats, mode, scope]);

  /* ── the map, built once ─────────────────────────────────────────── */
  useEffect(() => {
    let map: MLMap | null = null, dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current,
        style: groundStyle(pal),
        bounds: INDIA_BOX,
        fitBoundsOptions: { padding: 30 },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · H3" },
        maxPitch: 60,
        dragRotate: false,
        pitchWithRotate: false,
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __spmap?: MLMap }).__spmap = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        map!.addImage("hatch-night", hatchImage("rgba(239,231,218,0.42)"));
        map!.addImage("hatch-paper", hatchImage("rgba(11,30,61,0.45)"));
        setReady(true);
      });
    });
    return () => { dead = true; map?.remove(); mapRef.current = null; layersDone.current = false; setLayersReady(false); };
    // Built once; the ground is repainted in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── data layers, once the register has arrived ──────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !ds || layersDone.current) return;
    layersDone.current = true;
    const cellFeatures = ds.cells.map((_, i) => ({ type: "Feature" as const, id: i, properties: { i }, geometry: { type: "Polygon" as const, coordinates: [ringOf(ds, i)] } }));
    map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: cellFeatures } });
    map.addSource("frontier", { type: "geojson", data: { type: "FeatureCollection", features: ds.frontier.map((f, i) => ({ type: "Feature", id: i, properties: { k: f.cell, near: f.near, city: f.city }, geometry: { type: "Polygon", coordinates: [flatRing(f.ring)] } })) } });
    ["inner", "cases", "sel", "next", "feeding"].forEach((id) => map.addSource(id, { type: "geojson", data: EMPTY }));
    map.addSource("pts", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 38, clusterMaxZoom: 13 });
    map.addSource("cities", { type: "geojson", data: { type: "FeatureCollection", features: ds.cities.map((c, i) => ({ type: "Feature", properties: { i, n: c.animals, name: c.name }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) } });

    const fs = (k: string, d: number | string) => ["coalesce", ["feature-state", k], d] as ExpressionSpecification;
    map.addLayer({ id: "frontier-fill", type: "fill", source: "frontier", paint: { "fill-color": T, "fill-opacity": 0 } });
    map.addLayer({ id: "frontier-line", type: "line", source: "frontier", layout: { visibility: "none" }, paint: { "line-color": pal.dim, "line-width": 1, "line-dasharray": [2, 2.5], "line-opacity": ["case", ["==", ["get", "near"], 1], 0.55, 0.25] as ExpressionSpecification } });
    map.addLayer({ id: "cells", type: "fill", source: "cells", paint: { "fill-color": fs("c", T), "fill-opacity": fs("o", 0) } });
    map.addLayer({ id: "cells-hatch", type: "fill", source: "cells", paint: { "fill-pattern": "hatch-night", "fill-opacity": fs("hatch", 0) } });
    map.addLayer({ id: "cells-3d", type: "fill-extrusion", source: "cells", layout: { visibility: "none" }, paint: { "fill-extrusion-color": fs("c", T), "fill-extrusion-height": fs("h", 0), "fill-extrusion-opacity": 0.92 } });
    map.addLayer({ id: "inner", type: "fill", source: "inner", paint: { "fill-color": ["case", ["==", ["get", "k"], 1], pal.att[3], pal.seq[3]] as ExpressionSpecification, "fill-opacity": ["case", ["==", ["get", "k"], 2], 0.55, 0.95] as ExpressionSpecification } });
    map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: { "line-color": fs("line", pal.cellEdge), "line-width": ["case", ["!=", ["feature-state", "line"], null], 1.4, 0.8] as ExpressionSpecification, "line-opacity": ["case", [">", fs("o", 0), 0], 1, ["!=", ["feature-state", "line"], null], 1, [">", fs("hatch", 0), 0], 1, 0] as ExpressionSpecification } });
    map.addLayer({ id: "clusters", type: "circle", source: "pts", filter: ["has", "point_count"], layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 9, 30, 15, 200, 26] as ExpressionSpecification,
      "circle-color": pal.seq[3], "circle-opacity": 0.92, "circle-stroke-color": pal.bg, "circle-stroke-width": 2,
    } });
    map.addLayer({ id: "clusters-n", type: "symbol", source: "pts", filter: ["has", "point_count"], layout: { visibility: "none", "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": "#fffdf9" } });
    map.addLayer({ id: "pts", type: "circle", source: "pts", filter: ["!", ["has", "point_count"]], layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 2.6, 15, 4.6, 17, 6.5] as ExpressionSpecification,
      "circle-color": ["match", ["get", "k"], 1, pal.att[3], 2, pal.seq[4], pal.ink] as ExpressionSpecification,
      "circle-stroke-color": pal.bg, "circle-stroke-width": 1,
    } });
    /* An open case is a ring that widens as it waits; a critical one is solid. */
    map.addLayer({ id: "cases", type: "circle", source: "cases", layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, ["interpolate", ["linear"], ["get", "age"], 0, 2.5, 30, 4, 180, 7, 365, 9], 15, ["interpolate", ["linear"], ["get", "age"], 0, 4, 30, 7, 180, 12, 365, 16]] as ExpressionSpecification,
      "circle-color": pal.att[3],
      "circle-opacity": ["case", ["==", ["get", "crit"], 1], 0.95, 0] as ExpressionSpecification,
      "circle-stroke-color": ["case", ["==", ["get", "crit"], 1], pal.bg, pal.ink] as ExpressionSpecification,
      "circle-stroke-width": ["case", ["==", ["get", "crit"], 1], 1.2, 1.3] as ExpressionSpecification,
      "circle-stroke-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 0.95, 365, 0.5] as ExpressionSpecification,
    } });
    map.addLayer({ id: "feeding", type: "circle", source: "feeding", layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 15, 7] as ExpressionSpecification,
      "circle-color": pal.bg, "circle-stroke-color": pal.feed, "circle-stroke-width": 2.4,
    } });
    map.addLayer({ id: "next", type: "circle", source: "next", layout: { visibility: "none" }, paint: { "circle-radius": 11, "circle-color": pal.bg, "circle-stroke-color": pal.att[3], "circle-stroke-width": 2 } });
    map.addLayer({ id: "next-n", type: "symbol", source: "next", layout: { visibility: "none", "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": pal.ink } });
    map.addLayer({ id: "sel", type: "line", source: "sel", paint: { "line-color": pal.ink, "line-width": 2.2 } });
    map.addLayer({ id: "cities", type: "circle", source: "cities", maxzoom: 7.5, paint: {
      "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 6, 48, 26] as ExpressionSpecification,
      "circle-color": pal.seq[3], "circle-opacity": 0.9, "circle-stroke-color": pal.bg, "circle-stroke-width": 1.5,
    } });
    map.addLayer({ id: "cities-l", type: "symbol", source: "cities", maxzoom: 7.5, layout: { "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "n"]]], "text-font": ["Noto Sans Regular"], "text-size": 11.5, "text-offset": [0, 2.1], "text-anchor": "top" }, paint: { "text-color": pal.ink, "text-halo-color": pal.bg, "text-halo-width": 1.4 } });

    setLayersReady(true);
    underlay(map, pal, "frontier-fill").then((ok) => { if (ok) setBaseReady(true); }).catch(() => {});
  }, [ready, ds, pal]);

  /* ── repaint the ground ──────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersDone.current) return;
    restyle(map, pal);
    const set = (id: string, p: string, v: unknown) => { try { (map.setPaintProperty as (i: string, pr: string, val: unknown) => void).call(map, id, p, v); } catch { /* ok */ } };
    set("cells-hatch", "fill-pattern", ground === "night" ? "hatch-night" : "hatch-paper");
    set("frontier-line", "line-color", pal.dim);
    set("pts", "circle-stroke-color", pal.bg);
    set("pts", "circle-color", ["match", ["get", "k"], 1, pal.att[3], 2, pal.seq[4], pal.ink]);
    set("clusters", "circle-color", pal.seq[3]); set("clusters", "circle-stroke-color", pal.bg);
    set("cases", "circle-color", pal.att[3]); set("cases", "circle-stroke-color", ["case", ["==", ["get", "crit"], 1], pal.bg, pal.ink]);
    set("next", "circle-color", pal.bg); set("next-n", "text-color", pal.ink);
    set("feeding", "circle-color", pal.bg); set("feeding", "circle-stroke-color", pal.feed);
    set("sel", "line-color", pal.ink);
    set("inner", "fill-color", ["case", ["==", ["get", "k"], 1], pal.att[3], mode === "arv" ? pal.arv : pal.seq[3]]);
    set("cities", "circle-stroke-color", pal.bg); set("cities-l", "text-color", pal.ink); set("cities-l", "text-halo-color", pal.bg);
    try { localStorage.setItem("sp.map.ground", ground); } catch { /* storage blocked */ }
  }, [ground, pal, baseReady, mode, layersReady]);

  /* ── paint the cells for the mode, the time and the filters ──────── */
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersDone.current || !ds) return;
    const seen = new Set<number>();
    for (const s of stats) {
      const p = cellPaint(s);
      map.setFeatureState({ source: "cells", id: s.cell }, { c: p.c, o: p.o, line: p.line ?? null, hatch: p.hatch ?? 0, h: p.h ?? 0 });
      seen.add(s.cell);
    }
    for (let i = 0; i < ds.cells.length; i++) if (!seen.has(i)) map.setFeatureState({ source: "cells", id: i }, { c: T, o: 0, line: null, hatch: 0, h: 0 });
    const vis = (id: string, on: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); };
    vis("frontier-line", mode === "coverage");
    vis("next", mode === "coverage"); vis("next-n", mode === "coverage");
    const dots = mode === "animals";
    vis("clusters", dots); vis("clusters-n", dots); vis("pts", dots);
    vis("cases", mode === "cases" || mode === "medical");
    vis("feeding", dots);
    vis("cells-3d", relief && mode !== "animals" && mode !== "abc" && mode !== "arv" && mode !== "coverage");
    (map.getSource("pts") as GeoJSONSource | undefined)?.setData(animalPts);
    (map.getSource("cases") as GeoJSONSource | undefined)?.setData(casePts);
    (map.getSource("inner") as GeoJSONSource | undefined)?.setData(inner);
    (map.getSource("feeding") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: feeding.map((z) => ({ type: "Feature", properties: { id: z.id, name: z.name }, geometry: { type: "Point", coordinates: [z.lng, z.lat] } })) });
    (map.getSource("next") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: ds.next.map((n, i) => ({ type: "Feature", properties: { n: String(i + 1), k: n.cell }, geometry: { type: "Point", coordinates: n.center } })) });
    try { map.setPaintProperty("inner", "fill-color", ["case", ["==", ["get", "k"], 1], pal.att[3], mode === "arv" ? pal.arv : pal.seq[3]]); } catch { /* ok */ }
  }, [stats, cellPaint, mode, relief, animalPts, casePts, inner, ds, pal, layersReady, feeding]);

  /* ── relief: the cells rise by what they hold ────────────────────── */
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    map.easeTo({ pitch: relief ? 52 : 0, bearing: relief ? -12 : 0, duration: 700 });
  }, [relief, ready]);

  /* ── selection: outline and camera ───────────────────────────────── */
  const selCells = useMemo(() => {
    if (!ds || !sel) return [] as number[];
    if (sel.t === "cell") return [sel.cell];
    if (sel.t === "locality") return ds.cells.map((_, i) => i).filter((i) => ds.cellCity[i] === sel.city && ds.cellLocality[i] === sel.locality);
    return [];
  }, [ds, sel]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !layersDone.current || !ds) return;
    const feats: GeoJSON.Feature[] = selCells.map((c) => ({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ringOf(ds, c)] } }));
    if (sel?.t === "empty") {
      const f = ds.frontier.find((x) => x.cell === sel.key);
      if (f) feats.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [flatRing(f.ring)] } });
    }
    (map.getSource("sel") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: feats });
  }, [selCells, sel, ds, ready, layersReady]);

  const padding = useCallback(() => {
    const w = el.current?.clientWidth ?? 1000;
    return w > 900 ? { top: 150, bottom: 110, left: 40, right: 420 } : { top: 150, bottom: 170, left: 20, right: 20 };
  }, []);
  const camera = useCallback((s: Sel, instant = false) => {
    const map = mapRef.current; if (!map || !ds) return;
    const d = instant ? 0 : 1400;
    if (s.t === "india") map.fitBounds(INDIA_BOX, { padding: 30, duration: d });
    else if (s.t === "city") map.fitBounds(ds.cities[s.city].box, { padding: padding(), duration: d, maxZoom: 13 });
    else if (s.t === "locality") map.fitBounds(boxOfRings(selCells.map((c) => ringOf(ds, c)), 0.01), { padding: padding(), duration: d, maxZoom: 14.2 });
    else if (s.t === "cell") map.flyTo({ center: [ds.centers[s.cell * 2], ds.centers[s.cell * 2 + 1]], zoom: Math.max(map.getZoom(), 14.2), duration: d, padding: padding() });
    else map.flyTo({ center: s.center, zoom: Math.max(map.getZoom(), 13.8), duration: d, padding: padding() });
  }, [ds, padding, selCells]);

  const choose = useCallback((s: Sel) => { setSel(s); setSheet(s.t === "cell" || s.t === "empty" ? "open" : "peek"); }, []);
  useEffect(() => {
    if (sel && ready && layersReady) camera(sel, false);
    // The camera moves when the selection changes, not when its helpers are rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  /* ── first view: from the URL, or the busiest city ───────────────── */
  const started = useRef(false);
  useEffect(() => {
    if (!ds || !ready || !layersReady || started.current) return;
    started.current = true;
    const cellKey = params.get("cell");
    const cityName = params.get("city");
    const q = params.get("q");
    const focus = params.get("focus");
    const lat = parseFloat(params.get("lat") ?? ""), lng = parseFloat(params.get("lng") ?? "");
    const bbox = params.get("bbox")?.split(",").map(Number);
    const mParam = Number(params.get("m"));
    if (Number.isFinite(mParam) && params.get("m")) setMonth(Math.max(m0, Math.min(mNow, mParam)));
    const byCity = (name: string) => ds.cities.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
    const nearestCity = (x: number, y: number) => ds.cities.reduce((b, c, i) => ((c.lng - x) ** 2 + (c.lat - y) ** 2 < (ds.cities[b].lng - x) ** 2 + (ds.cities[b].lat - y) ** 2 ? i : b), 0);
    let s: Sel = { t: "city", city: 0 };
    if (cellKey) {
      const ci = ds.cells.indexOf(cellKey);
      if (ci >= 0) s = { t: "cell", cell: ci };
      else { const f = ds.frontier.find((x) => x.cell === cellKey); if (f) { const r = flatRing(f.ring); s = { t: "empty", key: f.cell, city: f.city, center: r[0] }; } }
    } else if (cityName && byCity(cityName) >= 0) {
      s = { t: "city", city: byCity(cityName) };
      if (q) { const li = ds.localities.findIndex((l) => l.toLowerCase() === q.toLowerCase()); if (li >= 0) s = { t: "locality", city: s.city, locality: li }; }
    } else if (q) {
      const li = ds.localities.findIndex((l) => l.toLowerCase() === q.toLowerCase());
      if (li >= 0) { const c = ds.cellLocality.findIndex((x) => x === li); s = { t: "locality", city: ds.cellCity[c], locality: li }; }
    } else if (Number.isFinite(lat) && Number.isFinite(lng)) {
      s = { t: "city", city: nearestCity(lng, lat) };
      setSel(s); setSheet("peek");
      mapRef.current?.jumpTo({ center: [lng, lat], zoom: 13.5 });
      return;
    } else if (bbox && bbox.length === 4 && bbox.every(Number.isFinite)) {
      s = { t: "city", city: nearestCity((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2) };
      setSel(s); setSheet("peek");
      mapRef.current?.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 30, duration: 0 });
      return;
    }
    if (focus?.startsWith("animal:")) {
      fetch(`/api/spatial/animal?id=${encodeURIComponent(focus.slice(7))}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
        const ci = j?.cell ? ds.cells.indexOf(j.cell) : -1;
        if (ci >= 0) { mapRef.current?.fitBounds(ds.cities[ds.cellCity[ci]].box, { padding: 20, duration: 0 }); setTimeout(() => choose({ t: "cell", cell: ci }), 500); }
      }).catch(() => {});
      setSel({ t: "city", city: 0 }); camera({ t: "city", city: 0 }, true);
      return;
    }
    setSel(s); setSheet(s.t === "cell" || s.t === "empty" ? "open" : "peek");
    camera(s, true);
  }, [ds, ready, layersReady, params, camera, choose, mNow, m0]);

  /* ── keep the URL in step, without navigating ────────────────────── */
  useEffect(() => {
    if (!ds || !sel || !started.current) return;
    const u = new URL(window.location.href);
    ["cell", "city", "q", "lat", "lng", "bbox", "focus"].forEach((k) => u.searchParams.delete(k));
    u.searchParams.set("mode", mode);
    if (mode === "cases" && lens !== "open") u.searchParams.set("lens", lens); else u.searchParams.delete("lens");
    if (month !== null && month !== mNow) u.searchParams.set("m", String(month)); else u.searchParams.delete("m");
    if (sel.t === "city") u.searchParams.set("city", ds.cities[sel.city].name);
    if (sel.t === "locality") { u.searchParams.set("city", ds.cities[sel.city].name); u.searchParams.set("q", ds.localities[sel.locality]); }
    if (sel.t === "cell") u.searchParams.set("cell", ds.cells[sel.cell]);
    if (sel.t === "empty") u.searchParams.set("cell", sel.key);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [ds, sel, mode, month, mNow, lens]);

  /* ── clicks and hover ────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready || !ds) return;
    const onClick = (e: MapMouseEvent) => {
      const layers = ["cities", "feeding", "clusters", "pts", "cases", "next", "cells", "frontier-fill"].filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
      const hits = map.queryRenderedFeatures(e.point, { layers });
      const h = hits[0];
      if (!h) return;
      const id = h.layer.id;
      if (id === "cities") { choose({ t: "city", city: Number(h.properties?.i) }); return; }
      if (id === "feeding") { router.push(`/feeding/${h.properties?.id}`); return; }
      if (id === "clusters") {
        const src = map.getSource("pts") as GeoJSONSource;
        src.getClusterExpansionZoom(Number(h.properties?.cluster_id)).then((z) => map.easeTo({ center: (h.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.4 })).catch(() => {});
        return;
      }
      if (id === "pts" || id === "cases") { choose({ t: "cell", cell: Number(h.properties?.c) }); return; }
      if (id === "next") {
        const key = String(h.properties?.k);
        const ci = ds.cells.indexOf(key);
        if (ci >= 0) choose({ t: "cell", cell: ci });
        else { const f = ds.frontier.find((x) => x.cell === key); if (f) choose({ t: "empty", key, city: f.city, center: ds.next.find((n) => n.cell === key)?.center ?? flatRing(f.ring)[0] }); }
        return;
      }
      if (id === "cells") {
        const ci = Number(h.id ?? h.properties?.i);
        if (statOf.get(ci)?.observed || statOf.get(ci)?.events) choose({ t: "cell", cell: ci });
        return;
      }
      if (id === "frontier-fill" && mode === "coverage") {
        const key = String(h.properties?.k);
        choose({ t: "empty", key, city: Number(h.properties?.city), center: [e.lngLat.lng, e.lngLat.lat] });
      }
    };
    const onMove = (e: MapMouseEvent) => {
      if (phone) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: ["cells"].filter((l) => map.getLayer(l)) });
      const ci = hits[0] ? Number(hits[0].id) : -1;
      const s = ci >= 0 ? statOf.get(ci) : undefined;
      if (!s || (!s.observed && !s.events) || (mode === "cases" && !value(s))) { setHover(null); map.getCanvas().style.cursor = ""; return; }
      map.getCanvas().style.cursor = "pointer";
      const loc = ds.cellLocality[ci] >= 0 ? ds.localities[ds.cellLocality[ci]] : "Unnamed cell";
      /* One cell on the public map never shows a count of one or two. */
      const pub = scope === "public";
      const n = (x: number) => fewOr(x, pub);
      const v = mode === "coverage" ? COVERAGE_TEXT[s.coverage].label
        : mode === "cases" ? `${n(value(s))} ${LENSES.find((l) => l.id === lens)!.unit}`
        : mode === "medical" ? `${n(s.injured + s.help)} injured or needing help`
        : mode === "activity" || mode === "change" ? `${n(s.recentEvents)} field records this year`
        : (mode === "abc" || mode === "arv") && pub && isSparse(s.animals) ? "few records — too few for a share"
        : mode === "abc" ? `${n(s.sterYes)} of ${n(s.animals)} sterilised on record`
        : mode === "arv" ? `${n(s.vaccYes)} of ${n(s.animals)} vaccinated on record`
        : pub && isSparse(s.animals) ? "few records"
        : `${n(s.animals)} animal${s.animals === 1 ? "" : "s"} recorded`;
      setHover({ x: e.point.x, y: e.point.y, text: `${loc} · ${v}` });
    };
    const onOut = () => setHover(null);
    map.on("click", onClick); map.on("mousemove", onMove); map.on("mouseout", onOut);
    return () => { map.off("click", onClick); map.off("mousemove", onMove); map.off("mouseout", onOut); };
  }, [ready, ds, statOf, mode, choose, phone, scope, router, value, lens]);

  /* ── Escape steps out one rung ───────────────────────────────────── */
  const stepOut = useCallback(() => {
    if (!ds || !sel) return;
    if (sel.t === "cell") { const c = ds.cellCity[sel.cell]; const l = ds.cellLocality[sel.cell]; choose(l >= 0 ? { t: "locality", city: c, locality: l } : { t: "city", city: c }); }
    else if (sel.t === "empty") choose({ t: "city", city: sel.city });
    else if (sel.t === "locality") choose({ t: "city", city: sel.city });
    else if (sel.t === "city") choose({ t: "india" });
  }, [ds, sel, choose]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !filterOpen) stepOut(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [stepOut, filterOpen]);

  /* ── the ladder ──────────────────────────────────────────────────── */
  const rungs: Rung[] = useMemo(() => {
    if (!ds || !sel) return [{ label: "India" }];
    const r: Rung[] = [{ label: "India", onClick: () => choose({ t: "india" }) }];
    const cityI = sel.t === "city" || sel.t === "locality" || sel.t === "empty" ? sel.city : sel.t === "cell" ? ds.cellCity[sel.cell] : -1;
    if (cityI >= 0) {
      const c = ds.cities[cityI];
      if (c.state && c.state !== c.name) r.push({ label: c.state });
      r.push({ label: c.name, onClick: () => choose({ t: "city", city: cityI }) });
    }
    if (sel.t === "locality") r.push({ label: ds.localities[sel.locality] });
    if (sel.t === "cell") {
      const l = ds.cellLocality[sel.cell];
      if (l >= 0) r.push({ label: ds.localities[l], onClick: () => choose({ t: "locality", city: ds.cellCity[sel.cell], locality: l }) });
      r.push({ label: "Cell" });
    }
    if (sel.t === "empty") r.push({ label: "Unmapped cell" });
    return r;
  }, [ds, sel, choose]);

  /* ── legend ──────────────────────────────────────────────────────── */
  const def = MODES.find((x) => x.id === mode)!;
  const legend = (() => {
    if (mode === "coverage") return (
      <ul className="sm-key">
        {(["strong", "partial", "weak", "insufficient"] as const).map((k) => <li key={k}><i className={`sm-sw is-cov-${k}`} />{COVERAGE_TEXT[k].label}</li>)}
        <li><i className="sm-sw is-frontier" />Not mapped</li>
        <li><i className="sm-sw is-next" />Map next</li>
      </ul>
    );
    if (mode === "abc" || mode === "arv") return (
      <ul className="sm-key">
        <li><i className={`sm-sw ${mode === "arv" ? "is-arv" : "is-abc"}`} />{mode === "abc" ? "Sterilised, on record" : "Vaccinated, on record"} — drawn at its share</li>
        <li><i className="sm-sw is-hatch" />Not recorded — unknown, not zero</li>
        {mode === "arv" && <li><i className="sm-sw is-due" />Booster due</li>}
        {scope === "public" && <li><i className={`sm-sw is-small ${mode === "arv" ? "is-arv" : "is-abc"}`} />Small mark — one or two animals, too few for a share</li>}
      </ul>
    );
    if (mode === "change") return (
      <ul className="sm-key">
        <li><i className="sm-sw is-new" />New this year</li><li><i className="sm-sw is-up" />More</li><li><i className="sm-sw is-steady" />Steady</li>
        <li><i className="sm-sw is-down" />Less</li><li><i className="sm-sw is-stopped" />Work stopped</li>
      </ul>
    );
    if (mode === "animals") return (
      <ul className="sm-key">
        <li><i className="sm-dot is-ink" />Animal on record</li><li><i className="sm-dot is-help" />Injured or needs help</li><li><i className="sm-dot is-res" />Reported by a resident</li>
        {feeding.length > 0 && <li><i className="sm-dot is-feed" />Feeding point</li>}
      </ul>
    );
    const ramp = mode === "medical" || mode === "cases" ? pal.att : pal.seq;
    if (mode === "cases" && lensCounts && !lensCounts.some((x) => x > 0)) return (
      <p className="sm-empty">
        {lens === "repeat"
          ? "No animal has a second case yet. Each imported case created its own animal record, so a return visit is not linked — linking it on the case is what makes it appear here."
          : `No case matches this question${filters.condition >= 0 ? " for this condition" : ""}, as of ${monthLabel(m)}.`}
      </p>
    );
    return (
      <div className="sm-ramp">
        <span>{br[0] ?? 1}</span>
        <i style={{ background: `linear-gradient(90deg, ${ramp.join(",")})` }} />
        <span>{(br[br.length - 1] ?? 1)}+ {mode === "cases" ? "cases" : mode === "activity" ? "records" : "animals"}</span>
        {mode === "cases" && <em><i className="sm-dot is-help" /> critical <i className="sm-dot is-ring" /> other · wider = older</em>}
      </div>
    );
  })();

  const nFilters = (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter((k) => filters[k] !== NO_FILTERS[k]).length;
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      mapRef.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14, duration: 1200 });
    }, () => {}, { timeout: 8000 });
  };
  const reportHere = () => {
    const c = mapRef.current?.getCenter();
    router.push(c ? `/report?lat=${c.lat}&lng=${c.lng}` : "/report");
  };

  return (
    <div className={`sm ${ground === "night" ? "is-night" : "is-paper"} ${phone ? "is-phone" : ""}`}>
      <div className="sm-canvas" ref={el} />
      <h1 className="sys-sr">Street animals on the StrayPaw register: {def.label.toLowerCase()} — {def.q}</h1>

      <div className="sm-top">
        {notice && <div className="sm-notice">{notice}</div>}
        <ScaleLadder rungs={rungs} night={ground === "night"} />
        <div className="sm-modes" role="tablist" aria-label="What the map shows">
          {MODES.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={mode === x.id} className={mode === x.id ? "is-on" : ""} onClick={() => setMode(x.id)}>{x.label}</button>
          ))}
        </div>
        <div className="sm-q">
          <p>{mode === "cases" ? LENSES.find((l) => l.id === lens)!.q : def.q}</p>
          {mode === "cases" && (
            <div className="sm-lens" role="group" aria-label="Which cases">
              {LENSES.map((l) => <button key={l.id} type="button" aria-pressed={lens === l.id} className={lens === l.id ? "is-on" : ""} onClick={() => setLens(l.id)}>{l.label}</button>)}
            </div>
          )}
          {legend}
          <p className="sm-note">Recorded animals, not population.{filters.source !== "all" || nFilters ? ` · ${nFilters} filter${nFilters === 1 ? "" : "s"} on` : ""}</p>
        </div>
      </div>

      <div className="sm-tools">
        <button type="button" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen} className={nFilters ? "is-on" : ""} aria-label="Filter the animals shown"><SlidersHorizontal size={16} />{nFilters ? <b>{nFilters}</b> : null}</button>
        <button type="button" onClick={() => setRelief((v) => !v)} aria-pressed={relief} className={relief ? "is-on" : ""} aria-label="Relief: raise each cell by what it holds"><Mountain size={16} /></button>
        <button type="button" onClick={() => setGround((g) => (g === "night" ? "paper" : "night"))} aria-label={ground === "night" ? "Switch to the paper ground, for daylight" : "Switch to the night ground"}><Layers size={16} /></button>
        <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" onClick={locate} aria-label="Go to where I am"><Crosshair size={16} /></button>
      </div>

      {filterOpen && (
        <div className="sm-filter" role="dialog" aria-label="Filter the map">
          <FilterRow label="Recorded by" value={filters.source} options={[["all", "Everyone"], ["field", "Field teams"], ["resident", "Residents"]]} onChange={(v) => setFilters({ ...filters, source: v as Filters["source"] })} />
          <FilterRow label="Health" value={filters.health} options={[["any", "Any"], ["help", "Needs help"], ["injured", "Injured"]]} onChange={(v) => setFilters({ ...filters, health: v as Filters["health"] })} />
          <FilterRow label="Sterilisation" value={filters.ster} options={[["any", "Any"], ["yes", "Recorded"], ["unknown", "Not recorded"]]} onChange={(v) => setFilters({ ...filters, ster: v as Filters["ster"] })} />
          <FilterRow label="Vaccination" value={filters.vacc} options={[["any", "Any"], ["yes", "Recorded"], ["unknown", "Not recorded"], ["due", "Booster due"]]} onChange={(v) => setFilters({ ...filters, vacc: v as Filters["vacc"] })} />
          <FilterRow label="Last seen" value={filters.seen} options={[["any", "Any time"], ["90", "90 days"], ["365", "A year"]]} onChange={(v) => setFilters({ ...filters, seen: v as Filters["seen"] })} />
          <label className="sm-filter-row">
            <span>Condition (cases)</span>
            <select value={filters.condition} onChange={(e) => setFilters({ ...filters, condition: Number(e.target.value) })}>
              <option value={-1}>Every condition</option>
              {CONDITIONS.map((c, i) => <option key={c} value={i}>{c}</option>)}
            </select>
          </label>
          <div className="sm-filter-acts">
            <button type="button" className="sys-btn is-quiet is-sm" onClick={() => setFilters(NO_FILTERS)}>Clear</button>
            <button type="button" className="sys-btn is-sm" onClick={() => setFilterOpen(false)}>Done</button>
          </div>
        </div>
      )}

      {hover && <div className="sm-hover" style={{ left: hover.x + 14, top: hover.y + 14 }}>{hover.text}</div>}

      {ds && ix && sel && (
        <Inspector
          ds={ds} ix={ix} sel={sel} t={t} scope={scope} next={ds.next}
          onSelect={choose} onClose={stepOut}
          onPickNext={(n: NextCell) => {
            const ci = ds.cells.indexOf(n.cell);
            if (ci >= 0) choose({ t: "cell", cell: ci }); else choose({ t: "empty", key: n.cell, city: n.city, center: n.center });
          }}
          compact={phone && sheet === "peek"} onExpand={() => setSheet("open")}
        />
      )}

      {ds && series.length > 1 && (
        <Timeline series={series} m0={m0} m={m} onChange={(x) => { setPlaying(false); setMonth(x); }} playing={playing} onPlay={play} night={ground === "night"} />
      )}

      <button type="button" className="sm-report" onClick={reportHere}><Plus size={16} /> Report here</button>

      {loading && <div className="sm-state" role="status"><span>Reading the register…</span></div>}
      {error && <div className="sm-state" role="status"><span>{error}</span></div>}
    </div>
  );
}

function FilterRow({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="sm-filter-row" role="group" aria-label={label}>
      <span>{label}</span>
      <div>{options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} className={value === v ? "is-on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>
    </div>
  );
}
