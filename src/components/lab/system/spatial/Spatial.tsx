"use client";

/* StrayPaw spatial intelligence: two views over one index.

   2D Intelligence — MapLibre streets with a deck.gl overlay. Wide views
   aggregate into H3 cells (resolution 8, ≈0.74 km²); closer in, the cells
   step back and the animals themselves appear, clustered until they can be
   told apart. Colour always answers the current mode's question, and a
   blank is never "no dogs": past the edge of the records the map says
   "not mapped".

   3D City — the real city, streamed: Google Photorealistic 3D Tiles in
   CesiumJS, loaded only when asked for. Where Google has no photogrammetry,
   or no key is configured, it falls back to satellite imagery and
   OpenStreetMap building footprints in MapLibre, and says which it is. */

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification, MapMouseEvent, StyleSpecification } from "maplibre-gl";
import type { MapboxOverlay } from "@deck.gl/mapbox";
import { restyle, underlay, type Palette } from "../../LabMap";
import {
  A, KINDS, OUTCOMES, CRITICAL, COV_ORDER, COV_TEXT, NO_FILTERS, CELL_KM2,
  buildIndex, computeCells, frontier, mapNext, animalVisible, caseOpenAt, kmBetween, cellOf, scaleRing,
  monthEnd, monthOf, monthLabel, dayLabel, fmt, pct,
  type Data, type Mode, type Filters, type Programme, type Cov, type CellStat,
} from "./engine";
import type { City3DPoint, City3DCell, Step, Coverage } from "./City3D";

// Cesium is fetched from its CDN inside City3D; this only splits the wrapper out of the 2D bundle.
const City3D = dynamic(() => import("./City3D").then((m) => m.City3D), { ssr: false });

const GROUND: Palette = {
  bg: "#081631", water: "#0c2548", land: "#081631", park: "#0a1b3a", building: "#0e2346",
  road: "rgba(243,237,228,0.05)", roadMajor: "rgba(243,237,228,0.11)", rail: "rgba(243,237,228,0.06)",
  boundary: "rgba(243,237,228,0.14)", label: "#f3ede4", labelHalo: "#081631", labelOpacity: 0.26,
  minorRoads: true, buildings: true, showRoadNames: false,
};
const MODES: { id: Mode; label: string; q: string }[] = [
  { id: "animals", label: "Animals", q: "Where dogs are recorded" },
  { id: "density", label: "Density", q: "Where recorded dogs cluster" },
  { id: "coverage", label: "Coverage", q: "How well each place is mapped" },
  { id: "abc", label: "ABC", q: "Sterilisation recorded, and what is unknown" },
  { id: "arv", label: "ARV", q: "Vaccination recorded, and boosters due" },
  { id: "medical", label: "Medical", q: "Injured animals and medical cases" },
  { id: "cases", label: "Cases", q: "Open and urgent cases" },
  { id: "projects", label: "Projects", q: "Where programmes are working" },
];
const BLUE = ["#132b55", "#1b3f80", "#2a5bb8", "#4f7fe0", "#93b1f0"];
const FLAME = ["#3b1f2c", "#6d2a2c", "#a8392b", "#e05537", "#f7a08c"];
const COV_COL: Record<Cov, string> = { strong: "#4f7fe0", partial: "#2a5bb8", weak: "#1b3f80", insufficient: "#132b55", unmapped: "transparent" };
const INDIA: [number, number, number, number] = [68, 7, 90, 33];
const STEPS = 33;
// The 3D ladder, dog → city. MapLibre zooms for the OpenStreetMap fallback; Cesium uses camera heights.
const STEP_Z: Record<Step, number> = { dog: 16.9, cluster: 15.1, locality: 13.4, city: 11.4 };
const LADDER: Step[] = ["dog", "cluster", "locality", "city"];
const GKEY = process.env.NEXT_PUBLIC_GOOGLE_MAP_TILES_KEY ?? "";
export const LS_KEY = "sp-lab-google-tiles-key";

type Sel =
  | { t: "india" } | { t: "city"; city: number }
  | { t: "locality"; city: number; name: string }
  | { t: "cell"; city: number; key: string }
  | { t: "animal"; city: number; i: number }
  | { t: "area"; city: number; center: [number, number]; km: number };
type RGBA = [number, number, number, number];

const rgb = (hex: string, a = 1): RGBA => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, Math.round(a * 255)]; };
const circle = (c: [number, number], km: number): [number, number][] => { const k = Math.cos((c[1] * Math.PI) / 180); return Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return [c[0] + (Math.cos(a) * km) / (111 * k), c[1] + (Math.sin(a) * km) / 111]; }); };

const mercY = (lat: number) => 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
/** fitBounds for a flat camera, computed here: MapLibre's own fit measures from the current pitch, so leaving 3D overshoots to country scale. */
function fitFlat(m: MLMap, b: [number, number, number, number], pad: { top: number; bottom: number; left: number; right: number }, duration: number, maxZoom = 18) {
  const c = m.getContainer(), w = c.clientWidth - pad.left - pad.right, h = c.clientHeight - pad.top - pad.bottom;
  const zx = Math.log2(w / (((b[2] - b[0]) / 360) * 512)), zy = Math.log2(h / ((mercY(b[1]) - mercY(b[3])) * 512));
  m.flyTo({ center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], zoom: Math.min(zx, zy, maxZoom), pitch: 0, bearing: 0, duration, padding: pad });
}

type DeckMods = { MapboxOverlay: typeof MapboxOverlay; H3HexagonLayer: typeof import("@deck.gl/geo-layers").H3HexagonLayer; PolygonLayer: typeof import("@deck.gl/layers").PolygonLayer; PathStyleExtension: typeof import("@deck.gl/extensions").PathStyleExtension };

export function Spatial({ data, initial }: { data: Data; initial: { animal?: string; view?: string; mode?: string } }) {
  const ix = useMemo(() => buildIndex(data), [data]);
  const focusIdx = initial.animal ? data.animals.findIndex((a) => a[A.id].startsWith(initial.animal!)) : -1;
  const [mode, setMode] = useState<Mode>((MODES.find((m) => m.id === initial.mode)?.id) ?? (focusIdx >= 0 ? "animals" : "density"));
  const [view, setView] = useState<"2d" | "3d">(initial.view === "3d" ? "3d" : "2d");
  const [step, setStep] = useState<Step>(focusIdx >= 0 ? "dog" : "locality");
  const [hex3d, setHex3d] = useState(false);
  const [imagery, setImagery] = useState(true);
  const [key, setKey] = useState(GKEY);
  const [cov3d, setCov3d] = useState<{ c: Coverage; detail?: string }>({ c: "checking" });
  const labelIds = useRef<string[]>([]);
  const [month, setMonth] = useState(monthOf(data.now));
  const [playing, setPlaying] = useState(false);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [prog, setProg] = useState<Programme>("all");
  const [sel, setSel] = useState<Sel>(focusIdx >= 0 ? { t: "animal", city: data.animals[focusIdx][A.city], i: focusIdx } : { t: "india" });
  const [drawer, setDrawer] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [field, setField] = useState(true);
  const [areaTool, setAreaTool] = useState(false);
  const [ctx, setCtx] = useState<"none" | "nearby" | "cases" | "history">("none");
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [bld, setBld] = useState(false);
  const [zoom, setZoom] = useState(4);
  const [deck, setDeck] = useState<DeckMods | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const overlay = useRef<MapboxOverlay | null>(null);
  const el = useRef<HTMLDivElement>(null);

  // A key pasted into the lab's coverage test is kept in this browser only, so a preview can be tried before the env var is set.
  useEffect(() => { if (!GKEY) try { const k = localStorage.getItem(LS_KEY); if (k) setKey(k); } catch { /* storage blocked */ } }, []);
  const photoreal = view === "3d" && !!key && cov3d.c !== "none" && cov3d.c !== "error";

  const t = Math.min(monthEnd(month), data.now);
  const city = sel.t === "india" ? 0 : sel.city;
  const stats = useMemo(() => computeCells(data, ix, t, filters), [data, ix, t, filters]);
  const front = useMemo(() => frontier(ix, stats, city), [ix, stats, city]);
  const next = useMemo(() => mapNext(data, ix, stats, city, t, front), [data, ix, stats, city, t, front]);
  const nActive = Object.entries(filters).filter(([k, v]) => v !== (NO_FILTERS as Record<string, string>)[k]).length;

  /* ── the map, built once ─────────────────────────────────────────────── */
  useEffect(() => {
    let map: MLMap | null = null; let dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const style: StyleSpecification = { version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf", sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": GROUND.bg } }] };
      map = new ml.Map({ container: el.current, style, bounds: INDIA, fitBoundsOptions: { padding: 40 }, attributionControl: { compact: true, customAttribution: "© OpenStreetMap · OpenFreeMap · H3" }, maxPitch: 70 });
      mapRef.current = map;
      (window as unknown as { __sp?: MLMap }).__sp = map; // lab only: lets the screenshot harness read the camera
      map.on("zoom", () => { const z = Math.round(map!.getZoom() * 4) / 4; setZoom((p) => (p === z ? p : z)); });
      map.on("load", () => {
        const m = map!;
        el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        const empty = { type: "FeatureCollection" as const, features: [] };
        ["pts", "cases", "next", "selo", "area", "beacon", "pulse", "prog"].forEach((id) => m.addSource(id, { type: "geojson", data: empty }));
        m.addSource("clusters", { type: "geojson", data: empty, cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
        m.addSource("cities", { type: "geojson", data: { type: "FeatureCollection", features: data.cities.map((c, i) => ({ type: "Feature", properties: { i, n: data.animals.filter((a) => a[A.city] === i).length, name: c.name }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) } });
        // Fallback 3D ground: Esri World Imagery, free with attribution, no key.
        m.addSource("sat", { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
        m.addLayer({ id: "sat", type: "raster", source: "sat", layout: { visibility: "none" }, paint: { "raster-saturation": -0.2, "raster-brightness-max": 0.92, "raster-contrast": 0.05 } });
        // Marker between the ground and the records; OSM buildings and street names are placed under it.
        m.addLayer({ id: "deck-slot", type: "background", paint: { "background-opacity": 0 } });
        m.addLayer({ id: "cl", type: "circle", source: "clusters", filter: ["has", "point_count"], layout: { visibility: "none" }, paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 9, 20, 16, 120, 28] as ExpressionSpecification,
          "circle-color": "rgba(243,237,228,0.92)", "circle-stroke-color": "#081631", "circle-stroke-width": 2,
        } });
        m.addLayer({ id: "cl-n", type: "symbol", source: "clusters", filter: ["has", "point_count"], layout: { visibility: "none", "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 11 }, paint: { "text-color": "#0b1e3d" } });
        m.addLayer({ id: "cl-pt", type: "circle", source: "clusters", filter: ["!", ["has", "point_count"]], layout: { visibility: "none" }, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, 4, 17, 7] as ExpressionSpecification, "circle-color": ["case", ["==", ["get", "inj"], 1], "#f05b40", "#f3ede4"] as ExpressionSpecification, "circle-stroke-color": "#081631", "circle-stroke-width": 1.2 } });
        // Individual animals appear only once the cells have stepped back.
        m.addLayer({ id: "pts", type: "circle", source: "pts", minzoom: 13, layout: { visibility: "none" }, paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2.4, 15, 4.5, 17, 6.5] as ExpressionSpecification,
          "circle-color": ["get", "c"] as ExpressionSpecification, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 13.8, 0.95] as ExpressionSpecification,
          "circle-stroke-color": "#081631", "circle-stroke-width": 1,
        } });
        m.addLayer({ id: "prog", type: "circle", source: "prog", minzoom: 13, layout: { visibility: "none" }, paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2.5, 16, 5.5] as ExpressionSpecification, "circle-color": ["get", "c"] as ExpressionSpecification, "circle-stroke-color": "#081631", "circle-stroke-width": 0.8, "circle-opacity": 0.9 } });
        m.addLayer({ id: "cases", type: "circle", source: "cases", layout: { visibility: "none" }, paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, ["interpolate", ["linear"], ["get", "age"], 0, 3, 60, 5.5], 15, ["interpolate", ["linear"], ["get", "age"], 0, 6, 60, 11]] as ExpressionSpecification,
          "circle-color": ["case", ["==", ["get", "crit"], 1], "#f05b40", "rgba(243,237,228,0.9)"] as ExpressionSpecification,
          "circle-stroke-color": "#081631", "circle-stroke-width": 1,
        } });
        m.addLayer({ id: "next", type: "circle", source: "next", layout: { visibility: "none" }, paint: { "circle-radius": 10, "circle-color": "#081631", "circle-stroke-color": "#f3ede4", "circle-stroke-width": 2 } });
        m.addLayer({ id: "next-n", type: "symbol", source: "next", layout: { visibility: "none", "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 10, "text-allow-overlap": true }, paint: { "text-color": "#f3ede4" } });
        m.addLayer({ id: "area", type: "fill", source: "area", paint: { "fill-color": "#f3ede4", "fill-opacity": 0.06 } });
        m.addLayer({ id: "area-l", type: "line", source: "area", paint: { "line-color": "#f3ede4", "line-width": 1.5, "line-dasharray": [3, 2] } });
        m.addLayer({ id: "selo", type: "line", source: "selo", paint: { "line-color": "#f3ede4", "line-width": 1.6, "line-opacity": 0.75, "line-dasharray": [2, 3] } });
        m.addLayer({ id: "pulse", type: "circle", source: "pulse", paint: { "circle-radius": 14, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#f05b40", "circle-stroke-width": 2, "circle-stroke-opacity": 0.8 } });
        m.addLayer({ id: "beacon", type: "fill-extrusion", source: "beacon", paint: { "fill-extrusion-color": "#f05b40", "fill-extrusion-height": ["get", "h"] as ExpressionSpecification, "fill-extrusion-opacity": 0.95 } });
        m.addLayer({ id: "cities", type: "circle", source: "cities", maxzoom: 7.5, paint: { "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 2, 5, 48, 22] as ExpressionSpecification, "circle-color": "rgba(79,127,224,0.85)", "circle-stroke-color": "#f3ede4", "circle-stroke-width": 1.5 } });
        m.addLayer({ id: "cities-l", type: "symbol", source: "cities", maxzoom: 7.5, layout: { "text-field": ["concat", ["get", "name"], "  ", ["to-string", ["get", "n"]]], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.9], "text-anchor": "top" }, paint: { "text-color": "#f3ede4", "text-halo-color": "#081631", "text-halo-width": 1.5 } });

        m.on("click", "cities", (e) => { const i = e.features?.[0]?.properties?.i; if (i != null) setSel({ t: "city", city: Number(i) }); });
        ["cities", "cl", "cl-pt", "pts", "cases"].forEach((l) => { m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer")); m.on("mouseleave", l, () => (m.getCanvas().style.cursor = "")); });
        m.on("click", "cl", (e) => { const f = e.features?.[0]; if (!f) return; (m.getSource("clusters") as GeoJSONSource).getClusterExpansionZoom(f.properties!.cluster_id).then((z) => m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z + 0.3 })); });
        setReady(true);
        underlay(m, GROUND).then(() => {
          // Fallback 3D: OpenStreetMap footprints with their recorded heights, only in the 3D view.
          if (m.getSource("openmaptiles") && !m.getLayer("bld3d")) {
            m.addLayer({ id: "bld3d", type: "fill-extrusion", source: "openmaptiles", "source-layer": "building", minzoom: 13.5, layout: { visibility: "none" }, paint: {
              "fill-extrusion-color": "#efe8dc", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8] as ExpressionSpecification,
              "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0] as ExpressionSpecification, "fill-extrusion-opacity": 0.72,
            } }, "deck-slot");
            restyle(m, GROUND);
            labelIds.current = (m.getStyle().layers ?? []).filter((l) => l.type === "symbol" && (l as { source?: string }).source === "openmaptiles" && m.getLayoutProperty(l.id, "visibility") !== "none").map((l) => l.id);
            labelIds.current.forEach((id) => { try { m.moveLayer(id, "deck-slot"); } catch { /* ok */ } });
            setBld(true);
          }
        }).catch(() => {});
        // deck.gl, loaded after the streets so the first paint is never waiting on it. Overlaid on its own
        // canvas: interleaving reads MapLibre's private transform, which MapLibre 6 no longer exposes.
        Promise.all([import("@deck.gl/mapbox"), import("@deck.gl/geo-layers"), import("@deck.gl/layers"), import("@deck.gl/extensions")]).then(([mb, geo, lay, ext]) => {
          if (dead) return;
          const o = new mb.MapboxOverlay({ interleaved: false, layers: [] });
          m.addControl(o);
          overlay.current = o;
          setDeck({ MapboxOverlay: mb.MapboxOverlay, H3HexagonLayer: geo.H3HexagonLayer, PolygonLayer: lay.PolygonLayer, PathStyleExtension: ext.PathStyleExtension });
        });
      });
    });
    return () => { dead = true; map?.remove(); mapRef.current = null; overlay.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── where the selection is ─────────────────────────────────────────── */
  const focusPt = useMemo((): [number, number] => {
    if (sel.t === "animal") { const a = data.animals[sel.i]; return [a[A.lng], a[A.lat]]; }
    if (sel.t === "cell") return ix.cells.get(sel.key)!.center;
    if (sel.t === "area") return sel.center;
    if (sel.t === "locality") { const cs = [...ix.cells.values()].filter((c) => c.city === sel.city && c.locality === sel.name); return [cs.reduce((a, c) => a + c.center[0], 0) / cs.length, cs.reduce((a, c) => a + c.center[1], 0) / cs.length]; }
    const c = data.cities[city]; return [c.lng, c.lat];
  }, [sel, data, ix, city]);

  /* ── camera follows the selection ───────────────────────────────────── */
  const cam = useCallback((s: Sel, instant = false) => {
    const m = mapRef.current; if (!m) return;
    const d = instant ? 0 : 2400;
    const w = m.getContainer().clientWidth, pad = w > 900 ? { top: 90, bottom: 110, left: 60, right: drawer ? 460 : 60 } : { top: 110, bottom: 240, left: 16, right: 16 };
    if (view === "3d") {
      // The 3D ladder always looks at the selection: dog, its cluster, its locality, the city.
      if (s.t === "india") { fitFlat(m, INDIA, { top: 40, bottom: 40, left: 40, right: 40 }, d); return; }
      m.flyTo({ center: focusPt, zoom: STEP_Z[step] - (w > 900 ? 0 : 0.6), pitch: step === "city" ? 50 : 62, bearing: -24, duration: instant ? 0 : 3200, essential: true, padding: pad });
      return;
    }
    if (s.t === "india") fitFlat(m, INDIA, { top: 40, bottom: 40, left: 40, right: 40 }, d);
    else if (s.t === "city") fitFlat(m, data.cities[s.city].box, pad, d);
    else if (s.t === "animal") m.flyTo({ center: focusPt, zoom: 15.4, pitch: 0, bearing: 0, duration: instant ? 0 : 3000, essential: true, padding: pad });
    else if (s.t === "cell") m.flyTo({ center: focusPt, zoom: 13.6, pitch: 0, bearing: 0, duration: d, padding: pad });
    else if (s.t === "area") m.flyTo({ center: focusPt, zoom: s.km > 1.5 ? 12.6 : 13.6, pitch: 0, bearing: 0, duration: d, padding: pad });
    else {
      const cs = [...ix.cells.values()].filter((c) => c.city === s.city && c.locality === s.name);
      const xs = cs.map((c) => c.center[0]), ys = cs.map((c) => c.center[1]);
      fitFlat(m, [Math.min(...xs) - 0.01, Math.min(...ys) - 0.01, Math.max(...xs) + 0.01, Math.max(...ys) + 0.01], pad, d, 14.5);
    }
  }, [view, step, focusPt, drawer, data, ix]);

  useEffect(() => {
    if (!ready) return;
    if (focusIdx >= 0) {
      // From a profile: open on the city, then travel to the dog.
      const c = data.cities[data.animals[focusIdx][A.city]];
      mapRef.current?.fitBounds(c.box, { duration: 0, padding: 20 });
      const id = setTimeout(() => cam(sel), 700);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => sel.t === "india" && setSel({ t: "city", city: 0 }), 1600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const first = useRef(true);
  useEffect(() => { if (!ready) return; if (first.current) { first.current = false; return; } if (!photoreal) cam(sel); }, [sel, view, step, ready, cam, photoreal]);
  // Entering 3D picks the rung that matches what is selected.
  // Leaving a dog in 3D: the "Dog" rung goes away, so step out to the one that matches the new selection.
  useEffect(() => { if (sel.t !== "animal" && step === "dog") setStep(sel.t === "city" ? "city" : sel.t === "locality" ? "locality" : "cluster"); }, [sel, step]);
  const enter3d = useCallback(() => { setStep(sel.t === "animal" ? "dog" : sel.t === "cell" || sel.t === "area" ? "cluster" : "locality"); setCov3d({ c: "checking" }); setView("3d"); }, [sel]);

  /* ── clicks and hover: animals first, then the cell underneath ───────── */
  const showCells = view === "2d" ? mode !== "animals" : hex3d;
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const onClick = (e: MapMouseEvent) => {
      if (areaTool) { setSel({ t: "area", city, center: [e.lngLat.lng, e.lngLat.lat], km: 1 }); setAreaTool(false); return; }
      const hits = m.queryRenderedFeatures(e.point, { layers: ["pts", "cl-pt", "cities", "cl", "prog", "cases"].filter((l) => m.getLayer(l) && m.getLayoutProperty(l, "visibility") !== "none") });
      const pt = hits.find((h) => h.layer.id === "pts" || h.layer.id === "cl-pt");
      if (pt) { setSel({ t: "animal", city, i: Number(pt.properties!.i) }); setCtx("none"); return; }
      if (hits.length || !showCells) return;
      const k = cellOf(e.lngLat.lng, e.lngLat.lat);
      const c = ix.cells.get(k);
      if (c && stats.get(k)?.animals) { setSel({ t: "cell", city: c.city, key: k }); setCtx("none"); }
    };
    const onMove = (e: MapMouseEvent) => {
      if (!showCells || m.getZoom() < 9) { setHover(null); return; }
      const c = ix.cells.get(cellOf(e.lngLat.lng, e.lngLat.lat));
      setHover(c && stats.get(c.key)?.animals ? { x: e.point.x, y: e.point.y, text: `${c.locality} · ${stats.get(c.key)!.animals}` } : null);
    };
    const onOut = () => setHover(null);
    m.on("click", onClick); m.on("mousemove", onMove); m.on("mouseout", onOut);
    m.getCanvas().style.cursor = areaTool ? "crosshair" : "";
    return () => { m.off("click", onClick); m.off("mousemove", onMove); m.off("mouseout", onOut); };
  }, [ready, areaTool, city, showCells, ix, stats]);

  /* ── the mode's value per cell ───────────────────────────────────────── */
  const valueOf = useCallback((s: CellStat) => {
    switch (mode) {
      case "animals": case "density": case "coverage": case "abc": case "arv": return s.animals;
      case "medical": return s.inj + s.help;
      case "cases": return s.open;
      case "projects": return prog === "abc" ? s.abc : prog === "vacc" ? s.arv : prog === "tvt" ? s.tvt : prog === "resident" ? s.residentReports : s.abc + s.arv + s.tvt + s.residentReports;
    }
  }, [mode, prog]);
  const quant = useMemo(() => {
    const vals = [...stats.values()].map(valueOf).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (f: number) => vals[Math.floor(f * (vals.length - 1))] ?? 1;
    return [q(0.25), q(0.5), q(0.75), q(0.92)];
  }, [stats, valueOf]);
  const rank = useCallback((v: number) => (v <= 0 ? -1 : quant.findIndex((s) => v <= s) === -1 ? 4 : quant.findIndex((s) => v <= s)), [quant]);
  const cellFill = useCallback((s: CellStat): RGBA => {
    if (mode === "coverage") return s.cov === "unmapped" ? [0, 0, 0, 0] : rgb(COV_COL[s.cov], s.cov === "insufficient" ? 0.55 : 0.9);
    if (mode === "abc" || mode === "arv") return rgb("#132b55", 0.55);
    const r = rank(valueOf(s)); if (r < 0) return [0, 0, 0, 0];
    return rgb((mode === "medical" ? FLAME : BLUE)[r], mode === "cases" ? 0.55 : 0.85);
  }, [mode, rank, valueOf]);

  /* ── deck.gl: cells, recorded shares, the unmapped frontier, the selection ── */
  useEffect(() => {
    const o = overlay.current; if (!o || !deck) return;
    const { H3HexagonLayer, PolygonLayer, PathStyleExtension } = deck;
    // Wide: the cell is the unit. Close in it steps back so streets and animals read through.
    const fade = view === "3d" ? 0.55 : zoom < 13 ? 1 : zoom > 15.5 ? 0.12 : 1 - ((zoom - 13) / 2.5) * 0.88;
    const cityStats = [...stats.values()].filter((s) => ix.cells.get(s.key)!.city === city || sel.t === "india");
    const drawn = cityStats.filter((s) => (mode === "coverage" ? s.cov !== "unmapped" : mode === "abc" || mode === "arv" ? s.animals > 0 : valueOf(s) > 0));
    const layers: unknown[] = [];
    if (showCells) {
      layers.push(new H3HexagonLayer<CellStat>({
        id: "cells", data: drawn, getHexagon: (s: CellStat) => s.key, extruded: false, filled: true, stroked: true,
        getFillColor: cellFill, getLineColor: rgb("#081631", 0.9), lineWidthMinPixels: 0.8, opacity: fade,
        highPrecision: false, updateTriggers: { getFillColor: [mode, prog, quant] },
      } as never));
      if (mode === "abc" || mode === "arv") {
        // Recorded share drawn solid inside the cell; the unfilled rest is "not recorded", never "not done".
        const inner: { ring: [number, number][]; c: RGBA }[] = [];
        for (const s of drawn) {
          const c = ix.cells.get(s.key)!, share = (mode === "abc" ? s.ster : s.vacc) / s.animals;
          if (share > 0) inner.push({ ring: scaleRing(c.ring, c.center, 0.94 * Math.sqrt(share)), c: rgb(mode === "abc" ? "#4f7fe0" : "#7fc9d6", 0.95) });
          if (mode === "arv" && s.due > 0) inner.push({ ring: scaleRing(c.ring, c.center, 0.18), c: rgb("#f05b40") });
        }
        layers.push(new PolygonLayer<{ ring: [number, number][]; c: RGBA }>({ id: "inner", data: inner, getPolygon: (d: { ring: [number, number][] }) => d.ring, getFillColor: (d: { c: RGBA }) => d.c, stroked: false, opacity: fade } as never));
      }
      if (mode === "coverage" && sel.t !== "india") {
        layers.push(new H3HexagonLayer<(typeof front)[number]>({
          id: "front", data: front, getHexagon: (f: { key: string }) => f.key, filled: false, stroked: true, extruded: false,
          getLineColor: (f: { near: boolean }) => rgb("#f3ede4", f.near ? 0.32 : 0.14), lineWidthMinPixels: 1, getDashArray: [3, 3], dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })], opacity: fade,
        } as never));
      }
    }
    const outline = sel.t === "cell" ? [sel.key] : sel.t === "locality" ? [...ix.cells.values()].filter((c) => c.city === sel.city && c.locality === sel.name).map((c) => c.key) : sel.t === "animal" && showCells ? [ix.cellOfAnimal[sel.i]] : [];
    if (outline.length) layers.push(new H3HexagonLayer<string>({ id: "sel", data: outline, getHexagon: (k: string) => k, filled: false, stroked: true, extruded: false, getLineColor: rgb("#f3ede4", 0.9), lineWidthMinPixels: 1.8 } as never));
    o.setProps({ layers: layers as never });
  }, [deck, stats, ix, city, sel, mode, prog, quant, valueOf, cellFill, front, showCells, zoom, view]);

  /* ── MapLibre: animals, cases, programmes, and the 3D fallback ───────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const vis = (id: string, on: boolean) => m.getLayer(id) && m.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    const three = view === "3d";
    const clusterOn = field && (mode === "animals" || three);
    ["cl", "cl-n", "cl-pt"].forEach((l) => vis(l, clusterOn));
    vis("pts", field && !three && (mode === "density" || mode === "medical" || mode === "abc" || mode === "arv" || mode === "coverage"));
    vis("prog", field && !three && mode === "projects");
    vis("cases", mode === "cases" || mode === "medical");
    vis("next", !three && mode === "coverage"); vis("next-n", !three && mode === "coverage");
    vis("sat", three && imagery);
    if (m.getLayer("bld3d")) vis("bld3d", three);
    labelIds.current.forEach((id) => vis(id, !three || !imagery));
    if (three) { m.dragRotate.enable(); m.touchZoomRotate.enableRotation(); }

    const vA: number[] = [];
    data.animals.forEach((a, i) => { if (animalVisible(data, i, t, filters)) vA.push(i); });
    const ptColor = (i: number) => { const a = data.animals[i]; if (mode === "coverage") { const since = t - Math.min(a[A.last] ?? 0, t); return since <= 180 ? "#93b1f0" : since <= 365 ? "#4f7fe0" : "rgba(243,237,228,0.32)"; } if (mode === "abc") return a[A.ster] ? "#93b1f0" : "rgba(243,237,228,0.5)"; if (mode === "arv") return a[A.lastVacc] >= 0 && a[A.lastVacc] < t - 365 ? "#f05b40" : a[A.vacc] ? "#9fe0e8" : "rgba(243,237,228,0.35)"; if (mode === "medical") return a[A.inj] || a[A.help] ? "#f05b40" : "rgba(243,237,228,0.25)"; return "#f3ede4"; };
    const ptsFC = { type: "FeatureCollection" as const, features: vA.map((i) => ({ type: "Feature" as const, properties: { i, c: ptColor(i), inj: data.animals[i][A.inj] || data.animals[i][A.help] }, geometry: { type: "Point" as const, coordinates: [data.animals[i][A.lng], data.animals[i][A.lat]] } })) };
    (m.getSource("pts") as GeoJSONSource).setData(ptsFC);
    (m.getSource("clusters") as GeoJSONSource).setData(ptsFC);

    if (mode === "projects") {
      const pf: GeoJSON.Feature[] = [];
      const colOf: Record<string, string> = { abc: "#4f7fe0", vacc: "#7fc9d6", tvt: "#f3ede4", resident: "#f7c16c" };
      const add = (i: number, k: string) => { const a = data.animals[i]; pf.push({ type: "Feature", properties: { i, c: colOf[k] }, geometry: { type: "Point", coordinates: [a[A.lng], a[A.lat]] } }); };
      data.events.forEach((e) => { if (e[1] > t) return; if (e[2] === 2 && (prog === "all" || prog === "abc")) add(e[0], "abc"); if (e[2] === 3 && (prog === "all" || prog === "vacc")) add(e[0], "vacc"); });
      if (prog === "all" || prog === "tvt") data.cases.forEach((c) => { if (c[1] <= t && c[2] === 2) add(c[0], "tvt"); });
      if (prog === "all" || prog === "resident") vA.forEach((i) => { if (data.animals[i][A.resident]) add(i, "resident"); });
      (m.getSource("prog") as GeoJSONSource).setData({ type: "FeatureCollection", features: pf });
    }
    const open: GeoJSON.Feature[] = [];
    data.cases.forEach((c) => {
      if (!caseOpenAt(c, t)) return;
      if (mode === "medical" && c[2] === 12) return;
      const a = data.animals[c[0]];
      open.push({ type: "Feature", properties: { age: t - c[1], crit: CRITICAL.has(c[2]) ? 1 : 0 }, geometry: { type: "Point", coordinates: [a[A.lng], a[A.lat]] } });
    });
    (m.getSource("cases") as GeoJSONSource).setData({ type: "FeatureCollection", features: open });
    (m.getSource("next") as GeoJSONSource).setData({ type: "FeatureCollection", features: next.map((n, i) => ({ type: "Feature", properties: { n: String(i + 1) }, geometry: { type: "Point", coordinates: n.center } })) });
  }, [ready, bld, mode, view, imagery, prog, field, data, t, filters, next]);

  /* ── the focus dog: precision ring, beacon, pulse ───────────────────── */
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const fc = (f: GeoJSON.Feature[]) => ({ type: "FeatureCollection" as const, features: f });
    // Street views show how precise the published position is (~1 km), not a false pinpoint.
    (m.getSource("selo") as GeoJSONSource).setData(fc(sel.t === "animal" && !showCells ? [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: circle(focusPt, 0.5) } }] : []));
    (m.getSource("area") as GeoJSONSource).setData(fc(sel.t === "area" ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circle(sel.center, sel.km)] } }] : []));
    let raf = 0;
    if (sel.t === "animal") {
      const recs = ix.eventsByAnimal[sel.i].length + ix.casesByAnimal[sel.i].length;
      (m.getSource("beacon") as GeoJSONSource).setData(fc(view === "3d" ? [{ type: "Feature", properties: { h: 45 + recs * 6 }, geometry: { type: "Polygon", coordinates: [circle(focusPt, 0.007)] } }] : []));
      (m.getSource("pulse") as GeoJSONSource).setData(fc([{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: focusPt } }]));
      const t0 = performance.now();
      const tick = (now: number) => { const k = ((now - t0) % 2200) / 2200; m.setPaintProperty("pulse", "circle-radius", 10 + k * 26); m.setPaintProperty("pulse", "circle-stroke-opacity", 0.9 * (1 - k)); raf = requestAnimationFrame(tick); };
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) raf = requestAnimationFrame(tick);
    } else { (m.getSource("beacon") as GeoJSONSource).setData(fc([])); (m.getSource("pulse") as GeoJSONSource).setData(fc([])); }
    return () => cancelAnimationFrame(raf);
  }, [sel, ready, view, showCells, focusPt, ix]);

  /* ── time: play the city forward ─────────────────────────────────────── */
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMonth((mo) => { if (mo >= STEPS - 1) { setPlaying(false); return STEPS - 1; } return mo + 1; }), 650);
    return () => clearInterval(id);
  }, [playing]);

  /* ── what the selection holds (analytics) ────────────────────────────── */
  const selAnimals = useMemo(() => {
    const inSel = (i: number) => {
      const a = data.animals[i];
      if (sel.t === "india") return true;
      if (a[A.city] !== sel.city) return false;
      if (sel.t === "city") return true;
      if (sel.t === "cell") return ix.cellOfAnimal[i] === sel.key;
      if (sel.t === "locality") return ix.cells.get(ix.cellOfAnimal[i])!.locality === sel.name;
      if (sel.t === "area") return kmBetween([a[A.lng], a[A.lat]], sel.center) <= sel.km;
      return ix.cellOfAnimal[i] === ix.cellOfAnimal[sel.i];
    };
    return data.animals.map((_, i) => i).filter((i) => inSel(i) && animalVisible(data, i, t, filters));
  }, [sel, data, ix, t, filters]);
  const agg = useMemo(() => {
    const set = new Set(selAnimals);
    const n = selAnimals.length;
    let ster = 0, vacc = 0, due = 0, help = 0, inj = 0, rep = 0, res = 0;
    for (const i of selAnimals) { const a = data.animals[i]; ster += a[A.ster]; vacc += a[A.vacc]; help += a[A.help]; inj += a[A.inj]; rep += a[A.dates] > 1 ? 1 : 0; res += a[A.resident]; if (a[A.lastVacc] >= 0 && a[A.lastVacc] < t - 365) due++; }
    const ev = data.events.filter((e) => set.has(e[0]) && e[1] <= t);
    const cs = data.cases.filter((c) => set.has(c[0]) && c[1] <= t);
    const open = cs.filter((c) => caseOpenAt(c, t));
    const byKind = KINDS.map((k, ki) => ({ k, n: ev.filter((e) => e[2] === ki).length })).filter((x) => x.n);
    const byCond = data.conditions.map((k, ki) => ({ k, n: cs.filter((c) => c[2] === ki).length })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    const outcomes = OUTCOMES.map((k, oi) => ({ k, n: cs.filter((c) => c[3] === 0 && c[4] === oi).length }));
    const monthly = new Array(STEPS).fill(0); ev.forEach((e) => { const mo = monthOf(e[1]); if (mo >= 0 && mo < STEPS) monthly[mo]++; });
    const last = ev.reduce((a, e) => Math.max(a, e[1]), -1);
    const cellsIn = new Set(selAnimals.map((i) => ix.cellOfAnimal[i]));
    const covCount = COV_ORDER.map((c) => ({ c, n: [...cellsIn].filter((k) => stats.get(k)?.cov === c).length }));
    return { n, ster, vacc, due, help, inj, rep, res, ev, cs, open, byKind, byCond, outcomes, monthly, last, cellsIn, covCount, crit: open.filter((c) => CRITICAL.has(c[2])).length };
  }, [selAnimals, data, t, ix, stats]);

  /* ── the 3D city's inputs: the dog, the city's other animals, open cases, cells on request ── */
  const pts3d = useMemo((): City3DPoint[] => {
    if (view !== "3d") return [];
    const openBy = new Set(data.cases.filter((c) => caseOpenAt(c, t)).map((c) => c[0]));
    const out: City3DPoint[] = [];
    data.animals.forEach((a, i) => { if (a[A.city] !== city || !animalVisible(data, i, t, filters)) return; out.push({ lng: a[A.lng], lat: a[A.lat], kind: sel.t === "animal" && sel.i === i ? "dog" : openBy.has(i) ? "case" : a[A.help] || a[A.inj] ? "help" : "other" }); });
    return out;
  }, [view, data, t, filters, city, sel]);
  const cells3d = useMemo((): City3DCell[] => (view === "3d" && hex3d ? [...stats.values()].filter((s) => ix.cells.get(s.key)!.city === city && valueOf(s) > 0).map((s) => { const f = cellFill(s); return { ring: ix.cells.get(s.key)!.ring, rgba: [f[0], f[1], f[2], 0.45] as RGBA }; }) : []), [view, hex3d, stats, ix, city, valueOf, cellFill]);
  const focus3d = useMemo(() => ({ lng: focusPt[0], lat: focusPt[1], records: sel.t === "animal" ? ix.eventsByAnimal[sel.i].length + ix.casesByAnimal[sel.i].length : 0 }), [focusPt, sel, ix]);
  const onCov = useCallback((c: Coverage, detail?: string) => setCov3d((p) => (p.c === "error" ? p : { c, detail })), []);

  /* ── labels ──────────────────────────────────────────────────────────── */
  const cityName = data.cities[city]?.name ?? "India";
  const selName = sel.t === "india" ? "India" : sel.t === "city" ? cityName : sel.t === "locality" ? sel.name : sel.t === "cell" ? ix.cells.get(sel.key)!.locality : sel.t === "area" ? `${sel.km} km around a point` : `Dog ${data.animals[sel.i][A.id].slice(0, 4)}·${data.animals[sel.i][A.id].slice(4)}`;
  const crumbs: { label: string; go: () => void }[] = [{ label: "India", go: () => setSel({ t: "india" }) }];
  if (sel.t !== "india") crumbs.push({ label: cityName, go: () => setSel({ t: "city", city }) });
  const locName = sel.t === "locality" ? sel.name : sel.t === "cell" ? ix.cells.get(sel.key)!.locality : sel.t === "animal" ? ix.cells.get(ix.cellOfAnimal[sel.i])!.locality : null;
  if (locName && city === 0) crumbs.push({ label: `${locName} area`, go: () => setSel({ t: "locality", city, name: locName }) });
  if (sel.t === "cell") crumbs.push({ label: "Cell", go: () => {} });
  if (sel.t === "animal") { const k = ix.cellOfAnimal[sel.i]; if (view === "2d" && mode !== "animals") crumbs.push({ label: "Cell", go: () => setSel({ t: "cell", city, key: k }) }); crumbs.push({ label: `Dog ${data.animals[sel.i][A.id].slice(0, 4)}`, go: () => {} }); }
  if (sel.t === "area") crumbs.push({ label: `${sel.km} km area`, go: () => {} });
  const M = MODES.find((x) => x.id === mode)!;
  const cellStat = sel.t === "cell" ? stats.get(sel.key) : undefined;
  const monthly = useMemo(() => { const arr = new Array(STEPS).fill(0); data.events.forEach((e) => { if (data.animals[e[0]][A.city] === city) { const mo = monthOf(e[1]); if (mo >= 0 && mo < STEPS) arr[mo]++; } }); return arr; }, [data, city]);
  const mmax = Math.max(1, ...monthly);
  const focus = sel.t === "animal" ? data.animals[sel.i] : null;
  const focusEv = sel.t === "animal" ? ix.eventsByAnimal[sel.i].map((e) => data.events[e]).sort((a, b) => a[1] - b[1]) : [];
  const nearby = sel.t === "animal" && focus ? data.animals.map((a, i) => ({ i, d: kmBetween([a[A.lng], a[A.lat]], [focus[A.lng], focus[A.lat]]) })).filter((x) => x.i !== sel.i && x.d <= 1 && animalVisible(data, x.i, t, filters)) : [];
  const nearCases = sel.t === "animal" && focus ? data.cases.filter((c) => caseOpenAt(c, t) && kmBetween([data.animals[c[0]][A.lng], data.animals[c[0]][A.lat]], [focus[A.lng], focus[A.lat]]) <= 2) : [];
  const ramp = mode === "coverage" || mode === "abc" || mode === "arv" || mode === "animals" ? null : mode === "medical" ? FLAME : BLUE;
  const source3d = !key ? "OpenStreetMap buildings · no Google key set" : cov3d.c === "checking" ? "Google 3D · loading" : cov3d.c === "photoreal" ? "Google Photorealistic 3D" : cov3d.c === "none" ? "No photorealistic coverage here · OpenStreetMap buildings" : "Google 3D refused · OpenStreetMap buildings";

  return (
    <div className={`sp v-${view}${photoreal ? " photoreal" : ""}${drawer ? " drawer" : ""}${sel.t !== "india" && sel.t !== "city" ? " has-focus" : ""}`}>
      <div ref={el} className="sp-map" />
      {view === "3d" && key && cov3d.c !== "none" && cov3d.c !== "error" && sel.t !== "india" && (
        <City3D apiKey={key} focus={focus3d} points={pts3d} cells={cells3d} step={step} onCoverage={onCov}
          onPick={(k) => { const i = data.animals.findIndex((a) => a[A.city] === city && a[A.lng] === pts3d[k]?.lng && a[A.lat] === pts3d[k]?.lat); if (i >= 0) setSel({ t: "animal", city, i }); }} />
      )}
      {hover && !areaTool && view === "2d" && <div className="sp-hover" style={{ left: hover.x + 14, top: hover.y + 14 }}>{hover.text}</div>}

      <nav className="sp-crumbs" aria-label="Scale">
        {crumbs.map((c, i) => <span key={c.label + i}>{i > 0 && <i>›</i>}<button type="button" onClick={c.go} aria-current={i === crumbs.length - 1 ? "location" : undefined}>{c.label}</button></span>)}
      </nav>

      {view === "2d" && <>
        <div className="sp-modes" role="tablist" aria-label="Map mode">
          {MODES.map((x) => <button key={x.id} type="button" role="tab" aria-selected={mode === x.id} onClick={() => setMode(x.id)}>{x.label}</button>)}
        </div>
        <p className="sp-q">{M.q}{mode === "projects" && (
          <span className="sp-prog">{([["all", "All"], ["abc", "ABC"], ["vacc", "Vaccination"], ["tvt", "TVT"], ["resident", "Residents"]] as [Programme, string][]).map(([k, l]) => <button key={k} type="button" aria-pressed={prog === k} onClick={() => setProg(k)}>{l}</button>)}</span>
        )}</p>
      </>}
      {view === "3d" && sel.t !== "india" && (
        <div className="sp-ladder" role="group" aria-label="Distance">
          {LADDER.filter((s) => s !== "dog" || sel.t === "animal").map((s) => <button key={s} type="button" aria-pressed={step === s} onClick={() => setStep(s)}>{s === "dog" ? "Dog" : s === "cluster" ? "Cluster" : s === "locality" ? "Locality" : "City"}</button>)}
        </div>
      )}

      <div className="sp-tools">
        <div className="sp-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "2d"} onClick={() => setView("2d")}>2D Intelligence</button>
          <button type="button" aria-pressed={view === "3d"} onClick={enter3d}>3D City</button>
        </div>
        {view === "3d" && <button type="button" className={`sp-tool${hex3d ? " on" : ""}`} onClick={() => setHex3d((x) => !x)}>Cells</button>}
        {view === "3d" && !photoreal && <button type="button" className={`sp-tool${imagery ? " on" : ""}`} onClick={() => setImagery((x) => !x)}>Imagery</button>}
        {view === "2d" && <button type="button" className={`sp-tool${areaTool ? " on" : ""}`} onClick={() => setAreaTool((a) => !a)} title="Select an area">Area</button>}
        {view === "2d" && <button type="button" className="sp-tool" onClick={() => setFilterOpen((f) => !f)}>Filters{nActive ? <b>{nActive}</b> : null}</button>}
        <button type="button" className={`sp-tool strong${drawer ? " on" : ""}`} onClick={() => setDrawer((d) => !d)}>Analytics</button>
      </div>

      {filterOpen && view === "2d" && (
        <div className="sp-filters" role="dialog" aria-label="Filters">
          {([
            ["ster", "Sterilisation", [["any", "Any"], ["yes", "Recorded sterilised"], ["unknown", "Not recorded"]]],
            ["vacc", "Vaccination", [["any", "Any"], ["yes", "Recorded"], ["unknown", "Not recorded"], ["due", "Booster due"]]],
            ["cond", "Condition", [["any", "Any"], ["help", "Needs help"], ["injured", "Injured"]]],
            ["seen", "Last seen", [["any", "Any time"], ["90", "90 days"], ["365", "12 months"]]],
            ["source", "Recorded by", [["all", "Anyone"], ["field", "Field team"], ["resident", "Resident"]]],
            ["repeat", "Repeat", [["all", "All"], ["repeat", "Recorded on 2+ dates"]]],
          ] as [keyof Filters, string, [string, string][]][]).map(([k, label, opts]) => (
            <div key={k} className="row"><span>{label}</span><div className="sp-seg sm">{opts.map(([v, l]) => <button key={v} type="button" aria-pressed={filters[k] === v} onClick={() => setFilters((f) => ({ ...f, [k]: v }))}>{l}</button>)}</div></div>
          ))}
          <div className="row"><span>Precision</span><div className="sp-seg sm"><button type="button" aria-pressed={!field} onClick={() => setField(false)}>Public · cells only</button><button type="button" aria-pressed={field} onClick={() => setField(true)}>Field team · animals</button></div></div>
          <p className="note">Sex is not in the public record, so it cannot be filtered here. &ldquo;Not recorded&rdquo; is never read as &ldquo;not sterilised&rdquo;. Public precision draws cells only; field-team precision adds each animal at its published position (about 1 km).</p>
          <div className="foot"><button type="button" className="sp-link" onClick={() => setFilters(NO_FILTERS)}>Clear</button><button type="button" className="sp-tool strong" onClick={() => setFilterOpen(false)}>Done</button></div>
        </div>
      )}

      {/* legend: one line, no box */}
      <div className="sp-legend" aria-hidden>
        {view === "3d" ? <>
          <span className="src">{source3d}</span>
          <span><i className="dot" style={{ background: "#f05b40" }} />this dog · needs help</span><span><i className="dot" style={{ background: "#f3ede4" }} />other dogs · groups show a count</span>
        </> : <>
          {mode === "coverage" && <>{(["strong", "partial", "weak", "insufficient"] as Cov[]).map((c) => <span key={c}><i style={{ background: COV_COL[c], opacity: c === "insufficient" ? 0.6 : 1 }} />{c}</span>)}<span><i className="hx" />unmapped</span><span><i className="ring" />map next</span></>}
          {(mode === "abc" || mode === "arv") && <><span><i style={{ background: "#132b55" }} />not recorded</span><span><i style={{ background: mode === "abc" ? "#4f7fe0" : "#7fc9d6" }} />recorded {mode === "abc" ? "sterilised" : "vaccinated"} · share of cell</span>{mode === "arv" && <span><i style={{ background: "#f05b40" }} />booster due</span>}</>}
          {mode === "animals" && <span>groups split into single dogs as you zoom in</span>}
          {ramp && <><span className="lo">fewer</span>{ramp.map((c) => <i key={c} style={{ background: c }} />)}<span className="lo">more {mode === "medical" ? "injured" : mode === "cases" ? "open cases" : mode === "projects" ? "programme records" : "dogs recorded"}</span></>}
          {(mode === "cases" || mode === "medical") && <span><i className="dot crit" />urgent</span>}
        </>}
      </div>

      {/* time: one quiet line at the foot of the map */}
      <div className="sp-time">
        <button type="button" className="play" onClick={() => { if (month >= STEPS - 1) setMonth(0); setPlaying((p) => !p); }} aria-label={playing ? "Pause" : "Play 2024 to 2026"}>{playing ? "❚❚" : "▶"}</button>
        <div className="track">
          <div className="bars" aria-hidden>{monthly.map((v, i) => <i key={i} className={i <= month ? "on" : ""} style={{ height: `${Math.max(6, (v / mmax) * 100)}%` }} />)}</div>
          <input type="range" min={0} max={STEPS - 1} value={month} onChange={(e) => { setPlaying(false); setMonth(+e.target.value); }} aria-label="Month" />
        </div>
        <span className="when m">{month >= STEPS - 1 ? "Today" : monthLabel(month)}</span>
      </div>

      {/* focus: small, only when something is selected */}
      {(sel.t !== "india" && sel.t !== "city") && (
        <aside className="sp-focus" aria-live="polite">
          <button type="button" className="sp-close" onClick={() => setSel({ t: "city", city })} aria-label="Close and return to the city">×</button>
          {sel.t === "animal" && focus ? (
            <>
              <span className="lbl">Dog · animal record</span>
              <h2 className="m">{focus[A.id].slice(0, 4)}·{focus[A.id].slice(4)}</h2>
              <p className="meta">{data.zones[focus[A.zone]] || "place not named"} · published to ~1 km · {focusEv.length} records{focus[A.dates] > 1 ? ` on ${focus[A.dates]} dates` : ""}</p>
              <ul className="facts">
                <li className={focus[A.ster] ? "yes" : "unk"}>ABC {focus[A.ster] ? "recorded" : "not recorded"}</li>
                <li className={focus[A.vacc] ? "yes" : "unk"}>ARV {focus[A.vacc] ? (focus[A.lastVacc] >= 0 && focus[A.lastVacc] < t - 365 ? "· booster due" : "recorded") : "not recorded"}</li>
                {(focus[A.inj] || focus[A.help]) ? <li className="need">Needs help</li> : null}
              </ul>
              <div className="ctx">
                <button type="button" aria-pressed={ctx === "history"} onClick={() => setCtx(ctx === "history" ? "none" : "history")}>Sightings · {focus[A.dates]}</button>
                <button type="button" aria-pressed={ctx === "nearby"} onClick={() => setCtx(ctx === "nearby" ? "none" : "nearby")}>Nearby · {nearby.length}</button>
                <button type="button" aria-pressed={ctx === "cases"} onClick={() => { setCtx(ctx === "cases" ? "none" : "cases"); if (view === "2d") setMode("cases"); }}>Open cases · {nearCases.length}</button>
              </div>
              {ctx === "history" && (
                <ol className="hist">
                  {focusEv.length === 0 && <li className="dim">No dated field records.</li>}
                  {focusEv.map((e, k) => <li key={k}><span className="m">{dayLabel(e[1])}</span><span>{KINDS[e[2]]}</span></li>)}
                  <li className="dim">Every sighting is at the same place — no movement recorded.</li>
                </ol>
              )}
              {ctx === "nearby" && <p className="meta">{nearby.length} dogs recorded within 1 km · {nearby.filter((x) => data.animals[x.i][A.ster]).length} with ABC recorded · {nearby.filter((x) => data.animals[x.i][A.help]).length} needing help.</p>}
              <div className="acts">
                {view !== "3d" ? <button type="button" className="sp-tool strong" onClick={enter3d}>View in city</button> : <button type="button" className="sp-tool" onClick={() => setView("2d")}>Back to 2D</button>}
                {focus[A.id] === "acf85c40" && <Link className="sp-link" href="/lab/system/animal">Open profile →</Link>}
                {focus[A.id] === "e139dddf" && <Link className="sp-link" href="/lab/system/case">Open case →</Link>}
              </div>
            </>
          ) : (
            <>
              <span className="lbl">{sel.t === "cell" ? `Cell · ${CELL_KM2.toFixed(2)} km² · ${cellStat ? COV_TEXT[cellStat.cov].split(":")[0].toLowerCase() : ""}` : sel.t === "locality" ? "Locality" : "Custom area"}</span>
              <h2>{selName}</h2>
              <dl className="nums">
                <div><dt>Dogs recorded</dt><dd className="m">{fmt(agg.n)}</dd></div>
                <div><dt>Open cases</dt><dd className={`m${agg.open.length ? " need" : ""}`}>{agg.open.length}</dd></div>
                <div><dt>ABC recorded</dt><dd className="m">{pct(agg.ster, agg.n)}%</dd></div>
                <div><dt>Repeat animals</dt><dd className="m">{agg.rep}</dd></div>
              </dl>
              <div className="acts">
                <button type="button" className="sp-tool strong" onClick={() => setDrawer(true)}>Why · analytics</button>
                {view === "2d" && <button type="button" className="sp-link" onClick={enter3d}>View in city</button>}
                {sel.t === "cell" && city === 0 && <button type="button" className="sp-link" onClick={() => setSel({ t: "locality", city, name: ix.cells.get(sel.key)!.locality })}>Whole locality</button>}
                {sel.t === "area" && [0.5, 1, 2].map((k) => <button key={k} type="button" className="sp-link" aria-pressed={sel.km === k} onClick={() => setSel({ ...sel, km: k })}>{k} km</button>)}
              </div>
            </>
          )}
        </aside>
      )}

      {/* analytics drawer: where the numbers and the reasons live */}
      {drawer && (
        <aside className="sp-drawer" aria-label="Analytics">
          <div className="dh"><div><span className="lbl">Analytics · {month >= STEPS - 1 ? "to date" : `to ${monthLabel(month)}`}{nActive ? ` · ${nActive} filter${nActive > 1 ? "s" : ""}` : ""}</span><h2>{selName}</h2></div><button type="button" className="x" onClick={() => setDrawer(false)} aria-label="Close analytics">×</button></div>
          {sel.t === "india" && <p className="note">{fmt(data.animals.length)} animals placed in {data.cities.length} cities. {Object.entries(data.held).map(([k, v]) => `${v} held back: ${k}`).join(" · ")} — a location that contradicts its own record is not drawn.</p>}
          <dl className="big">
            <div><dt>Dogs recorded</dt><dd>{fmt(agg.n)}</dd><span>{agg.cellsIn.size ? `${(agg.n / (agg.cellsIn.size * CELL_KM2)).toFixed(1)} per km² in the ${agg.cellsIn.size} cells where they are` : ""}</span></div>
            <div><dt>Open cases</dt><dd className={agg.open.length ? "need" : ""}>{agg.open.length}</dd><span>{agg.crit} urgent</span></div>
            <div><dt>Needing help</dt><dd className={agg.help ? "need" : ""}>{agg.help}</dd><span>{agg.inj} marked injured</span></div>
            <div><dt>Repeat animals</dt><dd>{agg.rep}</dd><span>recorded on 2+ dates</span></div>
          </dl>
          <section><h3>ABC · sterilisation</h3><Split a={agg.ster} n={agg.n} col="#4f7fe0" label="recorded sterilised" /><p className="note">No animal is recorded as <i>not</i> sterilised; the rest is unknown.</p></section>
          <section><h3>ARV · vaccination</h3><Split a={agg.vacc} n={agg.n} col="#7fc9d6" label="recorded vaccinated" /><p className="note">{agg.due} with the last dose over a year ago — booster due, derived from dose dates.</p></section>
          <section><h3>Mapping coverage</h3>
            <ul className="cov">{agg.covCount.filter((c) => c.c !== "unmapped").map((c) => <li key={c.c}><i style={{ background: COV_COL[c.c] }} /><span>{COV_TEXT[c.c]}</span><b className="m">{c.n}</b></li>)}</ul>
            {(sel.t === "city" || sel.t === "india") && next.length > 0 && <>
              <h4>Where to map next</h4>
              <ol className="next">{next.slice(0, 6).map((p, i) => <li key={p.key}><button type="button" onClick={() => { setMode("coverage"); setView("2d"); setSel({ t: "area", city, center: p.center, km: 1 }); }}><b className="m">{i + 1}</b><span><strong>near {p.locality}</strong>{p.reasons.join(" · ")}</span></button></li>)}</ol>
            </>}
          </section>
          <section><h3>Field activity</h3>
            <svg viewBox="0 0 330 46" width="100%" aria-hidden>{agg.monthly.map((v, i) => { const h = (v / Math.max(1, ...agg.monthly)) * 40; return <rect key={i} x={i * 10} y={44 - h} width="7" height={Math.max(h, v ? 2 : 0.8)} fill={v ? "#93b1f0" : "rgba(243,237,228,.18)"} />; })}</svg>
            <p className="note">{fmt(agg.ev.length)} field records · last {agg.last >= 0 ? `${dayLabel(agg.last)} (${t - agg.last} days before)` : "none"}</p>
            <ul className="kinds">{agg.byKind.map((k) => <li key={k.k}><span>{k.k}</span><b className="m">{k.n}</b></li>)}</ul>
          </section>
          <section><h3>Cases by condition</h3><ul className="kinds">{agg.byCond.slice(0, 8).map((k) => <li key={k.k}><span>{k.k}</span><b className="m">{k.n}</b></li>)}</ul>
            <p className="note">Outcomes of closed cases: {agg.outcomes.filter((o) => o.n).map((o) => `${o.k.toLowerCase()} ${o.n}`).join(" · ") || "none"}.</p></section>
          <section><h3>Who recorded it</h3><ul className="kinds"><li><span>Field partner</span><b className="m">{agg.n - agg.res}</b></li><li><span>Residents</span><b className="m">{agg.res}</b></li></ul></section>
          <section><h3>Animals here</h3><ol className="animals">{selAnimals.slice(0, 40).map((i) => { const a = data.animals[i]; return <li key={i}><button type="button" onClick={() => setSel({ t: "animal", city: a[A.city], i })}><span className="m">{a[A.id].slice(0, 4)}·{a[A.id].slice(4)}</span><span className="tags">{a[A.help] ? <em className="need">help</em> : null}{a[A.ster] ? <em>ABC</em> : null}{a[A.vacc] ? <em>ARV</em> : null}</span><span className="m dim">{a[A.last] != null ? dayLabel(Math.min(a[A.last]!, t)) : ""}</span></button></li>; })}</ol>{selAnimals.length > 40 && <p className="note">and {selAnimals.length - 40} more</p>}</section>
          <p className="src">Public register, {data.snapshot}. Positions published to ~1 km. Density means dogs recorded, never dogs present.</p>
        </aside>
      )}
    </div>
  );
}

function Split({ a, n, col, label }: { a: number; n: number; col: string; label: string }) {
  const p = n ? a / n : 0;
  return (
    <div className="split">
      <div className="bar"><i style={{ width: `${p * 100}%`, background: col }} /></div>
      <p><b className="m">{a}</b> {label} · <b className="m">{n - a}</b> not recorded · of {n}</p>
    </div>
  );
}
