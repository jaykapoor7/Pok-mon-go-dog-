/* ════════════════════════════════════════════════════════════════════
   The record, drawn in the folk ground's own hand.

   Every recorded area is a mark on the painted map: at national scale a
   vermilion dot with a marigold rim inside a fine ink ring, like mirror
   work; nearer, the round area itself, washed marigold to saffron by how
   many animals it holds and edged with a running stitch. Flat, no
   extrusion: paper, ink and colour.

   The camera on the landing is driven by script, so how much of each
   mark shows is set from the same frame (folkVis) rather than from zoom
   expressions, and written only when it changes.
   ════════════════════════════════════════════════════════════════════ */

import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import type { areasGeo } from "@/components/bindu/mapkit";

export const FOLK = { ink: "#0b1e3d", vermilion: "#f05b40", vermilionInk: "#c1391c", marigold: "#f4b23c", saffron: "#ef8a3a", palest: "#f6d58a", sea: "#d6e2f5", paper: "#f3ede4" };

const n = ["get", "n"] as ExpressionSpecification;
const areaOpacity = (a: number) => ["*", a, ["+", 0.1, ["*", 0.65, n]]] as ExpressionSpecification;
const dotR = (g: number, k = 1) => ["*", g * k, ["+", 2.6, ["*", 7, n]]] as ExpressionSpecification;

export function addFolkRecord(map: MLMap, geo: ReturnType<typeof areasGeo>, p: string) {
  map.addSource(`${p}-polys`, { type: "geojson", data: geo.polys });
  map.addSource(`${p}-pts`, { type: "geojson", data: geo.pts });
  map.addLayer({ id: `${p}-area`, type: "fill", source: `${p}-polys`, paint: { "fill-color": ["interpolate", ["linear"], n, 0, FOLK.palest, 0.5, FOLK.marigold, 1, FOLK.saffron], "fill-opacity": areaOpacity(0) } });
  map.addLayer({ id: `${p}-stitch`, type: "line", source: `${p}-polys`, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": FOLK.vermilionInk, "line-width": 1.2, "line-dasharray": [1.6, 1.6], "line-opacity": 0 } });
  map.addLayer({ id: `${p}-ring`, type: "circle", source: `${p}-pts`, paint: { "circle-radius": dotR(0, 1.7), "circle-opacity": 0, "circle-stroke-color": FOLK.ink, "circle-stroke-width": 0.8, "circle-stroke-opacity": 0 } });
  map.addLayer({ id: `${p}-dot`, type: "circle", source: `${p}-pts`, paint: { "circle-radius": dotR(0), "circle-color": FOLK.vermilion, "circle-stroke-color": FOLK.marigold, "circle-stroke-width": 1.4, "circle-opacity": 0, "circle-stroke-opacity": 0 } });
}

/** How much of the record shows: areas (a), dots (d) and the dots' growth (g), each 0 → 1;
 *  `wash` thins the areas' colour at street scale so the drawing shows through the stitch. */
export function folkVis(map: MLMap, p: string, a: number, d: number, g: number, memo: Record<string, string>, wash = 1) {
  const r = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 50) / 50;
  const A = r(a), D = r(d), G = r(g), F = r(wash), key = `${A}|${D}|${G}|${F}`;
  if (memo[p] === key || !map.getLayer(`${p}-dot`)) return;
  memo[p] = key;
  map.setPaintProperty(`${p}-area`, "fill-opacity", areaOpacity(A * F));
  map.setPaintProperty(`${p}-stitch`, "line-opacity", ["*", A * 0.75, ["+", 0.2, ["*", 0.8, n]]] as ExpressionSpecification);
  map.setPaintProperty(`${p}-ring`, "circle-radius", dotR(G, 1.7));
  map.setPaintProperty(`${p}-ring`, "circle-stroke-opacity", D * 0.45);
  map.setPaintProperty(`${p}-dot`, "circle-radius", dotR(G));
  map.setPaintProperty(`${p}-dot`, "circle-opacity", D);
  map.setPaintProperty(`${p}-dot`, "circle-stroke-opacity", D);
}

/** Dots belong to the country, areas to the city: their share at a given zoom. */
export const dotsAt = (z: number) => 1 - Math.max(0, Math.min(1, (z - 9.5) / 1.6));
export const areasAt = (z: number) => Math.max(0, Math.min(1, (z - 8.4) / 1.6));
export const washAt = (z: number) => 1 - 0.8 * Math.max(0, Math.min(1, (z - 13.2) / 1.2));
