"use client";

/* ════════════════════════════════════════════════════════════════════
   The live map at the heart of every dashboard.

   Daylight paper cartography. Far out, H3 analysis cells are a calm
   choropleth of the role's measure; closer in, each cell shows its count;
   at street level the cells fade to outlines and every recorded animal
   appears as a dot (coral when it needs help). Hover reads, click glides
   in and selects. A 3D column view is one press away.

   Privacy: a dot is placed inside its own cell, at a stable but
   illustrative spot. No coordinate finer than the H3 cell is ever drawn,
   and the legend says so.
   ════════════════════════════════════════════════════════════════════ */

import { roundCell } from "@/lib/spatial/round";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification, MapGeoJSONFeature } from "maplibre-gl";
import { cellToBoundary, cellToLatLng, isValidCell } from "h3-js";
import { Box, Minus, Plus, Scan, Square } from "lucide-react";
import { supportsWebGL2, groundStyle, underlay, PAPER, FONT_BOLD, type Palette } from "@/components/map/basemap";
import { pointInCell } from "@/components/spatial/data";

export type MapCell = { h3: string; value: number; hot?: number; label?: string | null };
/** One recorded animal (or case), placed illustratively inside its cell. k: 1 needs help, 2 cared for, 0 on record. */
export type MapDot = { lng: number; lat: number; k: 0 | 1 | 2; h3: string; id?: string };
/** @deprecated kept for older callers; use dots. */
export type MapPoint = { lng: number; lat: number; hot?: boolean };
export type MapTone = "blue" | "flame" | "teal";

const RAMPS: Record<MapTone, string[]> = {
  blue: ["#e2eafb", "#bccdf4", "#86a5ea", "#4a76dd", "#2457ce"],
  flame: ["#fde7e1", "#f9c3b4", "#f49279", "#f05b40", "#c2401f"],
  teal: ["#dff1f3", "#b3dde2", "#77bfc8", "#3c98a8", "#1d6f7d"],
};
const DOT = { hot: "#f05b40", care: "#1d8a99", on: "#2457ce" };
const PAL: Palette = {
  ...PAPER,
  bg: "#f4efe6", land: "#f4efe6", water: "#c8dbf3", park: "#dfe9d2", building: "#e8e0d2",
  road: "rgba(11,30,61,0.075)", roadMajor: "rgba(11,30,61,0.17)", rail: "rgba(11,30,61,0.1)",
  boundary: "rgba(11,30,61,0.24)", label: "#3a4a68", labelHalo: "#f7f3ec", labelOpacity: 0.9,
  labels: true, minorRoads: true, buildings: true, showRoadNames: true,
};
/* Zoom at which cells hand over to individual dots. */
const DOTS_IN = 12.6, DOTS_FULL = 13.6;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMPTY = { type: "FeatureCollection" as const, features: [] };
/* The patch endpoint returns at most this many animals per request. */
const VIEW_CAP = 300;
const hashOf = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483646 + 1; };

export function LiveMap({ pin = null, cells, dots: given = [], viewport = null, dotFocus = "all", tone = "blue", metric, dotNoun = "recorded animal", dotKeys = ["Needs help", "On record"], onCell, selected = null, box, label, height = 2400, children, emptyNote }: {
  cells: MapCell[];
  /** A card pinned above the selected cell; it follows the map as it moves. */
  pin?: ReactNode;
  dots?: MapDot[];
  /** "hot" keeps every dot but quietens the ones that are not urgent. */
  dotFocus?: "all" | "hot";
  /** Fetch the published animals in view, at street level, for this city. */
  viewport?: { city: string } | null;
  tone?: MapTone;
  /** What a cell's value measures, for the readout and legend. */
  metric: string;
  /** What one dot is, singular. */
  dotNoun?: string;
  /** Legend words for an urgent dot and an ordinary one. */
  dotKeys?: [string, string];
  onCell?: (h3: string | null, animalId?: string | null) => void;
  selected?: string | null;
  /** [west, south, east, north]; defaults to the cells' extent. */
  box?: [number, number, number, number];
  label: string;
  /** Height in metres of the tallest column in 3D. */
  height?: number;
  children?: ReactNode;
  emptyNote?: ReactNode;
  /** @deprecated */
  points?: MapPoint[];
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [three, setThree] = useState(false);
  const [zoom, setZoom] = useState(4);
  const [hover, setHover] = useState<{ x: number; y: number; title: string; sub: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const cb = useRef(onCell);
  cb.current = onCell;
  /* Street-level dots, fetched for the view and kept as the person pans. */
  const [viewDots, setViewDots] = useState<MapDot[]>([]);
  const [capped, setCapped] = useState(false);
  const seen = useRef(new Map<string, MapDot>());
  const vpRef = useRef(viewport);
  vpRef.current = viewport;
  const fetchRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  useEffect(() => { seen.current = new Map(); resetRef.current(); setViewDots([]); setCapped(false); fetchRef.current(); }, [viewport?.city]);
  const dots = viewport ? viewDots : given;

  const valid = useMemo(() => cells.filter((c) => c.h3 && isValidCell(c.h3) && c.value > 0), [cells]);
  const max = useMemo(() => Math.max(1, ...valid.map((c) => c.value)), [valid]);
  const byCell = useMemo(() => new Map(valid.map((c) => [c.h3, c])), [valid]);
  const byCellRef = useRef(byCell);
  byCellRef.current = byCell;
  const fc = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: valid.map((c, i) => ({
      type: "Feature" as const, id: i,
      properties: { h3: c.h3, v: c.value, n: Math.sqrt(c.value / max), label: c.label ?? "" },
      geometry: { type: "Polygon" as const, coordinates: [roundCell(c.h3)] },
    })),
  }), [valid, max]);
  const centres = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: valid.map((c) => { const [lat, lng] = cellToLatLng(c.h3); return { type: "Feature" as const, properties: { h3: c.h3, t: c.value.toLocaleString("en-IN") }, geometry: { type: "Point" as const, coordinates: [lng, lat] } }; }),
  }), [valid]);
  const dotFc = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: dots.map((d) => ({ type: "Feature" as const, properties: { k: d.k, h3: d.h3, id: d.id ?? "" }, geometry: { type: "Point" as const, coordinates: [d.lng, d.lat] } })),
  }), [dots]);

  /* Fit to where most of the activity is: a far outlying cell (a record
     filed at a district centroid) must not shrink the city to a dot. */
  const bounds = useMemo((): [number, number, number, number] | null => {
    if (box) return box;
    if (!valid.length) return null;
    const xs: number[] = [], ys: number[] = [];
    for (const c of valid) { const [lat, lng] = cellToLatLng(c.h3); xs.push(lng); ys.push(lat); }
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.round((arr.length - 1) * p)))];
    const trim = valid.length > 20 ? 0.04 : 0;
    const w = q(xs, trim), e = q(xs, 1 - trim), s = q(ys, trim), n = q(ys, 1 - trim);
    const pad = Math.max(0.01, (e - w) * 0.06, (n - s) * 0.06);
    return [w - pad, s - pad, e + pad, n + pad];
  }, [box, valid]);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const ramp = RAMPS[tone];
  const colour = ["interpolate", ["linear"], ["get", "n"], 0, ramp[0], 0.25, ramp[1], 0.5, ramp[2], 0.75, ramp[3], 1, ramp[4]] as ExpressionSpecification;
  const metricRef = useRef(metric);
  metricRef.current = metric;
  const nounRef = useRef(dotNoun);
  nounRef.current = dotNoun;
  const keysRef = useRef(dotKeys);
  keysRef.current = dotKeys;

  useEffect(() => {
    let dead = false;
    if (!supportsWebGL2()) { setFailed(true); return; }
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const map = new ml.Map({
        container: el.current, style: groundStyle(PAL),
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap · OpenFreeMap · H3" },
        center: [78.9, 22.5], zoom: 4, minZoom: 3, maxZoom: 18, pitch: 0, maxPitch: 65,
        dragRotate: false, pitchWithRotate: false, renderWorldCopies: false, fadeDuration: 150,
        clickTolerance: 4,
      });
      map.touchZoomRotate.disableRotation();
      map.keyboard.enable();
      mapRef.current = map;
      if (typeof ResizeObserver !== "undefined" && el.current) {
        let w = 0, h = 0;
        const ro = new ResizeObserver(([e]) => { const r = e.contentRect; if (Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 2) { w = r.width; h = r.height; map.resize(); } });
        ro.observe(el.current); map.once("remove", () => ro.disconnect());
      }
      map.on("error", (e) => { if (/webgl|context/i.test(e.error?.message ?? "")) setFailed(true); });
      map.on("zoomend", () => setZoom(map.getZoom()));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const rings = new Map<string, [number, number][]>();
      const done = new Set<string>();
      resetRef.current = () => done.clear();
      let busy = false;
      const load = async () => {
        const vp = vpRef.current;
        if (!vp || busy || map.getZoom() < DOTS_IN - 0.6) return;
        const b = map.getBounds(), c = map.getCenter();
        const pad = 0.2, dx = (b.getEast() - b.getWest()) * pad, dy = (b.getNorth() - b.getSouth()) * pad;
        /* The cells in view not yet read, nearest the centre first. */
        const want = [...byCellRef.current.keys()].filter((h) => !done.has(h)).map((h) => { const [lat, lng] = cellToLatLng(h); return { h, lat, lng }; })
          .filter((x) => x.lng > b.getWest() - dx && x.lng < b.getEast() + dx && x.lat > b.getSouth() - dy && x.lat < b.getNorth() + dy)
          .sort((a, z) => Math.hypot(a.lng - c.lng, a.lat - c.lat) - Math.hypot(z.lng - c.lng, z.lat - c.lat)).slice(0, 40).map((x) => x.h);
        if (!want.length) return;
        busy = true;
        const city = vp.city;
        try {
          for (let k = 0; k < want.length; k += 4) {
            const batch = want.slice(k, k + 4);
            const r = await fetch(`/api/spatial/patch?cells=${batch.join(",")}`);
            const j: { animals?: { id: string; h3_r8: string | null; needs_help: boolean | null; status: string | null }[] } = r.ok ? await r.json() : { animals: [] };
            if (vpRef.current?.city !== city) return;
            const rows = j.animals ?? [];
            for (const h of batch) done.add(h);
            for (const a of rows) {
              if (seen.current.has(a.id) || !a.h3_r8 || !isValidCell(a.h3_r8)) continue;
              let ring = rings.get(a.h3_r8); if (!ring) { ring = roundCell(a.h3_r8); rings.set(a.h3_r8, ring); }
              const [lng, lat] = pointInCell(ring, hashOf(a.id));
              seen.current.set(a.id, { lng, lat, h3: a.h3_r8, id: a.id, k: a.needs_help || a.status === "injured" ? 1 : 0 });
            }
            if (rows.length >= VIEW_CAP) setCapped(true);
            setViewDots([...seen.current.values()]);
          }
        } catch { busy = false; return; /* offline: keep what is drawn; the next move retries */ }
        busy = false;
        /* The view may have moved while reading. */
        if (!dead) fetchRef.current();
      };
      fetchRef.current = () => { clearTimeout(timer); timer = setTimeout(load, 200); };
      map.on("moveend", () => fetchRef.current());
      map.once("remove", () => clearTimeout(timer));
      map.on("load", async () => {
        map.addSource("cells", { type: "geojson", data: EMPTY });
        map.addSource("centres", { type: "geojson", data: EMPTY });
        map.addSource("dots", { type: "geojson", data: EMPTY });

        map.addLayer({ id: "cells-fill", type: "fill", source: "cells", paint: {
          "fill-color": colour, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.82, DOTS_IN, 0.62, DOTS_FULL + 0.6, 0.16, 16.5, 0.08],
          "fill-opacity-transition": { duration: 300 }, "fill-color-transition": { duration: 300 },
        } });
        map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: {
          "line-color": ["interpolate", ["linear"], ["zoom"], DOTS_IN, "rgba(255,255,255,0.95)", DOTS_FULL + 0.4, "rgba(36,87,206,0.35)"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 9, 0.5, 13, 1.2, 16, 1.6],
        } });
        map.addLayer({ id: "cols", type: "fill-extrusion", source: "cells", layout: { visibility: "none" }, paint: {
          "fill-extrusion-color": colour, "fill-extrusion-height": ["*", ["get", "n"], height], "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.94, "fill-extrusion-vertical-gradient": true,
        } });
        map.addLayer({ id: "hover-edge", type: "line", source: "cells", filter: ["==", ["get", "h3"], ""], paint: { "line-color": "#0b1e3d", "line-width": 1.6, "line-opacity": 0.55 } });
        map.addLayer({ id: "sel-fill", type: "fill", source: "cells", filter: ["==", ["get", "h3"], ""], paint: { "fill-color": "#0b1e3d", "fill-opacity": 0.06 } });
        map.addLayer({ id: "sel-edge", type: "line", source: "cells", filter: ["==", ["get", "h3"], ""], paint: { "line-color": "#0b1e3d", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 15, 3] } });
        map.addLayer({ id: "counts", type: "symbol", source: "centres", minzoom: 10.6, layout: {
          "text-field": ["get", "t"], "text-font": FONT_BOLD, "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10.5, 13, 13], "text-allow-overlap": false, "text-padding": 4,
        }, paint: {
          "text-color": "#0b1e3d", "text-halo-color": "rgba(255,255,255,0.92)", "text-halo-width": 1.6,
          "text-opacity": ["interpolate", ["linear"], ["zoom"], 10.6, 0, 11.3, 1, DOTS_IN + 0.3, 1, DOTS_FULL + 0.2, 0],
        } });
        const dotOn = ["interpolate", ["linear"], ["zoom"], DOTS_IN - 0.3, 0, DOTS_FULL, 1] as ExpressionSpecification;
        map.addLayer({ id: "dots-halo", type: "circle", source: "dots", minzoom: DOTS_IN - 0.4, filter: ["==", ["get", "k"], 1], paint: {
          "circle-color": DOT.hot, "circle-blur": 0.7,
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 5, 15, 13, 18, 22],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], DOTS_IN - 0.3, 0, DOTS_FULL, 0.28],
        } });
        map.addLayer({ id: "dots", type: "circle", source: "dots", minzoom: DOTS_IN - 0.4, paint: {
          "circle-color": ["match", ["get", "k"], 1, DOT.hot, 2, DOT.care, DOT.on],
          "circle-radius": ["interpolate", ["exponential", 1.6], ["zoom"], 12.5, 2, 14, 3.8, 16, 6.5, 18, 10],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12.5, 0.4, 14, 1.2, 16, 2],
          "circle-opacity": dotOn, "circle-stroke-opacity": dotOn,
          "circle-pitch-alignment": "map",
        } });

        const layersAt = () => [map.getLayoutProperty("cols", "visibility") === "visible" ? "cols" : "cells-fill"];
        const pick = (pt: { x: number; y: number }): { h3: string; dot?: MapGeoJSONFeature } | null => {
          if (map.getZoom() >= DOTS_IN) {
            const box: [[number, number], [number, number]] = [[pt.x - 6, pt.y - 6], [pt.x + 6, pt.y + 6]];
            const d = map.queryRenderedFeatures(box, { layers: ["dots"] })[0];
            if (d) return { h3: String(d.properties.h3), dot: d };
          }
          const f = map.queryRenderedFeatures([pt.x, pt.y], { layers: layersAt() })[0];
          return f ? { h3: String(f.properties.h3) } : null;
        };
        let lastHover = "";
        map.on("mousemove", (e) => {
          const hit = pick(e.point);
          map.getCanvas().style.cursor = hit ? "pointer" : "";
          const key = hit ? `${hit.h3}:${hit.dot ? hit.dot.properties.k : "c"}` : "";
          if (key !== lastHover) { lastHover = key; map.setFilter("hover-edge", ["==", ["get", "h3"], hit?.h3 ?? ""]); }
          if (!hit) { setHover(null); return; }
          const c = byCellRef.current.get(hit.h3);
          const place = c?.label || "This area";
          if (hit.dot) {
            const k = Number(hit.dot.properties.k);
            setHover({ x: e.point.x, y: e.point.y, title: k === 1 ? keysRef.current[0] : k === 2 ? "Cared for" : `A ${nounRef.current}`, sub: `${place} · click to meet them` });
          } else {
            setHover({ x: e.point.x, y: e.point.y, title: place, sub: `${(c?.value ?? 0).toLocaleString("en-IN")} ${metricRef.current}${map.getZoom() < DOTS_IN ? " · click to zoom in" : ""}` });
          }
        });
        map.getCanvas().addEventListener("mouseleave", () => { setHover(null); lastHover = ""; map.setFilter("hover-edge", ["==", ["get", "h3"], ""]); });
        map.on("click", (e) => {
          const hit = pick(e.point);
          cb.current?.(hit ? hit.h3 : null, hit?.dot ? String(hit.dot.properties.id || "") || null : null);
          if (!hit) return;
          const [lat, lng] = cellToLatLng(hit.h3);
          const z = Math.max(map.getZoom(), 14.4);
          /* Leave room for the card at the bottom-left. */
          const phoneW = map.getContainer().clientWidth < 560;
          const opts = { center: [lng, lat] as [number, number], zoom: z, offset: [0, phoneW ? -90 : 110] as [number, number] };
          if (reduced()) map.jumpTo(opts); else map.flyTo({ ...opts, duration: 900, curve: 1.3, essential: true });
        });

        await underlay(map, PAL, "cells-fill").catch(() => false);
        /* Credits stay one tap away instead of opening over the legend. */
        map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        if (!dead) { setZoom(map.getZoom()); setReady(true); }
      });
    }).catch(() => setFailed(true));
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; };
    // Built once; the effects below keep it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Data and colour. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("cells") as GeoJSONSource).setData(fc);
    (map.getSource("centres") as GeoJSONSource).setData(centres);
    map.setPaintProperty("cells-fill", "fill-color", colour);
    map.setPaintProperty("cols", "fill-extrusion-color", colour);
    // colour derives from tone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fc, centres, tone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("dots") as GeoJSONSource).setData(dotFc);
  }, [ready, dotFc]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const on = ["interpolate", ["linear"], ["zoom"], DOTS_IN - 0.3, 0, DOTS_FULL, dotFocus === "hot" ? ["case", ["==", ["get", "k"], 1], 1, 0.3] : 1] as ExpressionSpecification;
    map.setPaintProperty("dots", "circle-opacity", on);
  }, [ready, dotFocus]);

  const fitTo = (instant: boolean) => {
    const map = mapRef.current, b = boundsRef.current;
    if (!map || !b) return;
    map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: { top: 64, bottom: 48, left: 28, right: 28 }, pitch: three ? 50 : 0, bearing: three ? -12 : 0, duration: instant || reduced() ? 0 : 900, maxZoom: 13 });
  };
  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !bounds) return;
    /* The first fit is instant; later changes of place travel. */
    const first = !fitted.current; fitted.current = true;
    map.resize();
    fitTo(first);
    // Only when the place changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, bounds?.[0], bounds?.[1], bounds?.[2], bounds?.[3]]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("cols", "visibility", three ? "visible" : "none");
    map.setLayoutProperty("cells-fill", "visibility", three ? "none" : "visible");
    if (three) { map.dragRotate.enable(); map.touchZoomRotate.enableRotation(); } else { map.dragRotate.disable(); map.touchZoomRotate.disableRotation(); }
    map.easeTo({ pitch: three ? 50 : 0, bearing: three ? -12 : 0, duration: reduced() ? 0 : 600 });
  }, [three, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const f: ExpressionSpecification = ["==", ["get", "h3"], selected ?? ""];
    map.setFilter("sel-edge", f);
    map.setFilter("sel-fill", f);
  }, [selected, ready]);

  /* Where the selected cell is on screen, for the pinned card. */
  const [pinAt, setPinAt] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !selected || !isValidCell(selected)) { setPinAt(null); return; }
    const [lat, lng] = cellToLatLng(selected);
    let raf = 0;
    const upd = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { const p = map.project([lng, lat]); const c = map.getContainer(); setPinAt({ x: p.x, y: p.y, w: c.clientWidth, h: c.clientHeight }); }); };
    upd(); map.on("move", upd); map.on("resize", upd);
    return () => { cancelAnimationFrame(raf); map.off("move", upd); map.off("resize", upd); };
  }, [selected, ready]);

  const step = (d: number) => { const m = mapRef.current; if (m) m.easeTo({ zoom: m.getZoom() + d, duration: reduced() ? 0 : 260 }); };
  const closer = () => {
    const m = mapRef.current; if (!m) return;
    let c: [number, number] = [m.getCenter().lng, m.getCenter().lat];
    if (selected && isValidCell(selected)) { const [lat, lng] = cellToLatLng(selected); c = [lng, lat]; }
    else if (valid.length) { const top = [...valid].sort((a, b) => b.value - a.value)[0]; const [lat, lng] = cellToLatLng(top.h3); c = [lng, lat]; }
    if (reduced()) m.jumpTo({ center: c, zoom: 14.4 }); else m.flyTo({ center: c, zoom: 14.4, duration: 1000, essential: true });
  };
  const showDots = dots.length > 0;
  const atStreet = zoom >= DOTS_IN;

  return (
    <div className={`lmap ${ready ? "is-ready" : ""}`} onKeyDown={(e) => { if (e.key === "Escape") onCell?.(null); }}>
      <div className="lmap-canvas" ref={el} role="application" aria-label={`${label}. Drag to move, scroll or pinch to zoom, click an area to select it.`} tabIndex={0} />
      {failed && <div className="lmap-fail">This browser cannot draw the interactive map. The figures and lists beside it are unaffected.</div>}
      {!failed && !valid.length && ready && <div className="lmap-empty">{emptyNote ?? "Nothing to map yet."}</div>}
      <div className="lmap-tools" role="group" aria-label="Map controls">
        <button type="button" onClick={() => step(1)} aria-label="Zoom in" title="Zoom in"><Plus size={17} /></button>
        <button type="button" onClick={() => step(-1)} aria-label="Zoom out" title="Zoom out"><Minus size={17} /></button>
        <button type="button" onClick={() => fitTo(false)} aria-label="Show the whole area" title="Show the whole area"><Scan size={16} /></button>
        <button type="button" onClick={() => setThree((v) => !v)} aria-pressed={three} aria-label={three ? "Flat map" : "3D columns"} title={three ? "Flat map" : "3D columns"}>{three ? <Square size={15} /> : <Box size={16} />}</button>
      </div>
      {atStreet && capped && <p className="lmap-cap">Some areas here hold more animals than one map read shows; open an area to see them all.</p>}
      {(showDots || viewport) && !atStreet && ready && valid.length > 0 && (
        <button type="button" className="lmap-closer" onClick={closer}>Zoom in to see each {dotNoun}</button>
      )}
      <div className="lmap-legend">
        {atStreet && (showDots || viewport) ? (
          <>
            <span className="lmap-key"><i style={{ background: DOT.hot }} />{dotKeys[0]}</span>
            <span className="lmap-key"><i style={{ background: DOT.on }} />{dotKeys[1]}</span>
            <span className="lmap-note">Dots sit inside their area, not at an exact spot</span>
          </>
        ) : (
          <><span>Fewer</span><i className="lmap-ramp" style={{ background: `linear-gradient(90deg, ${ramp.join(",")})` }} /><span>More {metric}</span></>
        )}
      </div>
      {hover && <div className="lmap-hover" style={hover.x > (el.current?.clientWidth ?? 0) - 260 ? { left: hover.x - 14, top: hover.y + 14, transform: "translateX(-100%)" } : { left: hover.x + 14, top: hover.y + 14 }}><b>{hover.title}</b><span>{hover.sub}</span></div>}
      {pin && pinAt && pinAt.x > -40 && pinAt.x < pinAt.w + 40 && pinAt.y > -40 && pinAt.y < pinAt.h + 40 && (() => {
        const half = Math.min(170, pinAt.w / 2 - 12);
        const left = Math.max(half + 12, Math.min(pinAt.w - half - 12, pinAt.x));
        const below = pinAt.y < 330;
        return (
          <div className={`lmap-pin${below ? " is-below" : ""}`} style={{ left, top: pinAt.y, ["--tail" as string]: `${pinAt.x - left}px` }}>
            {pin}
          </div>
        );
      })()}
      {children}
    </div>
  );
}
