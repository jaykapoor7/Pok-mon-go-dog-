"use client";

/* ════════════════════════════════════════════════════════════════════
   A working map of areas (EarthRanger's lesson: the queue and the map
   are one selection), on the Map's illustrated ground.

   Each H3 area (≈0.74 km²) is a bloom sized by its count, in the
   workspace's ink; an area holding critical work carries a vermilion
   heart. Choosing an area narrows the list beside it; a row chosen in
   the list rings its area and the camera travels there. Areas, never
   addresses: the precision every record supports.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { cellToLatLng, isValidCell } from "h3-js";
import { supportsWebGL2 } from "@/components/map/basemap";
import { GLYPHS, collapseAttribution, drawGround, groundStyle } from "../map/ground";
import { BLOOM_PX, bloom } from "../map/marks";
import "./areamap.css";

export type AreaPoint = { h3: string; value: number; hot: number; label: string | null; second?: number };
type Pad = { top: number; right: number; bottom: number; left: number };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ZS: [number, number][] = [[6, 9], [9, 16], [11, 26], [12, 38], [13, 56], [15, 150]];

export function AreaMap({ cells, selected, focus, onPick, label, ink = "#1f6f80", hotInk = "#f05b40", empty, pad, className = "" }: {
  cells: AreaPoint[]; selected: string | null; focus?: string | null; onPick: (h3: string | null) => void; label: string; ink?: string; hotInk?: string; empty: string; pad?: Pad; className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = useRef(onPick); pick.current = onPick;
  const padRef = useRef(pad); padRef.current = pad;

  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setErr("This browser cannot draw the map; the list holds every item."); return; }
    let dead = false, map: MLMap | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({ container: el.current, style: { ...groundStyle(), glyphs: GLYPHS }, center: [78.9, 22.5], zoom: 4, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, maxZoom: 17 });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        const m = map!;
        m.setMissingStyleImageResolver((id: string) => { if (!m.hasImage(id) && id.startsWith("bl|")) m.addImage(id, bloom(id.slice(3)), { pixelRatio: 2 }); });
        m.addSource("a", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addSource("sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const size = ["interpolate", ["exponential", 2], ["zoom"], ...ZS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px / (BLOOM_PX / 2)]])];
        m.addLayer({ id: "a", type: "symbol", source: "a", layout: { "icon-image": ["get", "img"], "icon-size": size as never, "icon-allow-overlap": true, "icon-ignore-placement": true, "symbol-sort-key": ["get", "sort"] } });
        m.addLayer({ id: "a-hot", type: "circle", source: "a", filter: [">", ["get", "hot"], 0], paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...ZS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px * 0.2]])] as never, "circle-color": hotInk, "circle-stroke-color": "#fffdf9", "circle-stroke-width": 1.5 } });
        m.addLayer({ id: "sel", type: "circle", source: "sel", paint: { "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], ...ZS.flatMap(([z, px]) => [z, ["*", ["get", "k"], px * 0.62 + 5]])] as never, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#2457ce", "circle-stroke-width": 2.5 } });
        m.addLayer({ id: "a-n", type: "symbol", source: "a", minzoom: 10.5, layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-offset": [0, 0], "text-allow-overlap": true }, paint: { "text-color": "#0b1e3d", "text-halo-color": "#fffdf9", "text-halo-width": 2 } });
        m.on("click", "a", (e) => { const h = e.features?.[0]?.properties?.h3; if (h) pick.current(String(h)); });
        m.on("click", (e) => { if (!m.queryRenderedFeatures(e.point, { layers: ["a"] }).length) pick.current(null); });
        m.on("mouseenter", "a", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "a", () => { m.getCanvas().style.cursor = ""; });
        drawGround(m, "a").catch(() => {});
        collapseAttribution(m);
        setReady(true);
      });
    }).catch(() => setErr("The map could not start; the list holds every item."));
    return () => { dead = true; map?.remove(); mapRef.current = null; };
  }, [hotInk]);

  const fitted = useRef("");
  useEffect(() => {
    const m = mapRef.current; if (!m || !ready) return;
    const valid = cells.filter((c) => c.h3 && isValidCell(c.h3) && c.value > 0);
    const max = Math.sqrt(Math.max(1, ...valid.map((c) => c.value)));
    const k = (v: number) => 0.6 + (Math.sqrt(v) / max) * 0.8;
    (m.getSource("a") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: valid.map((c) => {
      const [lat, lng] = cellToLatLng(c.h3);
      return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { h3: c.h3, k: k(c.value), img: `bl|${ink}`, hot: c.hot, sort: -c.value, t: c.value > 1 ? String(c.value) : "" } };
    }) });
    const ring = [selected, focus].filter((h): h is string => !!h && isValidCell(h));
    (m.getSource("sel") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: ring.map((h) => { const [lat, lng] = cellToLatLng(h); const v = valid.find((c) => c.h3 === h)?.value ?? 1; return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { k: k(v) } }; }) });
    const key = valid.map((c) => c.h3).sort().join();
    if (valid.length && key !== fitted.current) {
      fitted.current = key;
      const pts = valid.map((c) => cellToLatLng(c.h3));
      const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
      const d = 0.012;
      m.fitBounds([[Math.min(...lngs) - d, Math.min(...lats) - d], [Math.max(...lngs) + d, Math.max(...lats) + d]], { padding: padRef.current ?? 40, maxZoom: 13.5, duration: reduced() ? 0 : 900 });
    }
  }, [cells, selected, focus, ready, ink]);

  /* A chosen area, or the area of a chosen case, brings the camera to it. */
  useEffect(() => {
    const m = mapRef.current, h = focus ?? selected; if (!m || !ready || !h || !isValidCell(h)) return;
    const [lat, lng] = cellToLatLng(h);
    m.flyTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 13.4), padding: padRef.current ?? 0, duration: reduced() ? 0 : 900 });
  }, [selected, focus, ready]);

  const has = cells.some((c) => c.value > 0);
  return (
    <div className={`areamap ${className}`} aria-label={label} role="region">
      <div ref={el} className="areamap-canvas" />
      {(err || (!has && ready)) && <p className="areamap-note">{err ?? empty}</p>}
    </div>
  );
}
