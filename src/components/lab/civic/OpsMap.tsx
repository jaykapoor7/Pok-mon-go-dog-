"use client";

/* Open work as coverage: this year's field records in hexagons, and each
   open case pinned to its locality with its docket number, so the map and
   the docket beside it can be read against each other. */

import { useCallback } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { LabMap, CIVIC } from "../LabMap";

export type OHex = { ring: [number, number][]; c: number };
export type OPin = { n: number; lng: number; lat: number; hot: boolean };

export function OpsMap({ hexes, pins }: { hexes: OHex[]; pins: OPin[] }) {
  const onLoad = useCallback((map: MLMap) => {
    map.addSource("hex", { type: "geojson", data: { type: "FeatureCollection", features: hexes.map((h) => ({ type: "Feature", properties: { c: h.c }, geometry: { type: "Polygon", coordinates: [h.ring] } })) } });
    map.addLayer({ id: "hex", type: "fill", source: "hex", paint: { "fill-color": ["step", ["get", "c"], "#d6e1f6", 3, "#a9c0ee", 8, "#6f95e2", 16, "#2457ce"], "fill-opacity": 0.8 } });
    map.addLayer({ id: "hex-l", type: "line", source: "hex", paint: { "line-color": "#0b1e3d", "line-width": 0.5, "line-opacity": 0.35 } });
    map.addSource("pins", { type: "geojson", data: { type: "FeatureCollection", features: pins.map((p) => ({ type: "Feature", properties: { n: String(p.n).padStart(2, "0"), hot: p.hot }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) } });
    map.addLayer({ id: "pins", type: "circle", source: "pins", paint: { "circle-radius": 10, "circle-color": ["case", ["get", "hot"], "#f05b40", "#0b1e3d"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
    map.addLayer({ id: "pins-n", type: "symbol", source: "pins", layout: { "text-field": ["get", "n"], "text-font": ["Noto Sans Bold"], "text-size": 9.5, "text-allow-overlap": true }, paint: { "text-color": "#ffffff" } });
  }, [hexes, pins]);
  return <LabMap palette={CIVIC} bounds={[76.88, 10.9, 77.06, 11.09]} padding={20} onLoad={onLoad} />;
}
