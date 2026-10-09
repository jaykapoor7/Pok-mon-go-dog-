"use client";

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   StrayPaw spatial intelligence: one map, one question at a time.

   The unit of place is an H3 cell (â0.74 kmÂ²), the same cell on the
   landing page, in analytics and on a profile. Each mode asks the cells
   one question â where are animals recorded, how densely, how well is the
   place known, where is sterilisation or vaccination recorded and where is
   it unknown, where is work open, where did it change â and colours them
   by the answer. Nothing else competes: the streets are a quiet ground,
   there is no text on the map, and the numbers wait in the inspector until
   a place is chosen.

   THREE RULES THE MAP KEEPS
   â¢ Recorded is not real. A light or empty cell is "not recorded", and the
     edge of the record is drawn as a dashed honeycomb that carries on into
     the unknown rather than stopping at the last dot.
   â¢ Unknown is hatched. In ABC and ARV the cell is hatched and the recorded
     share is drawn solid inside it, at its real size.
   â¢ Positions are honest. A record is known to its cell, so its dot is
     drawn inside its cell â never at an address the register does not hold.

   The same component serves the public map (/map) and an organisation's
   field map (/partner/map); only where the data comes from differs.
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification, MapMouseEvent } from "maplibre-gl";
import { ArrowUpRight, Box, ChevronDown, Crosshair, Hexagon, Layers, Minus, Plus, SlidersHorizontal, Square, X } from "lucide-react";
import { groundStyle, underlay, restyle, type Palette } from "@/components/map/basemap";
import {
  animalVisible, breaks, cellStats, COVERAGE_TEXT, fewOr, firstDay, isSparse, monthEndDay, monthLabel, monthOfDay, NO_FILTERS, openOn, rankOf, caseStateOn, resolvedOn, resolutionUndated,
  type CellStat, type Filters, type Mode,
} from "@/lib/spatial/engine";
import { A, A_STRIDE, AF, C, C_STRIDE, K, K_STRIDE, type NextCell, type SpatialDataset } from "@/lib/spatial/types";
import { densityContours, LEVELS } from "@/lib/spatial/contours";
import { Portraits, type DotPick } from "./Portraits";
import { CONDITIONS, DEFAULT_TRIAGE, STATUSES, type Condition } from "@/lib/register/taxonomy";
import { CITIES } from "@/lib/geo/cities";
import { getSupabase } from "@/lib/supabase";
import { useSpatialDataset, ringOf, flatRing, pointInCell, boxOfRings, INDIA_BOX, type Scope } from "./data";
import { Inspector, type Sel } from "./Inspector";
import { Timeline } from "./Timeline";
import { BoundedSpatialMap } from "./BoundedSpatialMap";
import { SearchSelect } from "@/components/app/SearchSelect";
import "./spatial.css";
import "./atlas.css";
import "./atlas-x.css";
import { AtlasIndex, CityEvidence, KIND_META, cityEvidence, kindOf } from "./AtlasRegister";
import { ATLAS_NIGHT, ATLAS_PAPER } from "./atlas-palette";
import { LensReadout } from "./LensReadout";

type ModeDef = { id: Mode | "change"; label: string; q: string };
const MODES: ModeDef[] = [
  { id: "animals", label: "Animals", q: "All recorded animals counted by cell, with individual records shown as detail" },
  { id: "density", label: "Density", q: "Where recorded animals gather, drawn as terrain" },
  { id: "coverage", label: "Evidence", q: "How much is recorded, and where the evidence is incomplete" },
  { id: "abc", label: "ABC", q: "Citywide sterilisation totals by cell, with individual detail where loaded" },
  { id: "arv", label: "ARV", q: "Citywide vaccination totals by cell, with individual detail where loaded" },
  { id: "medical", label: "Medical", q: "Where injured and sick animals are recorded" },
  { id: "cases", label: "Cases", q: "Where work is open, and how long it has waited" },
  { id: "activity", label: "Field work", q: "Detailed field records in the twelve months before this date" },
  { id: "change", label: "Change", q: "Change visible in the loaded detailed field record" },
];
type AnyMode = Mode | "change";
/* The operational modes belong in reach, not only behind More. The remaining
   analytical views stay available without competing with the everyday map. */
const PRIMARY_MODES: AnyMode[] = ["animals", "cases", "abc", "arv", "coverage"];

/* Cases mode asks one of the field map's working questions. */
type CaseLens = "open" | "critical" | "followup" | "noaction" | "repeat" | "resolved";
const LENSES: { id: CaseLens; label: string; q: string; unit: string }[] = [
  { id: "open", label: "Open", q: "Where work is open, and how long it has waited", unit: "open" },
  { id: "critical", label: "Critical", q: "Where critical cases are still open", unit: "critical, open" },
  { id: "followup", label: "Follow-up", q: "Where a follow-up is due or was missed", unit: "with a follow-up due or missed" },
  { id: "noaction", label: "Source: no action", q: "Records classified as no action; imported status is not proof of a missed intervention", unit: "classified as no action" },
  { id: "repeat", label: "Repeat animals", q: "Where the same animal keeps coming back", unit: "for animals seen before" },
  { id: "resolved", label: "Resolved", q: "Where cases were resolved", unit: "resolved" },
];

/* The filters that change what each mode draws, and no others. Sterilisation,
   vaccination and health are not filters: ABC, ARV and Medical are the modes
   that answer them. Coverage, field work and change are read from every
   record, so nothing narrows them but the date. */
type FilterKey = "source" | "seen" | "condition";
const FILTERS_FOR: Record<AnyMode, FilterKey[]> = {
  animals: ["source", "seen"], density: ["source", "seen"], abc: ["source", "seen"], arv: ["source", "seen"], medical: ["source", "seen"],
  cases: ["source", "condition"], coverage: [], activity: [], change: [],
};
const SOURCE_OPTS: [string, string][] = [["all", "Everyone"], ["field", "Field teams"], ["resident", "Residents"]];
const SEEN_OPTS: [string, string][] = [["any", "Any time"], ["90", "90 days"], ["365", "1 year"]];

const EMPTY = { type: "FeatureCollection" as const, features: [] as GeoJSON.Feature[] };
/* India scale: each city coloured by the kind of record it holds. */
const KIND_COLOR = ["match", ["get", "k"], "rescue", "#f26c52", "campaign", "#66c5d5", "clinical", "#93b1f0", "photo", "#e3b35b", "#c9cfdb"] as unknown as ExpressionSpecification;
const T = "rgba(0,0,0,0)";

/** A real, bounded map when a browser cannot start WebGL2. It deliberately
 * uses the same city dataset, cell colours and points as the MapLibre view:
 * a GPU capability issue must not turn the public record into a blank page. */
function LiveMapFallback({
  ds, stats, paint, animals, cases, mode, pal,
}: {
  ds: SpatialDataset;
  stats: CellStat[];
  paint: (s: CellStat) => { c: string; o: number; line?: string };
  animals: typeof EMPTY;
  cases: typeof EMPTY;
  mode: AnyMode;
  pal: Palette;
}) {
  const [west, south, east, north] = ds.cells.length ? ds.cities[0]?.box ?? INDIA_BOX : INDIA_BOX;
  const dx = Math.max(0.0001, east - west), dy = Math.max(0.0001, north - south);
  const point = ([lng, lat]: number[]) => [36 + ((lng - west) / dx) * 928, 664 - ((lat - south) / dy) * 628] as const;
  const path = (ring: [number, number][]) => ring.map((p, i) => {
    const [x, y] = point(p);
    return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";
  const cells = stats.map((s) => ({ s, p: paint(s) })).filter(({ p }) => p.o > 0 || p.line);
  const animalPoints = ds.cells.length > 1 && (mode === "animals" || mode === "abc" || mode === "arv" || mode === "medical" || mode === "density")
    ? animals.features.slice(0, 850) : [];
  const casePoints = ds.cells.length > 1 && (mode === "cases" || mode === "medical") ? cases.features.slice(0, 600) : [];
  return (
    <svg className="sm-fallback-map" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="700" fill={pal.bg} />
      {!ds.cells.length && ds.cities.map((city) => { const [x, y] = point([city.lng, city.lat]); return <g key={city.name}><circle cx={x} cy={y} r={Math.min(30, 3 + Math.sqrt(city.animals) / 6)} fill={pal.seq[3]} /><text x={x + 8} y={y + 20} fill={pal.ink} fontSize="12">{city.name}</text></g>; })}
      {cells.map(({ s, p }) => <path key={s.cell} d={path(ringOf(ds, s.cell))} fill={p.c} fillOpacity={p.o} stroke={p.line ?? "rgba(239,231,218,.16)"} strokeWidth=".75" />)}
      {animalPoints.map((feature, i) => {
        if (feature.geometry.type !== "Point") return null;
        const [x, y] = point(feature.geometry.coordinates as number[]);
        const kind = Number(feature.properties?.k ?? 0);
        return <circle key={i} cx={x} cy={y} r={kind === 1 ? 2.8 : 2} fill={kind === 1 ? pal.att[3] : pal.ink} fillOpacity=".88" />;
      })}
      {casePoints.map((feature, i) => {
        if (feature.geometry.type !== "Point") return null;
        const [x, y] = point(feature.geometry.coordinates as number[]);
        return <circle key={i} cx={x} cy={y} r="3" fill={Number(feature.properties?.crit ?? 0) ? pal.att[3] : pal.ink} stroke={pal.bg} strokeWidth="1" />;
      })}
    </svg>
  );
}

function hatchImage(color: string) {
  const s = 8, c = document.createElement("canvas");
  c.width = s; c.height = s;
  const g = c.getContext("2d")!;
  g.strokeStyle = color; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(0, s); g.lineTo(s, 0); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(s - 2, s + 2); g.lineTo(s + 2, s - 2); g.stroke();
  return g.getImageData(0, 0, s, s);
}

/* The lights the data draws with, on each ground. */
function lightsOf(p: Palette) {
  return p.name === "night" ? {
    core: "#dbe7ff", halo: "#4f7fe0", help: "#ff8a6e", res: "#93b1f0", unknown: "rgba(239,231,218,0.42)",
    abc: "#6f9bff", arv: "#7fc9d6", due: "#f7a08c", ring: "#efe7da", fog: "rgba(3,10,24,0.66)",
    heat: ["rgba(19,43,85,0)", "rgba(27,63,128,0.35)", "rgba(42,91,184,0.55)", "rgba(79,127,224,0.65)", "rgba(147,177,240,0.7)", "rgba(219,231,255,0.8)"],
    flame: ["rgba(59,31,44,0)", "rgba(109,42,44,0.5)", "#a8392b", "#e05537", "#f7a08c", "#ffe3da"],
    sky: ["rgba(15,50,60,0)", "rgba(30,90,100,0.45)", "#3c98a8", "#7fc9d6", "#bfe8ee", "#f0fbfc"],
    skyCore: "#bfe8ee",
    band: ["#1b3f80", "#2a5bb8", "#3f6fd0", "#4f7fe0", "#7ea3ec", "#93b1f0", "#dbe7ff"],
  } : {
    core: "#16398f", halo: "#5b82dc", help: "#d4421f", res: "#2457ce", unknown: "rgba(11,30,61,0.28)",
    abc: "#2457ce", arv: "#3c98a8", due: "#d4421f", ring: "#0b1e3d", fog: "rgba(239,231,218,0.78)",
    heat: ["rgba(200,212,240,0)", "rgba(200,212,240,0.55)", "#93aee9", "#5b82dc", "#2457ce", "#16398f"],
    flame: ["rgba(246,210,199,0)", "rgba(246,210,199,0.6)", "#f0b09c", "#f0957c", "#f05b40", "#b93a1d"],
    sky: ["rgba(200,230,235,0)", "rgba(170,215,222,0.55)", "#7fc0cc", "#3c98a8", "#2a7a88", "#1d5c67"],
    skyCore: "#2a7a88",
    band: ["#c8d4f0", "#93aee9", "#7496e2", "#5b82dc", "#2457ce", "#1b46b0", "#16398f"],
  };
}
const heatRamp = (c: string[]) => ["interpolate", ["linear"], ["heatmap-density"], 0, c[0], 0.12, c[1], 0.3, c[2], 0.55, c[3], 0.8, c[4], 1, c[5]];

export function SpatialMap({ scope = "public", userKey = null, surface = "community" }: { scope?: Scope; userKey?: string | null; surface?: "community" | "municipality" }) {
  const params = useSearchParams();
  const router = useRouter();
  const overviewOnly = scope === "public" && !["city", "cell", "q", "lat", "lng", "bbox", "focus"].some((key) => params.has(key));
  const { ds, ix, error, loading, city: datasetCity, cities: availableCities } = useSpatialDataset(scope, userKey, true, overviewOnly);
  /* The overview keeps one bounded city dataset in memory, while its lights
     represent every city. Entering a city switches to its bounded detail. */
  const indiaOverview = scope === "public" && !params.get("city");
  const cityPins = useMemo(() => {
    const positions = new Map(CITIES.map((city) => [city.name.toLowerCase(), city]));
    for (const city of ds?.cities ?? []) positions.set(city.name.toLowerCase(), city);
    return availableCities.flatMap((city) => {
      /* City rollups include a centroid derived from their own H3 cells. That
         makes every city addressable, including new imports not in CITIES. */
      const fallback = positions.get(city.city.toLowerCase());
      const lat = typeof city.lat === "number" ? city.lat : fallback?.lat;
      const lng = typeof city.lng === "number" ? city.lng : fallback?.lng;
      return typeof lat === "number" && typeof lng === "number"
        ? [{ ...city, lat, lng }]
        : [];
    });
  }, [availableCities, ds]);

  /* A national map is not a shrunken city map. At India scale it is a
     directory of real city registers; at street scale it is individual
     animals. Keep that handoff explicit, so zooming into another city never
     silently replaces the place someone was reading. */
  const [mapZoom, setMapZoom] = useState(4);
  const [approachingCity, setApproachingCity] = useState<(typeof cityPins)[number] | null>(null);
  /* On a phone the map remains the surface. The atlas starts as one compact
     route into city data; the city search remains available for the full list. */
  const [atlasOpen, setAtlasOpen] = useState(false);

  /* Night by default: the same ground as the landing plate, so opening the
     Atlas continues the picture rather than switching to another product. */
  const [ground, setGround] = useState<"night" | "paper">("paper");
  const [railClosed, setRailClosed] = useState(false);
  /* 3D columns by default at city scale; the plan view stays one press away. */
  const [three, setThree] = useState(params.get("view") !== "2d");
  useEffect(() => { try { const g = localStorage.getItem("sp.atlas.ground.v2"); if (g === "paper" || g === "night") setGround(g); } catch { /* storage blocked */ } }, []);
  const pal: Palette = ground === "night" ? ATLAS_NIGHT : ATLAS_PAPER;

  const initialMode = (MODES.find((m) => m.id === params.get("mode"))?.id ?? (surface === "municipality" ? "coverage" : "animals")) as AnyMode;
  const [mode, setMode] = useState<AnyMode>(initialMode);
  const urlMode = params.get("mode");
  useEffect(() => {
    const requested = MODES.find((item) => item.id === urlMode)?.id;
    if (requested) setMode(requested);
  }, [urlMode]);
  const atlasLens = mode === "cases" ? "cases" : ["abc", "arv", "medical"].includes(mode) ? "care" : ["coverage", "activity", "change"].includes(mode) ? "evidence" : "animals";
  const [lens, setLens] = useState<CaseLens>((LENSES.find((l) => l.id === params.get("lens"))?.id ?? "open") as CaseLens);
  const [month, setMonth] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<Sel | null>(null);
  /* A tapped animal dot opens that animal's card; the map does not move. */
  const [dotPick, setDotPick] = useState<DotPick | null>(null);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  /* Phone controls are intentionally one disclosed surface. The map keeps
     its space until someone asks to change how it is read. */
  const [phoneControlsOpen, setPhoneControlsOpen] = useState(false);
  const primaryModes = surface === "municipality"
    ? (["coverage", "abc", "arv", "cases", "animals"] as AnyMode[])
    : scope === "org"
      ? (["animals", "cases", "activity", "abc", "arv"] as AnyMode[])
      : PRIMARY_MODES;
  /* The hex grid is an analysis overlay: on by default only where a mode is about cells. */
  const [grid, setGrid] = useState(params.get("grid") === "1");
  /* Nothing sits over the map until someone picks a place on it. */
  const [sheet, setSheet] = useState<"hidden" | "peek" | "open">("hidden");
  /* The phone inspector behaves as a real bottom drawer. Keep the drag
     deliberately small and state-based: it should reveal context without
     ever moving the map or leaving the sheet between ambiguous heights. */
  const sheetDrag = useRef<{ y: number; from: "hidden" | "peek" | "open" } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  /* Authoritative per-cell totals from the rollup, keyed by H3. The bounded
     dataset drives dots and time-sliced/filtered views, while current unfiltered
     readouts use the full cell totals. This applies to public AND organisation
     maps; organisation cells are fetched with the member's own session. */
  const [authByCell, setAuthByCell] = useState<Map<string, { animals: number; sterilised: number; vaccinated: number; cases: number; open_cases: number; needs_help: number; care_events?: number }>>(new Map());
  useEffect(() => {
    if (!datasetCity) { setAuthByCell(new Map()); return; }
    let live = true;
    (async () => {
      const init: RequestInit = {};
      const scopeParam = scope === "org" ? "&scope=org" : "";
      if (scope === "org") {
        const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
        if (!data.session?.access_token) { if (live) setAuthByCell(new Map()); return; }
        init.headers = { Authorization: `Bearer ${data.session.access_token}` };
      }
      const r = await fetch(`/api/spatial?kind=cells&city=${encodeURIComponent(datasetCity)}${scopeParam}&v=3`, init);
      const j = r.ok ? await r.json() : { cells: [] };
      if (!live) return;
      const m = new Map<string, { animals: number; sterilised: number; vaccinated: number; cases: number; open_cases: number; needs_help: number; care_events?: number }>();
      for (const c of (j.cells ?? [])) m.set(c.h3_r8, c);
      setAuthByCell(m);
    })().catch(() => { if (live) setAuthByCell(new Map()); });
    return () => { live = false; };
  }, [scope, datasetCity]);
  const [ready, setReady] = useState(false);
  const [baseReady, setBaseReady] = useState(false);
  const [layersReady, setLayersReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
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

  /* ââ the clock âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
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

  /* Only the filters that apply to this mode reach the drawing; the rest
     are kept for when the reader switches back. */
  const eff = useMemo<Filters>(() => {
    const on = FILTERS_FOR[mode];
    return {
      ...NO_FILTERS,
      source: on.includes("source") ? filters.source : "all",
      seen: on.includes("seen") ? filters.seen : "any",
      condition: on.includes("condition") ? filters.condition : -1,
    };
  }, [filters, mode]);
  const filterNote = [
    eff.source === "field" ? "field-team records" : eff.source === "resident" ? "residents' reports" : "",
    eff.seen !== "any" ? `seen in the last ${eff.seen === "90" ? "90 days" : "year"}` : "",
    eff.condition >= 0 ? CONDITIONS[eff.condition] : "",
  ].filter(Boolean).join(" · ");

  /* ââ what each cell holds, now and a year earlier âââââââââââââââââââ */
  const boundedStats = useMemo(() => (ds && ix ? cellStats(ds, ix, t, eff) : []), [ds, ix, t, eff]);
  /* Current and unfiltered: the one state whose per-cell counts have an
     authoritative rollup equivalent. A time-sliced or filtered view is a
     subset and keeps the bounded analytical detail. */
  const unfiltered = month === null && eff.source === "all" && eff.seen === "any" && eff.condition < 0 && !(mode === "cases" && lens !== "open");
  const stats = useMemo(() => {
    if (!ds || !unfiltered || !authByCell.size) return boundedStats;
    return boundedStats.map((row) => {
      const exact = authByCell.get(ds.cells[row.cell]);
      if (!exact) return row;
      const animals = Number(exact.animals || 0);
      const sterYes = Number(exact.sterilised || 0);
      const vaccYes = Number(exact.vaccinated || 0);
      const cases = Number(exact.cases || 0);
      const open = Number(exact.open_cases || 0);
      const medical = Number(exact.needs_help || 0);
      return {
        ...row,
        animals,
        observed: Math.max(row.observed, animals),
        help: medical,
        medical,
        sterYes,
        // Rollups lack a verified no/unknown split. Preserve only explicit
        // negative evidence from loaded detail rather than inventing "no".
        sterNo: row.sterNo,
        vaccYes,
        vaccNo: row.vaccNo,
        cases,
        open,
        care: exact.care_events == null ? row.care : Number(exact.care_events),
      };
    });
  }, [boundedStats, unfiltered, authByCell, ds]);
  const prev = useMemo(() => (ds && ix && mode === "change" ? cellStats(ds, ix, t - 365, NO_FILTERS) : []), [ds, ix, t, mode]);
  const statOf = useMemo(() => new Map(stats.map((row) => [row.cell, row])), [stats]);

  /* Which cases the Cases mode is asking about, on day t: 0 not asked
     about, 1 a match, 2 a case whose resolution day is unknown â drawn as
     its own thing, never counted as open or as resolved on a day it may
     not have been (engine.caseStateOn). */
  const caseKind = useCallback((i: number): 0 | 1 | 2 => {
    if (!ds || !ix) return 0;
    const o = i * C_STRIDE, day = ds.cases[o + C.day];
    if (day < 0 || day > t) return 0;
    if (eff.condition >= 0 && ds.cases[o + C.cond] !== eff.condition) return 0;
    if (eff.source === "field" && ds.cases[o + C.source] === 1) return 0;
    if (eff.source === "resident" && ds.cases[o + C.source] !== 1) return 0;
    const st = STATUSES[ds.cases[o + C.status]];
    const state = caseStateOn(ds, i, t);
    const critical = DEFAULT_TRIAGE[(CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition] === "Critical";
    switch (lens) {
      case "open": return state === "open" ? 1 : state === "undated" ? 2 : 0;
      case "critical": return !critical ? 0 : state === "open" ? 1 : state === "undated" ? 2 : 0;
      case "followup": return ds.cases[o + C.fuUp] > 0 || ds.cases[o + C.fuMissed] > 0 ? 1 : 0;
      case "noaction": return st === "no_action" || st === "not_attended" ? 1 : 0;
      case "repeat": { const a = ds.cases[o + C.animal]; return a >= 0 && ix.casesByAnimal[a].length > 1 ? 1 : 0; }
      case "resolved": return st === "no_action" || st === "not_attended" || st === "other_ngo" || !resolvedOn(ds, i, t) ? 0 : resolutionUndated(ds, i) ? 2 : 1;
    }
  }, [ds, ix, t, lens, eff.condition, eff.source]);
  const caseMatch = useCallback((i: number) => caseKind(i) > 0, [caseKind]);
  /* Counted: matches, and resolved cases even when their day is unknown;
     an undated case on the open question is shown, not counted. */
  const lensCounts = useMemo(() => {
    if (!ds || !ix || mode !== "cases") return null;
    const m = new Int32Array(ds.cells.length);
    for (let i = 0; i < ix.nCases; i++) { const k = caseKind(i); if (k === 1 || (k === 2 && lens === "resolved")) m[ds.cases[i * C_STRIDE + C.cell]]++; }
    return m;
  }, [ds, ix, mode, caseKind, lens]);
  const undatedShown = useMemo(() => {
    if (!ds || !ix || mode !== "cases") return 0;
    let n = 0;
    for (let i = 0; i < ix.nCases; i++) if (caseKind(i) === 2) n++;
    return n;
  }, [ds, ix, mode, caseKind]);

  const value = useCallback((s: CellStat): number => {
    switch (mode) {
      case "animals": case "density": case "coverage": case "abc": case "arv": return s.animals;
      case "medical": return s.medical;
      case "cases": return lensCounts ? lensCounts[s.cell] : s.open;
      case "activity": return s.recentField;
      case "change": return s.recentField;
    }
  }, [mode, lensCounts]);
  const br = useMemo(() => breaks(stats.map(value), 5), [stats, value]);

  type ChangeClass = "new" | "up" | "steady" | "down" | "stopped" | null;
  const changeOf = useCallback((s: CellStat): ChangeClass => {
    const before = prev[s.cell]?.recentField ?? 0, now = s.recentField;
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
      case "animals": return r < 0 ? { c: T, o: 0 } : { c: seq[Math.min(4, r)], o: 0.72 };
      case "density": return r < 0 ? { c: T, o: 0 } : { c: seq[Math.min(4, r)], o: 0.9, h: (r + 1) * 260 };
      case "coverage": {
        const ink = ground === "night" ? "239,231,218" : "11,30,61";
        const a = { strong: 0.78, partial: 0.5, weak: 0.28, insufficient: 0.13, unmapped: 0 }[s.coverage];
        return a ? { c: `rgba(${ink},${a})`, o: 1 } : { c: T, o: 0 };
      }
      case "abc": case "arv": {
        /* The cell is shaded by the share on record and carries the count;
           a cell where none is on record stays hatched: unknown, not zero. */
        if (!s.animals) return { c: T, o: 0 };
        const yes = mode === "abc" ? s.sterYes : s.vaccYes;
        if (!yes) return { c: T, o: 0, hatch: 1 };
        if (scope === "public" && isSparse(s.animals)) return { c: seq[1], o: 0.55 };
        return { c: seq[Math.min(4, Math.floor((yes / s.animals) * 5))], o: 0.8 };
      }
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
  }, [mode, br, pal, ground, value, changeOf, scope]);

  /* ââ dots: one per animal, inside its cell âââââââââââââââââââââââââ */
  const animalPts = useMemo(() => {
    if (!ds || !ix) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < ix.nAnimals; i++) {
      if (!animalVisible(ds, i, t, eff)) continue;
      const o = i * A_STRIDE, c = ds.animals[o + A.cell], f = ds.animals[o + A.flags];
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      const k = f & (AF.help | AF.injured) ? 1 : f & AF.resident ? 2 : 0;
      /* What the programmes know about this one animal: 1 yes, 2 no, 3 booster due, 0 not recorded. */
      const st = f & AF.sterYes ? 1 : f & AF.sterNo ? 2 : 0;
      const lv = ds.animals[o + A.lastVacc];
      const va = f & AF.vaccYes ? (lv >= 0 && lv <= t && lv < t - 365 ? 3 : 1) : f & AF.vaccNo ? 2 : 0;
      feats.push({ type: "Feature", properties: { k, st, va, c }, geometry: { type: "Point", coordinates: pointInCell(r, i + 1) } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, ix, t, eff]);

  const casePts = useMemo(() => {
    if (!ds || !ix || (mode !== "cases" && mode !== "medical")) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    const rings = new Map<number, [number, number][]>();
    for (let i = 0; i < ix.nCases; i++) {
      const kind = mode === "cases" ? caseKind(i) : openOn(ds, i, t) ? 1 : 0;
      if (!kind) continue;
      const o = i * C_STRIDE, c = ds.cases[o + C.cell];
      // Medical draws open cases beside its animals; "Recorded by" narrows both.
      if (mode === "medical" && eff.source !== "all" && (ds.cases[o + C.source] === 1) !== (eff.source === "resident")) continue;
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      const cond = (CONDITIONS[ds.cases[o + C.cond]] ?? "Not recorded") as Condition;
      /* An undated case carries no waiting rings: how long it waited is not known. */
      feats.push({ type: "Feature", properties: { age: kind === 2 ? -1 : t - ds.cases[o + C.day], crit: kind === 1 && DEFAULT_TRIAGE[cond] === "Critical" ? 1 : 0, u: kind === 2 ? 1 : 0, c }, geometry: { type: "Point", coordinates: pointInCell(r, i * 7 + 3) } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, ix, t, mode, eff.source, caseKind]);

  /* Field work: every care event of the last twelve months, as a spark inside its cell. */
  const carePts = useMemo(() => {
    if (!ds || !ix || mode !== "activity") return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    const rings = new Map<number, [number, number][]>();
    const n = Math.floor(ds.care.length / K_STRIDE);
    for (let i = 0; i < n; i++) {
      const o = i * K_STRIDE, day = ds.care[o + K.day], c = ds.care[o + K.cell];
      if (day < 0 || day > t || day < t - 365 || c < 0) continue;
      let r = rings.get(c); if (!r) { r = ringOf(ds, c); rings.set(c, r); }
      feats.push({ type: "Feature", properties: { c, age: t - day }, geometry: { type: "Point", coordinates: pointInCell(r, i * 13 + 5) } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, ix, t, mode]);

  /* Density as terrain: recorded animals smoothed and cut into contour bands. */
  const terrain = useMemo(() => {
    if (!ds || mode !== "density") return EMPTY;
    return densityContours(stats.filter((s) => s.animals > 0).map((s) => ({ lng: ds.centers[s.cell * 2], lat: ds.centers[s.cell * 2 + 1], w: s.animals, city: ds.cellCity[s.cell] })));
  }, [ds, stats, mode]);

  /* The fog: everything outside the recorded area, with the record cut out of it. */
  const fog = useMemo(() => {
    if (!ds?.outline?.length) return EMPTY;
    const world: [number, number][] = [[40, -5], [120, -5], [120, 45], [40, 45], [40, -5]];
    const holes = ds.outline.map((poly) => poly[0]);
    const islands = ds.outline.flatMap((poly) => poly.slice(1).map((ring) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } })));
    const edge = { type: "Feature" as const, properties: { edge: 1 }, geometry: { type: "MultiLineString" as const, coordinates: ds.outline.flat() } };
    return { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [world, ...holes] } }, ...islands, edge] as GeoJSON.Feature[] };
  }, [ds]);

  /* ABC and ARV: each cell prints how many animals it has on record as
     sterilised (or vaccinated). Public cells with one or two print "few". */
  const inner = useMemo(() => {
    if (!ds || (mode !== "abc" && mode !== "arv")) return EMPTY;
    const feats: GeoJSON.Feature[] = [];
    for (const s of stats) {
      const yes = mode === "abc" ? s.sterYes : s.vaccYes;
      if (!s.animals || !yes) continue;
      const n = fewOr(yes, scope === "public");
      const due = mode === "arv" && s.due > 0 ? ` · ${fewOr(s.due, scope === "public")} due` : "";
      feats.push({ type: "Feature", properties: { n: `${n}${due}` }, geometry: { type: "Point", coordinates: [ds.centers[s.cell * 2], ds.centers[s.cell * 2 + 1]] } });
    }
    return { type: "FeatureCollection" as const, features: feats };
  }, [ds, stats, mode, scope]);

  /* ââ the map, built once âââââââââââââââââââââââââââââââââââââââââââ */
  useEffect(() => {
    let map: MLMap | null = null, dead = false;
    const canvas = document.createElement("canvas");
    // MapLibre 6 requires WebGL2. Do not let a WebGL1-only or blocked GPU
    // proceed into a half-started canvas: the live SVG fallback below keeps
    // the city, modes and filters useful instead of leaving a blank map.
    if (!canvas.getContext("webgl2")) {
      setMapError("Interactive map unavailable in this browser. Showing the live city map instead.");
      return () => { dead = true; };
    }
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
        dragRotate: true,
        pitchWithRotate: true,
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __spmap?: MLMap }).__spmap = map;
      map.touchZoomRotate.disableRotation();
      map.on("error", (event) => {
        const message = event.error instanceof Error ? event.error.message : "";
        if (/webgl|worker|renderer|context/i.test(message)) {
          setMapError("Interactive map unavailable in this browser. Showing the live city map instead.");
        }
      });
      map.on("load", () => {
        el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        map!.addImage("hatch-night", hatchImage("rgba(239,231,218,0.42)"));
        map!.addImage("hatch-paper", hatchImage("rgba(11,30,61,0.45)"));
        setMapError(null);
        setReady(true);
      });
    }).catch(() => { if (!dead) setMapError("Interactive map unavailable in this browser. Showing the live city map instead."); });
    return () => { dead = true; map?.remove(); mapRef.current = null; layersDone.current = false; setLayersReady(false); };
    // Built once; the ground is repainted in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ââ data layers, once the register has arrived ââââââââââââââââââââ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !ds || layersDone.current) return;
    layersDone.current = true;
    const cellFeatures = ds.cells.map((_, i) => ({ type: "Feature" as const, id: i, properties: { i }, geometry: { type: "Polygon" as const, coordinates: [ringOf(ds, i)] } }));
    map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: cellFeatures } });
    map.addSource("frontier", { type: "geojson", data: { type: "FeatureCollection", features: ds.frontier.map((f, i) => ({ type: "Feature", id: i, properties: { k: f.cell, near: f.near, city: f.city }, geometry: { type: "Polygon", coordinates: [flatRing(f.ring)] } })) } });
    ["inner", "cases", "sel", "next", "feeding"].forEach((id) => map.addSource(id, { type: "geojson", data: EMPTY }));
    ["pts", "care", "terrain", "fog"].forEach((id) => map.addSource(id, { type: "geojson", data: EMPTY }));
    map.addSource("cities", { type: "geojson", data: { type: "FeatureCollection", features: cityPins.map((c, i) => ({ type: "Feature", properties: { i, n: c.animals, name: c.city, k: kindOf(c.city, c.cells), one: c.cells <= 1 ? 1 : 0 }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) } });

    const fs = (k: string, d: number | string) => ["coalesce", ["feature-state", k], d] as ExpressionSpecification;
    const Z = (a: number, b: number, c: number, d: number) => ["interpolate", ["linear"], ["zoom"], a, b, c, d] as ExpressionSpecification;
    const L = lightsOf(pal);

    map.addLayer({ id: "frontier-fill", type: "fill", source: "frontier", paint: { "fill-color": T, "fill-opacity": 0 } });
    map.addLayer({ id: "frontier-line", type: "line", source: "frontier", layout: { visibility: "none" }, paint: { "line-color": pal.dim, "line-width": 1, "line-dasharray": [2, 2.5], "line-opacity": ["case", ["==", ["get", "near"], 1], 0.55, 0.25] as ExpressionSpecification } });

    /* The fog over everything unrecorded, and the edge of the record. */
    map.addLayer({ id: "fog", type: "fill", source: "fog", filter: ["!", ["has", "edge"]], layout: { visibility: "none" }, paint: { "fill-color": L.fog, "fill-opacity": 1 } });
    map.addLayer({ id: "fog-hatch", type: "fill", source: "fog", filter: ["!", ["has", "edge"]], layout: { visibility: "none" }, paint: { "fill-pattern": pal.name === "night" ? "hatch-night" : "hatch-paper", "fill-opacity": 0.35 } });
    map.addLayer({ id: "fog-edge", type: "line", source: "fog", filter: ["has", "edge"], layout: { visibility: "none" }, paint: { "line-color": pal.ink, "line-width": 1.6, "line-opacity": 0.8 } });

    /* Terrain: each band a little brighter than the one below. */
    map.addLayer({ id: "terrain-fill", type: "fill", source: "terrain", layout: { visibility: "none" }, paint: { "fill-color": ["match", ["get", "rank"], ...LEVELS.flatMap((_, i) => [i, L.band[Math.min(L.band.length - 1, i)]]), L.band[0]] as unknown as ExpressionSpecification, "fill-opacity": pal.name === "night" ? 0.28 : 0.3 } });
    map.addLayer({ id: "terrain-line", type: "line", source: "terrain", layout: { visibility: "none", "line-join": "round" }, paint: {
      "line-color": ["match", ["get", "rank"], ...LEVELS.flatMap((_, i) => [i, L.band[Math.min(L.band.length - 1, i)]]), L.band[0]] as unknown as ExpressionSpecification,
      "line-width": ["interpolate", ["linear"], ["get", "rank"], 0, 0.8, 6, 2.2] as ExpressionSpecification, "line-opacity": 0.95,
    } });
    map.addLayer({ id: "terrain-label", type: "symbol", source: "terrain", minzoom: 11.6, layout: { visibility: "none", "symbol-placement": "line", "text-field": ["concat", ["to-string", ["get", "v"]], " / kmÂ²"], "text-font": ["Noto Sans Regular"], "text-size": 10, "symbol-spacing": 320 }, paint: { "text-color": pal.ink, "text-halo-color": pal.bg, "text-halo-width": 1.6, "text-opacity": 0.8 } });

    map.addLayer({ id: "cells", type: "fill", source: "cells", paint: { "fill-color": fs("c", T), "fill-opacity": fs("o", 0) } });
    map.addLayer({ id: "cells-hatch", type: "fill", source: "cells", paint: { "fill-pattern": "hatch-night", "fill-opacity": fs("hatch", 0) } });
    map.addLayer({ id: "inner", type: "symbol", source: "inner", minzoom: 11, layout: { "text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 14] as ExpressionSpecification, "text-allow-overlap": false }, paint: { "text-color": pal.ink, "text-halo-color": pal.bg, "text-halo-width": 1.6 } });
    map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: { "line-color": fs("line", pal.cellEdge), "line-width": ["case", ["!=", ["feature-state", "line"], null], 1.4, 0.8] as ExpressionSpecification, "line-opacity": ["case", [">", fs("o", 0), 0], 1, ["!=", ["feature-state", "line"], null], 1, [">", fs("hatch", 0), 0], 1, 0] as ExpressionSpecification } });

    /* 3D: the same cells rising by the Lens measure. Hidden until 3D is on. */
    map.addLayer({ id: "cells-3d", type: "fill-extrusion", source: "cells", layout: { visibility: "none" }, paint: {
      "fill-extrusion-color": fs("c", T), "fill-extrusion-height": fs("e", 0), "fill-extrusion-base": 0,
      "fill-extrusion-opacity": 0.9, "fill-extrusion-vertical-gradient": true,
    } });
    /* Light: a soft glow where records gather, fading as the streets come in. */
    map.addLayer({ id: "heat", type: "heatmap", source: "pts", maxzoom: 16, layout: { visibility: "none" }, paint: {
      "heatmap-weight": 0.6, "heatmap-intensity": Z(9, 0.18, 14, 0.5), "heatmap-radius": Z(9, 7, 14, 26),
      "heatmap-opacity": Z(11, 0.75, 15.5, 0), "heatmap-color": heatRamp(L.heat) as ExpressionSpecification,
    } });
    map.addLayer({ id: "heat-care", type: "heatmap", source: "care", maxzoom: 16, layout: { visibility: "none" }, paint: {
      "heatmap-weight": 1, "heatmap-intensity": Z(9, 0.6, 14, 1.3), "heatmap-radius": Z(9, 10, 14, 30),
      "heatmap-opacity": Z(11, 0.85, 15.5, 0), "heatmap-color": heatRamp(L.sky) as ExpressionSpecification,
    } });
    map.addLayer({ id: "pts-halo", type: "circle", source: "pts", minzoom: 13, layout: { visibility: "none" }, paint: {
      "circle-radius": Z(9, 2.5, 16, 11), "circle-blur": 1, "circle-color": L.halo, "circle-opacity": 0.3,
    } });
    map.addLayer({ id: "pts", type: "circle", source: "pts", minzoom: 13, layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.1, 12, 2.1, 15, 4, 17, 6] as ExpressionSpecification,
      "circle-color": L.core, "circle-stroke-color": pal.bg, "circle-stroke-width": Z(13, 0, 15, 1),
    } });
    map.addLayer({ id: "care-pts", type: "circle", source: "care", minzoom: 12, layout: { visibility: "none" }, paint: {
      "circle-radius": Z(12, 1.4, 16, 3.4), "circle-color": L.skyCore, "circle-opacity": ["interpolate", ["linear"], ["get", "age"], 0, 1, 365, 0.35] as ExpressionSpecification,
    } });

    /* An open case is a beacon; every ring around it is time it has waited â a month, a quarter, half a year, a year. */
    [[365, 24, 0.22], [180, 18, 0.32], [90, 12.5, 0.45], [30, 8, 0.62]].forEach(([age, r, o]) => map.addLayer({
      id: `case-r${age}`, type: "circle", source: "cases", filter: [">=", ["get", "age"], age], layout: { visibility: "none" },
      paint: { "circle-radius": Z(9, r * 0.42, 15, r), "circle-color": T, "circle-stroke-color": L.ring, "circle-stroke-width": 1, "circle-stroke-opacity": o },
    }));
    map.addLayer({ id: "case-pulse", type: "circle", source: "cases", filter: ["==", ["get", "crit"], 1], layout: { visibility: "none" }, paint: {
      "circle-radius": Z(9, 4, 15, 9), "circle-color": pal.att[3], "circle-opacity": 0.35, "circle-blur": 0.6,
    } });
    map.addLayer({ id: "cases", type: "circle", source: "cases", layout: { visibility: "none" }, paint: {
      "circle-radius": Z(9, 2.2, 15, 4.6),
      "circle-color": ["case", ["==", ["get", "u"], 1], T, ["==", ["get", "crit"], 1], pal.att[3], pal.ink] as ExpressionSpecification,
      "circle-stroke-color": ["case", ["==", ["get", "u"], 1], pal.ink, pal.bg] as ExpressionSpecification,
      "circle-stroke-width": ["case", ["==", ["get", "u"], 1], 1.2, 1] as ExpressionSpecification,
    } });
    map.addLayer({ id: "feeding", type: "circle", source: "feeding", layout: { visibility: "none" }, paint: {
      "circle-radius": Z(10, 4, 15, 7.5), "circle-color": pal.bg, "circle-stroke-color": pal.feed, "circle-stroke-width": 2.4,
    } });
    map.addLayer({ id: "next", type: "circle", source: "next", layout: { visibility: "none" }, paint: { "circle-radius": 11, "circle-color": pal.bg, "circle-stroke-color": pal.att[3], "circle-stroke-width": 2 } });
    map.addLayer({ id: "next-n", type: "symbol", source: "next", layout: { visibility: "none", "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": pal.ink } });
    map.addLayer({ id: "sel", type: "line", source: "sel", paint: { "line-color": pal.ink, "line-width": 2.2 } });
    map.addLayer({ id: "cities", type: "circle", source: "cities", paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 6, 48, 26], 10, 8, 14, 5] as ExpressionSpecification,
      "circle-color": KIND_COLOR, "circle-opacity": ["case", ["==", ["get", "one"], 1], 0.14, 0.78] as ExpressionSpecification,
      "circle-stroke-color": ["case", ["==", ["get", "one"], 1], KIND_COLOR, pal.bg] as ExpressionSpecification, "circle-stroke-width": ["case", ["==", ["get", "one"], 1], 2, 1] as ExpressionSpecification,
    } });
    map.addLayer({ id: "cities-l", type: "symbol", source: "cities", maxzoom: 10, layout: { "text-field": ["format", ["get", "name"], { "text-font": ["literal", ["Noto Sans Bold"]], "font-scale": 1 }, "\n", {}, ["number-format", ["get", "n"], { locale: "en-IN" }], { "font-scale": 0.9 }] as ExpressionSpecification, "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.4], "text-anchor": "top", "text-optional": true }, paint: { "text-color": pal.ink, "text-halo-color": pal.bg, "text-halo-width": 1.4 } });

    setLayersReady(true);
    underlay(map, pal, "frontier-fill").then((ok) => { if (ok) setBaseReady(true); }).catch(() => {});
  }, [ready, ds, pal, cityPins]);

  // Client-side city navigation keeps the WebGL canvas alive. Replace the
  // geometry as well as the values: cell indices belong to each dataset.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !layersReady || !ds) return;
    map.removeFeatureState({ source: "cells" });
    (map.getSource("cells") as GeoJSONSource).setData({ type: "FeatureCollection", features: ds.cells.map((_, i) => ({ type: "Feature", id: i, properties: { i }, geometry: { type: "Polygon", coordinates: [ringOf(ds, i)] } })) });
    (map.getSource("frontier") as GeoJSONSource).setData({ type: "FeatureCollection", features: ds.frontier.map((f, i) => ({ type: "Feature", id: i, properties: { k: f.cell, near: f.near, city: f.city }, geometry: { type: "Polygon", coordinates: [flatRing(f.ring)] } })) });
  }, [ds, layersReady]);

  /* Zoom has meaning here: India → a city register → H3 cells → individual
     records. A nearby-city prompt makes the next step discoverable without
     treating an incidental pan as consent to change the selected city. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const readScale = () => {
      const z = map.getZoom();
      setMapZoom(z);
      if (!indiaOverview || z < 7 || !cityPins.length) { setApproachingCity(null); return; }
      const at = map.getCenter();
      const nearest = cityPins.reduce((best, city) => {
        const distance = (city.lng - at.lng) ** 2 + (city.lat - at.lat) ** 2;
        const bestDistance = (best.lng - at.lng) ** 2 + (best.lat - at.lat) ** 2;
        return distance < bestDistance ? city : best;
      }, cityPins[0]);
      const reach = Math.min(2.5, 200 / (2 ** z));
      setApproachingCity((nearest.lng - at.lng) ** 2 + (nearest.lat - at.lat) ** 2 <= reach ** 2 ? nearest : null);
    };
    readScale();
    map.on("moveend", readScale);
    map.on("zoomend", readScale);
    return () => { map.off("moveend", readScale); map.off("zoomend", readScale); };
  }, [ready, indiaOverview, cityPins]);

  /* ââ how the points are drawn in each mode âââââââââââââââââââââââââ */
  const pointStyle = useCallback(() => {
    const L = lightsOf(pal);
    const ring = ["case", ["==", ["get", "st"], 2], L.ring, pal.bg] as ExpressionSpecification;
    switch (mode) {
      case "abc": return {
        color: ["match", ["get", "st"], 1, L.abc, 2, pal.bg, L.unknown] as ExpressionSpecification,
        halo: ["match", ["get", "st"], 1, L.abc, "rgba(0,0,0,0)"] as ExpressionSpecification,
        stroke: ring, strokeW: ["case", ["==", ["get", "st"], 2], 1.2, 0] as ExpressionSpecification, filter: null,
      };
      case "arv": return {
        color: ["match", ["get", "va"], 1, L.arv, 3, L.due, 2, pal.bg, L.unknown] as ExpressionSpecification,
        halo: ["match", ["get", "va"], 1, L.arv, 3, L.due, "rgba(0,0,0,0)"] as ExpressionSpecification,
        stroke: ["case", ["==", ["get", "va"], 2], L.ring, pal.bg] as ExpressionSpecification, strokeW: ["case", ["==", ["get", "va"], 2], 1.2, 0] as ExpressionSpecification, filter: null,
      };
      case "medical": return { color: L.help, halo: L.help, stroke: pal.bg, strokeW: 0, filter: ["==", ["get", "k"], 1] as ExpressionSpecification };
      case "density": return { color: L.unknown, halo: "rgba(0,0,0,0)", stroke: pal.bg, strokeW: 0, filter: null };
      default: return {
        color: ["match", ["get", "k"], 1, L.help, 2, L.res, L.core] as ExpressionSpecification,
        halo: ["match", ["get", "k"], 1, L.help, L.halo] as ExpressionSpecification,
        stroke: pal.bg, strokeW: ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 1] as ExpressionSpecification, filter: null,
      };
    }
  }, [mode, pal]);

  /* ââ repaint the ground ââââââââââââââââââââââââââââââââââââââââââââ */
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersDone.current) return;
    restyle(map, pal);
    const L = lightsOf(pal);
    const set = (id: string, p: string, v: unknown) => { try { (map.setPaintProperty as (i: string, pr: string, val: unknown) => void).call(map, id, p, v); } catch { /* ok */ } };
    const hatch = ground === "night" ? "hatch-night" : "hatch-paper";
    set("cells-hatch", "fill-pattern", hatch); set("fog-hatch", "fill-pattern", hatch);
    set("fog", "fill-color", L.fog); set("fog-edge", "line-color", pal.ink);
    set("frontier-line", "line-color", pal.dim);
    const bandExpr = ["match", ["get", "rank"], ...LEVELS.flatMap((_, i) => [i, L.band[Math.min(L.band.length - 1, i)]]), L.band[0]];
    set("terrain-fill", "fill-color", bandExpr); set("terrain-line", "line-color", bandExpr);
    set("terrain-label", "text-color", pal.ink); set("terrain-label", "text-halo-color", pal.bg);
    set("heat", "heatmap-color", heatRamp(mode === "medical" ? L.flame : L.heat)); set("heat-care", "heatmap-color", heatRamp(L.sky));
    set("care-pts", "circle-color", L.skyCore);
    const ps = pointStyle();
    set("pts", "circle-color", ps.color); set("pts", "circle-stroke-color", ps.stroke); set("pts", "circle-stroke-width", ps.strokeW);
    set("pts-halo", "circle-color", ps.halo);
    /* In Animals, the portraits take over at street level. */
    /* At street level the points stay on beneath the portraits: every animal is still drawn. */
    set("pts", "circle-opacity", 1);
    set("pts-halo", "circle-opacity", 0.3);
    try { map.setFilter("pts", ps.filter); map.setFilter("pts-halo", ps.filter); map.setFilter("heat", ps.filter); } catch { /* ok */ }
    ["case-r365", "case-r180", "case-r90", "case-r30"].forEach((id) => set(id, "circle-stroke-color", L.ring));
    set("case-pulse", "circle-color", pal.att[3]);
    set("cases", "circle-color", ["case", ["==", ["get", "u"], 1], T, ["==", ["get", "crit"], 1], pal.att[3], pal.ink]); set("cases", "circle-stroke-color", ["case", ["==", ["get", "u"], 1], pal.ink, pal.bg]);
    set("next", "circle-color", pal.bg); set("next-n", "text-color", pal.ink);
    set("feeding", "circle-color", pal.bg); set("feeding", "circle-stroke-color", pal.feed);
    set("sel", "line-color", pal.ink);
    set("inner", "text-color", pal.ink); set("inner", "text-halo-color", pal.bg);
    set("cities", "circle-stroke-color", ["case", ["==", ["get", "one"], 1], KIND_COLOR, pal.bg]); set("cities-l", "text-color", pal.ink); set("cities-l", "text-halo-color", pal.bg);
    try { localStorage.setItem("sp.atlas.ground.v2", ground); } catch { /* storage blocked */ }
  }, [ground, pal, baseReady, mode, atlasLens, layersReady, pointStyle]);

  /* 3D columns: applied now and after every layer rebuild (the city index
     arriving rebuilds the layers). The tilt waits for the first camera fit. */
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersReady || !ds) return;
    const on = three && !indiaOverview && ds.cells.length > 1;
    const apply = () => {
      if (!map.getLayer("cells-3d")) return;
      if (map.getLayoutProperty("cells-3d", "visibility") !== (on ? "visible" : "none")) map.setLayoutProperty("cells-3d", "visibility", on ? "visible" : "none");
    };
    apply();
    map.on("styledata", apply);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => map.easeTo({ pitch: on ? 55 : 0, bearing: on ? -12 : 0, duration: reducedMotion ? 0 : 900 }), 1300);
    return () => { map.off("styledata", apply); window.clearTimeout(t); };
  }, [three, layersReady, ds, indiaOverview, cityPins, pal]);

  /* ââ what is drawn, for the mode, the time and the filters âââââââââ */
  const cellsOn = grid || (!indiaOverview && mapZoom < 13) || mode === "coverage" || mode === "change" || mode === "abc" || mode === "arv";
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersDone.current || !ds) return;
    const seen = new Set<number>();
    for (const s of stats) {
      const p = cellsOn ? cellPaint(s) : { c: T, o: 0 } as ReturnType<typeof cellPaint>;
      const rk = rankOf(value(s), br);
      const e = p.o > 0 && p.c !== T ? (rk >= 0 ? (rk + 1) * 520 : 260) : 0;
      map.setFeatureState({ source: "cells", id: s.cell }, { c: p.c, o: p.o, line: p.line ?? null, hatch: p.hatch ?? 0, h: p.h ?? 0, e });
      seen.add(s.cell);
    }
    for (let i = 0; i < ds.cells.length; i++) if (!seen.has(i)) map.setFeatureState({ source: "cells", id: i }, { c: T, o: 0, line: null, hatch: 0, h: 0, e: 0 });
    const vis = (id: string, on: boolean) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); };
    const spatialDetail = ds.cells.length > 1;
    const pointsOn = spatialDetail && (mode === "animals" || mode === "abc" || mode === "arv" || mode === "medical" || mode === "density");
    vis("pts", pointsOn); vis("pts-halo", pointsOn && mode !== "density");
    vis("heat", spatialDetail && mapZoom >= 13 && (mode === "animals" || mode === "medical"));
    vis("heat-care", spatialDetail && mode === "activity"); vis("care-pts", spatialDetail && mode === "activity");
    vis("terrain-fill", spatialDetail && mode === "density"); vis("terrain-line", spatialDetail && mode === "density"); vis("terrain-label", spatialDetail && mode === "density");
    vis("fog", mode === "coverage"); vis("fog-hatch", mode === "coverage"); vis("fog-edge", mode === "coverage");
    vis("frontier-line", false);
    vis("next", mode === "coverage"); vis("next-n", mode === "coverage");
    const rings = spatialDetail && mode === "cases";
    ["case-r365", "case-r180", "case-r90", "case-r30", "case-pulse", "cases"].forEach((id) => vis(id, rings));
    vis("inner", cellsOn); vis("cells-hatch", cellsOn);
    vis("feeding", mode === "animals");
    (map.getSource("pts") as GeoJSONSource | undefined)?.setData(animalPts);
    (map.getSource("care") as GeoJSONSource | undefined)?.setData(carePts);
    (map.getSource("terrain") as GeoJSONSource | undefined)?.setData(terrain);
    (map.getSource("fog") as GeoJSONSource | undefined)?.setData(fog);
    (map.getSource("cases") as GeoJSONSource | undefined)?.setData(casePts);
    (map.getSource("inner") as GeoJSONSource | undefined)?.setData(inner);
    (map.getSource("feeding") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: feeding.map((z) => ({ type: "Feature", properties: { id: z.id, name: z.name }, geometry: { type: "Point", coordinates: [z.lng, z.lat] } })) });
    (map.getSource("next") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: ds.next.map((n, i) => ({ type: "Feature", properties: { n: String(i + 1), k: n.cell }, geometry: { type: "Point", coordinates: n.center } })) });
  }, [stats, cellPaint, cellsOn, mode, animalPts, carePts, terrain, fog, casePts, inner, ds, pal, layersReady, feeding, mapZoom, br, value]);

  /* ââ a critical open case breathes âââââââââââââââââââââââââââââââââ */
  useEffect(() => {
    const map = mapRef.current; if (!map || !layersReady || mode !== "cases") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const ph = ((now - t0) % 2200) / 2200;
      try {
        map.setPaintProperty("case-pulse", "circle-radius", ["interpolate", ["linear"], ["zoom"], 9, 4 + ph * 8, 15, 9 + ph * 18]);
        map.setPaintProperty("case-pulse", "circle-opacity", 0.45 * (1 - ph));
      } catch { /* ok */ }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, layersReady]);

  /* ââ selection: outline and camera âââââââââââââââââââââââââââââââââ */
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

  /* The national overview: one bubble per city on the record, not just the
   * bounded dataset's own city. Coordinates come from the city list (the
   * centroid of each city's busiest cell), falling back to the loaded
   * dataset's geometry. Shown only at overview zoom (the layer's maxzoom). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ds || !ready || !layersReady) return;
    const src = map.getSource("cities") as GeoJSONSource | undefined;
    if (!src) return;
    ["cities", "cities-l"].forEach((id) => {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", indiaOverview || ds.cells.length === 1 ? "visible" : "none");
      map.setFilter(id, indiaOverview ? null : ["==", ["get", "name"], ds.cities[0]?.name ?? ""]);
    });
    const feats = availableCities.flatMap((c) => {
      const geo = ds.cities.find((x) => x.name.toLowerCase() === c.city.toLowerCase());
      const lng = typeof c.lng === "number" ? c.lng : geo?.lng;
      const lat = typeof c.lat === "number" ? c.lat : geo?.lat;
      if (typeof lng !== "number" || typeof lat !== "number") return [];
      const n = atlasLens === "cases" ? c.open_cases ?? 0 : atlasLens === "care" ? mode === "arv" ? c.vaccinated ?? 0 : mode === "medical" ? c.needs_help ?? 0 : c.sterilised ?? 0 : atlasLens === "evidence" ? c.cells : c.animals;
      return [{ type: "Feature" as const, properties: { name: c.city, n, k: kindOf(c.city, c.cells), one: c.cells <= 1 ? 1 : 0 }, geometry: { type: "Point" as const, coordinates: [lng, lat] } }];
    });
    if (feats.length) src.setData({ type: "FeatureCollection", features: feats });
  }, [availableCities, ds, ready, layersReady, atlasLens, mode, indiaOverview]);

  const padding = useCallback(() => {
    const w = el.current?.clientWidth ?? 1000;
    return w > 1100 ? { top: 60, bottom: 90, left: 470, right: 90 } : w > 760 ? { top: 60, bottom: 90, left: 410, right: 80 } : { top: 30, bottom: 250, left: 20, right: 20 };
  }, []);
  const camera = useCallback((s: Sel, instant = false) => {
    const map = mapRef.current; if (!map || !ds) return;
    const d = instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000;
    if (s.t === "india") map.fitBounds(INDIA_BOX, { padding: (el.current?.clientWidth ?? 0) > 900 ? { top: 40, bottom: 70, left: 470, right: 70 } : { top: 20, bottom: 250, left: 15, right: 15 }, duration: d });
    else if (s.t === "city") map.fitBounds(ds.cities[s.city].box, { padding: padding(), duration: d, maxZoom: ds.cells.length <= 1 ? 10 : 13 });
    else if (s.t === "locality") map.fitBounds(boxOfRings(selCells.map((c) => ringOf(ds, c)), 0.01), { padding: padding(), duration: d, maxZoom: 14.2 });
    else if (s.t === "cell") map.flyTo({ center: [ds.centers[s.cell * 2], ds.centers[s.cell * 2 + 1]], zoom: Math.max(map.getZoom(), 14.2), duration: d, padding: padding() });
    else map.flyTo({ center: s.center, zoom: Math.max(map.getZoom(), 13.8), duration: d, padding: padding() });
  }, [ds, padding, selCells]);

  /* The inspector opens collapsed â place name and three figures â for
     every kind of selection except an empty cell, whose "nothing recorded
     here, report one" card has no collapsed form worth hiding behind a
     tap. A person who wants the full breakdown of a cell taps Details. */
  const choose = useCallback((s: Sel) => {
    setSel(s); setSheet(s.t === "empty" ? "open" : "peek");
    // On a phone the panel and the place card share the screen: a place wins.
    if (window.matchMedia("(max-width: 760px)").matches) setFilterOpen(false);
  }, []);
  const beginSheetDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (!phone || sheet === "hidden") return;
    sheetDrag.current = { y: event.clientY, from: sheet };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [phone, sheet]);
  const endSheetDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = sheetDrag.current;
    sheetDrag.current = null;
    if (!phone || !drag) return;
    const delta = event.clientY - drag.y;
    if (delta < -34) setSheet("open");
    else if (delta > 34) setSheet(drag.from === "open" ? "peek" : "hidden");
    else setSheet(drag.from === "peek" ? "open" : "peek");
  }, [phone]);
  const cancelSheetDrag = useCallback(() => {
    const drag = sheetDrag.current;
    sheetDrag.current = null;
    if (drag) setSheet(drag.from);
  }, []);
  /* The mode chips scroll sideways on a phone: fade the edge that has more
     behind it, and keep the chosen mode in view. */
  const modesRef = useRef<HTMLDivElement>(null);
  const [modesMore, setModesMore] = useState<"" | "right" | "left" | "both">("");
  const readModesEdge = useCallback(() => {
    const el = modesRef.current; if (!el) return;
    const left = el.scrollLeft > 2, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setModesMore(left && right ? "both" : left ? "left" : right ? "right" : "");
  }, []);
  useEffect(() => {
    const el = modesRef.current; if (!el) return;
    const on = el.querySelector<HTMLElement>(".is-on");
    if (on) {
      const l = on.offsetLeft - 8, r = on.offsetLeft + on.offsetWidth + 8;
      if (l < el.scrollLeft) el.scrollLeft = l;
      else if (r > el.scrollLeft + el.clientWidth) el.scrollLeft = r - el.clientWidth;
    }
    readModesEdge();
  }, [mode, phone, readModesEdge]);
  useEffect(() => {
    window.addEventListener("resize", readModesEdge);
    return () => window.removeEventListener("resize", readModesEdge);
  }, [readModesEdge]);

  /* A link to a point or an area sets the view itself; the city chosen for
     the side panel must not then fly the camera out to the whole city. */
  const keepLinkedView = useRef(false);
  useEffect(() => {
    if (keepLinkedView.current) { keepLinkedView.current = false; return; }
    if (sel && ready && layersReady) camera(sel, false);
    // The camera moves when the selection changes, not when its helpers are rebuilt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  /* ââ first view: from the URL, or the busiest city âââââââââââââââââ */
  const started = useRef(false);
  const startedDataset = useRef<SpatialDataset | null>(null);
  const startedPlace = useRef("");
  const changeCity = useCallback((nextCity: string) => {
    const url = new URL(window.location.href);
    ["cell", "city", "q", "lat", "lng", "bbox", "focus", "m"].forEach((key) => url.searchParams.delete(key));
    if (nextCity !== "__india") url.searchParams.set("city", nextCity);
    setSel(null); setSheet("hidden"); setDotPick(null); setAtlasOpen(false); setMonth(null);
    started.current = false;
    router.push(url.pathname + url.search, { scroll: false });
  }, [router]);
  useEffect(() => {
    if (ds && startedDataset.current !== ds) { started.current = false; startedDataset.current = ds; }
    const requested = params.get("city");
    const placeKey = `${datasetCity}:${requested ?? ""}`;
    if (startedPlace.current !== placeKey) { started.current = false; startedPlace.current = placeKey; }
    if (requested && requested !== datasetCity && !(requested === "New Delhi" && datasetCity === "Delhi") && !(requested === "Secunderabad" && datasetCity === "Hyderabad")) return;
    if (!ds || (!mapError && (!ready || !layersReady)) || started.current) return;
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
    /* With no city in the URL, the map is an India overview. The bounded
       dataset still supplies the nearby detail when a visitor chooses a
       city, but we must not silently turn that fallback into a city URL. */
    let s: Sel = cityName || scope === "org" ? { t: "city", city: 0 } : { t: "india" };
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
      keepLinkedView.current = true;
      setSel(s); setSheet("hidden");
      mapRef.current?.jumpTo({ center: [lng, lat], zoom: 13.5 });
      return;
    } else if (bbox && bbox.length === 4 && bbox.every(Number.isFinite)) {
      const [w, so, e, n] = bbox;
      s = { t: "city", city: nearestCity((w + e) / 2, (so + n) / 2) };
      keepLinkedView.current = true;
      setSel(s); setSheet("hidden");
      mapRef.current?.fitBounds([[Math.min(w, e), Math.min(so, n)], [Math.max(w, e), Math.max(so, n)]], { padding: 30, duration: 0, maxZoom: 17 });
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
    setSel(s); setSheet(s.t === "empty" ? "open" : cellKey || cityName || q || scope === "org" ? (window.matchMedia("(max-width: 760px)").matches ? "peek" : "open") : "hidden");
    camera(s, true);
  }, [ds, datasetCity, ready, layersReady, mapError, params, camera, choose, mNow, m0, scope]);

  /* ââ keep the URL in step, without navigating ââââââââââââââââââââââ */
  useEffect(() => {
    if (!ds || !sel || !started.current) return;
    const u = new URL(window.location.href);
    ["cell", "city", "q", "lat", "lng", "bbox", "focus"].forEach((k) => u.searchParams.delete(k));
    u.searchParams.set("mode", mode);
    if (mode === "cases" && lens !== "open") u.searchParams.set("lens", lens); else u.searchParams.delete("lens");
    if (month !== null && month !== mNow) u.searchParams.set("m", String(month)); else u.searchParams.delete("m");
    if (sel.t === "city") u.searchParams.set("city", ds.cities[sel.city].name);
    if (sel.t === "locality") { u.searchParams.set("city", ds.cities[sel.city].name); u.searchParams.set("q", ds.localities[sel.locality]); }
    if (sel.t === "cell") { u.searchParams.set("cell", ds.cells[sel.cell]); u.searchParams.set("city", ds.cities[ds.cellCity[sel.cell]].name); }
    if (sel.t === "empty") u.searchParams.set("cell", sel.key);
    window.history.replaceState(window.history.state, "", u.toString());
  }, [ds, sel, mode, month, mNow, lens]);

  /* ââ clicks and hover ââââââââââââââââââââââââââââââââââââââââââââââ */
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready || !ds) return;
    const onClick = (e: MapMouseEvent) => {
      /* An animal's dot is small; give a finger a few pixels around it. */
      if (mode === "animals" && map.getLayer("pts") && map.getLayoutProperty("pts", "visibility") !== "none") {
        const pad = phone ? 12 : 7;
        const dots = map.queryRenderedFeatures([[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]], { layers: ["pts"] });
        if (dots.length) {
          const near = dots.reduce((b, f) => { const q = map.project((f.geometry as GeoJSON.Point).coordinates as [number, number]); const d = (q.x - e.point.x) ** 2 + (q.y - e.point.y) ** 2; return d < b.d ? { f, d } : b; }, { f: dots[0], d: Infinity }).f;
          const pr = near.properties ?? {};
          setDotPick({ cell: ds.cells[Number(pr.c)], help: Number(pr.k) === 1, ster: Number(pr.st), vacc: Number(pr.va), at: Date.now() });
          // On a phone the card and the place panel share the screen: the animal wins.
          if (phone) { setSheet("hidden"); setFilterOpen(false); }
          return;
        }
      }
      const layers = ["cities", "feeding", "pts", "care-pts", "cases", "next", "cells", "frontier-fill"].filter((l) => map.getLayer(l) && map.getLayoutProperty(l, "visibility") !== "none");
      const hits = map.queryRenderedFeatures(e.point, { layers });
      const h = hits[0];
      if (!h) return;
      const id = h.layer.id;
      if (id === "cities") {
        const name = String(h.properties?.name ?? "");
        const idx = ds.cities.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
        if (scope === "public" && indiaOverview && name) changeCity(name);
        else if (idx >= 0) choose({ t: "city", city: idx });
        else if (name) changeCity(name);
        return;
      }
      if (id === "feeding") { router.push(`/feeding/${h.properties?.id}`); return; }
      if (id === "pts" || id === "cases" || id === "care-pts") { choose({ t: "cell", cell: Number(h.properties?.c) }); return; }
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
      const onDot = mode === "animals" && !!map.getLayer("pts") && map.getLayoutProperty("pts", "visibility") !== "none" && map.queryRenderedFeatures([[e.point.x - 7, e.point.y - 7], [e.point.x + 7, e.point.y + 7]], { layers: ["pts"] }).length > 0;
      const hits = map.queryRenderedFeatures(e.point, { layers: ["cells"].filter((l) => map.getLayer(l)) });
      const ci = hits[0] ? Number(hits[0].id) : -1;
      const s = ci >= 0 ? statOf.get(ci) : undefined;
      if (!s || (!s.observed && !s.events) || (mode === "cases" && !value(s))) { setHover(null); map.getCanvas().style.cursor = onDot ? "pointer" : ""; return; }
      map.getCanvas().style.cursor = "pointer";
      const loc = ds.cellLocality[ci] >= 0 ? ds.localities[ds.cellLocality[ci]] : "Unnamed cell";
      /* One cell on the public map never shows a count of one or two. */
      const pub = scope === "public";
      const n = (x: number) => fewOr(x, pub);
      /* Authoritative current totals for the counts a readout states as totals;
         the bounded `s` still decides what is drawn and every filtered view. */
      const auth = unfiltered ? authByCell.get(ds.cells[ci]) : undefined;
      const aAnimals = auth ? auth.animals : s.animals;
      const aSter = auth ? auth.sterilised : s.sterYes;
      const aVacc = auth ? auth.vaccinated : s.vaccYes;
      const v = mode === "coverage" ? COVERAGE_TEXT[s.coverage].label
        : mode === "cases" ? `${n(value(s))} ${LENSES.find((l) => l.id === lens)!.unit}`
        : mode === "medical" ? `${n(s.medical)} injured or needing help`
        : mode === "activity" || mode === "change" ? `${n(s.recentField)} field-team records this year`
        : (mode === "abc" || mode === "arv") && pub && isSparse(aAnimals) ? "few records — too few for a share"
        : mode === "abc" ? `${n(aSter)} of ${n(aAnimals)} sterilised on record`
        : mode === "arv" ? `${n(aVacc)} of ${n(aAnimals)} vaccinated on record`
        : pub && isSparse(aAnimals) ? "few records"
        : `${n(aAnimals)} animal${aAnimals === 1 ? "" : "s"} recorded`;
      setHover({ x: e.point.x, y: e.point.y, text: `${loc} · ${v}` });
    };
    const onOut = () => setHover(null);
    map.on("click", onClick); map.on("mousemove", onMove); map.on("mouseout", onOut);
    return () => { map.off("click", onClick); map.off("mousemove", onMove); map.off("mouseout", onOut); };
  }, [ready, ds, statOf, mode, choose, phone, scope, router, value, lens, authByCell, unfiltered, indiaOverview, changeCity]);

  /* ââ Escape steps out one rung âââââââââââââââââââââââââââââââââââââ */
  const stepOut = useCallback(() => {
    if (!ds || !sel) return;
    if (sel.t === "cell") { const c = ds.cellCity[sel.cell]; const l = ds.cellLocality[sel.cell]; choose(l >= 0 ? { t: "locality", city: c, locality: l } : { t: "city", city: c }); }
    else if (sel.t === "empty") choose({ t: "city", city: sel.city });
    else if (sel.t === "locality") choose({ t: "city", city: sel.city });
    else if (sel.t === "city") choose({ t: "india" });
  }, [ds, sel, choose]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (filterOpen) setFilterOpen(false); else stepOut(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [stepOut, filterOpen]);

  /* ââ legend ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
  const def = MODES.find((x) => x.id === mode)!;
  const legend = (() => {
    if (mode === "coverage") return (
      <ul className="sm-key">
        {(["strong", "partial", "weak", "insufficient"] as const).map((k) => <li key={k}><i className={`sm-sw is-cov-${k}`} />{COVERAGE_TEXT[k].label}</li>)}
        <li><i className="sm-sw is-fog" />Unreported area — not a verified intervention gap</li>
        <li><i className="sm-sw is-next" />Map next</li>
      </ul>
    );
    if (mode === "abc" || mode === "arv") return (
      <ul className="sm-key">
        <li><i className={`sm-dot ${mode === "arv" ? "is-arv" : "is-abc"}`} />{mode === "abc" ? "Sterilised, on record" : "Vaccinated, on record"}</li>
        {mode === "arv" && <li><i className="sm-dot is-due" />Booster due</li>}
        <li><i className="sm-dot is-ring" />{mode === "abc" ? "Recorded as not sterilised" : "Recorded as not vaccinated"}</li>
        <li><i className="sm-dot is-unk" />Not recorded — unknown, not zero</li>
        <li>Cell numbers show profiles recorded {mode === "abc" ? "as sterilised" : "as vaccinated"}; shading shows the recorded share, not programme coverage. Hatching means no positive status recorded, not verified absence of care.</li>
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
        <li><i className="sm-dot is-ink" />Individual record loaded</li><li><i className="sm-dot is-help" />Injured or needs help</li><li><i className="sm-dot is-res" />Reported by a resident</li>
        {feeding.length > 0 && <li><i className="sm-dot is-feed" />Feeding point</li>}
      </ul>
    );
    if (mode === "medical") return <ul className="sm-key"><li><i className="sm-dot is-help" />Injured or needing help, on record</li></ul>;
    if (mode === "activity") return <ul className="sm-key"><li><i className="sm-dot is-sky" />Field-team work in the twelve months before this date</li></ul>;
    if (mode === "density") return (
      <div className="sm-ramp is-terrain">
        <span>{LEVELS[0]}</span>
        <i style={{ background: `linear-gradient(90deg, ${lightsOf(pal).band.join(",")})` }} />
        <span>{LEVELS[LEVELS.length - 1]}+ loaded profiles / km²</span>
      </div>
    );
    if (mode === "cases" && lensCounts && !lensCounts.some((x) => x > 0)) return (
      <p className="sm-empty">
        {lens === "repeat"
          ? "No linked repeat case in the loaded detail. Imported encounters may have separate animal identities; a return visit needs a verified link to appear here."
          : `No case matches this question${eff.condition >= 0 ? " for this condition" : ""}, as of ${monthLabel(m)}.`}
      </p>
    );
    if (mode === "cases") return (
      <ul className="sm-key">
        {lens === "resolved"
          ? <li><i className="sm-dot is-ink" />Resolved on a known day</li>
          : <><li><i className="sm-dot is-help" />Critical</li><li><i className="sm-dot is-ink" />Other</li></>}
        {undatedShown > 0 && <li><i className="sm-dot is-undated" />{lens === "resolved"
          ? `Resolved, date unknown (${undatedShown.toLocaleString("en-IN")})`
          : `Closed, day unknown (${undatedShown.toLocaleString("en-IN")}) · not counted as open`}</li>}
        {lens !== "resolved" && <li><i className="sm-rings" />Rings: how long it has waited</li>}
      </ul>
    );
    const ramp = pal.seq;
    return (
      <div className="sm-ramp">
        <span>{br[0] ?? 1}</span>
        <i style={{ background: `linear-gradient(90deg, ${ramp.join(",")})` }} />
        <span>{(br[br.length - 1] ?? 1)}+ animals</span>
      </div>
    );
  })();

  const nFilters = (Object.keys(NO_FILTERS) as (keyof Filters)[]).filter((k) => eff[k] !== NO_FILTERS[k]).length + (mode === "cases" && lens !== "open" ? 1 : 0);
  const applies = FILTERS_FOR[mode];
  const lensDef = LENSES.find((l) => l.id === lens)!;
  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      mapRef.current?.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 14, duration: 1200 });
    }, () => {}, { timeout: 8000 });
  };

  /* The rich dataset is intentionally bounded, but a cold database can still
     miss its serverless budget. Never turn that transient failure into a dead
     map: the cell-rollup map uses the same authoritative city totals and has
     no register fan-out. Rich modes return automatically on the next load. */
  if (error && !ds) return <BoundedSpatialMap scope={scope} />;

  const LENS_DEFS = [
    { id: "animals", label: "Animals", mode: "animals", q: "Where are animals on the record?" },
    { id: "care", label: "Care", mode: "abc", q: "Where is sterilisation and vaccination recorded — and where is it unknown?" },
    { id: "cases", label: "Cases", mode: "cases", q: "Where are requests for help open, and how long have they waited?" },
    { id: "evidence", label: "Evidence", mode: "coverage", q: "How well is each place known, and where is the record thin?" },
  ] as const;
  const lensNow = LENS_DEFS.find((l) => l.id === atlasLens)!;
  const cityRow = availableCities.find((c) => c.city === datasetCity) ?? null;
  const evidence = datasetCity ? cityEvidence(datasetCity, cityRow?.cells ?? ds?.cells.length ?? 0) : null;
  const measure = (c: (typeof availableCities)[number]) => atlasLens === "cases" ? c.open_cases ?? 0 : atlasLens === "care" ? (mode === "arv" ? c.vaccinated ?? 0 : c.sterilised ?? 0) : atlasLens === "evidence" ? c.cells : c.animals;
  const measureLabel = atlasLens === "cases" ? "Open cases" : atlasLens === "care" ? (mode === "arv" ? "Vaccination recorded" : "Sterilisation recorded") : atlasLens === "evidence" ? "Cells with records" : "Profiles";
  const placeTitle = indiaOverview ? "India"
    : !ds || !sel ? (datasetCity ?? params.get("city") ?? "Reading…")
    : sel.t === "cell" ? (ds.cellLocality[sel.cell] >= 0 ? ds.localities[ds.cellLocality[sel.cell]] : "An unnamed cell")
    : sel.t === "locality" ? ds.localities[sel.locality]
    : sel.t === "empty" ? "A cell with no record"
    : datasetCity ?? ds.cities[0]?.name ?? "City";
  const rung = indiaOverview ? 0 : !sel || sel.t === "city" || sel.t === "india" ? 1 : 2;
  const showInspector = !indiaOverview && ds && ix && sel && sel.t !== "india";
  const railState = phone ? (sheet === "hidden" ? "peek" : sheet) : (sheet === "hidden" && railClosed ? "closed" : "open");

  return (
    <div className={`sm ax ${indiaOverview ? "is-india" : "is-city"} ${ground === "night" ? "is-night" : "is-paper"} ${phone ? "is-phone" : ""}`} data-lens={atlasLens} data-rail={railState}>
      <div className="sm-canvas ax-canvas" ref={el} />
      {mapError && ds && <LiveMapFallback ds={ds} stats={stats} paint={cellPaint} animals={animalPts} cases={casePts} mode={mode} pal={pal} />}
      <h1 className="sys-sr">StrayPaw Living Atlas: {placeTitle}, {lensNow.label} — {lensNow.q}</h1>

      <aside className="ax-rail" aria-label="Atlas">
        {phone && <button type="button" className="ax-grip" aria-label={railState === "open" ? "Collapse the Atlas panel" : "Expand the Atlas panel"} aria-expanded={railState === "open"} onPointerDown={beginSheetDrag} onPointerUp={endSheetDrag} onPointerCancel={cancelSheetDrag} onClick={(e) => { if (e.detail === 0) setSheet(railState === "open" ? "peek" : "open"); }}><i aria-hidden /></button>}
        <header className="ax-head">
          <div className="ax-topline">
            <nav className="ax-ladder" aria-label="Scale">
              {scope === "public" ? <button type="button" aria-current={rung === 0 ? "true" : undefined} onClick={() => changeCity("__india")}>India</button> : <span>{scope === "org" ? "Your organisation" : "India"}</span>}
              {!indiaOverview && <><span aria-hidden>/</span><button type="button" aria-current={rung === 1 ? "true" : undefined} onClick={() => ds && choose({ t: "city", city: Math.max(0, ds.cities.findIndex((c) => c.name === datasetCity)) })}>{datasetCity ?? params.get("city")}</button></>}
              {rung === 2 && <><span aria-hidden>/</span><span aria-current="true">{sel?.t === "cell" || sel?.t === "empty" ? "Cell" : "Locality"}</span></>}
            </nav>
            {availableCities.length > 1 && (
              <SearchSelect className="ax-city-find" icon="place" label="Go to a city" allLabel={scope === "public" ? "India overview" : "All cities"} emptyLabel="Go to a city" placeholder="Find a city"
                options={availableCities.map((item) => ({ value: item.city, hint: item.state || undefined }))}
                value="" onChange={(v) => changeCity(v || (scope === "public" ? "__india" : availableCities[0].city))} />
            )}
          </div>
          <h2 className="ax-title">{placeTitle}</h2>
          {indiaOverview
            ? <p className="ax-char">The record, city by city — coloured by the kind of evidence each holds.</p>
            : evidence && <p className="ax-char"><i style={{ background: KIND_META[kindOf(datasetCity!, cityRow?.cells ?? 0)].color }} aria-hidden /><b>{evidence.label}</b> · {evidence.precision}</p>}

          <div className="ax-lenses" role="group" aria-label="Lens">
            {LENS_DEFS.map((item) => <button key={item.id} type="button" aria-pressed={atlasLens === item.id} onClick={() => { setMode(item.mode); setMoreOpen(false); if (phone && railState === "peek") setSheet("peek"); }}>{item.label}</button>)}
          </div>
          <p className="ax-q">{mode === "cases" ? lensDef.q : lensNow.q}</p>
          {!indiaOverview && (
            <div className="ax-repr">
              <label>
                <span className="sys-sr">{atlasLens === "cases" ? "Which cases" : "Representation"}</span>
                {atlasLens === "cases"
                  ? <select value={lens} onChange={(event) => setLens(event.target.value as CaseLens)}>{LENSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                  : <select value={mode} onChange={(event) => setMode(event.target.value as AnyMode)}>{MODES.filter((item) => atlasLens === "care" ? ["abc", "arv", "medical"].includes(item.id) : atlasLens === "evidence" ? ["coverage", "activity", "change"].includes(item.id) : ["animals", "density"].includes(item.id)).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}
              </label>
              <button type="button" className={`ax-filter-btn${nFilters ? " is-on" : ""}`} aria-expanded={filterOpen} onClick={() => setFilterOpen((v) => !v)}><SlidersHorizontal size={15} aria-hidden /> Time & filters{nFilters ? <b>{nFilters}</b> : null}</button>
            </div>
          )}
        </header>

        <div className="ax-body">
          {indiaOverview && scope === "public" && <AtlasIndex cities={availableCities} onCity={changeCity} measure={measure} measureLabel={measureLabel} />}
          {!indiaOverview && <div className="ax-legend-block">{legend}</div>}
          {showInspector && (
            <Inspector
              ds={ds} ix={ix} sel={sel} t={t} scope={scope} next={ds.next}
              intelligence={sel.t === "city" && cityRow ? <LensReadout city={cityRow} ds={ds} lens={atlasLens} municipal={surface === "municipality"} /> : undefined}
              onSelect={choose} onClose={() => (sel.t === "city" ? (phone ? setSheet("peek") : setRailClosed(true)) : stepOut())}
              onPickNext={(n: NextCell) => {
                const ci = ds.cells.indexOf(n.cell);
                if (ci >= 0) choose({ t: "cell", cell: ci }); else choose({ t: "empty", key: n.cell, city: n.city, center: n.center });
              }}
              compact={false} onExpand={() => setSheet("open")}
              onMode={(x) => { setMode(x); setMoreOpen(false); }}
              filters={eff} note={filterNote}
              exact={unfiltered ? authByCell : undefined}
            />
          )}
          {!indiaOverview && !showInspector && datasetCity && <CityEvidence city={datasetCity} cells={cityRow?.cells ?? ds?.cells.length ?? 0} municipal={surface === "municipality"} />}
          {!indiaOverview && <p className="ax-fine">{unfiltered ? "Current cell totals come from the full register; individual dots are bounded detail." : "Filtered and historical views use bounded detail and never replace citywide totals."} Recorded animals and work — not a population estimate.</p>}
        </div>
      </aside>
      {!phone && railState === "closed" && <button type="button" className="ax-rail-open" onClick={() => setRailClosed(false)}>Show the Atlas panel</button>}

      <div className="ax-scale" aria-label="Map detail scale" data-zoom={mapZoom.toFixed(2)}>
        {[{ label: "India", at: 7 }, { label: "City", at: 11 }, { label: "Cells", at: 15 }, { label: "Animals", at: Infinity }].map(({ label, at }, i) => (
          <span key={label} className={mapZoom < at && (i === 0 || mapZoom >= [0, 7, 11, 15][i]) ? "is-on" : ""}>{label}</span>
        ))}
        <em>{indiaOverview ? `Size: ${measureLabel.toLowerCase()} · colour: kind of evidence` : (cityRow?.cells ?? 2) <= 1 ? "Every record here shares one city location — no street detail exists" : atlasLens === "animals" && mapZoom < 13 ? "Shade: recorded profiles per cell" : "Cells ≈ 0.7 km² · dots placed within their cell"}</em>
      </div>

      {scope === "public" && indiaOverview && approachingCity && (
        <aside className="ax-approach" aria-live="polite">
          <span>{approachingCity.state ?? "City register"}</span>
          <b>{approachingCity.city}</b>
          <p>{approachingCity.animals.toLocaleString("en-IN")} recorded profiles · {approachingCity.cells.toLocaleString("en-IN")} cells</p>
          <button type="button" className="x-btn is-flame" onClick={() => changeCity(approachingCity.city)}>Enter {approachingCity.city} <ArrowUpRight size={15} /></button>
        </aside>
      )}

      <div className="ax-tools" role="group" aria-label="Map tools">
        <button type="button" disabled={!ready} onClick={() => mapRef.current?.zoomIn({ duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220 })} aria-label="Zoom in" title="Zoom in"><Plus size={18} /></button>
        <button type="button" disabled={!ready} onClick={() => mapRef.current?.zoomOut({ duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220 })} aria-label="Zoom out" title="Zoom out"><Minus size={18} /></button>
        <span className="ax-tools-gap" aria-hidden />
        {!indiaOverview && <button type="button" onClick={() => setThree((v) => !v)} aria-pressed={three} aria-label={three ? "Switch to plan view" : "Switch to 3D columns"} title={three ? "Plan view" : "3D columns"}>{three ? <Square size={16} /> : <Box size={16} />}</button>}
        <button type="button" onClick={() => setGrid((v) => !v)} aria-pressed={cellsOn} aria-label="Analysis grid: show the map as cells of about 0.7 km²" title="Analysis grid"><Hexagon size={17} /></button>
        <button type="button" onClick={() => setGround((g) => (g === "night" ? "paper" : "night"))} aria-label={ground === "night" ? "Switch to the daylight ground" : "Switch to the night ground"} title={ground === "night" ? "Daylight ground" : "Night ground"}><Layers size={17} /></button>
        <button type="button" onClick={locate} aria-label="Go to where I am" title="Go to where I am"><Crosshair size={17} /></button>
      </div>

      {filterOpen && (
        <div className="ax-filter" role="dialog" aria-label="Time and filters">
          <div className="ax-filter-head">
            <b>Time & filters</b>
            {nFilters > 0 && <button type="button" className="x-btn is-ghost" onClick={() => { setFilters(NO_FILTERS); setLens("open"); }}>Reset</button>}
            <button type="button" className="ax-x" onClick={() => setFilterOpen(false)} aria-label="Close filters"><X size={18} /></button>
          </div>
          {ds && series.length > 1 && (
            <Timeline series={series} m0={m0} m={m} onChange={(x) => { setPlaying(false); setMonth(x); }} playing={playing} onPlay={play} night={false} />
          )}
          {mode === "cases" && (
            <div className="ax-filter-pair">
              <label className="ax-filter-row"><span>Show</span>
                <select value={lens} onChange={(e) => setLens(e.target.value as CaseLens)}>{LENSES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
              </label>
              <label className="ax-filter-row"><span>Condition</span>
                <select value={filters.condition} onChange={(e) => setFilters({ ...filters, condition: Number(e.target.value) })}>
                  <option value={-1}>Any</option>
                  {CONDITIONS.map((c, i) => <option key={c} value={i}>{c}</option>)}
                </select>
              </label>
            </div>
          )}
          {applies.includes("source") && <FilterRow label="Recorded by" value={filters.source} options={SOURCE_OPTS} onChange={(v) => setFilters({ ...filters, source: v as Filters["source"] })} />}
          {applies.includes("seen") && <FilterRow label="Seen" value={filters.seen} options={SEEN_OPTS} onChange={(v) => setFilters({ ...filters, seen: v as Filters["seen"] })} />}
          {!applies.length && <p className="ax-fine">{def.label} is read from every record; only the date changes it.</p>}
        </div>
      )}

      {mode === "cases" && lensCounts && !lensCounts.some((x) => x > 0) && !filterOpen && (
        <p className="ax-hint" role="status">No {lensDef.label.toLowerCase()} cases{eff.condition >= 0 ? ` for ${CONDITIONS[eff.condition]}` : ""} as of {monthLabel(m)}</p>
      )}

      {hover && <div className="ax-hover" style={{ left: hover.x + 14, top: hover.y + 14 }}>{hover.text}</div>}

      <Portraits map={layersReady ? mapRef.current : null} ds={ds} on={mode === "animals" && (ds?.cells.length ?? 0) > 1} pick={dotPick} />

      {loading && <div className="ax-state" role="status"><span className="ax-spin" aria-hidden />{indiaOverview ? "Reading the national index…" : `Reading ${params.get("city") ?? "the city"}'s record…`}</div>}
      {(error || mapError) && <div className="ax-state is-err" role="status">{error ?? mapError}</div>}
    </div>
  );
}


function FilterRow({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="sm-filter-row" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="sm-seg">{options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} className={value === v ? "is-on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>
    </div>
  );
}
