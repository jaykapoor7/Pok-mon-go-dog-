/* ════════════════════════════════════════════════════════════════════
   The landing's map kit: the night ground, the globe, and the record
   drawn as light.

   Every recorded area in India (an H3 cell, about 0.7 km²) becomes a
   round column whose height is its animals on the record, in StrayPaw's
   blues rising to flame at the fullest areas. Heights are scaled with
   zoom so a column keeps its screen size from the globe down to a
   street. A soft glow marks each area at national scale, where the
   columns are too fine to see. Nothing is placed finer than its area.
   ════════════════════════════════════════════════════════════════════ */

import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import { latLngToCell } from "h3-js";
import { roundCell } from "@/lib/spatial/round";

export type Cell = [number, number, number];
export type AreaFeature = { h3: string; c: [number, number]; animals: number; name?: string | null };

export const COL = { deep: "#081a3a", low: "#1b3f80", mid: "#2457ce", high: "#5b8cf0", top: "#a9c4ff", hot: "#f05b40" };

/** Round columns and glow points for a set of areas. Heights are normalised to the fullest area given. */
export function areasGeo(cells: AreaFeature[], focus: Set<string> = new Set()) {
  const top = Math.sqrt(Math.max(1, ...cells.map((c) => c.animals)));
  const polys = cells.map((c) => ({
    type: "Feature" as const,
    properties: { h3: c.h3, n: Math.sqrt(c.animals) / top, animals: c.animals, name: c.name ?? null, focus: focus.has(c.h3) ? 1 : 0 },
    geometry: { type: "Polygon" as const, coordinates: [roundCell(c.h3, 0.86)] },
  }));
  const pts = cells.map((c) => ({ type: "Feature" as const, properties: { n: Math.sqrt(c.animals) / top, focus: focus.has(c.h3) ? 1 : 0 }, geometry: { type: "Point" as const, coordinates: c.c } }));
  return { polys: { type: "FeatureCollection" as const, features: polys }, pts: { type: "FeatureCollection" as const, features: pts } };
}

/** National areas arrive as centres; their cell is recovered from the centre (resolution 8). */
export function fromCentres(cells: Cell[]): AreaFeature[] {
  return cells.map(([lng, lat, n]) => ({ h3: latLngToCell(lat, lng, 8), c: [lng, lat] as [number, number], animals: n }));
}

/** Column height in metres: a fixed screen height at any zoom, times growth (0 → 1). */
export function heightExpr(grow: number): ExpressionSpecification {
  const A = 2.6e6 * grow;
  return ["interpolate", ["exponential", 0.5], ["zoom"], 3, ["*", ["get", "n"], A], 16, ["*", ["get", "n"], A / 8192]] as ExpressionSpecification;
}

export function addRecord(map: MLMap, geo: ReturnType<typeof areasGeo>, grow: number, prefix = "rec") {
  map.addSource(`${prefix}-pts`, { type: "geojson", data: geo.pts });
  map.addSource(`${prefix}-cols`, { type: "geojson", data: geo.polys });
  map.addLayer({ id: `${prefix}-glow`, type: "circle", source: `${prefix}-pts`, maxzoom: 9.5, paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, ["+", 2.5, ["*", ["get", "n"], 10]], 5, ["+", 3, ["*", ["get", "n"], 16]], 9, ["+", 6, ["*", ["get", "n"], 26]]],
    "circle-color": ["case", ["==", ["get", "focus"], 1], COL.hot, ["interpolate", ["linear"], ["get", "n"], 0, COL.mid, 0.6, COL.top, 1, COL.hot]],
    "circle-blur": 0.85, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 1, 7.5, 0.6, 9.5, 0],
    "circle-pitch-alignment": "map",
  } });
  map.addLayer({ id: `${prefix}-core`, type: "circle", source: `${prefix}-pts`, maxzoom: 9.5, paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 6, ["+", 1.2, ["*", ["get", "n"], 2.4]]],
    "circle-color": ["interpolate", ["linear"], ["get", "n"], 0, "#cfe0ff", 1, "#ffd9cf"], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.95, 9.5, 0],
  } });
  map.addLayer({ id: `${prefix}-3d`, type: "fill-extrusion", source: `${prefix}-cols`, paint: {
    "fill-extrusion-color": ["case", ["==", ["get", "focus"], 1], COL.hot, ["interpolate", ["linear"], ["get", "n"], 0, COL.low, 0.35, COL.mid, 0.7, COL.high, 0.92, COL.top, 1, COL.hot]],
    "fill-extrusion-height": heightExpr(grow), "fill-extrusion-base": 0,
    "fill-extrusion-opacity": 0.92, "fill-extrusion-vertical-gradient": true,
  } });
}

/** The night globe: an electric-blue atmosphere, lit from the south-west. */
export function setNight(map: MLMap) {
  try { map.setProjection({ type: "globe" }); } catch { /* flat is fine */ }
  try {
    map.setSky({ "sky-color": "#061127", "horizon-color": "#2457ce", "fog-color": "#061127", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.6,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.32, 4, 0.22, 7, 0.1, 10, 0] } as never);
  } catch { /* older renderers draw without sky */ }
  try { map.setLight({ anchor: "map", color: "#dbe6ff", intensity: 0.45, position: [1.4, 210, 35] }); } catch { /* default light */ }
}

/* Camera interpolation that dives toward its target: the centre moves in step with scale, so
   the destination stays under the eye while the world grows, as a real dolly does. */
export type Cam = { c: [number, number]; z: number; pitch: number; bearing: number };
const merc = ([lng, lat]: [number, number]) => [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2];
const unmerc = ([x, y]: number[]): [number, number] => [x * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - 90];
export function camBetween(a: Cam, b: Cam, t: number): Cam {
  /* the destination's distance from the centre of the screen shrinks evenly while the scale changes */
  const z = a.z + (b.z - a.z) * t, k = (2 ** a.z * (1 - t)) / 2 ** z;
  const ma = merc(a.c), mb = merc(b.c);
  return { c: unmerc([mb[0] - (mb[0] - ma[0]) * k, mb[1] - (mb[1] - ma[1]) * k]), z, pitch: a.pitch + (b.pitch - a.pitch) * t, bearing: a.bearing + (b.bearing - a.bearing) * t };
}

/** India's edge in electric blue, once the street ground has arrived beneath the record. */
export function edgeGlow(map: MLMap) {
  try { map.setPaintProperty("india-edge", "line-color", "#5b8cf0"); map.setPaintProperty("india-edge", "line-opacity", 0.75); } catch { /* no ground */ }
}
