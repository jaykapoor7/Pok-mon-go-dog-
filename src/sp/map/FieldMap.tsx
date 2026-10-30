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
import { LENSES, lensFigure, nationalMeasure, needingHelp, type LensId } from "../atlas/lenses";
import { rememberHome, resolveHome } from "@/lib/home-city";
import { GLYPHS, ORNAMENT, collapseAttribution, groundStyle, drawGround } from "./ground";
import { MARK } from "./marks";
import { Chrome, type Face, type Level } from "./Chrome";
import { MAP_LENSES, unitFor, type MapScope, type MapVariant } from "./lens";
import { LOAD_ZOOM, NEED_INK, NEED_LABEL, needOf, type Need } from "./need";
import { getSupabase } from "@/lib/supabase";
import "./field-map.css";


const INDIA_BOX: [[number, number], [number, number]] = [[68.2, 6.4], [97.4, 35.6]];
const CITY_ZOOM = 7.6, ENTER_ZOOM = 8.6, PAW_ZOOM = 13.2;
/* Dots are the city view: they are drawn from the moment the city fits the
   screen (~10.4), so the reader sees animals, not circles, as the camera lands. */
const PAW_SHOW_LO = 9.4, PAW_SHOW_HI = 10.2;
/* One dot per animal the area read returns (it returns at most 60, most
   urgent first), and the same count before and after it is read, so a dot
   keeps its place when its record arrives. */
const PER_AREA = 60;
/* Night inks: an undated area, and care as the record has it. */
const UNDATED_INK = "#53627f";
const CARE = { yes: "#1f6f80", no: "#d0782a", unknown: "#9aa6b6" };
type DotMode = "need" | "help" | "open" | "ster" | "vacc";
/** How each lens paints the dots: by need, a need filter, or care. */
const dotMode = (l: LensId): DotMode => (l === "help" ? "help" : l === "requests" || l === "followups" ? "open" : l === "care" || l === "abc" ? "ster" : l === "arv" ? "vacc" : "need");
const careKey = (v: string | null, yes: string, no: string): keyof typeof CARE => (v === yes ? "yes" : v === no ? "no" : "unknown");
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* ease-in-out cubic: a soft take-off and a soft landing, so the India →
   city swoop never feels yanked. */
const travel = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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

export function FieldMap({ variant = "community", scope = "public", lenses = MAP_LENSES, defaultLens = "animals", initialCities, initialUnplaced, initialServerFailed = false, embedded = false }: {
  embedded?: boolean; variant?: MapVariant; scope?: MapScope; lenses?: LensId[]; defaultLens?: LensId; initialCities?: NationalCity[]; initialUnplaced?: Unplaced[]; initialServerFailed?: boolean;
}) {
  const params = useSearchParams();
  const cameraRestored = useRef(false);
  const I = useRef({ city: embedded ? null : params.get("city"), lens: embedded ? null : params.get("lens"), area: embedded ? null : params.get("area"), animal: embedded ? null : params.get("animal"), place: embedded ? null : params.get("place"), view: embedded ? null : params.get("view"), lng: embedded ? null : params.get("lng"), lat: embedded ? null : params.get("lat"), z: embedded ? null : params.get("z") }).current;

  /* ── state ── */
  const [cities, setCities] = useState<NationalCity[]>(initialCities ?? []);
  const [unplaced, setUnplaced] = useState<Unplaced[]>(initialUnplaced ?? []);
  /* The server's own snapshot read either returned rows ("ready"), returned
     nothing ("loading", because the client is about to retry live), or threw
     ("error", shown immediately so a reader never sees "no records" when the
     backend is down). */
  const [citiesState, setCitiesState] = useState<"ready" | "loading" | "error" | "auth">(initialCities?.length ? "ready" : initialServerFailed ? "error" : "loading");
  const [national, setNational] = useState<NationalCell[]>([]);
  const [faces, setFaces] = useState<Face[]>([]);
  const [city, setCity] = useState<string | null>(I.city);
  const [data, setData] = useState<MapCity | null>(null);
  const [cityState, setCityState] = useState<"idle" | "loading" | "error" | "missing">("idle");
  const [lens, setLens] = useState<LensId>(lenses.includes(I.lens as LensId) ? (I.lens as LensId) : defaultLens);
  const [areaH3, setAreaH3] = useState<string | null>(I.area);
  /* Every area read in this city, so dots across the neighbourhood are real
     animals; kept per map (never shared), so a private read stays private. */
  const [areas, setAreas] = useState<Map<string, MapArea | "loading" | "error">>(() => new Map());
  const [animalId, setAnimalId] = useState<string | null>(I.animal);
  /* A dot was tapped before its area was read: show the animal as reading. */
  const [pendingDog, setPendingDog] = useState(false);
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
  /* Where a tapped dot sits, so the camera brings that animal into view. */
  const pickAt = useRef<[number, number] | null>(null);
  const dogFromDot = useRef(false);
  /* Closing an animal tapped on the map leaves the reader where they were. */
  const holdCamera = useRef(false);

  const L = LENSES[lens];
  const q = question(L.q);
  const facet = L.facet ?? (q.facets?.[0]?.id ?? "all");
  const level: Level = !city ? "india" : animalId || pendingDog ? "animal" : areaH3 ? "area" : "city";
  const area: MapArea | null | "loading" | "error" = areaH3 ? areas.get(areaH3) ?? "loading" : null;
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
    /* When the server read also fails and set initialServerFailed, the UI is
       already in "error" state so the reader sees the true cause while we
       retry quietly in the background; a success flips it back to "ready". */
    const read = (left: number): void => {
      api("/api/livingmap?kind=cities", scope).then((r) => (r.status === 401 ? "auth" : r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((j) => { if (!live) return; if (j === "auth") { setCitiesState("auth"); return; } setCities(j.cities ?? []); setUnplaced(j.unplaced ?? []); setCitiesState("ready"); })
        .catch(() => { if (!live) return; if (left > 0) window.setTimeout(() => read(left - 1), 1200); else setCitiesState("error"); });
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
  /* ── areas: read on demand, six at a time, never twice ── */
  const gen = useRef(0);
  const asked = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
  const active = useRef(0);
  const readFor = useRef({ city, scope });
  readFor.current = { city, scope };
  useEffect(() => { gen.current++; asked.current.clear(); queue.current = []; setAreas(new Map()); }, [city, scope]);
  const pump = useCallback(() => {
    while (active.current < 6 && queue.current.length) {
      const h3 = queue.current.shift()!;
      const { city: c, scope: s } = readFor.current; const g = gen.current;
      if (!c) continue;
      active.current++;
      api(`/api/livingmap?kind=area&city=${encodeURIComponent(c)}&h3=${h3}`, s)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((a: MapArea) => { if (g === gen.current) setAreas((m) => new Map(m).set(h3, a)); })
        .catch(() => { if (g === gen.current) { asked.current.delete(h3); setAreas((m) => new Map(m).set(h3, "error")); } })
        .finally(() => { active.current--; pump(); });
    }
  }, []);
  /** Read an area; the chosen one jumps the queue. */
  const loadArea = useCallback((h3: string, first = false) => {
    if (asked.current.has(h3)) return;
    asked.current.add(h3);
    setAreas((m) => (m.has(h3) ? m : new Map(m).set(h3, "loading")));
    if (first) queue.current.unshift(h3); else queue.current.push(h3);
    pump();
  }, [pump]);
  useEffect(() => { if (city && areaH3) loadArea(areaH3, true); }, [city, areaH3, loadArea]);
  /* A dot tapped before its area was read resolves to the same animal: the
     read returns those needing help first, the order the dots were drawn in. */
  useEffect(() => {
    if (!pendingDog || !area || area === "loading") return;
    const j = pendingPaw.current; pendingPaw.current = null; setPendingDog(false);
    if (area !== "error" && j !== null && area.animals[j]) setAnimalId(area.animals[j].id);
  }, [pendingDog, area]);

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
      map.on("error", (e) => {
        const msg = e.error?.message ?? "";
        /* Surface any MapLibre runtime error to the console (expression type
           failures, style validation, source parse errors). The previous
           handler only acted on WebGL errors, which meant a malformed paint
           expression could silently drop a whole layer — fog + clusters
           disappearing at city zoom with no sign of why. */
        console.warn("[map]", msg, e.error ?? "");
        if (/webgl|context/i.test(msg)) setMapError("This browser cannot draw the interactive map. Search and the city list still work.");
      });
      map.on("load", () => {
        const m = map!;
        const empty = { type: "FeatureCollection" as const, features: [] };
        for (const s of ["nat", "cities", "edge", "areas", "paws", "sel", "spot", "nums"]) m.addSource(s, { type: "geojson", data: empty });
        /* All math on per-feature numbers is wrapped in a defaulted `number`
           coercion. If a feature's property is ever missing or wrong-typed,
           MapLibre silently drops the paint of the layer — which is exactly
           what was swallowing the fog + clusters at city zoom. */
        const num = (key: string, fallback = 1) => ["number", ["coalesce", ["get", key], fallback]] as never;
        const zr = (k: number) => ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", num("k"), num("g"), (px / 2) * k]])] as never;
        /* India: every recorded area a glow, every city a point of light. The
           glows stay on while a city is being read, so the flight lands on
           the city's real areas instead of empty ground. */
        m.addLayer({ id: "nat-glow", type: "circle", source: "nat", maxzoom: 9.6, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["*", ["get", "r"], 2.2], 7, ["*", ["get", "r"], 4], 10.6, ["*", ["get", "r"], 7]], "circle-color": ["get", "color"], "circle-blur": 0.4, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.12, 8.4, 0.12, 9.4, 0], "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "nat", type: "circle", source: "nat", maxzoom: 9.6, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], 0.6], 7, ["*", ["get", "r"], 1.2], 10.6, ["*", ["get", "r"], 2.4]], "circle-color": ["get", "color"], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3.5, 0.75, 8.4, 0.75, 9.4, 0], "circle-pitch-alignment": "map" } });
        /* A soft heat halo under each area, bigger than the disc, so the city
           reads as a living temperature map from zoom 9 onwards. */
        m.addLayer({ id: "areas-heat", type: "circle", source: "areas", minzoom: 8.6, paint: {
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", num("k"), num("g"), px]])] as never,
          "circle-color": ["coalesce", ["get", "color"], "#2a3b5c"], "circle-blur": 1.1, "circle-pitch-alignment": "map",
          /* Zoom must be the input of the top-level interpolate (MapLibre
             rejects the whole layer otherwise); per-area dimming rides in each stop. */
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], ...([[8, 0.22], [10, 0.42], [11, 0.5], [PAW_ZOOM, 0.22]] as [number, number][]).flatMap(([z, v]) => [z, ["*", ["case", ["==", ["get", "dim"], 1], 0.22, 1], v]])] as never } });
        /* The areas themselves, for touch and hover: a disc on the ground
           under each column. The feature's own `o` drives opacity so the
           disc only brightens for a selected area; the broad reading lives
           in the heat halo above. At city overview zoom (9–12) the discs
           read as the dots a visitor is looking for, so they are rendered
           bright with a thin stroke; past deep-area zoom (13+) they fade
           and the individual paws take over. */
        m.addLayer({ id: "areas", type: "circle", source: "areas", paint: { "circle-radius": zr(1), "circle-color": ["coalesce", ["get", "color"], "#2a3b5c"],
          "circle-stroke-color": "#fffdf9", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 0.6, 11, 1.4, PAW_ZOOM, 0],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 11, 0.85, PAW_ZOOM, 0], "circle-blur": 0.05, "circle-pitch-alignment": "map",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], ...([[8, 0.95], [10.4, 0.95], [12, 0.75], [PAW_ZOOM, 0.4]] as [number, number][]).flatMap(([z, v]) => [z, ["*", num("o", 0.85), v]])] as never } });
        /* A lit finding rings the areas it rests on, in turmeric; nothing else changes meaning. */
        m.addLayer({ id: "spot", type: "circle", source: "spot", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", num("k"), px * 0.55 + 3]])] as never, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f2b632", "circle-stroke-width": 2.2, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...BLOOM_STOPS.flatMap(([z, px]) => [z, ["*", num("g"), px * 0.62 + 6]])] as never, "circle-color": "rgba(143,176,255,0.12)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 2.5, "circle-stroke-opacity": 0.95, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "nums", type: "symbol", source: "nums", minzoom: 11.4, layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 11.4, 10, 13, 13], "text-allow-overlap": false, "text-padding": 1 }, paint: { "text-color": "#0b1e3d", "text-halo-color": "#fffdf9", "text-halo-width": 1.6, "text-opacity": ["interpolate", ["linear"], ["zoom"], 11.4, 0, 11.8, 1] } });
        /* One dot per recorded animal, coloured by need: needing help on top
           and breathing, an open request next, the rest quiet. A filter fades
           what it leaves out (`f`); the chosen animal is ringed in ink. */
        m.addLayer({ id: "paws-pulse", type: "circle", source: "paws", minzoom: PAW_SHOW_LO, filter: ["==", ["get", "pu"], 1], paint: {
          "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 9.4, ["*", num("s"), 5], 13, ["*", num("s"), 10], 15, ["*", num("s"), 16], 17, ["*", num("s"), 24]],
          "circle-color": NEED_INK.help, "circle-blur": 0.8, "circle-opacity": 0.24, "circle-pitch-alignment": "map" } });
        m.addLayer({ id: "paws", type: "circle", source: "paws", minzoom: PAW_SHOW_LO, layout: { "circle-sort-key": num("z", 0) }, paint: {
          "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 9.4, ["*", num("s"), 2.2], 11, ["*", num("s"), 3], 13, ["*", num("s"), 4.2], 15, ["*", num("s"), 7.5], 17, ["*", num("s"), 11]],
          "circle-color": ["coalesce", ["get", "col"], NEED_INK.rec],
          "circle-stroke-color": ["case", ["==", ["get", "ch"], 1], "#0b1e3d", "#ffffff"],
          "circle-stroke-width": ["case", ["==", ["get", "ch"], 1], 3.5, ["==", ["get", "ph"], 1], 2, 1.1],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], PAW_SHOW_LO, 0, PAW_SHOW_HI, num("f", 1)],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], PAW_SHOW_LO, 0, PAW_SHOW_HI, num("f", 1)] } });
        /* City rosettes fade out as the city opens so they never ring the
           ground once you are reading its areas. */
        m.addLayer({ id: "cities-glow", type: "circle", source: "cities", maxzoom: 11, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], ["get", "g"], 1.5], 8, ["*", ["get", "r"], ["get", "g"], 2.2]], "circle-color": ["get", "col"], "circle-blur": 0.4, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3.5, 0.12, 9, 0.12, 11, 0] } });
        m.addLayer({ id: "cities", type: "circle", source: "cities", maxzoom: 11, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3.5, ["*", ["get", "r"], ["get", "g"], 0.42], 8, ["*", ["get", "r"], ["get", "g"], 0.62]],
          "circle-color": ["case", ["==", ["get", "hol"], 1], "rgba(0,0,0,0)", ["get", "col"]], "circle-stroke-color": "#fffdf9", "circle-stroke-width": ["case", ["==", ["get", "hol"], 1], 1.5, 1.2], "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 3.5, 0.85, 9, 0.85, 11, 0], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3.5, 1, 9, 1, 11, 0] } });

        const tip = (e: { features?: MapGeoJSONFeature[]; point: { x: number; y: number } }) => {
          if (window.matchMedia("(hover: none)").matches) return;
          const f = e.features?.[0]; if (!f) return;
          const title = String(f.properties?.title ?? ""), line = String(f.properties?.line ?? "");
          /* Placeholder paws (shown while an area's records are still being
             read) carry no title; don't hover-tip them. */
          if (!title && !line) { setHover(null); return; }
          setHover({ x: e.point.x, y: e.point.y, title, line });
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

  const live = useRef({ cells, city, area, level, areaH3 });
  live.current = { cells, city, area, level, areaH3 };
  /* The click handler is bound once, when the map loads; it climbs through the current `up`. */
  const upRef = useRef<() => void>(() => {});
  const onMapClick = (m: MLMap, p: { x: number; y: number }) => {
    const layers = (ids: string[]) => ({ layers: ids.filter((l) => m.getLayer(l)) });
    const dist = (h: MapGeoJSONFeature) => { const q2 = m.project((h.geometry as GeoJSON.Point).coordinates as [number, number]); return (q2.x - p.x) ** 2 + (q2.y - p.y) ** 2; };
    const Lc = live.current;
    /* A dot is a small target on a phone: forgive a near miss, and prefer
       the one in the filter (faded dots are not what the reader is after). */
    const paws = m.queryRenderedFeatures([[p.x - 11, p.y - 11], [p.x + 11, p.y + 11]], layers(["paws"]));
    const pawHit = paws.sort((a, b) => (Number(b.properties?.f ?? 1) >= 0.5 ? 1 : 0) - (Number(a.properties?.f ?? 1) >= 0.5 ? 1 : 0) || dist(a) - dist(b))[0];
    if (pawHit && Lc.city) {
      const id = pawHit.properties?.id as string | undefined, i = pawHit.properties?.i as number, j = pawHit.properties?.j as number;
      const c = Lc.cells[i]; if (!c) return;
      /* The camera moves only when the tap changes area; a neighbour in the same area just opens. */
      pickAt.current = c.h3 === Lc.areaH3 ? null : (pawHit.geometry as GeoJSON.Point).coordinates as [number, number];
      dogFromDot.current = true;
      if (id) { pendingPaw.current = null; setPendingDog(false); setAreaH3(c.h3); setAnimalId(id); return; }
      pendingPaw.current = j; setAnimalId(null); setPendingDog(true); setAreaH3(c.h3); return;
    }
    const hit = m.queryRenderedFeatures([[p.x - 6, p.y - 6], [p.x + 6, p.y + 6]], layers(["cities", "areas"]));
    const cityHit = hit.filter((h) => h.layer.id === "cities").sort((a, b) => dist(a) - dist(b))[0];
    if (cityHit) { openCity(String(cityHit.properties?.name)); return; }
    const areaHit = hit.filter((h) => h.layer.id === "areas").sort((a, b) => dist(a) - dist(b))[0];
    if (areaHit && Lc.city) { const c = Lc.cells[areaHit.properties?.i as number]; if (c) { pickAt.current = null; dogFromDot.current = false; clearPending(); setAreaH3(c.h3); setAnimalId(null); } return; }
    /* Empty ground climbs one scale, the same way the close button does. */
    if (Lc.level === "animal" || Lc.level === "area") upRef.current();
  };

  const clearPending = useCallback(() => { pendingPaw.current = null; setPendingDog(false); }, []);
  const openCity = useCallback((name: string, opts?: { area?: string; animal?: string }) => {
    clearPending(); pickAt.current = null; dogFromDot.current = false;
    setCity(name); setAreaH3(opts?.area ?? null); setAnimalId(opts?.animal ?? null); setPicking(false);
  }, [clearPending]);
  const goIndia = useCallback(() => { clearPending(); setCity(null); setAreaH3(null); setAnimalId(null); if (!embedded && scope === "public") rememberHome(null); }, [embedded, scope, clearPending]);
  /* Closing an animal goes back the way it came: a dot tapped on the map
     returns to the city, an animal chosen from an area's list to that list. */
  const up = useCallback(() => {
    if (animalId || pendingDog) { clearPending(); setAnimalId(null); if (dogFromDot.current) { dogFromDot.current = false; holdCamera.current = true; setAreaH3(null); } }
    else if (areaH3) setAreaH3(null); else if (city) goIndia();
  }, [animalId, pendingDog, areaH3, city, goIndia, clearPending]);
  upRef.current = up;

  /* Where the map opens: a link that names a place wins; otherwise the
     person's own city (an organisation: its largest), and India only when
     they chose India or the record has not reached them (lib/home-city). */
  const homed = useRef(embedded || !!(I.city || I.area || I.animal || I.place || I.lng));
  const cityNow = useRef(city);
  cityNow.current = city;
  useEffect(() => {
    if (homed.current || citiesState !== "ready" || !cities.length) return;
    let live = true;
    const pick = scope === "org" ? Promise.resolve(cities[0]?.city ?? null) : resolveHome(cities);
    pick.then((home) => { if (!live) return; homed.current = true; if (home && !cityNow.current) openCity(home); });
    return () => { live = false; };
  }, [cities, citiesState, scope, openCity]);
  /* A city opened is remembered; India only when the person goes there. */
  useEffect(() => { if (city && homed.current && !embedded && scope === "public") rememberHome(city); }, [city, embedded, scope]);

  /* ?place=: once the city is read, open that locality's busiest area. */
  useEffect(() => {
    const want = pendingPlace.current?.trim().toLowerCase();
    if (!want || !data) return;
    pendingPlace.current = null;
    const hit = data.cells.filter((c) => placeName(c.zone).toLowerCase() === want).sort((a, b) => b.animals - a.animals)[0];
    if (hit) setAreaH3(hit.h3);
  }, [data]);

  /* The living map pulses: the paw halo breathes with a 2.6s cycle, and the
     city heat glow drifts just a little so the field never looks frozen.
     Opacity-only updates on existing paint properties — no new data upload,
     no layout work. Pauses when the tab is hidden or reduced motion is on. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    if (reduced()) return;
    let raf = 0, start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 2.6));
      const heat = 0.5 + 0.5 * Math.sin(t * (Math.PI * 2 / 7) + 0.9);
      try {
        if (m.getLayer("paws-pulse")) m.setPaintProperty("paws-pulse", "circle-opacity", 0.08 + 0.22 * pulse);
        if (m.getLayer("areas-heat")) m.setPaintProperty("areas-heat", "circle-blur", 0.9 + 0.35 * heat);
      } catch { /* layer removed */ }
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    const vis = () => { if (!document.hidden && !raf) { start = performance.now(); raf = requestAnimationFrame(tick); } };
    raf = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); raf = 0; document.removeEventListener("visibilitychange", vis); };
  }, [ready]);

  /* Zoom is navigation: out past a city returns to India; in near a city opens it.
     Zooming in never picks anything for the reader: it only reads the areas
     in view, so every dot there becomes a real animal that opens on a tap. */
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
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !city || !cells.length || zoom < LOAD_ZOOM) return;
    const b = m.getBounds(), c = m.getCenter();
    const seen = cells.map((cell, i) => ({ cell, p: centers[i] }))
      .filter(({ p }) => p[0] > b.getWest() - 0.01 && p[0] < b.getEast() + 0.01 && p[1] > b.getSouth() - 0.01 && p[1] < b.getNorth() + 0.01)
      .sort((x, y) => Math.hypot(x.p[0] - c.lng, x.p[1] - c.lat) - Math.hypot(y.p[0] - c.lng, y.p[1] - c.lat));
    for (const { cell } of seen.slice(0, 30)) loadArea(cell.h3);
  }, [ready, city, cells, centers, zoom, moved, loadArea]);

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
      /* On the default map a city where the record says someone should look
         is painted in flame, so India shows where to go before any filter. */
      const need = hollow ? 0 : nationalMeasure("help", c);
      const col = lens === "animals" ? (need > 0 ? NEED_INK.help : "#2457ce") : L.ink;
      const fig = v.toLocaleString("en-IN");
      return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: {
        name: c.city, col, hol: hollow ? 1 : 0, r: d / 2, g: Math.max(0, Math.min(1, g * 1.5 - rank * 0.5)), sort: -v,
        title: c.city, line: hollow ? `${fig} animals in a city-level clinical register · not mapped by street` : `${fig} ${unitFor(lens, v)}${lens === "animals" && need ? ` · ${need.toLocaleString("en-IN")} needing help` : ""}`,
      } }];
    }) : [] });
  }, [cities, level, lens, L.ink]);
  useEffect(() => { if (ready) cityFeatures(); }, [ready, cityFeatures]);
  const grewCities = useRef(false);
  useEffect(() => { if (ready && cities.length && level === "india" && !grewCities.current) { grewCities.current = true; grow("cities", cityFeatures); } }, [ready, cities.length, level, grow, cityFeatures]);

  /* Every recorded area as a quiet blue light: where the record reaches, so
     the flame cities read as where to go. They stay drawn at every scale and
     hand over to a city's own dots as they appear (9.4), so the flight
     never crosses empty ground. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    (m.getSource("nat") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: national.map(([lng, lat, a]) => (
      { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lng, lat] }, properties: { r: 1.8 + Math.min(4.2, Math.sqrt(a) * 0.45), color: "#2457ce" } }
    )) });
  }, [ready, national]);

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
    /* Per-feature `o` lets the areas disc dim across the board when no area
       is selected, so the city reads as its heat halo first. Picking an area
       (click, URL, or auto-selected on deep zoom) lights that one disc, the
       others stay quiet. The heat halo keeps the broad reading alive. */
    /* Under a filter, an area with nothing in it draws no circle: the
       circles mark where the filter finds something, and nothing else. For
       the need filters an unknown (an imported request never confirmed, a
       request with no status) is not a finding either: the panel names it,
       the map does not ring it. */
    const needFilter = lens === "help" || lens === "requests" || lens === "followups";
    /* Needs help and Open requests ring exactly the areas whose dots they light. */
    const openOf = (c: (typeof cells)[number]) => Math.max(0, c.open_cases - (c.open_unconfirmed ?? 0));
    const own = (c: (typeof cells)[number]) => (lens === "help" ? needingHelp(c.needs_help, openOf(c), c.fu_missed_live ?? 0) : lens === "requests" ? openOf(c) : null);
    const shown = (i: number) => { const n = own(cells[i]); if (n !== null) return n > 0; const k = byId.get(classOf[i])?.kind; return animalsRecency || (needFilter ? k === "value" : k !== "zero"); };
    set("areas", cells.flatMap((c, i) => (shown(i) ? [{ c, i }] : [])).map(({ c, i }) => {
      const dist = Math.hypot(centers[i][0] - mid[0], centers[i][1] - mid[1]) / far;
      const g = Math.max(0, Math.min(1, g0 * 1.6 - dist * 0.6));
      const k = 0.55 + (Math.sqrt(c.animals) / maxA) * 0.75;
      const isSel = !!areaH3 && areaH3 === c.h3;
      const dim = (areaH3 && areaH3 !== c.h3 && level !== "city") || (spot && level === "city" && !spot.cells.has(c.h3)) ? 1 : 0;
      /* Default (no selection): bright, so each area reads as a visible
         cluster marker on the city view. Dimmed only when something else is
         picked (another area, a spotlit finding), so the chosen one wins. */
      const o = isSel ? 1 : (areaH3 ? 0.22 : (spot ? (spot.cells.has(c.h3) ? 1 : 0.18) : 0.85));
      if (animalsRecency) {
        const rb = bucketOf(lastRecorded(c), now);
        return pt(centers[i], { i, k, g, o, color: rb ? rb.color : UNDATED_INK, n: Math.sqrt(c.animals) / maxA, sort: -c.animals, dim,
          title: placeName(c.zone), line: `${c.animals.toLocaleString("en-IN")} animals · last recorded ${rb ? rb.label.toLowerCase() : "on no recorded date"}` });
      }
      const n = own(c);
      if (n !== null) {
        const ink = lens === "help" ? NEED_INK.help : NEED_INK.open;
        return pt(centers[i], { i, k, g, o, color: ink, n: Math.sqrt(c.animals) / maxA, sort: -n, dim,
          title: placeName(c.zone), line: `${n.toLocaleString("en-IN")} ${lens === "help" ? "needing help" : `open request${n === 1 ? "" : "s"}`}` });
      }
      const kl = byId.get(classOf[i]); const v = q.measure(c, facet, ctx, i);
      const fill = kl?.kind === "unknown" ? UNDATED_INK : kl?.kind === "zero" ? "#2a3b5c" : kl?.color ?? "#2a3b5c";
      return pt(centers[i], { i, k: kl?.kind === "value" ? k : k * 0.7, g, o, color: fill, n: Math.sqrt(c.animals) / maxA, sort: -(v || 0), dim,
        title: placeName(c.zone), line: `${kl?.label ?? ""}${v ? ` · ${v.toLocaleString("en-IN")} ${q.unit(facet)}` : ""}` });
    }));
    set("nums", cells.flatMap((c, i) => {
      const v = animalsRecency ? c.animals : own(c) ?? q.measure(c, facet, ctx, i); if (!v || !shown(i)) return [];
      return [pt(centers[i], { t: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) })];
    }));
    set("edge", (data?.edge ?? []).map((e) => pt(e, {})));
    /* One dot per animal, as soon as the city opens. An area already read
       gives each dot its own animal; one not yet read draws the same number
       of dots from its totals: those needing help first, the order the read
       returns them in, so a dot keeps its colour and its place when its
       record arrives. Positions are a schematic seed inside the area, never
       where the animal was seen. */
    const mode = dotMode(lens);
    const paws: GeoJSON.Feature[] = [];
    const style = (need: Need, care: keyof typeof CARE, inFilter: boolean, chosen: boolean, photo: boolean) => {
      const careMode = mode === "ster" || mode === "vacc";
      const f = careMode || mode === "need" ? 1 : inFilter ? 1 : 0.14;
      const urgent = !careMode && f === 1;
      return {
        col: careMode ? CARE[care] : NEED_INK[need], f,
        s: chosen ? 1.9 : f < 1 ? 0.8 : !urgent ? 1 : need === "help" ? 1.35 : need === "open" ? 1.12 : photo ? 1.05 : 0.92,
        pu: urgent && need === "help" && !chosen ? 1 : 0,
        z: chosen ? 9 : f < 1 ? 0 : urgent ? (need === "help" ? 3 : need === "open" ? 2 : 1) : 1,
        ch: chosen ? 1 : 0, ph: photo ? 1 : 0,
      };
    };
    cells.forEach((c, i) => {
      const n = Math.min(PER_AREA, Math.max(1, c.animals));
      const seats = seedHead(centers[i], n);
      const got = areas.get(c.h3);
      if (got && got !== "loading" && got !== "error") {
        got.animals.slice(0, n).forEach((a, j) => {
          const need = needOf(a), chosen = a.id === animalId;
          const care = mode === "vacc" ? careKey(a.vacc, "vaccinated", "not_vaccinated") : careKey(a.ster, "sterilised", "not_sterilised");
          const inFilter = mode === "help" ? need === "help" : mode === "open" ? (a.facts?.open ?? 0) > 0 : true;
          paws.push(pt(seats[j], { i, j, id: a.id, need, ...style(need, care, inFilter, chosen, !!a.photo),
            title: a.title, line: `${NEED_LABEL[need]} · tap to open` }));
        });
        return;
      }
      /* Not read yet: the area's own totals, spread over its dots. */
      const help = Math.min(n, c.needs_help);
      const openConfirmed = Math.max(0, c.open_cases - (c.open_unconfirmed ?? 0));
      const open = Math.min(n - help, Math.max(0, openConfirmed - c.needs_help));
      const total = Math.max(1, c.animals);
      const yes = Math.round(n * ((mode === "vacc" ? c.vacc_yes : c.ster_yes) / total));
      const no = mode === "vacc" ? 0 : Math.round(n * (c.ster_no / total));
      const place = placeName(c.zone);
      const hint = c.needs_help ? `${c.needs_help.toLocaleString("en-IN")} needing help here` : `${c.animals.toLocaleString("en-IN")} ${c.animals === 1 ? "animal" : "animals"} here`;
      seats.forEach((p, j) => {
        const need: Need = j < help ? "help" : j < help + open ? "open" : "rec";
        const care: keyof typeof CARE = j < yes ? "yes" : j < yes + no ? "no" : "unknown";
        const inFilter = mode === "help" ? need === "help" : mode === "open" ? j < Math.min(n, openConfirmed) : true;
        paws.push(pt(p, { i, j, need, ...style(need, care, inFilter, false, false), title: place, line: `${hint} · tap to open` }));
      });
    });
    set("paws", paws);
  }, [city, cells, centers, classes, classOf, q, facet, ctx, data, animalsRecency, areas, animalId, areaH3, level, spot, lens]);
  /* Circles for areas are a filter's reading, not the default view: with
     Animals chosen the city is its dots alone. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const vis = lens === "animals" ? "none" : "visible";
    for (const id of ["areas", "areas-heat", "nums"]) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", vis);
  }, [ready, lens]);
  useEffect(() => { if (ready) areaFeatures(); }, [ready, areaFeatures]);
  const grewFor = useRef<string | null>(null);
  useEffect(() => { if (ready && data && grewFor.current !== data.city) { grewFor.current = data.city; grow("areas", areaFeatures); } }, [ready, data, grow, areaFeatures]);

  /* Selection ring, drawn in once. */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const src = m.getSource("sel") as GeoJSONSource | undefined; if (!src) return;
    /* An area chosen as an area is ringed; a chosen animal is marked by its own dot. */
    if (areaIndex < 0 || level === "animal") { src.setData({ type: "FeatureCollection", features: [] }); return; }
    const c = cells[areaIndex], k = 0.55 + (Math.sqrt(c.animals) / Math.sqrt(Math.max(1, ...cells.map((x) => x.animals)))) * 0.75;
    const paint = (g: number) => src.setData({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: centers[areaIndex] }, properties: { g: k * g } }] });
    paint(1);
  }, [ready, areaIndex, cells, centers, level]);

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
      const need = !hollow && lens === "animals" ? nationalMeasure("help", c) : 0;
      if (need) e.classList.add("is-need");
      e.innerHTML = `<b></b><small></small>`;
      e.querySelector("b")!.textContent = c.city;
      e.querySelector("small")!.textContent = hollow ? `${v.toLocaleString("en-IN")} · city-level register` : need ? `${need.toLocaleString("en-IN")} needing help` : `${v.toLocaleString("en-IN")} ${unitFor(lens, v)}`;
      e.setAttribute("aria-label", `${c.city}: ${hollow ? "" : `${v.toLocaleString("en-IN")} ${unitFor(lens, v)}${need ? `, ${need.toLocaleString("en-IN")} needing help` : ""}. `}Open the city.`);
      /* Start reading the city as the reader reaches for it, so it is ready when the camera lands. */
      const warm = () => { if (!hollow) readCity(c.city, scope).catch(() => {}); };
      e.addEventListener("pointerenter", warm, { once: true });
      e.addEventListener("focus", warm, { once: true });
      e.addEventListener("click", (ev) => { ev.stopPropagation(); openCity(c.city); });
      E.cities.set(c.city, mark(e, [c.lng!, c.lat!], "top"));
    });
    return () => { unmark(E.cities.values()); E.cities.clear(); };
  }, [ready, cities, level, lens, openCity, mark, scope]);

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

  /* The camera's travel, for marks that should hold still while it moves. */
  const [, setMoving] = useState(false);
  /* ── camera ── */
  const pad = useCallback(() => {
    const w = el.current?.clientWidth ?? 1200, h = el.current?.clientHeight ?? 800;
    const card = level !== "india";
    if (w > 900) return { top: 120, bottom: 110, left: 40, right: card ? 480 : 40 };
    /* A phone frames the place in the gap the reader can actually see and
       tap: below the search, filters and title, above the sheet (peeking for
       a city, half open for an area or an animal). */
    const box = el.current?.getBoundingClientRect();
    const head = el.current?.parentElement?.querySelector(".fm-head")?.getBoundingClientRect();
    const bottom = Math.round(h * (level === "area" || level === "animal" ? 0.46 : 0.2));
    const top = box && head?.height ? Math.round(head.bottom - box.top + 12) : 140;
    return { top: Math.max(96, Math.min(top, h - bottom - 160)), bottom, left: 16, right: 16 };
  }, [level]);
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const key = `${level === "animal" ? "area" : level}:${city}:${areaH3}:${cells.length}:${clinical}`;
    if (key === lastCam.current) return;
    if (holdCamera.current && level === "city") { holdCamera.current = false; lastCam.current = key; return; }
    holdCamera.current = false;
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
      /* A tapped dot comes to the middle of the open map, close enough to
         read its neighbours; an area chosen from a list opens on its centre. */
      const at = pickAt.current ?? centers[areaIndex]; pickAt.current = null;
      const zz = Math.max(14.6, Math.min(m.getZoom(), 16));
      const from = m.getZoom();
      const d = reduced() ? 0 : Math.min(900, 420 + Math.abs(from - zz) * 90);
      m.flyTo({ center: at, zoom: zz, pitch: 0, bearing: 0, padding: pad(), duration: d, easing: travel });
      return;
    }
    const b = coreBounds(centers);
    /* Fit the real geographic extent without tilting or rotating the street
       map. On the India → city leap use flyTo's native parabolic path (curve
       1.4, speed 1.1), which first zooms out a little then swoops in — the
       density fog becomes visible as the camera descends, so the city reads
       as a landscape of clusters, not a cut. */
    const cam = m.cameraForBounds(b, { padding: pad(), maxZoom: 12.4 });
    const zz = cam?.zoom ?? 11;
    const from = m.getZoom();
    const bigHop = Math.abs(from - zz) > 3;
    if (bigHop && !reduced()) {
      m.flyTo({ ...cam, zoom: zz, pitch: 0, bearing: 0, padding: pad(), curve: 1.4, speed: 1.1, essential: true });
    } else {
      m.flyTo({ ...cam, zoom: zz, pitch: 0, bearing: 0, padding: pad(), duration: dur(from, zz), easing: travel });
    }
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
      {hover && <div className="fm-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden><b>{hover.title}</b><span>{hover.line}</span></div>}
      <Chrome embedded={embedded}
        level={level} city={city} cityRow={cityRow} cities={cities} unplaced={unplaced} citiesState={citiesState} cityState={cityState} clinical={clinical} ev={ev}
        variant={variant} scope={scope} lenses={lenses} spot={spot?.id ?? null} onSpot={(id, list) => setSpot(id ? { id, cells: new Set(list) } : null)}
        lens={lens} setLens={setLens} fig={fig} reading={reading} places={places} cells={cells} centers={centers} months={months}
        area={area} areaIndex={areaIndex} animalId={animalId} faces={faces} zoom={zoom} quiet={quiet} setQuiet={setQuiet} mapError={mapError}
        picking={picking} setPicking={setPicking} center={center} recency={RECENCY}
        onPlace={(c, name) => { if (data?.city === c) { const hit = data.cells.filter((x) => placeName(x.zone).toLowerCase() === name.toLowerCase()).sort((a, b) => b.animals - a.animals)[0]; if (hit) { setAreaH3(hit.h3); setAnimalId(null); } } else { pendingPlace.current = name; openCity(c); } }}
        onIndia={goIndia} onCity={openCity} onArea={(h3) => { pickAt.current = null; dogFromDot.current = false; clearPending(); setAreaH3(h3); setAnimalId(null); }} onAnimal={(id) => { dogFromDot.current = false; clearPending(); setAnimalId(id); }} onUp={up}
        onFly={flyTo} onZoom={zoomBy} onLocate={locate} onRetry={() => { const c = city; if (c) { cityCache.delete(cacheKey(scope, c)); setCity(null); window.setTimeout(() => setCity(c), 0); } }}
      />
    </div>
  );
}
