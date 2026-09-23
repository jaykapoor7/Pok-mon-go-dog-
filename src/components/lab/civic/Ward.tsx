"use client";

/* The ward view: coverage hexes on a municipal basemap, the register of
   what has been seen in them beside it. Selecting a register row lights
   its hexagon; selecting a hexagon filters nothing and hides nothing — it
   points at the rows inside it. */

import { useCallback, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { LabMap, CIVIC } from "../LabMap";

export type WRow = { id: string; n: number; lng: number; lat: number; zone: string; km: number; when: string; img: string; injured: boolean; record: string; hex: string };
export type WHex = { key: string; ring: [number, number][]; count: number };

const STEPS = [1, 2, 4, 7];
const COLORS = ["#d6e1f6", "#a9c0ee", "#6f95e2", "#2457ce", "#1a3f99"];

export function Ward({ rows, hexes, home }: { rows: WRow[]; hexes: WHex[]; home: { lng: number; lat: number } }) {
  const [sel, setSel] = useState<string | null>(null);
  const mapRef = useRef<MLMap | null>(null);

  const pick = useCallback((r: WRow) => {
    setSel(r.id);
    const m = mapRef.current;
    if (!m) return;
    m.setFilter("hex-sel", ["==", ["get", "key"], r.hex]);
    m.setFilter("pt-sel", ["==", ["get", "id"], r.id]);
    m.easeTo({ center: [r.lng, r.lat], zoom: Math.max(m.getZoom(), 13), duration: 600 });
  }, []);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    const xs = hexes.flatMap((h) => h.ring.map((p) => p[0])).concat(home.lng), ys = hexes.flatMap((h) => h.ring.map((p) => p[1])).concat(home.lat);
    map.fitBounds([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], { padding: { top: 40, bottom: 90, left: 40, right: 40 }, animate: false, maxZoom: 13.5 });
    map.addSource("hex", { type: "geojson", data: { type: "FeatureCollection", features: hexes.map((h) => ({ type: "Feature", properties: { key: h.key, c: h.count }, geometry: { type: "Polygon", coordinates: [h.ring] } })) } });
    map.addLayer({ id: "hex", type: "fill", source: "hex", paint: { "fill-color": ["step", ["get", "c"], COLORS[0], STEPS[0] + 1, COLORS[1], STEPS[1] + 1, COLORS[2], STEPS[2] + 1, COLORS[3], STEPS[3] + 1, COLORS[4]], "fill-opacity": 0.82 } });
    map.addLayer({ id: "hex-l", type: "line", source: "hex", paint: { "line-color": "#0b1e3d", "line-width": 0.8, "line-opacity": 0.5 } });
    map.addLayer({ id: "hex-sel", type: "line", source: "hex", filter: ["==", ["get", "key"], ""], paint: { "line-color": "#0b1e3d", "line-width": 3 } });
    map.addLayer({ id: "hex-c", type: "symbol", source: "hex", layout: { "text-field": ["to-string", ["get", "c"]], "text-font": ["Noto Sans Bold"], "text-size": 12 }, paint: { "text-color": ["case", [">", ["get", "c"], STEPS[2]], "#ffffff", "#0b1e3d"] } });
    map.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: rows.map((r) => ({ type: "Feature", properties: { id: r.id, inj: r.injured }, geometry: { type: "Point", coordinates: [r.lng, r.lat] } })) } });
    map.addLayer({ id: "pt-sel", type: "circle", source: "pts", filter: ["==", ["get", "id"], ""], paint: { "circle-radius": 11, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": "#0b1e3d", "circle-stroke-width": 2 } });
    map.addSource("you", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [home.lng, home.lat] } } });
    map.addLayer({ id: "you", type: "circle", source: "you", paint: { "circle-radius": 7, "circle-color": "#ffffff", "circle-stroke-color": "#f05b40", "circle-stroke-width": 3 } });
    map.on("click", "hex", (e) => {
      const key = e.features?.[0]?.properties?.key;
      const r = rows.find((x) => x.hex === key);
      if (r) { pick(r); document.querySelector(`[data-row="${r.id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    });
  }, [hexes, rows, home, pick]);

  return (
    <div className="ci-ward">
      <div className="ci-ward-map">
        <LabMap palette={CIVIC} center={[home.lng, home.lat]} zoom={11.6} onLoad={onLoad} />
        <div className="ci-legend">
          <span className="lbl">Records per 1 km hexagon</span>
          <div className="ci-ramp">
            {["1", "2", "3–4", "5–7", "8+"].map((l, i) => <span key={l} style={{ background: COLORS[i], color: i > 2 ? "#fff" : "#0b1e3d" }}>{l}</span>)}
          </div>
        </div>
      </div>
      <div className="ci-ward-list">
        <div className="ci-ward-head">
          <span className="lbl" style={{ color: "#6b7485" }}>Ward view · South Delhi</span>
          <h1>Hauz Khas area</h1>
          <p>{rows.length} animals seen within 9 km of you · {hexes.length} hexagons with at least one record · positions to ~1 km</p>
        </div>
        <div className="ci-table">
          <div className="ci-trow h lbl"><span>№</span><span>Photo</span><span>Locality · record</span><span>Distance</span><span>Status</span></div>
          {rows.map((r) => (
            <button key={r.id} type="button" className="ci-trow" data-row={r.id} aria-pressed={sel === r.id} onClick={() => pick(r)}>
              <span className="no">{String(r.n).padStart(2, "0")}</span>
              <img src={r.img} alt={`Street dog, ${r.zone}`} loading="lazy" />
              <span><b>{r.zone}</b><small>REC {r.record} · {r.when}</small></span>
              <span className="mono" style={{ fontSize: 12 }}>{r.km.toFixed(1)} km</span>
              <span><span className={`st${r.injured ? " f" : ""}`}>{r.injured ? "Injured" : "Seen"}</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
