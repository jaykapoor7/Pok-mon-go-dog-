"use client";

/* The resident's map: a 1.5 km circle around where they are. Cells are
   shaded by field work in the last 90 days; flame marks the animals
   marked as needing help and the open cases; gap cells (animals recorded,
   no work in twelve months) carry a flame edge. Items in the list below
   point to their place on the map. */

import { useCallback } from "react";
import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { LabMap, PAPER } from "../LabMap";

export type NCell = { ring: [number, number][]; w: number; gap: boolean };
export function NearbyMap({ centre, radiusKm, cells, help, open }: { centre: [number, number]; radiusKm: number; cells: NCell[]; help: [number, number][]; open: { lng: number; lat: number; n: number }[] }) {
  const onLoad = useCallback((map: MLMap) => {
    const dLat = radiusKm / 111, dLng = radiusKm / (111 * Math.cos((centre[1] * Math.PI) / 180));
    const fit = () => map.fitBounds([centre[0] - dLng, centre[1] - dLat, centre[0] + dLng, centre[1] + dLat], { padding: 18, animate: false });
    fit(); map.on("resize", fit);
    const ring: [number, number][] = Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return [centre[0] + Math.cos(a) * dLng, centre[1] + Math.sin(a) * dLat]; });
    map.addSource("c", { type: "geojson", data: { type: "FeatureCollection", features: cells.map((c) => ({ type: "Feature", properties: { w: c.w, g: c.gap ? 1 : 0 }, geometry: { type: "Polygon", coordinates: [c.ring] } })) } });
    map.addLayer({ id: "c", type: "fill", source: "c", paint: { "fill-color": ["interpolate", ["linear"], ["get", "w"], 0, "#e3dbcd", 1, "#c8d4f0", 3, "#93aee9", 8, "#5b82dc"] as ExpressionSpecification, "fill-opacity": 0.85 } });
    map.addLayer({ id: "c-gap", type: "line", source: "c", filter: ["==", ["get", "g"], 1], paint: { "line-color": "#f05b40", "line-width": 2 } });
    map.addLayer({ id: "c-edge", type: "line", source: "c", filter: ["==", ["get", "g"], 0], paint: { "line-color": "#faf7f1", "line-width": 1 } });
    map.addSource("ring", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring } } });
    map.addLayer({ id: "ring", type: "line", source: "ring", paint: { "line-color": "#0b1e3d", "line-width": 1.5, "line-dasharray": [2, 2] } });
    map.addSource("help", { type: "geojson", data: { type: "FeatureCollection", features: help.map((h) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: h } })) } });
    map.addLayer({ id: "help", type: "circle", source: "help", paint: { "circle-radius": 5, "circle-color": "#f05b40", "circle-stroke-color": "#faf7f1", "circle-stroke-width": 1.5 } });
    map.addSource("open", { type: "geojson", data: { type: "FeatureCollection", features: open.map((o) => ({ type: "Feature", properties: { n: o.n }, geometry: { type: "Point", coordinates: [o.lng, o.lat] } })) } });
    map.addLayer({ id: "open", type: "circle", source: "open", paint: { "circle-radius": 11, "circle-color": "#0b1e3d", "circle-stroke-color": "#f05b40", "circle-stroke-width": 3 } });
    map.addLayer({ id: "open-n", type: "symbol", source: "open", layout: { "text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Bold"], "text-size": 11 }, paint: { "text-color": "#faf7f1" } });
    map.addSource("me", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: centre } } });
    map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 8, "circle-color": "#2457ce", "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
  }, [centre, radiusKm, cells, help, open]);
  return <LabMap palette={PAPER} center={centre} zoom={13} onLoad={onLoad} />;
}
