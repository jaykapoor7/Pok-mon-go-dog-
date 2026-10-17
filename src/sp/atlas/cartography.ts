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
import regions from "./india-regions.json";
export const FIELD: Palette = {
  ...PAPER,
  /* Night print: the city on the same indigo sheet as the sea, streets in paper ink. */
  bg: "#1f2a5c", land: "#1f2a5c", water: "#34508f", park: "#264a46", building: "#27346c",
  road: "rgba(246,239,227,0.2)", roadMajor: "rgba(246,239,227,0.55)", rail: "rgba(246,239,227,0.3)",
  boundary: "rgba(246,239,227,0.3)", label: "#f6efe3", labelHalo: "#1f2a5c", labelOpacity: 0.72,
  showRoadNames: false, buildings: false,
  cellEdge: "#1f2a5c",
  seq: ["#dbe5f8", "#a9c0ef", "#6f93e2", "#2f62d3", "#163f9a"],
};

/** Sea wash outside India, and the inks used by fieldInks. */
const FI = {
  sea: "#1f2a5c", seaFar: "#141c44", seaInk: "#e8dfcb", waterInk: "#c9d3ee", waterEcho: "#6f9ee0", hatch: "#7cc36a", wood: "#24493f",
  residential: "#24306a", motorway: "#c0603c", rail: "#f6efe3", state: "#f6efe3", border: "#f6efe3", borderEcho: "#f05b40",
  paper: "#f6efe3",
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
  if (!map.hasImage("fa-wave")) map.addImage("fa-wave", waveImage("#c9d3ee"));

  /* Land: paper at national scale (India as a cut-out on the indigo sea), night print by the city. */
  const NIGHTFALL = (paper: string, night: string) => ["interpolate", ["linear"], ["zoom"], 6.4, paper, 8.2, night];
  for (const l of map.getStyle().layers ?? []) if (l.type === "background") set(l.id, "background-color", NIGHTFALL(FI.paper, "#1f2a5c"));
  /* Land tints. */
  set("landuse_residential", "fill-color", NIGHTFALL("#f4e3cf", FI.residential));
  set("landuse_residential", "fill-opacity", ["interpolate", ["linear"], ["zoom"], 9, 0, 11, 0.85]);
  set("landcover_wood", "fill-color", NIGHTFALL("#cbdcb4", FI.wood));
  /* Roads drawn as an engraver would: paper lines cased in ink, highways in marigold cased in terracotta. */
  for (const id of ["highway_motorway_inner", "highway_motorway_bridge_inner"]) set(id, "line-color", "#f3d39a");
  for (const id of ["highway_motorway_casing", "highway_motorway_bridge_casing"]) set(id, "line-color", "#b65a3a");
  set("highway_motorway_subtle", "line-color", "rgba(182,90,58,0.55)");
  set("highway_major_inner", "line-color", "rgba(233,220,192,0.62)");
  set("highway_major_casing", "line-color", "rgba(10,15,45,0)");
  set("highway_major_subtle", "line-color", "rgba(240,180,90,0.45)");
  set("highway_minor", "line-color", "rgba(246,239,227,0.22)");
  set("highway_path", "line-color", "rgba(246,239,227,0.14)");
  for (const id of ["water", "water_intermittent"]) set(id, "fill-color", NIGHTFALL("#b9cfe6", "#34508f"));
  for (const id of ["park", "landcover_grass", "landcover_park"]) set(id, "fill-color", NIGHTFALL("#d6e3c3", "#264a46"));
  /* Beyond India, an indigo printed ground: India reads as a paper cut-out on the sheet.
     Past the national scale it fades back to paper, so a border city is never framed in dark. */
  if (map.getLayer("india-mask")) set("india-mask", "fill-color", ["interpolate", ["linear"], ["zoom"], 6.5, FI.sea, 8.5, FI.seaFar]);
  if (map.getLayer("india-edge")) set("india-edge", "line-color", NIGHTFALL("#0b1e3d", "#f0b45a"));

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
  /* Water-lines: the coast echoed three times outward, the old engraver's way of drawing the sea. */
  if (map.getSource("india-mask")) {
    [[3, 0.55], [8, 0.34], [14, 0.2], [22, 0.1]].forEach(([off, op], i) => add({ id: `fa-ripple-${i}`, type: "line", source: "india-mask", maxzoom: 7.5,
      paint: { "line-color": "#d9e1f5", "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, op, 7.5, 0], "line-width": 0.9, "line-offset": -off } }, under));
  }
  /* Seas: names and a few pen waves, only at the national scale. */
  if (!map.getSource("fa-seas")) {
    map.addSource("fa-seas", { type: "geojson", data: { type: "FeatureCollection", features: [
      ...SEAS.map(([name, c]) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c }, properties: { name, kind: "name" } })),
      ...WAVES.map((c) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: c }, properties: { kind: "wave" } })),
    ] } });
  }
  add({ id: "fa-waves", type: "symbol", source: "fa-seas", maxzoom: 7.5, filter: ["==", ["get", "kind"], "wave"], layout: { "icon-image": "fa-wave", "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.8, 6, 1.2], "icon-allow-overlap": true }, paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 6, 1, 7.5, 0] } });
  add({ id: "fa-sea-names", type: "symbol", source: "fa-seas", maxzoom: 7.5, filter: ["==", ["get", "kind"], "name"], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Italic"], "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 6, 16], "text-letter-spacing": 0.32, "text-max-width": 6 }, paint: { "text-color": FI.seaInk, "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 7.5, 0] } });
}

/* ── India's physical regions, painted as a printed relief key ──────────
   Natural Earth physical regions (public domain), simplified. They are
   orientation, not data: they sit under the mask (so they stop at India's
   border), fade out before a city opens, and the legend says so. Each kind
   of land has its own mark, drawn by hand-feeling pen strokes:
     range      staggered peaks with a shaded flank   lac / terracotta
     plateau    stipple                              turmeric
     plain      grass ticks                          leaf
     desert     dune arcs and grains                 ochre
     delta, coast  ripples                           sky                */


export type RegionKind = "range" | "plain" | "plateau" | "desert" | "delta" | "coast" | "peninsula";
export const REGION_INK: Record<RegionKind, { wash: string; ink: string; label: string }> = {
  range: { wash: "#ecc7b0", ink: "#9b3149", label: "Hills and ranges" },
  plateau: { wash: "#f2dca6", ink: "#b57d10", label: "Plateau" },
  plain: { wash: "#dce8c6", ink: "#4b7f4f", label: "Plains" },
  desert: { wash: "#f0d6a0", ink: "#a8741f", label: "Desert" },
  delta: { wash: "#cfe2ea", ink: "#2f6f9a", label: "Delta" },
  coast: { wash: "#d5e6e6", ink: "#1f6f80", label: "Coast" },
  peninsula: { wash: "#ecdcbc", ink: "#a8741f", label: "Peninsula" },
};

type Img = { width: number; height: number; data: Uint8ClampedArray };
/** A deterministic wobble, so marks feel drawn but every render is identical. */
const jit = (i: number, k = 1) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
function tile(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Img {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.lineCap = "round"; g.lineJoin = "round"; draw(g);
  return { width: w, height: h, data: g.getImageData(0, 0, w, h).data };
}
function markImage(kind: RegionKind): Img {
  const ink = REGION_INK[kind].ink;
  switch (kind) {
    case "range": return tile(36, 30, (g) => {
      g.strokeStyle = ink; g.lineWidth = 1.25; g.globalAlpha = 0.78;
      for (const [x, y, s] of [[9, 12, 1], [27, 27, 0.85]] as const) {
        g.beginPath(); g.moveTo(x - 6 * s, y); g.lineTo(x + jit(x) * 1.2, y - 7 * s); g.lineTo(x + 6 * s, y); g.stroke();
        g.globalAlpha = 0.42; g.lineWidth = 0.9;
        for (let k = 1; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 1.6 * s, y - 7 * s + k * 2.2 * s); g.lineTo(x + k * 1.6 * s - 1.4, y); g.stroke(); }
        g.globalAlpha = 0.78; g.lineWidth = 1.25;
      }
    });
    case "plateau": return tile(22, 22, (g) => {
      g.fillStyle = ink; g.globalAlpha = 0.6;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(Math.abs(jit(i, 1)) * 22, Math.abs(jit(i, 2)) * 22, 0.75 + Math.abs(jit(i, 3)) * 0.5, 0, Math.PI * 2); g.fill(); }
    });
    case "plain": return tile(30, 24, (g) => {
      g.strokeStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.6;
      for (const [x, y] of [[6, 8], [21, 19]] as const) { g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x, y); g.lineTo(x + 3, y - 3.5); g.moveTo(x, y); g.lineTo(x + 0.3, y - 4.5); g.stroke(); }
    });
    case "desert": return tile(34, 26, (g) => {
      g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.6;
      g.beginPath(); g.arc(10, 14, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.beginPath(); g.arc(26, 25, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(Math.abs(jit(i, 4)) * 34, Math.abs(jit(i, 5)) * 26, 0.6, 0, Math.PI * 2); g.fill(); }
    });
    default: return tile(32, 18, (g) => {
      g.strokeStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.55;
      for (const [y, x0] of [[6, 2], [14, 17]] as const) { g.beginPath(); for (let x = x0; x <= x0 + 13; x++) { const yy = y + Math.sin((x - x0) / 2.1) * 1.4; if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
    });
  }
}

export const REGIONS = regions as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { name: string; hi: string; kind: RegionKind }>;
/** Fades every region out before the city scale. */
const REGION_FADE = (peak: number) => ["interpolate", ["linear"], ["zoom"], 3, peak, 6, peak * 0.75, 7.6, 0] as unknown as number;

/** Physical regions as washes and marks, beneath the India mask. Idempotent. */
export function regionInks(map: MLMap) {
  const at = map.getLayer("india-mask") ? "india-mask" : undefined;
  if (!map.getSource("fa-regions")) map.addSource("fa-regions", { type: "geojson", data: REGIONS as GeoJSON.FeatureCollection });
  const kinds = Object.keys(REGION_INK) as RegionKind[];
  for (const k of kinds) if (!map.hasImage(`fa-r-${k}`)) map.addImage(`fa-r-${k}`, markImage(k), { pixelRatio: 1.6 });
  /* Plains first, ranges last: a range printed over a plain stays legible. */
  const order: RegionKind[] = ["plain", "peninsula", "coast", "delta", "desert", "plateau", "range"];
  for (const k of order) {
    const id = `fa-region-${k}`;
    if (map.getLayer(id)) continue;
    try {
      map.addLayer({ id: `${id}-wash`, type: "fill", source: "fa-regions", maxzoom: 8, filter: ["==", ["get", "kind"], k], paint: { "fill-color": REGION_INK[k].wash, "fill-opacity": REGION_FADE(k === "range" ? 0.55 : 0.6) } }, at);
      map.addLayer({ id, type: "fill", source: "fa-regions", maxzoom: 8, filter: ["==", ["get", "kind"], k], paint: { "fill-pattern": `fa-r-${k}`, "fill-opacity": REGION_FADE(0.9) } }, at);
    } catch { /* absent */ }
  }
  setRegionsVisible(map, true);
}

/** Restrained mode and city scale hide the relief; the evidence stays. */
export function setRegionsVisible(map: MLMap, on: boolean) {
  for (const k of Object.keys(REGION_INK)) for (const id of [`fa-region-${k}`, `fa-region-${k}-wash`]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
}

/** Where to letter each region, and at what angle: the mass centre of its
    largest polygon, turned along a long range so the name follows the hills. */
export type RegionLabel = { name: string; hi: string; kind: RegionKind; at: [number, number]; angle: number; major: boolean };
/* Where the mass centre falls on a neighbour's name, the letterer moves it, as an atlas would. */
const ANCHOR: Record<string, [number, number]> = { "Indo-Gangetic Plain": [83.4, 26.9], "Deccan Plateau": [75.3, 18.1], "Ganges Delta": [89.4, 22.4], "Thar Desert": [72.6, 27.3], "Himalaya": [79.4, 31.2], "Vindhya Range": [77.6, 23.2], "Satpura Range": [76.6, 21.9] };
const MAJOR = new Set(["Himalaya", "Indo-Gangetic Plain", "Deccan Plateau", "Thar Desert", "Western Ghats", "Eastern Ghats"]);
export function regionLabels(): RegionLabel[] {
  return REGIONS.features.map((f) => {
    const ring = f.geometry.coordinates.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
    const n = ring.length, mx = ring.reduce((s, p) => s + p[0], 0) / n, my = ring.reduce((s, p) => s + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of ring) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const l1 = (sxx + syy) / 2 + Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2), l2 = (sxx + syy) / 2 - Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2);
    let angle = l2 > 0 && l1 / l2 > 6 && f.properties.kind !== "plain" ? -(theta * 180) / Math.PI : 0;
    if (angle > 90) angle -= 180; if (angle < -90) angle += 180;
    return { name: f.properties.name, hi: f.properties.hi, kind: f.properties.kind, at: ANCHOR[f.properties.name] ?? ([mx, my] as [number, number]), angle: Math.round(angle), major: MAJOR.has(f.properties.name) };
  });
}
