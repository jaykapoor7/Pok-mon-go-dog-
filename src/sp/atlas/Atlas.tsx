"use client";

/* ════════════════════════════════════════════════════════════════════
   The Living Field Atlas.

   INDIA      one inked stamp per city register, coloured by the kind of
              evidence it holds and sized by the lens's live count. A
              clinical register kept at city level is drawn hollow and
              never opens into areas or dots.
   CITY       every recorded area (H3 r8, ≈0.74 km²) as a round disc,
              classed by the lens; areas bordering the record with nothing
              in it are hatched rings: the edge of reporting, not empty.
   AREA       the disc opens into a seed head, one dot per recorded animal
              at SCHEMATIC positions inside the area: a count you can see,
              never a location. The inspector lists the animals.
   ANIMAL     a preview in place (photo or an honest no-photo plate) and
              the way to the full record, keeping camera and filters.

   Flightradar-style persistent selection and compare (up to three
   areas); evidence-based playback by recorded month (never an animal's
   path); Radio-Garden camera travel, no globe; reduced motion collapses
   travel to a cut. Every read is bounded: national index, one city's
   complete area aggregates, one area's animals.
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { GeoJSONSource, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import { Pause, Play, Plus, Minus, Locate, X, GitCompare, SlidersHorizontal, ChevronRight, Layers } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { groundStyle, supportsWebGL2, underlay } from "@/components/map/basemap";
import { C, QUESTIONS, foldMonths, orgPalette, question, type Ctx, type Range } from "@/lib/livingmap/questions";
import { headline, localities, placeName, tally } from "@/lib/livingmap/reading";
import type { MapArea, MapCell, MapCity, NationalCity, Unplaced } from "@/lib/livingmap/types";
import type { NationalCell } from "@/lib/livingmap/types";
import { MR, MON } from "@/lib/livingmap/types";
import { FIELD, fieldInks, regionInks, regionLabels, setRegionsVisible } from "./cartography";
import { bucketOf, lastRecorded } from "./recency";
import { DISC_PX, PIE_INK, coreBounds, glyphImage, hatchDisc, haversineKm, pieImage, seedHead } from "./geo";
import { KINDS, cityEvidence, kindOf } from "./evidence";
import { LENSES, MORE_LENSES, PUBLIC_LENSES, lensFigure, nationalMeasure, type LensId } from "./lenses";
import { Inspector } from "./Inspector";
import "./atlas.css";

export type Level = "india" | "city" | "area" | "animal";
export type Scope = "public" | "org";
export type Variant = "community" | "ngo" | "city";

const PAL = { ...FIELD, labelOpacity: 0.48 };
const INDIA_BOX: [[number, number], [number, number]] = [[67.5, 6.2], [97.8, 35.8]];
const CITY_ZOOM = 7.6, ENTER_ZOOM = 8.6, AREA_ZOOM = 13.2, MAX_DOTS = 140;
const R_STOPS: [number, number][] = [[6, 2.6], [8, 3.4], [10, 5], [12, 11.5], [13, 23], [16, 184]];
const radius = (k = 1, add = 0) => ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, r * k + add])] as unknown as number;
/** Radius scaled per feature by its `k` (areas sized by their animals). */
const radiusK = (add = 0) => ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, ["+", ["*", ["coalesce", ["get", "k"], 1], r], add]])] as unknown as number;
const iconSize = (k = 1) => ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, (r * 2 * k) / DISC_PX])] as unknown as number;

/** Dots in the Animals lens: each animal's recorded sterilisation status, which partitions every animal exactly. */
export const DOT_KEY = [
  { label: "Recorded sterilised", color: PIE_INK.yes },
  { label: "Recorded not sterilised", color: PIE_INK.no },
  { label: "Not recorded", color: PIE_INK.unknown },
] as const;

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const travel = (t: number) => 1 - Math.pow(1 - t, 3);
const dur = (from: number, to: number) => (reduced() ? 0 : Math.min(2200, 650 + Math.abs(from - to) * 180));

async function api(path: string, scope: Scope): Promise<Response> {
  if (scope === "public") return fetch(path);
  const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return new Response(JSON.stringify({ error: "Sign in with your organisation to see its map." }), { status: 401 });
  return fetch(`${path}${path.includes("?") ? "&" : "?"}scope=org`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}
const cityCache = new Map<string, Promise<MapCity | null>>();
function readCity(city: string, scope: Scope) {
  const key = `${scope}:${city}`;
  const hit = cityCache.get(key); if (hit) return hit;
  const p = api(`/api/livingmap?city=${encodeURIComponent(city)}`, scope).then(async (r) => { if (r.status === 404) return null; if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as MapCity; });
  cityCache.set(key, p); p.catch(() => cityCache.delete(key));
  return p;
}

export function Atlas({ variant = "community", scope = "public", lenses = PUBLIC_LENSES, more = MORE_LENSES, defaultLens = "animals", initialCities, initialUnplaced }: {
  variant?: Variant; scope?: Scope; lenses?: LensId[]; more?: LensId[]; defaultLens?: LensId; initialCities?: NationalCity[]; initialUnplaced?: Unplaced[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const init = useRef({
    city: params.get("city"), lens: (params.get("lens") as LensId | null), area: params.get("area"), animal: params.get("animal"),
    t: params.get("t"), cmp: params.get("cmp"), place: params.get("place"), by: params.get("by"), view: params.get("view"),
  }).current;

  /* ── state ─────────────────────────────────────────────────────── */
  const [cities, setCities] = useState<NationalCity[]>(initialCities ?? []);
  const [unplaced, setUnplaced] = useState<Unplaced[]>(initialUnplaced ?? []);
  const [citiesState, setCitiesState] = useState<"ready" | "loading" | "auth" | "error">(initialCities?.length ? "ready" : "loading");
  const [city, setCity] = useState<string | null>(init.city);
  const [data, setData] = useState<MapCity | null>(null);
  const [cityState, setCityState] = useState<"idle" | "loading" | "error" | "missing">("idle");
  const [lens, setLens] = useState<LensId>(init.lens && LENSES[init.lens] ? init.lens : defaultLens);
  const [range, setRange] = useState<Range>(() => { const m = init.t?.match(/^(\d+)-(\d+)$/); return m ? { from: +m[1], to: +m[2] } : null; });
  const [areaH3, setAreaH3] = useState<string | null>(init.area);
  const [area, setArea] = useState<MapArea | null | "loading" | "error">(null);
  const [animalId, setAnimalId] = useState<string | null>(init.animal);
  const [cmp, setCmp] = useState<string[]>(init.cmp ? init.cmp.split(",").slice(0, 3) : []);
  const [comparing, setComparing] = useState(false);
  const [isolate, setIsolate] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
  const [hover, setHover] = useState<{ x: number; y: number; title: string; line: string } | null>(null);
  const [zoom, setZoom] = useState(4);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [filters, setFilters] = useState(false);
  const [recentre, setRecentre] = useState(0);
  /* Animals lens colour: when each area was last recorded (default), or its recorded sterilisation. */
  const [by, setBy] = useState<"recent" | "ster">(init.by === "ster" ? "ster" : "recent");
  /* Restrained map: the evidence on a quiet ground, without the painted relief and printer's flourishes. */
  const [plain, setPlain] = useState(init.view === "plain");
  const [national, setNational] = useState<NationalCell[]>([]);

  const L = LENSES[lens];
  const q = question(L.q);
  const facet = L.facet ?? (q.facets?.[0]?.id ?? "all");
  const level: Level = !city ? "india" : animalId ? "animal" : areaH3 ? "area" : "city";

  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const userMove = useRef(false);
  const lastCam = useRef("");
  const pendingPlace = useRef(init.place);
  const labelEls = useRef<{ el: HTMLElement; major: boolean }[]>([]);

  /* ── reads ─────────────────────────────────────────────────────── */
  useEffect(() => {
    if (initialCities?.length) return;
    let live = true;
    const read = (left: number): void => {
      api("/api/livingmap?kind=cities", scope).then((r) => {
        if (r.status === 401) { if (live) setCitiesState("auth"); return null; }
        return r.ok ? r.json() : Promise.reject(new Error(String(r.status)));
      }).then((j) => { if (live && j) { setCities(j.cities ?? []); setUnplaced(j.unplaced ?? []); setCitiesState("ready"); } })
        .catch(() => { if (!live) return; if (left > 0) window.setTimeout(() => read(left - 1), 1200); else setCitiesState("error"); });
    };
    read(2);
    return () => { live = false; };
  }, [scope, initialCities]);

  /* India's recorded areas, slimmed (public scope only; an organisation's map stays its own). */
  useEffect(() => {
    if (scope !== "public") return;
    let live = true;
    fetch("/api/livingmap?kind=national").then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j?.cells) setNational(j.cells); }).catch(() => {});
    return () => { live = false; };
  }, [scope]);

  useEffect(() => {
    if (!city) { setData(null); setCityState("idle"); return; }
    if (kindOf(city, cities.find((c) => c.city === city)?.cells ?? 2) === "clinical") { setData(null); setCityState("idle"); return; }
    let live = true;
    setCityState("loading");
    readCity(city, scope).then((d) => { if (live) { setData(d); setCityState(d ? "idle" : "missing"); } }).catch(() => { if (live) { setData(null); setCityState("error"); } });
    return () => { live = false; };
  }, [city, scope, cities]);

  useEffect(() => {
    if (!city || !areaH3) { setArea(null); return; }
    let live = true;
    setArea("loading");
    api(`/api/livingmap?kind=area&city=${encodeURIComponent(city)}&h3=${areaH3}`, scope)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((a: MapArea) => { if (live) setArea(a); })
      .catch(() => { if (live) setArea("error"); });
    return () => { live = false; };
  }, [city, areaH3, scope]);

  /* ?place=: once the city is read, open that locality's busiest area. */
  useEffect(() => {
    const want = pendingPlace.current?.trim().toLowerCase();
    if (!want || !data) return;
    pendingPlace.current = null;
    const hit = data.cells.filter((c) => placeName(c.zone).toLowerCase() === want).sort((a, b) => b.animals - a.animals)[0];
    if (hit) setAreaH3(hit.h3);
  }, [data]);

  /* ── the reading ───────────────────────────────────────────────── */
  const cells = useMemo(() => data?.cells ?? [], [data]);
  const centers = useMemo(() => cells.map((c) => c.c), [cells]);
  const orgColor = useMemo(() => orgPalette(cells), [cells]);
  const timed = q.timed(facet) && !!range;
  const ctx: Ctx = useMemo(() => ({ range: timed ? range : null, inRange: timed && data ? foldMonths(data.months, cells.length, range) : null, orgColor, today: Date.now(), org: scope === "org" }), [timed, range, data, cells.length, orgColor, scope]);
  const classes = useMemo(() => q.classes(facet, ctx), [q, facet, ctx]);
  const { tally: counts, classOf } = useMemo(() => tally(cells, q, facet, ctx), [cells, q, facet, ctx]);
  const reading = useMemo(() => (cells.length ? headline(q, facet, ctx, cells, counts) : null), [q, facet, ctx, cells, counts]);
  const places = useMemo(() => localities(cells, centers, q, facet, ctx), [cells, centers, q, facet, ctx]);
  const areaIndex = areaH3 ? cells.findIndex((c) => c.h3 === areaH3) : -1;

  /* Months on the record for this city: opened requests and care, summed. */
  const months = useMemo(() => {
    if (!data?.months.length) return [] as { m: number; opened: number; care: number }[];
    const by = new Map<number, { m: number; opened: number; care: number }>();
    for (const r of data.months) { const x = by.get(r[MR.m]) ?? { m: r[MR.m], opened: 0, care: 0 }; x.opened += r[MR.opened]; x.care += r[MR.care]; by.set(r[MR.m], x); }
    const ms = [...by.keys()]; const lo = Math.min(...ms), hi = Math.max(...ms);
    const out = []; for (let m = Math.max(lo, hi - 47); m <= hi; m++) out.push(by.get(m) ?? { m, opened: 0, care: 0 });
    return out;
  }, [data]);

  /* ── the map ───────────────────────────────────────────────────── */
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!supportsWebGL2()) { setMapError("This browser cannot draw the interactive map. The panel lists every place and figure."); return; }
    let dead = false, map: MLMap | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({ container: el.current, style: groundStyle(PAL), bounds: INDIA_BOX, fitBoundsOptions: { padding: 40 },
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · Natural Earth · H3" }, dragRotate: false, pitchWithRotate: false, maxZoom: 16.5, minZoom: 3 });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __atlas?: MLMap }).__atlas = map;
      map.touchZoomRotate.disableRotation();
      map.on("error", (e) => { if (/webgl|context/i.test(e.error?.message ?? "")) setMapError("This browser cannot draw the interactive map. The panel lists every place and figure."); });
      map.on("load", () => {
        const m = map!;
        m.addImage("h-quiet", hatchDisc("rgba(11,30,61,0.4)", "rgba(246,239,227,0.92)", "rgba(11,30,61,0.45)"));
        m.addImage("h-amber", hatchDisc("rgba(168,116,15,0.8)", "rgba(250,240,220,0.95)", "rgba(168,116,15,0.9)"));
        m.addImage("h-care", hatchDisc("rgba(31,111,128,0.75)", "rgba(232,242,242,0.95)", "rgba(31,111,128,0.9)"));
        m.addImage("h-stale", hatchDisc("rgba(138,106,59,0.85)", "rgba(244,236,222,0.95)", "rgba(138,106,59,0.95)"));
        m.addImage("h-edge", hatchDisc("rgba(11,30,61,0.16)", "rgba(246,239,227,0.35)", "rgba(11,30,61,0.3)", true));
        m.on("styleimagemissing", (e: { id: string }) => {
          const pm = /^p:(\d+)-(\d+)$/.exec(e.id);
          if (pm && !m.hasImage(e.id)) { m.addImage(e.id, pieImage(+pm[1], +pm[2])); return; }
          const g = /^g:(?:(\d+)-(\d+)|x):([012])$/.exec(e.id);
          if (!g || m.hasImage(e.id)) return;
          m.addImage(e.id, glyphImage(g[1] ? [+g[1], +g[2]] : null, +g[3] as 0 | 1 | 2));
        });
        const empty = { type: "FeatureCollection" as const, features: [] };
        for (const s of ["edge", "areas", "glyphs", "dots", "zones", "nums", "sel", "cmp", "cities", "national"]) m.addSource(s, { type: "geojson", data: empty });
        /* A printed graticule every 5°, lettered at the edge: geography, not decoration. */
        const grat: GeoJSON.Feature[] = [];
        for (let lng = 65; lng <= 100; lng += 5) grat.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[lng, 2], [lng, 38]] }, properties: { t: `${lng}°E` } });
        for (let lat = 5; lat <= 35; lat += 5) grat.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[60, lat], [102, lat]] }, properties: { t: `${lat}°N` } });
        m.addSource("graticule", { type: "geojson", data: { type: "FeatureCollection", features: grat } });
        m.addLayer({ id: "graticule", type: "line", source: "graticule", maxzoom: 7.5, paint: { "line-color": "#0b1e3d", "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.16, 7.5, 0], "line-width": 0.7, "line-dasharray": [1, 3] } });
        m.addLayer({ id: "graticule-l", type: "symbol", source: "graticule", maxzoom: 7.5, layout: { "symbol-placement": "line", "symbol-spacing": 420, "text-field": ["get", "t"], "text-font": ["Noto Sans Regular"], "text-size": 10.5, "text-letter-spacing": 0.08, "text-keep-upright": true }, paint: { "text-color": "#0b1e3d", "text-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.42, 7.5, 0], "text-halo-color": "#f6efe3", "text-halo-width": 1.4 } });
        m.addLayer({ id: "edge", type: "symbol", source: "edge", layout: { "icon-image": "h-edge", "icon-size": iconSize(0.92), "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12, 1, 14.5, 0.4] } });
        m.addLayer({ id: "areas-echo", type: "circle", source: "areas", filter: ["all", ["!=", ["get", "kind"], "unknown"], ["!=", ["get", "pie"], 1]], paint: {
          "circle-radius": radiusK(0.5), "circle-color": "rgba(0,0,0,0)", "circle-translate": [1.6, -1.2],
          "circle-stroke-color": ["get", "color"], "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 0, 11, 0.8, 14, 1.2], "circle-stroke-opacity": ["case", ["==", ["get", "dim"], 1], 0, 0.55],
        } });
        m.addLayer({ id: "areas", type: "circle", source: "areas", filter: ["all", ["!=", ["get", "kind"], "unknown"], ["!=", ["get", "pie"], 1]], paint: {
          "circle-radius": radiusK(), "circle-color": ["get", "color"],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12.4, ["case", ["==", ["get", "dim"], 1], 0.1, 0.9], 14, ["case", ["==", ["get", "dim"], 1], 0.06, 0.2]],
          "circle-stroke-color": ["case", ["==", ["get", "kind"], "zero"], "rgba(11,30,61,0.4)", "rgba(11,30,61,0.55)"],
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 12, 0.8, 15, 1.4], "circle-stroke-opacity": ["case", ["==", ["get", "dim"], 1], 0.15, 0.9],
        } });
        m.addLayer({ id: "areas-unknown", type: "symbol", source: "areas", filter: ["==", ["get", "kind"], "unknown"], layout: { "icon-image": ["get", "pattern"], "icon-size": ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, ["*", ["coalesce", ["get", "k"], 1], (r * 2) / DISC_PX]])] as unknown as number, "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12.4, ["case", ["==", ["get", "dim"], 1], 0.18, 1], 14, ["case", ["==", ["get", "dim"], 1], 0.12, 0.55]] } });
        /* Animals lens: each area a printed pie of recorded sterilisation status, sized by count. */
        m.addLayer({ id: "pies", type: "symbol", source: "areas", filter: ["==", ["get", "pie"], 1], layout: {
          "icon-image": ["get", "pi"], "icon-allow-overlap": true, "icon-ignore-placement": true,
          "icon-size": ["interpolate", ["exponential", 2], ["zoom"], ...R_STOPS.flatMap(([z, r]) => [z, ["*", ["get", "k"], (r * 3.1) / DISC_PX]])] as unknown as number,
        }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 12.6, ["case", ["==", ["get", "dim"], 1], 0.12, 1], 14, ["case", ["==", ["get", "dim"], 1], 0.06, 0.25]] } });
        m.addLayer({ id: "multi", type: "circle", source: "areas", filter: ["==", ["get", "multi"], 1], paint: { "circle-radius": radius(1, 3), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": C.ink, "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 2.2] } });
        m.addLayer({ id: "glyphs", type: "symbol", source: "glyphs", minzoom: 10.2, layout: { "icon-image": ["get", "g"], "icon-size": iconSize(1.22), "icon-allow-overlap": true, "icon-ignore-placement": true }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 10.2, 0, 11, ["case", ["==", ["get", "dim"], 1], 0.1, 0.9], 14.6, ["case", ["==", ["get", "dim"], 1], 0.05, 0.45]] } });
        m.addLayer({ id: "dots", type: "circle", source: "dots", minzoom: AREA_ZOOM - 0.4, paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 1.7, 15, 3.8, 16.5, 5.4], "circle-color": ["get", "color"],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], AREA_ZOOM - 0.4, 0, AREA_ZOOM + 0.2, 1],
          "circle-stroke-color": "#fbf6ee", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0, 15, 0.9],
        } });
        m.addLayer({ id: "cmp", type: "circle", source: "cmp", paint: { "circle-radius": radius(1.2, 6), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 2.2, "circle-stroke-opacity": 0.9 } });
        m.addLayer({ id: "cmp-n", type: "symbol", source: "cmp", layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-offset": [1.6, -1.6], "text-allow-overlap": true }, paint: { "text-color": "#fff", "text-halo-color": "#2457ce", "text-halo-width": 3 } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": radius(1.12, 4), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": C.ink, "circle-stroke-width": 2.4 } });
        m.addLayer({ id: "sel-echo", type: "circle", source: "sel", paint: { "circle-radius": radius(1.12, 6), "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f05b40", "circle-stroke-width": 1.4, "circle-translate": [2, -2], "circle-stroke-opacity": 0.8 } });
        m.addLayer({ id: "nums", type: "symbol", source: "nums", minzoom: 11.6, layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11.6, 10, 14, 13], "text-padding": 1 }, paint: { "text-color": ["get", "ink"], "text-opacity": ["interpolate", ["linear"], ["zoom"], AREA_ZOOM - 0.4, 1, AREA_ZOOM + 0.2, 0] } });
        m.addLayer({ id: "zones", type: "symbol", source: "zones", maxzoom: 15.5, layout: {
          "text-field": ["get", "name"], "text-font": ["case", ["<", ["get", "rank"], 8], ["literal", ["Noto Sans Bold"]], ["literal", ["Noto Sans Regular"]]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 9, ["case", ["<", ["get", "rank"], 8], 12.5, 10.5], 14, ["case", ["<", ["get", "rank"], 8], 15, 13]],
          "symbol-sort-key": ["get", "rank"], "text-padding": 6, "text-max-width": 9, "text-variable-anchor": ["center", "top", "bottom"], "text-radial-offset": 0.9,
        }, paint: { "text-color": C.ink, "text-halo-color": "#f8f2e7", "text-halo-width": 1.7, "text-opacity": ["interpolate", ["linear"], ["zoom"], 8.5, 0, 9.5, 0.95] } });
        /* India's recorded areas: one inked dot per area, coloured by when it was last recorded. */
        m.addLayer({ id: "national-echo", type: "circle", source: "national", paint: { "circle-radius": ["get", "r"], "circle-color": "rgba(0,0,0,0)", "circle-translate": [1.4, -1.1], "circle-stroke-color": ["get", "color"], "circle-stroke-width": 0.8, "circle-stroke-opacity": 0.5 } });
        m.addLayer({ id: "national", type: "circle", source: "national", paint: { "circle-radius": ["get", "r"], "circle-color": ["get", "color"], "circle-opacity": ["case", ["==", ["get", "u"], 1], 0.25, 0.88], "circle-stroke-color": ["case", ["==", ["get", "u"], 1], "rgba(11,30,61,0.55)", "#fbf6ee"], "circle-stroke-width": 0.6 } });
        m.addLayer({ id: "cities-echo", type: "circle", source: "cities", paint: { "circle-radius": ["+", ["get", "r"], 1.5], "circle-color": "rgba(0,0,0,0)", "circle-translate": [2.5, -2], "circle-stroke-color": ["get", "echo"], "circle-stroke-width": 1.2, "circle-stroke-opacity": ["get", "eop"] } });
        m.addLayer({ id: "cities", type: "circle", source: "cities", paint: { "circle-radius": ["get", "r"], "circle-color": ["get", "color"], "circle-opacity": ["get", "op"], "circle-stroke-color": ["get", "stroke"], "circle-stroke-width": ["get", "sw"] } });
        m.addLayer({ id: "cities-l", type: "symbol", source: "cities", filter: ["==", ["get", "label"], 1], layout: {
          "text-field": ["format", ["get", "name"], { "font-scale": 1 }, "\n", {}, ["get", "fig"], { "font-scale": 0.84 }], "text-font": ["Noto Sans Bold"], "text-size": 12.5,
          "text-variable-anchor": ["top", "bottom", "right", "left"], "text-radial-offset": ["get", "off"], "symbol-sort-key": ["get", "rank"], "text-optional": true, "text-justify": "auto",
        }, paint: { "text-color": C.ink, "text-halo-color": "#f8f2e7", "text-halo-width": 1.7 } });

        const hoverIt = (e: { features?: MapGeoJSONFeature[]; point: { x: number; y: number } }) => {
          if (window.matchMedia("(hover: none)").matches) return;
          const f = e.features?.[0]; if (!f) return;
          setHover({ x: e.point.x, y: e.point.y, title: String(f.properties?.title ?? ""), line: String(f.properties?.line ?? "") });
        };
        for (const id of ["areas", "areas-unknown", "pies", "cities"]) {
          m.on("mousemove", id, hoverIt);
          m.on("mouseleave", id, () => { setHover(null); m.getCanvas().style.cursor = ""; });
          m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
        }
        m.on("click", (e) => onMapClick(m, e.point, (e.originalEvent as MouseEvent)?.shiftKey));
        m.on("movestart", (e) => { userMove.current = !!(e as { originalEvent?: unknown }).originalEvent; });
        m.on("moveend", () => setZoom(m.getZoom()));
        underlay(m, PAL, "graticule").then((ok) => { if (!ok) return; fieldInks(m, "graticule"); regionInks(m); setRegionsVisible(m, !plainRef.current); setInked((n) => n + 1); }).catch(() => {});
        /* Region names are lettered in HTML: the map's own text engine cannot shape Devanagari. */
        labelEls.current = regionLabels().map((r) => {
          const e = document.createElement("div");
          e.className = `atlas-region is-${r.kind}${r.major ? " is-major" : ""}`;
          e.setAttribute("aria-hidden", "true");
          e.innerHTML = `<span style="transform:rotate(${r.angle}deg)"><b></b><i class="hi" lang="hi"></i></span>`;
          e.querySelector("b")!.textContent = r.name; e.querySelector("i")!.textContent = r.hi;
          new ml.Marker({ element: e, anchor: "center" }).setLngLat(r.at).addTo(m);
          return { el: e, major: r.major };
        });
        setZoom(m.getZoom());
        setReady(true);
      });
    }).catch(() => setMapError("The map could not start. The panel lists every place and figure."));
    return () => { dead = true; map?.remove(); mapRef.current = null; setReady(false); };
    // Built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plainRef = useRef(plain);
  plainRef.current = plain;
  const [inked, setInked] = useState(0);
  /* Restrained map: hide the painted relief, sea waves and printer's echoes; keep every evidence layer. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    setRegionsVisible(m, !plain);
    for (const id of ["fa-waves", "fa-sea-names", "fa-border-echo", "fa-park-hatch", "fa-water-echo", "graticule", "graticule-l", "areas-echo", "national-echo", "cities-echo", "sel-echo"]) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", plain ? "none" : "visible");
  }, [plain, ready, inked]);
  useEffect(() => {
    for (const { el: e, major } of labelEls.current) {
      const on = !plain && level === "india" && zoom < 7 && (major || zoom >= 4.7);
      e.classList.toggle("is-on", on);
    }
  }, [plain, level, zoom, ready]);

  const live = useRef({ cells, city, comparing, cmp });
  live.current = { cells, city, comparing, cmp };
  const onMapClick = (m: MLMap, p: { x: number; y: number }, shift: boolean) => {
    const hit = m.queryRenderedFeatures([[p.x - 4, p.y - 4], [p.x + 4, p.y + 4]], { layers: ["cities", "areas", "areas-unknown", "pies", "dots"].filter((l) => m.getLayer(l)) });
    const dist = (h: MapGeoJSONFeature) => { const q2 = m.project((h.geometry as GeoJSON.Point).coordinates as [number, number]); return (q2.x - p.x) ** 2 + (q2.y - p.y) ** 2; };
    const cityHit = hit.filter((h) => h.layer.id === "cities").sort((a, b) => dist(a) - dist(b))[0];
    const areaHit = hit.find((h) => h.layer.id !== "cities");
    const Lc = live.current;
    if (areaHit && Lc.city) {
      const c = Lc.cells[areaHit.properties?.i as number]; if (!c) return;
      if (shift || Lc.comparing) { toggleCompare(c.h3); return; }
      setAreaH3(c.h3); setAnimalId(null); setSheet("half"); return;
    }
    if (cityHit) { openCity(String(cityHit.properties?.name)); return; }
    if (Lc.city) { setAreaH3(null); setAnimalId(null); }
  };
  const toggleCompare = useCallback((h3: string) => { setCmp((x) => (x.includes(h3) ? x.filter((y) => y !== h3) : [...x, h3].slice(-3))); }, []);

  const openCity = useCallback((name: string) => { setCity(name); setAreaH3(null); setAnimalId(null); setIsolate(null); setRange(null); setCmp([]); setSheet("half"); }, []);
  const goIndia = useCallback(() => { setCity(null); setAreaH3(null); setAnimalId(null); setIsolate(null); setRange(null); setCmp([]); setComparing(false); }, []);

  /* Zoom is navigation: out past a city returns to India; in near a city opens it. */
  useEffect(() => {
    if (!ready || !userMove.current) return;
    const m = mapRef.current; if (!m) return;
    if (city && zoom < CITY_ZOOM - 1) { goIndia(); return; }
    if (!city && zoom >= ENTER_ZOOM && cities.length) {
      const c = m.getCenter();
      const near = cities.filter((x) => typeof x.lng === "number" && kindOf(x.city, x.cells) !== "clinical").map((x) => ({ x, d: haversineKm([c.lng, c.lat], [x.lng!, x.lat!]) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 60) { userMove.current = false; openCity(near.x.city); }
    }
  }, [zoom, ready, city, cities, goIndia, openCity]);

  const showNational = level === "india" && lens === "animals" && national.length > 0;
  /* ── paint: India ───────────────────────────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("cities") as GeoJSONSource | undefined; if (!src) return;
    const show = level === "india";
    const vals = cities.map((c) => nationalMeasure(lens, c));
    const max = Math.sqrt(Math.max(1, ...vals));
    const ranked = cities.map((c, i) => ({ c, v: vals[i] })).sort((a, b) => b.v - a.v).map((x) => x.c.city);
    src.setData({ type: "FeatureCollection", features: show ? cities.flatMap((c, i) => {
      if (typeof c.lng !== "number" || typeof c.lat !== "number") return [];
      const k = kindOf(c.city, c.cells), K = KINDS[k], clinical = k === "clinical", v = vals[i];
      const r = clinical ? 15 : v ? 4.5 + (Math.sqrt(v) / max) * 30 : 3.5;
      return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: {
        name: c.city, r, color: K.ink, op: clinical || showNational ? 0 : v ? 0.86 : 0.25, stroke: clinical || showNational ? K.ink : "#fbf6ee", sw: clinical ? 2.4 : showNational ? 1.1 : 1, echo: K.echo, eop: showNational ? 0 : v || clinical ? 0.7 : 0,
        fig: clinical ? `${c.animals.toLocaleString("en-IN")} · register` : v ? v.toLocaleString("en-IN") : "", rank: ranked.indexOf(c.city) + (v ? 0 : 1000), off: r / 12 + 0.5, label: v || clinical ? 1 : 0,
        title: c.city, line: `${K.label} · ${clinical ? "city-level register, no areas" : `${v.toLocaleString("en-IN")} ${LENSES[lens].unit}`}`,
      } }];
    }) : [] });
  }, [cities, ready, level, lens, showNational]);

  /* India's areas: shown under the Animals lens, where the measure is the same (animals recorded). */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const now = Date.now();
    (m.getSource("national") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: showNational ? national.map(([lng, lat, a, last]) => {
      const b = bucketOf(last, now);
      return { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lng, lat] }, properties: { r: 1.6 + Math.min(5.5, Math.sqrt(a) * 0.55), color: by === "ster" ? "#2457ce" : b?.color ?? "#f6efe3", u: by === "recent" && !b ? 1 : 0 } };
    }) : [] });
  }, [ready, showNational, national, by]);

  /* ── paint: city ────────────────────────────────────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const set = (id: string, features: GeoJSON.Feature[]) => (m.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    if (!city || !cells.length) { for (const s of ["areas", "edge", "dots", "zones", "nums", "glyphs"]) set(s, []); return; }
    const byId = new Map(classes.map((k) => [k.id, k]));
    const pattern = (id: string) => (id === "stale" || id === "revisit" ? "h-stale" : ["status", "nostatus", "outcome", "unconf", "confirm"].includes(id) ? "h-amber" : id === "survey" ? "h-care" : "h-quiet");
    const pt = (c: [number, number], properties: Record<string, unknown> = {}): GeoJSON.Feature => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties });
    const animalsAll = L.q === "animals" && facet === "all";
    const pies = animalsAll && by === "ster", recent = animalsAll && by === "recent";
    const now = Date.now();
    const maxA = Math.sqrt(Math.max(1, ...cells.map((c) => c.animals)));
    set("areas", cells.map((c, i) => {
      const k = byId.get(classOf[i]); const v = q.measure(c, facet, ctx, i);
      const yes = c.animals ? Math.round((c.ster_yes / c.animals) * 12) : 0, no = c.animals ? Math.min(12 - yes, Math.round((c.ster_no / c.animals) * 12)) : 0;
      const rb = recent ? bucketOf(lastRecorded(c), now) : null;
      if (recent) return pt(centers[i], { pie: 0, k: 0.55 + (Math.sqrt(c.animals) / maxA) * 0.85, i, kind: rb ? "value" : "unknown", color: rb?.color ?? C.zeroFill, pattern: "h-quiet", dim: isolate && isolate !== (rb?.id ?? "rx") ? 1 : 0, multi: 0,
        title: placeName(c.zone), line: `${c.animals.toLocaleString("en-IN")} animals · last recorded ${rb ? rb.label.toLowerCase() : "on no recorded date"}` });
      return pt(centers[i], { pie: pies && c.animals ? 1 : 0, pi: `p:${yes}-${no}`, k: pies ? 0.62 + (Math.sqrt(c.animals) / maxA) * 0.75 : 1, i, kind: k?.kind ?? "zero", color: k?.color ?? C.zeroFill, pattern: pattern(classOf[i]), dim: isolate && isolate !== classOf[i] ? 1 : 0, multi: L.q === "orgs" && c.orgs.length > 1 ? 1 : 0,
        title: placeName(c.zone), line: pies ? `${c.animals.toLocaleString("en-IN")} animals · ${c.ster_yes} sterilised, ${c.ster_no} recorded not, ${Math.max(0, c.animals - c.ster_yes - c.ster_no)} not recorded` : `${k?.label ?? ""}${v ? ` · ${v.toLocaleString("en-IN")} ${q.unit(facet)}` : ""}` });
    }));
    set("glyphs", animalsAll ? [] : cells.map((c, i) => {
      const r = c.animals ? [Math.min(12, Math.round((c.ster_yes / c.animals) * 12)), Math.round((c.ster_no / c.animals) * 12)] : null;
      const waiting = c.open_30 - (c.open_30_unconfirmed ?? 0), known = c.open_cases - (c.open_unconfirmed ?? 0);
      const att = waiting > 0 || (c.fu_missed_live ?? 0) > 0 || (c.needs_help > 0 && !c.open_cases) || known > 0 ? 2 : (c.open_unconfirmed ?? 0) > 0 || c.status_unknown > 0 ? 1 : 0;
      return pt(centers[i], { g: `g:${r ? `${r[0]}-${Math.min(12 - r[0], r[1])}` : "x"}:${att}`, dim: isolate && isolate !== classOf[i] ? 1 : 0 });
    }));
    set("edge", L.q === "gaps" || zoom > 11 ? (data?.edge ?? []).map((e) => pt(e)) : []);
    set("nums", cells.flatMap((c, i) => {
      const v = q.measure(c, facet, ctx, i); if (!v || recent || (isolate && isolate !== classOf[i])) return [];
      const k = byId.get(classOf[i]); const dark = k?.kind === "value" && /^(#16398f|#2457ce|#1f6f80|#3c98a8|#a8230f|#e0472b|#0b1e3d)$/i.test(k.color);
      return [pt(centers[i], { t: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v), ink: dark && zoom < 12.5 ? "#ffffff" : C.ink })];
    }));
    set("zones", places.slice(0, 60).map((p, r) => pt(p.center, { name: p.name, rank: r })));
    const dots: GeoJSON.Feature[] = [];
    cells.forEach((c, i) => {
      const rb = recent ? bucketOf(lastRecorded(c), now) : null;
      if (isolate && isolate !== (recent ? rb?.id ?? "rx" : classOf[i])) return;
      const nAll = Math.min(c.animals, MAX_DOTS); if (!nAll) return;
      const parts: [number, string][] = recent ? [[c.animals, rb?.color ?? "rgba(11,30,61,0.3)"]] : dotParts(c, L.q, facet, orgColor);
      const colors: string[] = [];
      for (const [count, col] of parts) for (let j = 0; j < count && colors.length < nAll; j++) colors.push(col);
      while (colors.length < nAll) colors.push("rgba(11,30,61,0.3)");
      seedHead(centers[i], nAll).forEach((p, j) => dots.push(pt(p, { i, color: colors[j] })));
    });
    set("dots", dots);
  }, [ready, city, cells, centers, classOf, classes, isolate, L.q, facet, q, ctx, data, places, zoom, orgColor, by]);

  /* Selection and comparison rings. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const ring = (h: string) => { const j = cells.findIndex((c) => c.h3 === h); return j >= 0 ? centers[j] : null; };
    const sel = areaIndex >= 0 ? [centers[areaIndex]] : [];
    (m.getSource("sel") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: sel.map((c) => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: {} })) });
    (m.getSource("cmp") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: cmp.flatMap((h, i) => { const c = ring(h); return c ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c }, properties: { n: String(i + 1) } }] : []; }) });
  }, [ready, areaIndex, centers, cmp, cells]);

  /* ── camera ─────────────────────────────────────────────────────── */
  const pad = useCallback(() => {
    const w = el.current?.clientWidth ?? 1200, h = el.current?.clientHeight ?? 800;
    return w > 900 ? { top: 150, bottom: 120, left: 60, right: 460 } : { top: 130, bottom: Math.round(h * 0.42), left: 16, right: 16 };
  }, []);
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const key = `${level}:${city}:${areaH3}:${cells.length}:${level === "india" ? cities.length : 0}:${recentre}`;
    if (key === lastCam.current) return;
    lastCam.current = key; userMove.current = false;
    if (level === "india") { m.fitBounds(INDIA_BOX, { padding: pad(), duration: dur(m.getZoom(), 4.2), easing: travel }); return; }
    if (city && kindOf(city, cities.find((c) => c.city === city)?.cells ?? 2) === "clinical") {
      const c = cities.find((x) => x.city === city);
      if (c?.lng) m.flyTo({ center: [c.lng, c.lat!], zoom: 9.5, duration: dur(m.getZoom(), 9.5), easing: travel, padding: pad() });
      return;
    }
    if (!cells.length) return;
    if ((level === "area" || level === "animal") && areaIndex >= 0) {
      const z = Math.max(14.4, Math.min(m.getZoom(), 15.4));
      const p = pad(); m.flyTo({ center: centers[areaIndex], zoom: z, offset: [(p.left - p.right) / 2, (p.top - p.bottom) / 2], duration: dur(m.getZoom(), z), easing: travel });
      return;
    }
    const b = coreBounds(centers);
    const z = m.cameraForBounds(b, { padding: pad(), maxZoom: 12.8 })?.zoom ?? 11;
    m.fitBounds(b, { padding: pad(), maxZoom: 12.8, duration: dur(m.getZoom(), z), easing: travel });
  }, [ready, level, city, areaH3, areaIndex, cells.length, centers, pad, cities, recentre]);

  /* ── URL: shareable, restorable state; Back returns here intact ──── */
  useEffect(() => {
    const p = new URLSearchParams();
    if (city) p.set("city", city);
    if (lens !== defaultLens) p.set("lens", lens);
    if (areaH3) p.set("area", areaH3);
    if (animalId) p.set("animal", animalId);
    if (range) p.set("t", `${range.from}-${range.to}`);
    if (cmp.length) p.set("cmp", cmp.join(","));
    if (by === "ster") p.set("by", "ster");
    if (plain) p.set("view", "plain");
    const s = p.toString();
    window.history.replaceState(window.history.state, "", s ? `${window.location.pathname}?${s}` : window.location.pathname);
  }, [city, lens, areaH3, animalId, range, cmp, defaultLens, by, plain]);

  /* Escape climbs one scale. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || (e.target as HTMLElement)?.closest("input, textarea, dialog")) return;
      if (filters) setFilters(false); else if (animalId) setAnimalId(null); else if (areaH3) setAreaH3(null); else if (city) goIndia();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [animalId, areaH3, city, goIndia, filters]);

  /* Playback: step month by month through the recorded months. */
  useEffect(() => {
    if (!playing || !months.length) return;
    const id = window.setInterval(() => {
      setRange((r) => {
        const i = r ? months.findIndex((x) => x.m === r.from) : -1;
        const next = months[i + 1];
        if (!next) { setPlaying(false); return r; }
        return { from: next.m, to: next.m };
      });
    }, reduced() ? 1400 : 900);
    return () => window.clearInterval(id);
  }, [playing, months]);

  const pickLens = (id: LensId) => { setLens(id); setIsolate(null); if (!LENSES[id].timed) { setRange(null); setPlaying(false); } };
  const zoomBy = (d: number) => { const m = mapRef.current; if (m) m.easeTo({ zoom: m.getZoom() + d, duration: reduced() ? 0 : 300 }); };
  const flyTo = (center: [number, number]) => { const m = mapRef.current; if (!m) return; const p = pad(); m.flyTo({ center, zoom: Math.max(m.getZoom(), 13), offset: [(p.left - p.right) / 2, (p.top - p.bottom) / 2], duration: dur(m.getZoom(), 13), easing: travel }); };

  const place = level === "india" ? (scope === "org" ? "Your organisation" : "India") : level === "city" ? city : areaIndex >= 0 ? placeName(cells[areaIndex]?.zone) : city;
  const ev = city ? cityEvidence(city, cities.find((c) => c.city === city)?.cells ?? 2) : null;
  const figFor = (id: LensId) => lensFigure(id, level === "india" ? null : cells, level === "india" ? cities : null);
  const timedLens = !!L.timed && level !== "india" && months.length > 0;
  const monthMax = Math.max(1, ...months.map((x) => (L.q === "needs" ? x.opened : x.care)));

  return (
    <div className={`atlas is-${level} v-${variant}`} data-sheet={sheet}>
      <div className="atlas-map" ref={el} role="application" aria-label={`Map of ${place}. ${L.define} The panel lists the same places and figures.`} />
      {mapError && <p className="atlas-err float" role="status">{mapError}</p>}
      {hover && <div className="atlas-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden><b>{hover.title}</b><span>{hover.line}</span></div>}

      {/* Place, set on the map like an atlas page heading. */}
      <header className="atlas-place">
        <nav className="atlas-ladder" aria-label="Scale" hidden={level === "india"}>
          <button type="button" onClick={goIndia} aria-current={level === "india" ? "page" : undefined}>India</button>
          {city && <><ChevronRight size={13} aria-hidden /><button type="button" onClick={() => { setAreaH3(null); setAnimalId(null); }} aria-current={level === "city" ? "page" : undefined}>{city}</button></>}
          {areaIndex >= 0 && <><ChevronRight size={13} aria-hidden /><button type="button" onClick={() => setAnimalId(null)} aria-current={level === "area" ? "page" : undefined}>{placeName(cells[areaIndex]?.zone)}</button></>}
        </nav>
        {variant === "city" && <p className="atlas-kicker k">City evidence · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
        {variant === "ngo" && <p className="atlas-kicker k">Your organisation&rsquo;s open work</p>}
        <h1 className="serif">{place}</h1>
        {ev && <p className="atlas-ev"><i style={{ background: KINDS[ev.kind].ink }} aria-hidden />{KINDS[ev.kind].label} · {ev.precision}</p>}
        {cityState === "loading" && <p className="atlas-ev" role="status">Reading {city}&rsquo;s areas…</p>}
        {cityState === "error" && <p className="atlas-ev is-err" role="alert">{city} could not be read. That is not the same as no records. <button type="button" className="link" onClick={() => { const c = city; setCity(null); window.setTimeout(() => setCity(c), 0); }}>Retry</button></p>}
      </header>

      {/* The four lenses: always visible, each with its live figure. */}
      <div className="atlas-dock" role="radiogroup" aria-label={variant === "city" ? "Evidence layers" : "Lens"}>
        {variant === "city" && <p className="atlas-dock-h k">Layers</p>}
        {lenses.map((id) => {
          const fig = figFor(id);
          return (
            <button key={id} type="button" role="radio" aria-checked={lens === id} className={`atlas-lens${lens === id ? " is-on" : ""}`} style={{ ["--lc" as string]: LENSES[id].ink }} onClick={() => pickLens(id)}>
              <span className="atlas-lens-l">{LENSES[id].label}</span>
              <b className="serif tnum">{citiesState === "loading" && level === "india" ? "…" : fig.big}</b>
              <small>{fig.small}</small>
            </button>
          );
        })}
        <button type="button" className={`atlas-more${filters ? " is-on" : ""}`} aria-expanded={filters} onClick={() => setFilters((v) => !v)}><SlidersHorizontal size={16} aria-hidden /><span>More</span></button>
      </div>

      {filters && (
        <div className="atlas-filters float" role="dialog" aria-label="More lenses and filters">
          <header><b>Further readings</b><button type="button" className="icon-btn" onClick={() => setFilters(false)} aria-label="Close"><X size={16} /></button></header>
          <div className="row" style={{ ["--g" as string]: "6px" }}>
            {more.map((id) => <button key={id} type="button" className="chip" aria-pressed={lens === id} disabled={level === "india" && (id === "orgs" || id === "quality")} onClick={() => pickLens(id)}>{LENSES[id].label}</button>)}
          </div>
          {q.facets && q.facets.length > 1 && (
            <>
              <b>{L.label}: which records</b>
              <div className="row" style={{ ["--g" as string]: "6px" }}>
                {q.facets.map((fc) => <button key={fc.id} type="button" className="chip" aria-pressed={facet === fc.id} onClick={() => { const match = (Object.values(LENSES).find((x) => x.q === L.q && x.facet === fc.id)); if (match) pickLens(match.id); }}>{fc.label}</button>)}
              </div>
            </>
          )}
          <p className="small">{L.define}</p>
          {level !== "india" && <p className="small">Comparing areas: hold Shift and click, or turn on <b>Compare</b> on the map edge. Up to three areas, same period.</p>}
        </div>
      )}

      {/* Map edge tools. */}
      <div className="atlas-tools" role="group" aria-label="Map tools">
        <button type="button" className="icon-btn" onClick={() => zoomBy(1)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" className="icon-btn" onClick={() => zoomBy(-1)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" className="icon-btn" onClick={() => setRecentre((n) => n + 1)} aria-label="Re-centre on the selection"><Locate size={16} /></button>
        <button type="button" className={`icon-btn${plain ? " is-on" : ""}`} aria-pressed={plain} onClick={() => setPlain((v) => !v)} aria-label="Plain map: evidence only, without the painted relief" title={plain ? "Show the painted atlas" : "Plain map: evidence only"}><Layers size={16} /></button>
        {level !== "india" && cells.length > 0 && <button type="button" className={`icon-btn${comparing ? " is-on" : ""}`} aria-pressed={comparing} onClick={() => setComparing((v) => !v)} aria-label="Compare areas" title="Compare areas"><GitCompare size={16} /></button>}
      </div>

      {city && zoom >= AREA_ZOOM && (
        <p className="atlas-note float" aria-hidden>
          One dot, one recorded animal. Positions inside an area are schematic, never a location.
          {L.q === "animals" && facet === "all" && by === "recent" && <span className="atlas-dotkey"><span>Dots take their area&rsquo;s colour: when it was last recorded.</span></span>}
          {L.q === "animals" && facet === "all" && by === "ster" && <span className="atlas-dotkey">{DOT_KEY.map((d) => <span key={d.label}><i style={{ background: d.color }} />{d.label}</span>)}</span>}
        </p>
      )}

      {/* Evidence playback: recorded months, discrete; nothing interpolated. */}
      {timedLens && (
        <div className="atlas-time float" aria-label="Recorded months">
          <button type="button" className="icon-btn" onClick={() => { if (!range && months.length) setRange({ from: months[0].m, to: months[0].m }); setPlaying((v) => !v); }} aria-label={playing ? "Pause playback" : "Play recorded months"}>{playing ? <Pause size={15} /> : <Play size={15} />}</button>
          <div className="atlas-bars" role="group" aria-label={`${L.q === "needs" ? "Requests opened" : "Care recorded"} per month`}>
            {months.map((x) => {
              const v = L.q === "needs" ? x.opened : x.care, on = range && x.m >= range.from && x.m <= range.to;
              const label = `${MON[x.m % 12]} ${2000 + Math.floor(x.m / 12)}: ${v ? v.toLocaleString("en-IN") : "none recorded"}`;
              return <button key={x.m} type="button" aria-pressed={!!on} title={label} aria-label={label} onClick={() => { setPlaying(false); setRange(on && range?.from === range?.to ? null : { from: x.m, to: x.m }); }}><i style={{ height: `${v ? 8 + (v / monthMax) * 92 : 4}%` }} className={v ? undefined : "is-none"} /></button>;
            })}
          </div>
          <p className="atlas-time-l">{range ? <><b>{MON[range.from % 12]} {2000 + Math.floor(range.from / 12)}</b>{range.to !== range.from ? <> to <b>{MON[range.to % 12]} {2000 + Math.floor(range.to / 12)}</b></> : null}<button type="button" className="link" onClick={() => { setRange(null); setPlaying(false); }}>All time</button></> : <>All recorded time · {L.q === "needs" ? "requests opened" : "care recorded"} per month</>}</p>
        </div>
      )}

      <Inspector
        variant={variant} scope={scope} level={level} lens={lens} q={q} facet={facet} classes={classes} counts={counts} reading={reading}
        cities={cities} citiesState={citiesState} unplaced={unplaced} city={city} cityState={cityState} data={data} cells={cells} places={places} ctx={ctx}
        area={area} areaIndex={areaIndex} animalId={animalId} cmp={cmp} isolate={isolate} sheet={sheet} evidence={ev}
        onCity={openCity} onIndia={goIndia} onArea={(h) => { setAreaH3(h); setAnimalId(null); setSheet("half"); }} onCloseArea={() => { setAreaH3(null); setAnimalId(null); }}
        onAnimal={(id) => { setAnimalId(id); setSheet("full"); }} onCloseAnimal={() => setAnimalId(null)} onIsolate={(k) => setIsolate((x) => (x === k ? null : k))}
        onPlace={flyTo} onSheet={setSheet} onCompare={toggleCompare} onClearCompare={() => setCmp([])}
        onOpenRecord={(id) => router.push(`/animal/${id}?from=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
        nationalMeasure={(c) => nationalMeasure(lens, c)}
        by={by} onBy={(b) => { setBy(b); setIsolate(null); }} national={showNational ? national : []} plain={plain}
      />
    </div>
  );
}

/** How an area's dots divide for the active lens: [count, colour], centre out. */
function dotParts(c: MapCell, q: string, facet: string, orgColor: Map<string, string>): [number, string][] {
  switch (q) {
    case "needs": case "act": return [[c.needs_help, C.flame], [Math.max(0, c.open_cases - c.needs_help), C.flameSoft]];
    case "care":
      if (facet === "vacc") return [[c.vacc_yes, C.care[3]], [c.vacc_unknown, "rgba(11,30,61,0.18)"]];
      if (facet === "treat") return [[Math.min(c.animals, c.care - (c.care_kinds.sterilisation ?? 0) - (c.care_kinds.vaccination ?? 0)), "#4b7f4f"]];
      return [[c.ster_yes, C.care[3]], [c.ster_no, C.ink], [c.ster_unknown, "rgba(11,30,61,0.18)"]];
    case "orgs": return c.orgs.map((o) => [o.a, (o.name && orgColor.get(o.name)) || "rgba(11,30,61,0.3)"] as [number, string]);
    case "gaps": return [[c.exact_loc, C.seq[3]], [c.animals - c.exact_loc, "rgba(11,30,61,0.22)"]];
    default: return facet === "photos" ? [[c.photos, C.seq[4]]] : facet === "residents" ? [[c.residents, C.seq[4]]]
      : [[c.ster_yes, DOT_KEY[0].color], [c.ster_no, DOT_KEY[1].color], [Math.max(0, c.animals - c.ster_yes - c.ster_no), DOT_KEY[2].color]];
  }
}

export { QUESTIONS };
