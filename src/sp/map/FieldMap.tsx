"use client";

/** Shared 2D Living Atlas: national city clusters, recorded areas and real
 * area records. Public coordinates remain generalised to their source area.
 * Landing, Explore and role workspaces share this foundation and scoped APIs. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { GeoJSONSource, Map as MLMap, MapGeoJSONFeature } from "maplibre-gl";
import { supportsWebGL2 } from "@/components/map/basemap";
import { foldMonths, orgPalette, question, type Ctx } from "@/lib/livingmap/questions";
import { headline, localities, placeName, tally } from "@/lib/livingmap/reading";
import type { MapArea, MapCity, NationalCell, NationalCity, Unplaced } from "@/lib/livingmap/types";
import { MR } from "@/lib/livingmap/types";
import { RECENCY, bucketOf, lastRecorded } from "../atlas/recency";
import { coreBounds, haversineKm, seedHead } from "../atlas/geo";
import { KINDS, cityEvidence, kindOf } from "../atlas/evidence";
import { LENSES, lensFigure, nationalMeasure, type LensId } from "../atlas/lenses";
import { GLYPHS, ORNAMENT, collapseAttribution, groundStyle, drawGround } from "./ground";
import { MARK } from "./marks";
import { Chrome, type Face, type Level } from "./Chrome";
import { MAP_LENSES, unitFor, type MapScope, type MapVariant } from "./lens";
import { getSupabase } from "@/lib/supabase";
import "./field-map.css";


const INDIA_BOX: [[number, number], [number, number]] = [[68.2, 6.4], [97.4, 35.6]];
const CITY_ZOOM = 7.6, ENTER_ZOOM = 8.6, PAW_ZOOM = 13.2, MAX_PAWS = 140;
/* Night inks: an undated area, and the dots of sterilisation as the record has them. */
const UNDATED_INK = "#53627f";
const DOT = { yes: "#1f6f80", no: "#f05b40", unknown: "#697b8d" };
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const travel = (t: number) => 1 - Math.pow(1 - t, 3);
const dur = (from: number, to: number) => (reduced() ? 0 : Math.min(1800, 600 + Math.abs(from - to) * 150));
/** Bloom size by zoom, × each area's own k (sized by its animals). */
const BLOOM_STOPS: [number, number][] = [[8, 10], [10, 17], [11, 24], [12, 36], [13, 54], [14, 96], [16, 300]];

/** A city rosette's diameter in px: by the lens's count, never smaller than a legible flower. */
export const rosetteD = (v: number, max: number, hollow: boolean) => (hollow ? 48 : 22 + (Math.sqrt(v) / Math.max(1, max)) * 64);

/** A read in the Map's scope: public, or an organisation's own records with its member's session. */
async function api(path: string, scope: MapScope): Promise<Response> {
  if (scope === "public") return fetch(path);
  const { data } = (await getSupabase()?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) return new Response(JSON.stringify({ error: "Sign in with your organisation to see its map." }), { status: 401 });
  return fetch(`${path}${path.includes("?") ? "&" : "?"}scope=org`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
}
const cityCache = new Map<string, Promise<MapCity | null>>();
const cacheKey = (scope: MapScope, city: string) => `${scope}:${city}`;
function readCity(city: string, scope: MapScope) {
  const key = cacheKey(scope, city);
  const hit = scope === "public" ? cityCache.get(key) : null; if (hit) return hit;
  const p = api(`/api/livingmap?city=${encodeURIComponent(city)}`, scope).then(async (r) => { if (r.status === 404) return null; if (!r.ok) throw new Error(String(r.status)); return (await r.json()) as MapCity; });
  // Private reads must never survive a change of authenticated organisation.
  if (scope === "public") { cityCache.set(key, p); p.catch(() => cityCache.delete(key)); }
  return p;
}

export function FieldMap({ variant = "community", scope = "public", lenses = MAP_LENSES, defaultLens = "animals", initialCities, initialUnplaced, embedded = false }: {
  embedded?: boolean; variant?: MapVariant; scope?: MapScope; lenses?: LensId[]; defaultLens?: LensId; initialCities?: NationalCity[]; initialUnplaced?: Unplaced[];
}) {
  const params = useSearchParams();
  const cameraRestored = useRef(false);
  const I = useRef({ city: embedded ? null : params.get("city"), lens: embedded ? null : params.get("lens"), area: embedded ? null : params.get("area"), animal: embedded ? null : params.get("animal"), place: embedded ? null : params.get("place"), view: embedded ? null : params.get("view"), lng: embedded ? null : params.get("lng"), lat: embedded ? null : params.get("lat"), z: embedded ? null : params.get("z") }).current;

  /* ── state ── */
  const [cities, setCities] = useState<NationalCity[]>(initialCities ?? []);
  const [unplaced, setUnplaced] = useState<Unplaced[]>(initialUnplaced ?? []);
  const [citiesState, setCitiesState] = useState<"ready" | "loading" | "error" | "auth">(initialCities?.length ? "ready" : "loading");
  const [national, setNational] = useState<NationalCell[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [city, setCity] = useState<string | null>(I.city);
  const [data, setData] = useState<MapCity | null>(null);
  const [cityState, setCityState] = useState<"idle" | "loading" | "error" | "missing">("idle");
  const [lens, setLens] = useState<LensId>(lenses.includes(I.lens as LensId) ? (I.lens as LensId) : defaultLens);
  const [areaH3, setAreaH3] = useState<string | null>(I.area);
  const [area, setArea] = useState<MapArea | null | "loading" | "error">(null);
  const [animalId, setAnimalId] = useState<string | null>(I.animal);
  const [spot, setSpot] = useState<{ id: string; cells: Set<string> } | null>(null);
  const [quiet, setQuiet] = useState(I.view === "quiet");
  const [zoom, setZoom] = useState(4);
  const [ready, setReady] = useState(false);
  const [inked, setInked] = useState(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; title: string; line: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [moved, setMoved] = useState(0);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const pendingPaw = useRef<number | null>(null);
  const pendingPlace = useRef<string | null>(I.place);

  const L = LENSES[lens];
  const q = question(L.q);
  const facet = L.facet ?? (q.facets?.[0]?.id ?? "all");
  const level: Level = !city ? "india" : animalId ? "animal" : areaH3 ? "area" : "city";
  const clinical = !!city && kindOf(city, cities.find((c) => c.city === city)?.cells ?? 2) === "clinical";

  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const userMove = useRef(false);
  const lastCam = useRef("");
  const preserveCameraFor = useRef<string | null>(null);
  const htmlEls = useRef<{ regions: HTMLElement[]; cities: Map<string, HTMLElement>; places: HTMLElement[] }>({ regions: [], cities: new Map(), places: [] });
  const ml = useRef<typeof import("maplibre-gl") | null>(null);

  /* ── reads ── */
  useEffect(() => {
    if (initialCities?.length) return;
    let live = true;
    const read = (left: number): void => {
      api("/api/livingmap?kind=cities", scope).then((r) => (r.status === 401 ? "auth" : r.status === 402 ? Promise.reject(new Error("quota-exceeded")) : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j) => { if (!live) return; if (j === "auth") { setCitiesState("auth"); return; } setCities(j.cities ?? []); setUnplaced(j.unplaced ?? []); setCitiesState("ready"); })
        .catch((error) => { if (!live) return; if (String(error).includes("quota-exceeded")) { setCitiesState("error"); return; } if (left > 0) window.setTimeout(() => read(left - 1), 1200); else setCitiesState("error"); });
    };
    read(2);
    return () => { live = false; };
  }, [initialCities, scope]);
  /* India's recorded areas and its faces are public; an organisation's map stays its own. */
  useEffect(() => {
    if (scope !== "public") return;
    let live = true;
    fetch("/api/livingmap?kind=national").then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j?.cells) setNational(j.cells); }).catch(() => {});
    fetch("/api/livingmap?kind=faces").then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j?.faces) setFaces(j.faces); }).catch(() => {});
    return () => { live = false; };
  }, [scope]);
  useEffect(() => {
    setSpot(null);
    if (!city || clinical) { setData(null); setCityState("idle"); return; }
    let live = true;
    setCityState("loading");
    readCity(city, scope).then((d) => { if (live) { setData(d); setCityState(d ? "idle" : "missing"); } }).catch(() => { if (live) { setData(null); setCityState("error"); } });
    return () => { live = false; };
  }, [city, clinical, scope]);
  useEffect(() => {
    if (!city || !areaH3) { setArea(null); return; }
    let live = true;
    setArea("loading");
    api(`/api/livingmap?kind=area&city=${encodeURIComponent(city)}&h3=${areaH3}`, scope)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).then((a: MapArea) => {
        if (!live) return;
        setArea(a);
        const j = pendingPaw.current; pendingPaw.current = null;
        if (j !== null && a.animals[j]) setAnimalId(a.animals[j].id);
      })
      .catch(() => { if (live) setArea("error"); });
    return () => { live = false; };
  }, [city, areaH3, scope]);

  /* ── the reading ── */
  const cells = useMemo(() => data?.cells ?? [], [data]);
  const centers = useMemo(() => cells.map((c) => c.c), [cells]);
  const orgColor = useMemo(() => orgPalette(cells), [cells]);
  const ctx: Ctx = useMemo(() => ({ range: null, inRange: data ? foldMonths(data.months, cells.length, null) : null, orgColor, today: Date.now() }), [data, cells.length, orgColor]);
  const classes = useMemo(() => q.classes(facet, ctx), [q, facet, ctx]);
  const { tally: counts, classOf } = useMemo(() => tally(cells, q, facet, ctx), [cells, q, facet, ctx]);
  const reading = useMemo(() => (cells.length ? headline(q, facet, ctx, cells, counts) : null), [q, facet, ctx, cells, counts]);
  const places = useMemo(() => localities(cells, centers, q, facet, ctx), [cells, centers, q, facet, ctx]);
  const areaIndex = areaH3 ? cells.findIndex((c) => c.h3 === areaH3) : -1;
  const months = useMemo(() => {
    if (!data?.months.length) return [] as { m: number; opened: number; care: number }[];
    const by = new Map<number, { m: number; opened: number; care: number }>();
    for (const r of data.months) { const x = by.get(r[MR.m]) ?? { m: r[MR.m], opened: 0, care: 0 }; x.opened += r[MR.opened]; x.care += r[MR.care]; by.set(r[MR.m], x); }
    const ms = [...by.keys()]; const lo = Math.min(...ms), hi = Math.max(...ms);
    const out = []; for (let m = Math.max(lo, hi - 59); m <= hi; m++) out.push(by.get(m) ?? { m, opened: 0, care: 0 });
    return out;
  }, [data]);
  const animalsRecency = lens === "animals";

  /* ── the map ── */
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (!supportsWebGL2()) { setMapError("This browser cannot draw the interactive map. Search and the city list still work."); return; }
    let dead = false, map: MLMap | null = null;
    import("maplibre-gl").then((lib) => {
      if (dead || !el.current) return;
      ml.current = lib;
      lib.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new lib.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, bounds: INDIA_BOX, fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: node.clientWidth < 900, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · Natural Earth · H3" }, maxPitch: 0, pitch: 0, bearing: 0, maxZoom: 18, minZoom: 2 });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __map?: MLMap }).__map = map;
      map.touchZoomRotate.disableRotation();
      map.dragRotate.disable();
      map.touchPitch.disable();
      map.scrollZoom.setWheelZoomRate(1 / 500);
      if (embedded) { map.scrollZoom.disable(); map.dragPan.disable(); map.on("click", () => { map?.dragPan.enable(); }); }
      const resize = new ResizeObserver(() => map?.resize()); resize.observe(node);
      map.on("remove", () => resize.disconnect());
      map.on("error", (e) => { if (/webgl|context/i.test(e.error?.message ?? "")) setMapError("This browser cannot draw the interactive map. Search and the city list still work."); });
      map.on("load", () => {
        const m = map!;
        const empty = { type: "FeatureCollection" as const, features: [] };
        for (const s of ["nat", "cities", "edge", "areas", "paws", "sel", "spot", "nums"]) m.addSource(s, { type: "geojson", data: empty });
        const zr = (k: number) => ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", ["get", "k"], ["get", "g"], (px / 2) * k]])] as never;
        /* India: every recorded area a glow, every city a point of light. */
        m.addLayer({ id: "nat-glow", type: "circle", source: "nat", maxzoom: 8.4, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["*", ["get", "r"], 2.2], 7, ["*", ["get", "r"], 4]], "circle-color": ["get", "color"], "circle-blur": 0.4, "circle-opacity": 0.12, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "nat", type: "circle", source: "nat", maxzoom: 8.4, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], 0.6], 7, ["*", ["get", "r"], 1.2]], "circle-color": ["get", "color"], "circle-opacity": ["case", ["==", ["get", "u"], 1], 0.35, 1], "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "edge", type: "circle", source: "edge", minzoom: 10.5, paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, px * 0.42])] as never, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "rgba(11,30,61,0.2)", "circle-stroke-width": 1, "circle-pitch-alignment": "map" } });
        /* The areas themselves, for touch and hover: a faint disc on the ground under each column. */
        m.addLayer({ id: "areas", type: "circle", source: "areas", paint: { "circle-radius": zr(1), "circle-color": ["get", "color"], "circle-blur": 0.08, "circle-pitch-alignment": "map",
          "circle-opacity": ["*", ["case", ["==", ["get", "dim"], 1], 0.3, 1], ["interpolate", ["linear"], ["zoom"], 8, 0.52, PAW_ZOOM, 0.28]] } });
        /* A lit finding rings the areas it rests on, in turmeric; nothing else changes meaning. */
        m.addLayer({ id: "spot", type: "circle", source: "spot", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px * 0.55 + 3]])] as never, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f2b632", "circle-stroke-width": 2.2, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", ["get", "g"], px * 0.62 + 6]])] as never, "circle-color": "rgba(143,176,255,0.12)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 2.5, "circle-stroke-opacity": 0.95, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "nums", type: "symbol", source: "nums", minzoom: 11.4, layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11.4, 10, 13, 13], "text-allow-overlap": false, "text-padding": 1 }, paint: { "text-color": "#0b1e3d", "text-halo-color": "#fffdf9", "text-halo-width": 1.6, "text-opacity": ["interpolate", ["linear"], ["zoom"], 11.4, 0, 11.8, 1] } });
        /* Neighbourhood: one dot per recorded animal, arranged in its area. A photographed animal is ringed in white. */
        m.addLayer({ id: "paws", type: "circle", source: "paws", minzoom: PAW_ZOOM - 0.6, paint: {
          "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 13, ["*", ["get", "s"], 3.4], 15, ["*", ["get", "s"], 6.5], 17, ["*", ["get", "s"], 10]],
          "circle-color": ["get", "col"], "circle-stroke-color": ["case", ["==", ["get", "ph"], 1], "#ffffff", "rgba(7,20,43,0.9)"], "circle-stroke-width": ["case", ["==", ["get", "ch"], 1], 3, ["==", ["get", "ph"], 1], 1.8, 1],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], PAW_ZOOM - 0.6, 0, PAW_ZOOM + 0.1, 1], "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], PAW_ZOOM - 0.6, 0, PAW_ZOOM + 0.1, 1] } });
        m.addLayer({ id: "cities-glow", type: "circle", source: "cities", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], ["get", "g"], 1.5], 8, ["*", ["get", "r"], ["get", "g"], 2.2]], "circle-color": ["get", "col"], "circle-blur": 0.4, "circle-opacity": 0.12 } });
        m.addLayer({ id: "cities", type: "circle", source: "cities", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], ["get", "g"], 0.42], 8, ["*", ["get", "r"], ["get", "g"], 0.62]],
          "circle-color": ["case", ["==", ["get", "hol"], 1], "rgba(0,0,0,0)", ["get", "col"]], "circle-stroke-color": "#fffdf9", "circle-stroke-width": ["case", ["==", ["get", "hol"], 1], 1.5, 1.2], "circle-stroke-opacity": 0.85 } });

        const tip = (e: { features?: MapGeoJSONFeature[]; point: { x: number; y: number } }) => {
          if (window.matchMedia("(hover: none)").matches) return;
          const f = e.features?.[0]; if (!f) return;
          setHover({ x: e.point.x, y: e.point.y, title: String(f.properties?.title ?? ""), line: String(f.properties?.line ?? "") });
        };
        for (const id of ["areas", "cities", "paws"]) {
          m.on("mousemove", id, tip);
          m.on("mouseleave", id, () => { setHover(null); m.getCanvas().style.cursor = ""; });
          m.on("mouseenter", id, () => { m.getCanvas().style.cursor = "pointer"; });
        }
        m.on("click", (e) => onMapClick(m, e.point));
        m.on("movestart", (e) => { userMove.current = !!(e as { originalEvent?: unknown }).originalEvent; setHover(null); setMoving(true); });
        m.on("moveend", () => { setZoom(m.getZoom()); const c = m.getCenter(); setCenter([c.lng, c.lat]); setMoved((n) => n + 1); setMoving(false); });
        drawGround(m, "nat-glow").then(() => setInked(n => n + 1)).catch(() => {});
        collapseAttribution(m);
        setZoom(m.getZoom());
        setReady(true);
      });
    }).catch(() => setMapError("The map could not start. Search and the city list still work."));
    return () => { dead = true; map?.remove(); mapRef.current = null; setReady(false); };
    // Built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Quiet view: the evidence on plain paper, without the national ornament. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    for (const id of ORNAMENT) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", quiet ? "none" : "visible");
  }, [quiet, ready, inked]);

  const live = useRef({ cells, city, area, level });
  live.current = { cells, city, area, level };
  const onMapClick = (m: MLMap, p: { x: number; y: number }) => {
    const hit = m.queryRenderedFeatures([[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]], { layers: ["paws", "cities", "areas"].filter((l) => m.getLayer(l)) });
    const dist = (h: MapGeoJSONFeature) => { const q2 = m.project((h.geometry as GeoJSON.Point).coordinates as [number, number]); return (q2.x - p.x) ** 2 + (q2.y - p.y) ** 2; };
    const Lc = live.current;
    const pawHit = hit.filter((h) => h.layer.id === "paws").sort((a, b) => dist(a) - dist(b))[0];
    if (pawHit && Lc.city) {
      const id = pawHit.properties?.id as string | undefined, i = pawHit.properties?.i as number, j = pawHit.properties?.j as number;
      const c = Lc.cells[i]; if (!c) return;
      if (id) { setAreaH3(c.h3); setAnimalId(id); return; }
      pendingPaw.current = j; setAnimalId(null); setAreaH3(c.h3); return;
    }
    const cityHit = hit.filter((h) => h.layer.id === "cities").sort((a, b) => dist(a) - dist(b))[0];
    if (cityHit) { openCity(String(cityHit.properties?.name)); return; }
    const areaHit = hit.filter((h) => h.layer.id === "areas").sort((a, b) => dist(a) - dist(b))[0];
    if (areaHit && Lc.city) { const c = Lc.cells[areaHit.properties?.i as number]; if (c) { setAreaH3(c.h3); setAnimalId(null); } return; }
    if (Lc.level === "animal") setAnimalId(null);
    else if (Lc.level === "area") setAreaH3(null);
  };

  const openCity = useCallback((name: string, opts?: { area?: string; animal?: string }) => {
    setCity(name); setAreaH3(opts?.area ?? null); setAnimalId(opts?.animal ?? null); setPicking(false);
  }, []);
  const goIndia = useCallback(() => { setCity(null); setAreaH3(null); setAnimalId(null); }, []);
  const up = useCallback(() => { if (animalId) setAnimalId(null); else if (areaH3) setAreaH3(null); else if (city) goIndia(); }, [animalId, areaH3, city, goIndia]);

  /* ?place=: once the city is read, open that locality's busiest area. */
  useEffect(() => {
    const want = pendingPlace.current?.trim().toLowerCase();
    if (!want || !data) return;
    pendingPlace.current = null;
    const hit = data.cells.filter((c) => placeName(c.zone).toLowerCase() === want).sort((a, b) => b.animals - a.animals)[0];
    if (hit) setAreaH3(hit.h3);
  }, [data]);

  /* Zoom is navigation: out past a city returns to India; in near a city opens it. */
  useEffect(() => {
    if (!ready || !userMove.current) return;
    const m = mapRef.current; if (!m) return;
    if (city && zoom < CITY_ZOOM - 1) { goIndia(); return; }
    if (zoom >= ENTER_ZOOM && cities.length) {
      const c = m.getCenter();
      const near = cities.filter((x) => typeof x.lng === "number").map((x) => ({ x, d: haversineKm([c.lng, c.lat], [x.lng!, x.lat!]) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 45 && near.x.city !== city) { preserveCameraFor.current = near.x.city; userMove.current = false; openCity(near.x.city); }
    }
  }, [zoom, ready, city, cities, goIndia, openCity]);

  /* ── growth: marks bloom outward when a scale opens (a cut under reduced motion) ── */
  const growRef = useRef<{ cities: number; areas: number }>({ cities: 1, areas: 1 });
  /* Marks appear in place: the camera's travel is the only motion. */
  const grow = useCallback((key: "cities" | "areas", repaint: () => void) => { growRef.current[key] = 1; repaint(); }, []);

  /* ── paint: India ── */
  const cityFeatures = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    const show = level === "india";
    const vals = cities.map((c) => nationalMeasure(lens, c));
    const max = Math.sqrt(Math.max(1, ...cities.map((c, i) => (kindOf(c.city, c.cells) === "clinical" ? 0 : vals[i]))));
    const order = cities.map((c, i) => ({ c, v: vals[i] })).sort((a, b) => b.v - a.v).map((x) => x.c.city);
    const g = growRef.current.cities;
    (m.getSource("cities") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: show ? cities.flatMap((c, i) => {
      if (typeof c.lng !== "number" || typeof c.lat !== "number") return [];
      const k = kindOf(c.city, c.cells), hollow = k === "clinical", v = hollow ? c.animals : vals[i];
      if (!v && !hollow) return [];
      const rank = order.indexOf(c.city) / Math.max(1, cities.length);
      const d = rosetteD(hollow ? 0 : v, max, hollow);
      const col = lens === "animals" ? "#2457ce" : L.ink;
      const fig = v.toLocaleString("en-IN");
      return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: {
        name: c.city, col, hol: hollow ? 1 : 0, r: d / 2, g: Math.max(0, Math.min(1, g * 1.5 - rank * 0.5)), sort: -v,
        title: c.city, line: hollow ? `${fig} animals in a city-level clinical register · not mapped by street` : `${fig} ${unitFor(lens, v)} · ${KINDS[k].label.toLowerCase()}`,
      } }];
    }) : [] });
  }, [cities, level, lens, L.ink]);
  useEffect(() => { if (ready) cityFeatures(); }, [ready, cityFeatures]);
  const grewCities = useRef(false);
  useEffect(() => { if (ready && cities.length && level === "india" && !grewCities.current) { grewCities.current = true; grow("cities", cityFeatures); } }, [ready, cities.length, level, grow, cityFeatures]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const now = Date.now();
    (m.getSource("nat") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: level === "india" && lens === "animals" ? national.map(([lng, lat, a, last]) => {
      const b = bucketOf(last, now);
      return { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lng, lat] }, properties: { r: 1.8 + Math.min(4.2, Math.sqrt(a) * 0.45), color: b?.color ?? "#697b8d", u: b ? 0 : 1 } };
    }) : [] });
  }, [ready, national, level, lens]);

  /* ── paint: city ── */
  const areaFeatures = useCallback(() => {
    const m = mapRef.current; if (!m) return;
    const set = (id: string, features: GeoJSON.Feature[]) => (m.getSource(id) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
    if (!city || !cells.length) { for (const s of ["areas", "edge", "paws", "nums"]) set(s, []); return; }
    const byId = new Map(classes.map((k) => [k.id, k]));
    const now = Date.now(), maxA = Math.sqrt(Math.max(1, ...cells.map((c) => c.animals)));
    const mid = centers.reduce((a, c) => [a[0] + c[0] / centers.length, a[1] + c[1] / centers.length], [0, 0]);
    const far = Math.max(0.01, ...centers.map((c) => Math.hypot(c[0] - mid[0], c[1] - mid[1])));
    const g0 = growRef.current.areas;
    const pt = (c: [number, number], p: Record<string, unknown>): GeoJSON.Feature => ({ type: "Feature", geometry: { type: "Point", coordinates: c }, properties: p });
    set("areas", cells.map((c, i) => {
      const dist = Math.hypot(centers[i][0] - mid[0], centers[i][1] - mid[1]) / far;
      const g = Math.max(0, Math.min(1, g0 * 1.6 - dist * 0.6));
      const k = 0.55 + (Math.sqrt(c.animals) / maxA) * 0.75;
      if (animalsRecency) {
        const rb = bucketOf(lastRecorded(c), now);
        return pt(centers[i], { i, k, g, color: rb ? rb.color : UNDATED_INK, n: Math.sqrt(c.animals) / maxA, sort: -c.animals, dim: (areaH3 && areaH3 !== c.h3 && level !== "city") || (spot && level === "city" && !spot.cells.has(c.h3)) ? 1 : 0,
          title: placeName(c.zone), line: `${c.animals.toLocaleString("en-IN")} animals · last recorded ${rb ? rb.label.toLowerCase() : "on no recorded date"}` });
      }
      const kl = byId.get(classOf[i]); const v = q.measure(c, facet, ctx, i);
      const fill = kl?.kind === "unknown" ? UNDATED_INK : kl?.kind === "zero" ? "#2a3b5c" : kl?.color ?? "#2a3b5c";
      return pt(centers[i], { i, k: kl?.kind === "value" ? k : k * 0.7, g, color: fill, n: Math.sqrt(c.animals) / maxA, sort: -(v || 0), dim: (areaH3 && areaH3 !== c.h3 && level !== "city") || (spot && level === "city" && !spot.cells.has(c.h3)) ? 1 : 0,
        title: placeName(c.zone), line: `${kl?.label ?? ""}${v ? ` · ${v.toLocaleString("en-IN")} ${q.unit(facet)}` : ""}` });
    }));
    set("nums", cells.flatMap((c, i) => {
      const v = animalsRecency ? c.animals : q.measure(c, facet, ctx, i); if (!v) return [];
      return [pt(centers[i], { t: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) })];
    }));
    set("edge", (data?.edge ?? []).map((e) => pt(e, {})));
    /* Only loaded individual records receive markers. Their public positions
       are schematic within the disclosed area, never invented GPS fixes. */
    const sel = area && area !== "loading" && area !== "error" ? area : null;
    const paws: GeoJSON.Feature[] = [];
    const i = sel ? cells.findIndex(c => c.h3 === sel.h3) : -1;
    if (sel && i >= 0) {
      const records = sel.animals.slice(0, MAX_PAWS);
      seedHead(centers[i], records.length).forEach((p, j) => {
        const a = records[j], chosen = a.id === animalId;
        paws.push(pt(p, { i, j, id: a.id, col: a.ster === "sterilised" ? DOT.yes : a.ster === "not_sterilised" ? DOT.no : DOT.unknown,
          ph: a.photo ? 1 : 0, ch: chosen ? 1 : 0, s: chosen ? 1.6 : a.photo ? 1.25 : 1,
          title: a.title, line: "Recorded in this area. Marker position is approximate." }));
      });
    }
    set("paws", paws);
  }, [city, cells, centers, classes, classOf, q, facet, ctx, data, animalsRecency, area, animalId, areaH3, level, spot]);
  useEffect(() => { if (ready) areaFeatures(); }, [ready, areaFeatures]);
  const grewFor = useRef<string | null>(null);
  useEffect(() => { if (ready && data && grewFor.current !== data.city) { grewFor.current = data.city; grow("areas", areaFeatures); } }, [ready, data, grow, areaFeatures]);

  /* Selection ring, drawn in once. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("sel") as GeoJSONSource | undefined; if (!src) return;
    if (areaIndex < 0) { src.setData({ type: "FeatureCollection", features: [] }); return; }
    const c = cells[areaIndex], k = 0.55 + (Math.sqrt(c.animals) / Math.sqrt(Math.max(1, ...cells.map((x) => x.animals)))) * 0.75;
    const paint = (g: number) => src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: centers[areaIndex] }, properties: { g: k * g } }] });
    paint(1);
  }, [ready, areaIndex, cells, centers]);

  /* A lit finding: ring its areas and bring them into view; the rest of the city stays, dimmed. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("spot") as GeoJSONSource | undefined; if (!src) return;
    const on = spot && level === "city" ? cells.flatMap((c, i) => (spot.cells.has(c.h3) ? [i] : [])) : [];
    const maxA = Math.sqrt(Math.max(1, ...cells.map((x) => x.animals)));
    src.setData({ type: "FeatureCollection", features: on.map((i) => ({ type: "Feature", geometry: { type: "Point", coordinates: centers[i] }, properties: { k: 0.55 + (Math.sqrt(cells[i].animals) / maxA) * 0.75 } })) });
    if (!on.length) return;
    const pts = on.map((i) => centers[i]);
    const lng = pts.map((p) => p[0]), lat = pts.map((p) => p[1]), d = 0.01;
    userMove.current = false;
    m.fitBounds([[Math.min(...lng) - d, Math.min(...lat) - d], [Math.max(...lng) + d, Math.max(...lat) + d]], { padding: pad(), maxZoom: 12.8, duration: dur(m.getZoom(), 12.8), easing: travel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, spot, level, cells, centers]);

  /* ── HTML lettering: city names at national scale, localities at city scale ──
     Each marker's root is a bare wrapper (MapLibre writes inline opacity on it);
     fades and collisions act on the lettering inside. */
  const mark = useCallback((child: HTMLElement, at: [number, number], anchor: "top" | "center", offset: [number, number] = [0, 0]) => {
    const m = mapRef.current, lib = ml.current; if (!m || !lib) return child;
    const root = document.createElement("div"); root.className = "fm-mk"; root.appendChild(child);
    new lib.Marker({ element: root, anchor, offset }).setLngLat(at).addTo(m);
    return child;
  }, []);
  const unmark = (els: Iterable<HTMLElement>) => { for (const e of els) e.parentElement?.remove(); };
  useEffect(() => {
    if (!ready) return;
    const E = htmlEls.current;
    unmark(E.cities.values()); E.cities.clear();
    if (level !== "india") return;
    const vals = cities.map((c) => (kindOf(c.city, c.cells) === "clinical" ? c.animals : nationalMeasure(lens, c)));
    const max = Math.sqrt(Math.max(1, ...cities.map((c, i) => (kindOf(c.city, c.cells) === "clinical" ? 0 : vals[i]))));
    /* A city-level register is lettered after the street cities it would otherwise crowd out. */
    const weight = (c: NationalCity, v: number) => (kindOf(c.city, c.cells) === "clinical" ? v / 8 : v);
    const ranked = cities.map((c, i) => ({ c, v: vals[i] })).filter((x) => x.v > 0 && typeof x.c.lng === "number").sort((a, b) => weight(b.c, b.v) - weight(a.c, a.v));
    ranked.forEach(({ c, v }, r) => {
      const hollow = kindOf(c.city, c.cells) === "clinical";
      const d = rosetteD(hollow ? 0 : v, max, hollow);
      const e = document.createElement("button");
      e.type = "button";
      e.className = `fm-city${r < 6 ? " is-major" : ""}${hollow ? " is-hollow" : ""}`;
      e.style.setProperty("--off", `${Math.round(d * 0.5 + 4)}px`);
      e.style.setProperty("--i", String(r));
      e.innerHTML = `<b></b><small></small>`;
      e.querySelector("b")!.textContent = c.city;
      e.querySelector("small")!.textContent = hollow ? `${v.toLocaleString("en-IN")} · city-level register` : `${v.toLocaleString("en-IN")} ${unitFor(lens, v)}`;
      e.setAttribute("aria-label", `${c.city}: ${e.querySelector("small")!.textContent}. Open the city.`);
      e.addEventListener("click", (ev) => { ev.stopPropagation(); openCity(c.city); });
      E.cities.set(c.city, mark(e, [c.lng!, c.lat!], "top"));
    });
    return () => { unmark(E.cities.values()); E.cities.clear(); };
  }, [ready, cities, level, lens, openCity, mark]);

  useEffect(() => {
    if (!ready) return;
    const E = htmlEls.current;
    unmark(E.places); E.places = [];
    if (!city || clinical || !places.length) return;
    E.places = places.slice(0, 24).map((p, r) => {
      const e = document.createElement("div");
      e.className = `fm-place${r < 6 ? " is-major" : ""}`;
      e.setAttribute("aria-hidden", "true");
      e.textContent = p.name;
      e.style.setProperty("--i", String(r));
      return mark(e, p.center, "center", [0, -20]);
    });
    return () => { unmark(E.places); E.places = []; };
  }, [ready, city, clinical, places, mark]);

  /* Lettering follows the scale; in rank order, a name that would overprint one already set steps back. */
  useEffect(() => {
    const E = htmlEls.current;
    for (const e of E.regions) e.classList.toggle("is-on", !quiet && level === "india" && zoom < 7);
    for (const e of E.cities.values()) e.classList.toggle("is-on", zoom < 8.2 && (e.classList.contains("is-major") || zoom > 5.2));
    for (const e of E.places) e.classList.toggle("is-on", zoom > 10.4 && zoom < 15.6 && (e.classList.contains("is-major") || zoom > 11.6));
    const id = requestAnimationFrame(() => {
      const placed: DOMRect[] = [];
      const hit = (r: DOMRect) => placed.some((q) => r.left < q.right + 3 && r.right > q.left - 3 && r.top < q.bottom + 1 && r.bottom > q.top - 1);
      for (const e of [...E.cities.values(), ...E.places]) {
        e.classList.remove("is-crowded");
        if (!e.classList.contains("is-on")) continue;
        const r = e.getBoundingClientRect(); if (!r.width) continue;
        if (hit(r)) e.classList.add("is-crowded"); else placed.push(r);
      }
      for (const e of E.regions) {
        e.classList.remove("is-crowded");
        if (!e.classList.contains("is-on")) continue;
        const r = (e.firstElementChild as HTMLElement).getBoundingClientRect();
        if (hit(r)) e.classList.add("is-crowded");
      }
    });
    return () => cancelAnimationFrame(id);
  }, [zoom, moved, level, quiet, ready, cities, places]);

  /* Stamps: a few photographed animals set in the sea margins, each threaded to its city. */
  const [moving, setMoving] = useState(false);
  const stamps = useMemo(() => {
    const m = mapRef.current;
    if (!m || !ready || level !== "india" || zoom > 6.2 || !faces.length) return [];
    const w = el.current?.clientWidth ?? 1200, h = el.current?.clientHeight ?? 800, phone = w < 900;
    /* On a phone the sea margin is too narrow to hold stamps without covering the coast; the sheet carries them. */
    if (phone) return [];
    const size = 76, gap = 16;
    const pick = faces.slice(0, 8);
    const cols = { w: pick.filter((f) => f.c[0] < 80.5).sort((a, b) => b.c[1] - a.c[1]), e: pick.filter((f) => f.c[0] >= 80.5).sort((a, b) => b.c[1] - a.c[1]) };
    const out: { f: Face; x: number; y: number; to: [number, number]; side: "w" | "e"; i: number }[] = [];
    (["w", "e"] as const).forEach((side) => {
      const list = cols[side]; if (!list.length) return;
      const xRef = m.project(side === "w" ? [65.6, 15] : [91.6, 14]);
      const yTop = m.project([0, side === "w" ? 21.5 : 19.5]).y;
      const x = Math.max(12, Math.min(w - size - 12, side === "w" ? xRef.x - size : xRef.x));
      list.forEach((f, k) => {
        const y = Math.min(h - size - 90, yTop + k * (size + 26 + gap));
        const p = m.project(f.c);
        out.push({ f, x, y, to: [p.x, p.y], side, i: out.length });
      });
    });
    return out;
    // `moved` repositions after every camera stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, level, zoom, moved, faces]);
  /* ── camera ── */
  const pad = useCallback(() => {
    const w = el.current?.clientWidth ?? 1200, h = el.current?.clientHeight ?? 800;
    const card = level !== "india";
    return w > 900 ? { top: 120, bottom: 110, left: 40, right: card ? 480 : 40 } : { top: 140, bottom: Math.round(h * (card ? 0.46 : 0.2)), left: 16, right: 16 };
  }, [level]);
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const key = `${level === "animal" ? "area" : level}:${city}:${areaH3}:${cells.length}:${clinical}`;
    if (key === lastCam.current) return;
    if (city && preserveCameraFor.current === city) {
      if (!cells.length && !clinical) return;
      lastCam.current = key; preserveCameraFor.current = null; return;
    }
    if (!embedded && !cameraRestored.current && (!city || cells.length || clinical)) {
      cameraRestored.current = true;
      const lng = Number(I.lng), lat = Number(I.lat), z = Number(I.z);
      if (I.lng && I.lat && I.z && Number.isFinite(lng) && Number.isFinite(lat) && Number.isFinite(z) && lng >= 60 && lng <= 105 && lat >= 0 && lat <= 40 && z >= 2 && z <= 18) {
        lastCam.current = key; m.jumpTo({ center: [lng, lat], zoom: z, pitch: 0, bearing: 0 }); return;
      }
    }
    lastCam.current = key; userMove.current = false;
    if (level === "india") { const cam = m.cameraForBounds(INDIA_BOX, { padding: pad() }); m.flyTo({ ...cam, pitch: 0, bearing: 0, duration: dur(m.getZoom(), 4.2), easing: travel }); return; }
    if (clinical) { const c = cities.find((x) => x.city === city); if (c?.lng) m.flyTo({ center: [c.lng, c.lat!], zoom: 10, duration: dur(m.getZoom(), 10), easing: travel, padding: pad() }); return; }
    if (!cells.length) return;
    if ((level === "area" || level === "animal") && areaIndex >= 0) {
      const zz = Math.max(14.6, Math.min(m.getZoom(), 15.6));
      m.flyTo({ center: centers[areaIndex], zoom: zz, pitch: 0, bearing: 0, padding: pad(), duration: dur(m.getZoom(), zz), easing: travel });
      return;
    }
    const b = coreBounds(centers);
    /* Fit the real geographic extent without tilting or rotating the street map. */
    const cam = m.cameraForBounds(b, { padding: pad(), maxZoom: 12.4 });
    const zz = cam?.zoom ?? 11;
    m.flyTo({ ...cam, zoom: zz, pitch: 0, bearing: 0, duration: dur(m.getZoom(), zz), easing: travel });
  }, [ready, level, city, areaH3, areaIndex, cells.length, centers, pad, cities, clinical, I.lng, I.lat, I.z, embedded]);

  const flyTo = useCallback((c: [number, number], zz = 14.6) => { const m = mapRef.current; if (!m) return; userMove.current = false; m.flyTo({ center: c, zoom: zz, padding: pad(), duration: dur(m.getZoom(), zz), easing: travel }); }, [pad]);
  const zoomBy = (d: number) => { const m = mapRef.current; if (m) { userMove.current = true; m.easeTo({ zoom: m.getZoom() + d, duration: reduced() ? 0 : 320 }); } };

  /* ── URL: shareable, restorable state ── */
  useEffect(() => {
    if (embedded) return;
    const p = new URLSearchParams();
    const map = mapRef.current;
    if (ready && map) { const c = map.getCenter(); p.set("lng", c.lng.toFixed(5)); p.set("lat", c.lat.toFixed(5)); p.set("z", map.getZoom().toFixed(2)); }
    if (city) p.set("city", city);
    if (lens !== defaultLens) p.set("lens", lens);
    if (areaH3) p.set("area", areaH3);
    if (animalId) p.set("animal", animalId);
    if (quiet) p.set("view", "quiet");
    const s = p.toString();
    window.history.replaceState(window.history.state, "", s ? `${window.location.pathname}?${s}` : window.location.pathname);
  }, [city, lens, areaH3, animalId, quiet, defaultLens, moved, ready, embedded]);

  /* Escape climbs one scale. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (embedded && !el.current?.parentElement?.contains(document.activeElement)) return;
      if (e.key !== "Escape" || (e.target as HTMLElement)?.closest("input, textarea, dialog")) return;
      if (picking) setPicking(false); else up();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [up, picking, embedded]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const at: [number, number] = [p.coords.longitude, p.coords.latitude];
      const near = cities.filter((x) => typeof x.lng === "number" && kindOf(x.city, x.cells) !== "clinical").map((x) => ({ x, d: haversineKm(at, [x.lng!, x.lat!]) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 60) { openCity(near.x.city); window.setTimeout(() => flyTo(at, 14), 900); }
      else flyTo(at, 12);
    }, () => {}, { enableHighAccuracy: false, timeout: 8000 });
  };

  const cityRow = city ? cities.find((c) => c.city === city) ?? null : null;
  const ev = city ? cityEvidence(city, cityRow?.cells ?? 2) : null;
  const fig = lensFigure(lens, level === "india" ? null : cells, level === "india" ? cities : null);

  return (
    <div className={`fm ${embedded ? "is-embedded" : ""} is-${variant} is-${level}${quiet ? " is-quiet" : ""}${picking ? " is-picking" : ""}`}>
      <div className="fm-map" ref={el} role="application" aria-label={`Map of ${city ?? "India"}. ${L.define} The card lists the same places and figures.`} />
      {stamps.length > 0 && (
        <div className={`fm-stamps${moving ? " is-moving" : ""}`}>
          <svg className="fm-threads" aria-hidden>{stamps.map((s2) => {
            const sx = s2.side === "w" ? s2.x + (el.current && el.current.clientWidth < 900 ? 58 : 76) : s2.x, sy = s2.y + 34;
            const mx = (sx + s2.to[0]) / 2;
            return <g key={s2.f.id}><path d={`M${sx},${sy} C${mx},${sy} ${mx},${s2.to[1]} ${s2.to[0]},${s2.to[1]}`} /><circle cx={s2.to[0]} cy={s2.to[1]} r={3.2} /></g>;
          })}</svg>
          {stamps.map((s2) => (
            <button key={s2.f.id} type="button" className="fm-stamp" style={{ left: s2.x, top: s2.y, ["--rot" as string]: `${(s2.i % 2 ? 1 : -1) * (2 + (s2.i % 3) * 1.5)}deg`, ["--i" as string]: s2.i }}
              aria-label={`${s2.f.title}, ${s2.f.describe ?? "an animal"} recorded in ${s2.f.city}. Open this animal.`} onClick={() => openCity(s2.f.city, { area: s2.f.h3, animal: s2.f.id })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s2.f.photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
              <span>{s2.f.title}</span><small>{s2.f.city}</small>
            </button>
          ))}
        </div>
      )}
      {hover && <div className="fm-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden><b>{hover.title}</b><span>{hover.line}</span></div>}
      <Chrome embedded={embedded}
        level={level} city={city} cityRow={cityRow} cities={cities} unplaced={unplaced} citiesState={citiesState} cityState={cityState} clinical={clinical} ev={ev}
        variant={variant} scope={scope} lenses={lenses} spot={spot?.id ?? null} onSpot={(id, list) => setSpot(id ? { id, cells: new Set(list) } : null)}
        lens={lens} setLens={setLens} fig={fig} reading={reading} places={places} cells={cells} centers={centers} months={months}
        area={area} areaIndex={areaIndex} animalId={animalId} faces={faces} zoom={zoom} quiet={quiet} setQuiet={setQuiet} mapError={mapError}
        picking={picking} setPicking={setPicking} center={center} recency={RECENCY}
        onPlace={(c, name) => { if (data?.city === c) { const hit = data.cells.filter((x) => placeName(x.zone).toLowerCase() === name.toLowerCase()).sort((a, b) => b.animals - a.animals)[0]; if (hit) { setAreaH3(hit.h3); setAnimalId(null); } } else { pendingPlace.current = name; openCity(c); } }}
        onIndia={goIndia} onCity={openCity} onArea={(h3) => { setAreaH3(h3); setAnimalId(null); }} onAnimal={(id) => setAnimalId(id)} onUp={up}
        onFly={flyTo} onZoom={zoomBy} onLocate={locate} onRetry={() => { const c = city; if (c) { cityCache.delete(cacheKey(scope, c)); setCity(null); window.setTimeout(() => setCity(c), 0); } }}
      />
    </div>
  );
}
