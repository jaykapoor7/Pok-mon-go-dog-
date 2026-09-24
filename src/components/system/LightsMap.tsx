"use client";

/* ════════════════════════════════════════════════════════════════════
   A small night map of a place and its animals: the streets, a ring for
   the area in question, one point of light per recorded animal (flame for
   one that needs help), and a mark for the centre. The same language as
   the big map, for places where a whole map would be too much. Static:
   the page around it is where things are done.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { NIGHT, groundStyle, underlay } from "@/components/map/basemap";

export type Light = { lng: number; lat: number; help?: boolean };

export function LightsMap({ center, radiusKm, lights, label, zoom, credit = true, outline, box, dot = 2 }: {
  center: [number, number]; radiusKm?: number; lights: Light[]; label: string; zoom?: number; credit?: boolean;
  /** A place drawn in flame: the cell or area the caption is about. */
  outline?: [number, number][];
  /** Fit to this box instead of the ring or zoom: [west, south, east, north]. */
  box?: [number, number, number, number];
  dot?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);

  const ring = (): [number, number][] => {
    if (!radiusKm) return [];
    const k = Math.cos((center[1] * Math.PI) / 180), d = radiusKm / 111.32;
    return Array.from({ length: 73 }, (_, i) => { const a = (i / 72) * Math.PI * 2; return [center[0] + (Math.cos(a) * d) / k, center[1] + Math.sin(a) * d]; });
  };
  const data = () => ({
    lights: { type: "FeatureCollection" as const, features: lights.map((l) => ({ type: "Feature" as const, properties: { h: l.help ? 1 : 0 }, geometry: { type: "Point" as const, coordinates: [l.lng, l.lat] } })) },
    ring: { type: "FeatureCollection" as const, features: radiusKm ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: ring() } }] : [] },
    centre: { type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: center } },
  });

  useEffect(() => {
    let dead = false;
    /* Built only once it is near the screen: a page may carry several. */
    const start = () => import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const r = ring();
      const map = new ml.Map({
        container: el.current, style: groundStyle(NIGHT), interactive: false, attributionControl: false,
        ...(box ? { bounds: [[box[0], box[1]], [box[2], box[3]]] as [[number, number], [number, number]], fitBoundsOptions: { padding: 12 } } : r.length ? { bounds: [[Math.min(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1]))], [Math.max(...r.map((p) => p[0])), Math.max(...r.map((p) => p[1]))]] as [[number, number], [number, number]], fitBoundsOptions: { padding: 18 } } : { center, zoom: zoom ?? 13.5 }),
      });
      mapRef.current = map;
      map.on("load", async () => {
        const d = data();
        map.addSource("lights", { type: "geojson", data: d.lights });
        map.addSource("ring", { type: "geojson", data: d.ring });
        map.addSource("centre", { type: "geojson", data: d.centre });
        map.addSource("outline", { type: "geojson", data: { type: "FeatureCollection", features: outline?.length ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [outline] } }] : [] } });
        map.addLayer({ id: "outline-fill", type: "fill", source: "outline", paint: { "fill-color": "#f05b40", "fill-opacity": 0.12 } });
        map.addLayer({ id: "outline", type: "line", source: "outline", paint: { "line-color": "#f7a08c", "line-width": 1.6 } });
        map.addLayer({ id: "ring", type: "line", source: "ring", paint: { "line-color": "#efe7da", "line-width": 1.2, "line-opacity": 0.55, "line-dasharray": [3, 3] } });
        map.addLayer({ id: "glow", type: "heatmap", source: "lights", paint: {
          "heatmap-weight": 0.4, "heatmap-intensity": 0.25, "heatmap-radius": 18, "heatmap-opacity": 0.7,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(19,43,85,0)", 0.2, "rgba(27,63,128,0.35)", 0.5, "rgba(79,127,224,0.55)", 1, "rgba(219,231,255,0.75)"],
        } });
        map.addLayer({ id: "halo", type: "circle", source: "lights", paint: { "circle-radius": 6, "circle-blur": 1, "circle-color": ["case", ["==", ["get", "h"], 1], "#f05b40", "#4f7fe0"], "circle-opacity": 0.35 } });
        map.addLayer({ id: "dots", type: "circle", source: "lights", paint: { "circle-radius": ["case", ["==", ["get", "h"], 1], dot + 1.4, dot], "circle-color": ["case", ["==", ["get", "h"], 1], "#ff8a6e", "#dbe7ff"] } });
        if (radiusKm) map.addLayer({ id: "centre", type: "circle", source: "centre", paint: { "circle-radius": 6, "circle-color": "#8fb7ff", "circle-stroke-color": "#efe7da", "circle-stroke-width": 2 } });
        await underlay(map, NIGHT, "ring").catch(() => false);
        if (!dead) setReady(true);
      });
    });
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "undefined" || !el.current) start();
    else {
      io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io?.disconnect(); start(); } }, { rootMargin: "300px" });
      io.observe(el.current);
    }
    return () => { dead = true; io?.disconnect(); mapRef.current?.remove(); mapRef.current = null; };
    // Built once; the data effect below keeps it current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const d = data();
    (map.getSource("lights") as GeoJSONSource | undefined)?.setData(d.lights);
    (map.getSource("ring") as GeoJSONSource | undefined)?.setData(d.ring);
    (map.getSource("centre") as GeoJSONSource | undefined)?.setData(d.centre);
    const r = ring();
    if (r.length) map.fitBounds([[Math.min(...r.map((p) => p[0])), Math.min(...r.map((p) => p[1]))], [Math.max(...r.map((p) => p[0])), Math.max(...r.map((p) => p[1]))]], { padding: 18, duration: 600 });
    // Re-drawn when the place or its animals change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center[0], center[1], radiusKm, lights]);

  return (
    <div className={`lm ${ready ? "is-ready" : ""}`}>
      <div className="lm-canvas" ref={el} role="img" aria-label={label} />
      {credit && <p className="lm-credit">Map © OpenStreetMap contributors · OpenFreeMap</p>}
    </div>
  );
}
