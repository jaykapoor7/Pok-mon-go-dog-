"use client";

/* ════════════════════════════════════════════════════════════════════
   A working map of areas (EarthRanger's lesson: the queue and the map
   are one selection). Each H3 area is a disc sized by its count; areas
   with critical work carry a flame core. Choosing an area narrows the
   list beside it; a row chosen in the list rings its area. Same printed
   cartography as the atlas, quieter, for work.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { cellToLatLng, isValidCell } from "h3-js";
import { groundStyle, supportsWebGL2, underlay } from "@/components/map/basemap";
import { FIELD, fieldInks } from "./cartography";
import "./areamap.css";

export type AreaPoint = { h3: string; value: number; hot: number; label: string | null; second?: number };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function AreaMap({ cells, selected, onPick, label, ink = "#2f3d8f", hotInk = "#f05b40", empty }: {
  cells: AreaPoint[]; selected: string | null; onPick: (h3: string | null) => void; label: string; ink?: string; hotInk?: string; empty: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = useRef(onPick); pick.current = onPick;

  useEffect(() => {
    if (!el.current) return;
    if (!supportsWebGL2()) { setErr("This browser cannot draw the map; the list holds every item."); return; }
    let dead = false, map: MLMap | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({ container: el.current, style: groundStyle({ ...FIELD, labelOpacity: 0.5 }), center: [78.9, 22.5], zoom: 4, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();
      map.on("load", () => {
        const m = map!;
        m.addSource("a", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        m.addLayer({ id: "a-echo", type: "circle", source: "a", paint: { "circle-radius": ["get", "r"], "circle-color": "rgba(0,0,0,0)", "circle-translate": [1.6, -1.3], "circle-stroke-width": 1, "circle-stroke-color": ["get", "c"], "circle-stroke-opacity": 0.5 } });
        m.addLayer({ id: "a", type: "circle", source: "a", paint: { "circle-radius": ["get", "r"], "circle-color": ["get", "c"], "circle-opacity": 0.82, "circle-stroke-width": ["case", ["==", ["get", "sel"], 1], 3, 1], "circle-stroke-color": ["case", ["==", ["get", "sel"], 1], "#0b1e3d", "#fbf6ee"] } });
        m.addLayer({ id: "a-hot", type: "circle", source: "a", filter: [">", ["get", "hot"], 0], paint: { "circle-radius": ["*", ["get", "r"], 0.42], "circle-color": hotInk } });
        m.addLayer({ id: "a-n", type: "symbol", source: "a", layout: { "text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 11, "text-offset": [0, 0] }, paint: { "text-color": "#fff", "text-halo-color": "rgba(11,30,61,0.4)", "text-halo-width": 1 } });
        m.on("click", "a", (e) => { const h = e.features?.[0]?.properties?.h3; if (h) pick.current(String(h)); });
        m.on("click", (e) => { if (!m.queryRenderedFeatures(e.point, { layers: ["a"] }).length) pick.current(null); });
        m.on("mouseenter", "a", () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", "a", () => { m.getCanvas().style.cursor = ""; });
        underlay(m, FIELD, "a-echo").then((ok) => { if (ok) fieldInks(m, "a-echo"); }).catch(() => {});
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
    (m.getSource("a") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: valid.map((c) => {
      const [lat, lng] = cellToLatLng(c.h3);
      return { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: { h3: c.h3, r: 7 + (Math.sqrt(c.value) / max) * 18, c: ink, hot: c.hot, sel: c.h3 === selected ? 1 : 0, t: c.value > 1 ? String(c.value) : "" } };
    }) });
    const key = valid.map((c) => c.h3).sort().join();
    if (valid.length && key !== fitted.current) {
      fitted.current = key;
      const pts = valid.map((c) => cellToLatLng(c.h3));
      const lats = pts.map((p) => p[0]), lngs = pts.map((p) => p[1]);
      const pad = 0.01;
      m.fitBounds([[Math.min(...lngs) - pad, Math.min(...lats) - pad], [Math.max(...lngs) + pad, Math.max(...lats) + pad]], { padding: 40, maxZoom: 14, duration: reduced() ? 0 : 700 });
    }
  }, [cells, selected, ready, ink]);

  useEffect(() => {
    const m = mapRef.current; if (!m || !ready || !selected || !isValidCell(selected)) return;
    const [lat, lng] = cellToLatLng(selected);
    m.easeTo({ center: [lng, lat], zoom: Math.max(m.getZoom(), 13), duration: reduced() ? 0 : 500 });
  }, [selected, ready]);

  const has = cells.some((c) => c.value > 0);
  return (
    <div className="areamap" aria-label={label} role="region">
      <div ref={el} className="areamap-canvas" />
      {(err || (!has && ready)) && <p className="areamap-note float">{err ?? empty}</p>}
    </div>
  );
}
