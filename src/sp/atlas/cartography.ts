/* ════════════════════════════════════════════════════════════════════
   StrayPaw 2.0 cartography: the Living Field Atlas basemap.

   A hand-tinted printed map. Warm paper land; water lines inked twice,
   a hair off register, like a two-ink print; sage parks with a pen
   hatch; peach neighbourhoods; ochre and terracotta arterials; dotted
   state lines; India's border printed in ink with a flame echo; the
   seas named and drawn with a few pen waves at national scale.

   Every embellishment is cartographic, not data: nothing here moves a
   street, adds a mark where nothing was recorded, or competes with the
   evidence layers drawn above it. Streets come from OpenFreeMap
   (OpenStreetMap), fetched after the data so slow tiles never block it.
   ════════════════════════════════════════════════════════════════════ */

import type { Map as MLMap } from "maplibre-gl";
import { PAPER, type Palette } from "@/components/map/basemap";
export const FIELD: Palette = {
  ...PAPER,
  bg: "#f6efe3", land: "#f6efe3", water: "#b9cfe6", park: "#d6e3c3", building: "#ece0cf",
  road: "rgba(11,30,61,0.11)", roadMajor: "rgba(184,112,58,0.55)", rail: "rgba(11,30,61,0.3)",
  boundary: "rgba(11,30,61,0.32)", label: "#0b1e3d", labelHalo: "#f8f2e7", labelOpacity: 0.62,
  showRoadNames: false, buildings: false,
  cellEdge: "#f6efe3",
  seq: ["#dbe5f8", "#a9c0ef", "#6f93e2", "#2f62d3", "#163f9a"],
};

/** Sea wash outside India, and the inks used by fieldInks. */
const FI = {
  sea: "#e6dccb", waterInk: "#2f3d8f", waterEcho: "#5e93c9", hatch: "#4b7f4f", wood: "#cbdcb4",
  residential: "#f4e3cf", motorway: "#c0603c", rail: "#0b1e3d", state: "#0b1e3d", border: "#0b1e3d", borderEcho: "#f05b40",
};

function hatchImage(color: string, size = 12): { width: number; height: number; data: Uint8ClampedArray } {
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const g = c.getContext("2d")!;
  g.strokeStyle = color; g.globalAlpha = 0.5; g.lineWidth = 1; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, size); g.lineTo(size, 0); g.moveTo(-size / 2, size / 2); g.lineTo(size / 2, -size / 2); g.moveTo(size / 2, size * 1.5); g.lineTo(size * 1.5, size / 2); g.stroke();
  const d = g.getImageData(0, 0, size, size);
  return { width: size, height: size, data: d.data };
}

function waveImage(color: string): { width: number; height: number; data: Uint8ClampedArray } {
  const w = 54, h = 22, c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.strokeStyle = color; g.lineWidth = 1.3; g.lineCap = "round"; g.globalAlpha = 0.55;
  for (const [y, x0, x1] of [[7, 2, 30], [15, 18, 52]] as const) {
    g.beginPath();
    for (let x = x0; x <= x1; x += 1) { const yy = y + Math.sin((x - x0) / 3.2) * 2.2; if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
  return { width: w, height: h, data: g.getImageData(0, 0, w, h).data };
}

const SEAS: [string, [number, number]][] = [["Arabian Sea", [65.2, 15.2]], ["Bay of Bengal", [88.6, 15.4]], ["Indian Ocean", [78.6, 4.2]]];
const WAVES: [number, number][] = [[62.5, 19.5], [67.5, 10.5], [70.5, 18.2], [85.2, 11.4], [91.4, 18.6], [89.4, 9.2], [74.2, 6.2], [84.6, 5.6], [60.8, 13.6], [93.2, 13.4]];

/** Adds the printmaking inks to an app map after `underlay`. Idempotent. */
export function fieldInks(map: MLMap, beforeId?: string) {
  const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  /* Linework sits beneath the basemap's own lettering, so a name is never struck through. */
  const firstLabel = (map.getStyle().layers ?? []).find((l) => l.type === "symbol" && (l as { source?: string }).source === "openmaptiles")?.id;
  const under = firstLabel ?? before;
  const add = (layer: Parameters<MLMap["addLayer"]>[0], at = before) => { if (map.getLayer(layer.id)) return; try { map.addLayer(layer, at); } catch { /* a source this build lacks */ } };
  const set = (id: string, prop: string, v: unknown) => { try { (map.setPaintProperty as (i: string, pr: string, val: unknown) => void).call(map, id, prop, v); } catch { /* absent */ } };
  if (!map.hasImage("fa-hatch")) map.addImage("fa-hatch", hatchImage(FI.hatch));
  if (!map.hasImage("fa-wave")) map.addImage("fa-wave", waveImage(FI.waterInk));

  /* Land tints. */
  set("landuse_residential", "fill-color", FI.residential);
  set("landuse_residential", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 9, 0, 11, 0.85]);
  set("landcover_wood", "fill-color", FI.wood);
  for (const id of ["highway_motorway_inner", "highway_motorway_subtle", "highway_motorway_bridge_inner"]) set(id, "line-color", FI.motorway);
  for (const id of ["highway_major_inner", "highway_major_subtle"]) set(id, "line-color", "rgba(201,140,70,0.7)");
  if (map.getLayer("india-mask")) set("india-mask", "fill-color", FI.sea);

  const omt = map.getSource("openmaptiles") ? "openmaptiles" : null;
  if (omt) {
    add({ id: "fa-park-hatch", type: "fill", source: omt, "source-layer": "park", minzoom: 9, paint: { "fill-pattern": "fa-hatch", "fill-opacity": 0.75 } }, under);
    add({ id: "fa-water-echo", type: "line", source: omt, "source-layer": "water", paint: { "line-color": FI.waterEcho, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.6, 12, 1.4], "line-opacity": 0.55, "line-translate": [2, 1.5] } }, under);
    add({ id: "fa-water-ink", type: "line", source: omt, "source-layer": "water", paint: { "line-color": FI.waterInk, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 12, 1.1], "line-opacity": 0.6 } }, under);
    add({ id: "fa-rivers", type: "line", source: omt, "source-layer": "waterway", filter: ["==", ["get", "class"], "river"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": FI.waterEcho, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.8, 10, 1.6, 14, 3], "line-opacity": 0.8 } }, under);
    add({ id: "fa-states", type: "line", source: omt, "source-layer": "boundary", minzoom: 3, filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": FI.state, "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.32, 9, 0.22], "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.1, 9, 1.8], "line-dasharray": [0.1, 2.4] } }, under);
    add({ id: "fa-rail", type: "line", source: omt, "source-layer": "transportation", minzoom: 10, filter: ["==", ["get", "class"], "rail"], paint: { "line-color": FI.rail, "line-opacity": 0.35, "line-width": 1, "line-dasharray": [3, 2] } }, under);
  }
  /* India's border, printed twice: ink, and a flame echo a hair off register. */
  if (map.getSource("india-mask")) {
    add({ id: "fa-border-echo", type: "line", source: "india-mask", maxzoom: 9, paint: { "line-color": FI.borderEcho, "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.2, 8, 2], "line-translate": [2.5, 2] } }, under);
  }
  /* Seas: names and a few pen waves, only at the national scale. */
  if (!map.getSource("fa-seas")) {
    map.addSource("fa-seas", { type: "geojson", data: { type: "FeatureCollection", features: [
      ...SEAS.map(([name, c]) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c }, properties: { name, kind: "name" } })),
      ...WAVES.map((c) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c }, properties: { kind: "wave" } })),
    ] } });
  }
  add({ id: "fa-waves", type: "symbol", source: "fa-seas", maxzoom: 7.5, filter: ["==", ["get", "kind"], "wave"], layout: { "icon-image": "fa-wave", "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.2], "icon-allow-overlap": true }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 6, 1, 7.5, 0] } });
  add({ id: "fa-sea-names", type: "symbol", source: "fa-seas", maxzoom: 7.5, filter: ["==", ["get", "kind"], "name"], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 6, 16], "text-letter-spacing": 0.32, "text-max-width": 6 }, paint: { "text-color": FI.waterInk, "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.62, 7.5, 0], "text-halo-color": FI.sea, "text-halo-width": 1.2 } });
}
