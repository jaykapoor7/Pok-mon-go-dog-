"use client";

/* ════════════════════════════════════════════════════════════════════
   The live map at the heart of every dashboard.

   One component for every role: H3 analysis cells rise as columns whose
   height is the role's measure (recorded animals, open cases, recorded
   care…), lit from a night ground continuous with the landing plate. A
   glow underneath shows where activity gathers; hover reads a cell; a
   click selects it. 3D by default with a 2D plan view one press away.

   It draws only what it is given: cell totals and optional points. It
   never invents positions — columns stand on their H3 cell, never on an
   address.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { cellToBoundary, cellToLatLng, isValidCell } from "h3-js";
import { Box, Minus, Plus, RotateCcw, Square } from "lucide-react";
import { supportsWebGL2, groundStyle, underlay, type Palette } from "@/components/map/basemap";
import { ATLAS_NIGHT } from "@/components/spatial/atlas-palette";

export type MapCell = { h3: string; value: number; hot?: number; label?: string | null };
export type MapPoint = { lng: number; lat: number; hot?: boolean };
export type MapTone = "blue" | "flame" | "teal";

const RAMPS: Record<MapTone, string[]> = {
  /* Monochrome by default: cool greys rising to white. */
  blue: ["#1c3a80", "#2457ce", "#4f86f0", "#8fb7ff", "#e8f0ff"],
  flame: ["#5e2430", "#a8392b", "#e05537", "#f7a08c", "#ffe1d8"],
  teal: ["#173f4b", "#2a6474", "#4f909f", "#93c8d2", "#e6f6f8"],
};
const PAL: Palette = { ...ATLAS_NIGHT, labelOpacity: 0.42 };
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function LiveMap({ cells, points = [], tone = "blue", metric, onCell, selected = null, box, label, height = 3000, children, emptyNote }: {
  cells: MapCell[];
  points?: MapPoint[];
  tone?: MapTone;
  /** What a column measures, for the hover readout and legend. */
  metric: string;
  onCell?: (h3: string | null) => void;
  selected?: string | null;
  /** [west, south, east, north]; defaults to the cells' extent. */
  box?: [number, number, number, number];
  label: string;
  /** Height in metres of the tallest column. */
  height?: number;
  children?: ReactNode;
  emptyNote?: ReactNode;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [three, setThree] = useState(true);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const cb = useRef(onCell);
  cb.current = onCell;

  const valid = useMemo(() => cells.filter((c) => c.h3 && isValidCell(c.h3) && c.value > 0), [cells]);
  const max = useMemo(() => Math.max(1, ...valid.map((c) => c.value)), [valid]);
  const fc = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: valid.map((c, i) => ({
      type: "Feature" as const, id: i,
      properties: { h3: c.h3, v: c.value, n: Math.sqrt(c.value / max), hot: c.hot ?? 0, label: c.label ?? "" },
      geometry: { type: "Polygon" as const, coordinates: [cellToBoundary(c.h3, true)] },
    })),
  }), [valid, max]);
  const centers = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: [
      ...valid.map((c) => { const [lat, lng] = cellToLatLng(c.h3); return { type: "Feature" as const, properties: { w: Math.sqrt(c.value / max), hot: c.hot ? 1 : 0 }, geometry: { type: "Point" as const, coordinates: [lng, lat] } }; }),
    ],
  }), [valid, max]);
  const pts = useMemo(() => ({ type: "FeatureCollection" as const, features: points.map((p) => ({ type: "Feature" as const, properties: { h: p.hot ? 1 : 0 }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } })) }), [points]);
  /* Fit to where most of the activity is: a few far outlying cells (a
     record filed at a district centroid) must not shrink the city to a dot. */
  const bounds = useMemo((): [number, number, number, number] | null => {
    if (box) return box;
    if (!valid.length) return null;
    const xs: number[] = [], ys: number[] = [];
    for (const c of valid) { const [lat, lng] = cellToLatLng(c.h3); xs.push(lng); ys.push(lat); }
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.round((arr.length - 1) * p)))];
    const trim = valid.length > 20 ? 0.04 : 0;
    const w = q(xs, trim), e = q(xs, 1 - trim), s = q(ys, trim), n = q(ys, 1 - trim);
    const pad = Math.max(0.012, (e - w) * 0.08, (n - s) * 0.08);
    return [w - pad, s - pad, e + pad, n + pad];
  }, [box, valid]);

  const ramp = RAMPS[tone];
  const colour = ["interpolate", ["linear"], ["get", "n"], 0, ramp[0], 0.25, ramp[1], 0.5, ramp[2], 0.75, ramp[3], 1, ramp[4]] as ExpressionSpecification;

  useEffect(() => {
    let dead = false;
    if (!supportsWebGL2()) { setFailed(true); return; }
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const map = new ml.Map({
        container: el.current, style: groundStyle(PAL), attributionControl: { compact: true, customAttribution: "© OpenStreetMap · OpenFreeMap · H3" },
        center: [78.9, 22.5], zoom: 4, pitch: 52, bearing: -14, maxPitch: 70, dragRotate: true,
      });
      mapRef.current = map;
      if (typeof ResizeObserver !== "undefined" && el.current) { let w = 0, h = 0; const ro = new ResizeObserver(([e]) => { const r = e.contentRect; if (Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 2) { w = r.width; h = r.height; map.resize(); } }); ro.observe(el.current); map.once("remove", () => ro.disconnect()); }
      map.on("error", (e) => { if (/webgl|context/i.test(e.error?.message ?? "")) setFailed(true); });
      map.on("load", async () => {
        map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("centres", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({ id: "glow", type: "heatmap", source: "centres", paint: {
          "heatmap-weight": ["get", "w"], "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 14, 1.4],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 18, 12, 40, 15, 70], "heatmap-opacity": 0.55,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(7,18,42,0)", 0.3, "rgba(120,140,180,0.12)", 0.6, "rgba(180,195,220,0.22)", 1, "rgba(255,255,255,0.32)"],
        } });
        map.addLayer({ id: "flat", type: "fill", source: "cells", layout: { visibility: "none" }, paint: { "fill-color": colour, "fill-opacity": 0.85, "fill-outline-color": "rgba(8,22,49,0.9)" } });
        map.addLayer({ id: "cols", type: "fill-extrusion", source: "cells", paint: {
          "fill-extrusion-color": colour, "fill-extrusion-height": 0, "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.92, "fill-extrusion-vertical-gradient": true,
        } });
        map.addLayer({ id: "sel", type: "line", source: "cells", filter: ["==", ["get", "h3"], ""], paint: { "line-color": "#ffffff", "line-width": 2.4 } });
        map.addLayer({ id: "pts-halo", type: "circle", source: "pts", paint: { "circle-radius": 9, "circle-blur": 1, "circle-color": ["case", ["==", ["get", "h"], 1], "#f05b40", "#8fb7ff"], "circle-opacity": 0.45 } });
        map.addLayer({ id: "pts", type: "circle", source: "pts", paint: { "circle-radius": 3, "circle-color": ["case", ["==", ["get", "h"], 1], "#ff8a6e", "#e2ebff"], "circle-pitch-alignment": "map" } });
        const pick = (e: { point: { x: number; y: number } }) => map.queryRenderedFeatures([e.point.x, e.point.y], { layers: [map.getLayoutProperty("flat", "visibility") === "visible" ? "flat" : "cols"] })[0];
        map.on("mousemove", (e) => {
          const f = pick(e);
          map.getCanvas().style.cursor = f ? "pointer" : "";
          if (!f) { setHover(null); return; }
          const p = f.properties as { v: number; label: string };
          setHover({ x: e.point.x, y: e.point.y, text: `${p.label || "Analysis cell"} · ${Number(p.v).toLocaleString("en-IN")} ${metricRef.current}` });
        });
        map.on("mouseout", () => setHover(null));
        map.on("click", (e) => { const f = pick(e); cb.current?.(f ? String((f.properties as { h3: string }).h3) : null); });
        await underlay(map, PAL, "glow").catch(() => false);
        if (!dead) setReady(true);
      });
    }).catch(() => setFailed(true));
    return () => { dead = true; mapRef.current?.remove(); mapRef.current = null; };
    // Built once; the effects below keep it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const metricRef = useRef(metric);
  metricRef.current = metric;

  /* Data, colour and the columns rising into place. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("cells") as GeoJSONSource).setData(fc);
    (map.getSource("centres") as GeoJSONSource).setData(centers);
    (map.getSource("pts") as GeoJSONSource).setData(pts);
    map.setPaintProperty("cols", "fill-extrusion-color", colour);
    map.setPaintProperty("flat", "fill-color", colour);
    const target = ["*", ["get", "n"], height] as ExpressionSpecification;
    if (reduced()) { map.setPaintProperty("cols", "fill-extrusion-height", target); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      map.setPaintProperty("cols", "fill-extrusion-height", ["*", ["get", "n"], height * e]);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // colour is derived from tone
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fc, centers, pts, tone, height]);

  const fitted = useRef(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !bounds) return;
    /* The first fit is instant (a resize mid-flight would cancel it); later
       changes of place travel, so distance reads as distance. */
    const first = !fitted.current; fitted.current = true;
    map.resize();
    map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: { top: 70, bottom: 50, left: 30, right: 30 }, pitch: three ? 52 : 0, bearing: three ? -14 : 0, duration: first || reduced() ? 0 : 1100, maxZoom: 13.2 });
    // Only when the place changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, bounds?.[0], bounds?.[1], bounds?.[2], bounds?.[3]]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty("cols", "visibility", three ? "visible" : "none");
    map.setLayoutProperty("flat", "visibility", three ? "none" : "visible");
    map.easeTo({ pitch: three ? 52 : 0, bearing: three ? -14 : 0, duration: reduced() ? 0 : 600 });
  }, [three, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setFilter("sel", ["==", ["get", "h3"], selected ?? ""]);
  }, [selected, ready]);

  const reset = () => { const map = mapRef.current; if (map && bounds) map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: { top: 70, bottom: 50, left: 30, right: 30 }, pitch: three ? 52 : 0, bearing: three ? -14 : 0, duration: reduced() ? 0 : 800 }); };
  const zoom = (d: number) => mapRef.current?.easeTo({ zoom: (mapRef.current?.getZoom() ?? 10) + d, duration: reduced() ? 0 : 220 });

  return (
    <div className={`lmap ${ready ? "is-ready" : ""}`}>
      <div className="lmap-canvas" ref={el} role="img" aria-label={label} />
      {failed && <div className="lmap-fail">This browser cannot draw the interactive map. The figures and lists beside it are unaffected.</div>}
      {!failed && !valid.length && ready && <div className="lmap-empty">{emptyNote ?? "Nothing to map yet."}</div>}
      <div className="lmap-tools" role="group" aria-label="Map controls">
        <button type="button" onClick={() => setThree((v) => !v)} aria-pressed={three} title={three ? "Switch to plan view" : "Switch to 3D"} aria-label={three ? "Switch to plan view" : "Switch to 3D columns"}>{three ? <Square size={16} /> : <Box size={16} />}</button>
        <button type="button" onClick={() => zoom(1)} aria-label="Zoom in"><Plus size={16} /></button>
        <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out"><Minus size={16} /></button>
        <button type="button" onClick={reset} aria-label="Reset the view"><RotateCcw size={15} /></button>
      </div>
      <div className="lmap-legend" aria-hidden>
        <span>Fewer</span><i style={{ background: `linear-gradient(90deg, ${ramp.join(",")})` }} /><span>More {metric}</span>
      </div>
      {hover && <div className="lmap-hover" style={{ left: hover.x + 14, top: hover.y + 14 }}>{hover.text}</div>}
      {children}
    </div>
  );
}
