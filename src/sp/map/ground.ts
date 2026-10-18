/* ════════════════════════════════════════════════════════════════════
   The Map's ground: an illustrated, hand-tinted India.

   Real geography (OpenStreetMap vector tiles via OpenFreeMap, India's
   boundary from Natural Earth on India's official view, physical regions
   from Natural Earth) drawn in StrayPaw's own language, a daylight field
   guide rather than a borrowed basemap:

     sea          peacock teal, filled with rows of fine dashes: the line
                  infill of Gond painting, as a principle, not a copied motif
     India        handmade paper, outlined twice (ink, then a vermilion
                  echo a hair off register), like a Madhubani double line
     states       a running stitch, as kantha embroidery joins cloth
     hills, plateaus, plains, desert
                  washes with pen marks, lettered in English and Hindi
     rivers       drawn twice: a deep line and a lighter echo
     parks, woods leaf washes filled with dots
     roads        engraved: arterials turmeric cased in ink, highways
                  vermilion, lanes paper lines, rail a ladder
     buildings    terracotta blocks with an ink edge and a printed shadow

   Nothing here moves a street or adds a mark where nothing was recorded.
   The ground fades back as the evidence takes over: national ornament is
   gone before a city opens, street detail arrives only as you near it.
   ════════════════════════════════════════════════════════════════════ */

import type { Map as MLMap, StyleSpecification, LayerSpecification } from "maplibre-gl";
import regions from "../atlas/india-regions.json";

export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** The ground's inks. Data inks live in marks.ts and never repeat these meanings. */
export const INK = {
  paper: "#f7edd8", paperDeep: "#efdfc0", sea: "#1f8a8c", seaDeep: "#17706f", seaLine: "#9fe0d6",
  ink: "#2a1d17", vermilion: "#d9452b", stitch: "#c2412d",
  water: "#58b4c2", waterLine: "#1e6f86", river: "#2f8fb0",
  leaf: "#b8d98b", leafDot: "#5d9a3c", wood: "#9cc77a",
  residential: "#f3dcc0", building: "#e7b48f", buildingEdge: "#9a5536",
  turmeric: "#f4c542", highway: "#e9603f", lane: "#fffaf0", laneEdge: "#c7a57a",
  label: "#3a2a22", halo: "#f7edd8",
};

export function groundStyle(): StyleSpecification {
  return { version: 8, glyphs: GLYPHS, sources: {}, layers: [{ id: "g-paper", type: "background", paint: { "background-color": INK.paper } }] };
}

type Img = { width: number; height: number; data: Uint8ClampedArray };
function tile(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Img {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; g.lineCap = "round"; g.lineJoin = "round"; draw(g);
  return { width: w, height: h, data: g.getImageData(0, 0, w, h).data };
}
/** A deterministic wobble: drawn-feeling, identical on every render. */
const jit = (i: number, k = 1) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

/* Gond-style line infill for the sea: staggered rows of short dashes. */
const seaFill = () => tile(48, 24, (g) => {
  g.fillStyle = INK.sea; g.fillRect(0, 0, 48, 24);
  g.strokeStyle = INK.seaLine; g.lineWidth = 1.1; g.globalAlpha = 0.42;
  for (const [y, off] of [[6, 0], [18, 12]] as const) for (let x = off; x < 48 + 12; x += 24) { g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x, y - 2.2, x + 6, y); g.stroke(); }
});
/* Dotted infill for parks and woods. */
const dotFill = (bg: string, dot: string) => tile(14, 14, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 14, 14);
  g.fillStyle = dot; g.globalAlpha = 0.55;
  for (const [x, y] of [[3.5, 3.5], [10.5, 10.5]] as const) { g.beginPath(); g.arc(x, y, 1.15, 0, Math.PI * 2); g.fill(); }
});
/* Ripples for lakes and tanks at street scale. */
const ripple = () => tile(40, 18, (g) => {
  g.fillStyle = INK.water; g.fillRect(0, 0, 40, 18);
  g.strokeStyle = "#e9fbff"; g.globalAlpha = 0.5; g.lineWidth = 1;
  for (const [y, x0] of [[5, 2], [13, 20]] as const) { g.beginPath(); for (let x = x0; x <= x0 + 16; x++) { const yy = y + Math.sin((x - x0) / 2.4) * 1.3; if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
});
/* Handmade-paper grain: barely-there fibres so land is never a flat fill. */
const grain = () => tile(64, 64, (g) => {
  g.fillStyle = INK.paper; g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = i % 3 ? "#e6d3ae" : "#fffaf0"; g.globalAlpha = 0.55; g.lineWidth = 0.7;
    const x = jit(i, 1) * 64, y = jit(i, 2) * 64, a = jit(i, 3) * Math.PI, l = 3 + jit(i, 4) * 6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
});

/* ── Physical regions: a painted relief key (Natural Earth, public domain). ── */
type RegionKind = "range" | "plain" | "plateau" | "desert" | "delta" | "coast" | "peninsula";
export const RELIEF: Record<RegionKind, { wash: string; ink: string; label: string }> = {
  range: { wash: "#f1c3a6", ink: "#a2342a", label: "Hills and ranges" },
  plateau: { wash: "#f6dc9c", ink: "#b57d10", label: "Plateau" },
  plain: { wash: "#dcebbf", ink: "#4b8a45", label: "Plains" },
  desert: { wash: "#f5d79a", ink: "#b27318", label: "Desert" },
  delta: { wash: "#cfe8e6", ink: "#1f7d8a", label: "Delta" },
  coast: { wash: "#d8ece3", ink: "#1f7d8a", label: "Coast" },
  peninsula: { wash: "#f0dfbd", ink: "#a8741f", label: "Peninsula" },
};
function reliefMark(kind: RegionKind): Img {
  const ink = RELIEF[kind].ink;
  switch (kind) {
    case "range": return tile(38, 30, (g) => {
      g.strokeStyle = ink; g.fillStyle = ink;
      for (const [x, y, s] of [[10, 13, 1], [28, 27, 0.85]] as const) {
        g.globalAlpha = 0.85; g.lineWidth = 1.35;
        g.beginPath(); g.moveTo(x - 7 * s, y); g.lineTo(x, y - 8 * s); g.lineTo(x + 7 * s, y); g.stroke();
        g.globalAlpha = 0.45; g.lineWidth = 0.9;
        for (let k = 1; k <= 3; k++) { g.beginPath(); g.moveTo(x + k * 1.7 * s, y - 8 * s + k * 2.4 * s); g.lineTo(x + k * 1.7 * s - 1.5, y); g.stroke(); }
      }
    });
    case "plateau": return tile(22, 22, (g) => { g.fillStyle = ink; g.globalAlpha = 0.6; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(jit(i, 1) * 22, jit(i, 2) * 22, 0.8 + jit(i, 3) * 0.5, 0, Math.PI * 2); g.fill(); } });
    case "plain": return tile(30, 24, (g) => { g.strokeStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.6; for (const [x, y] of [[6, 9], [21, 20]] as const) { g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x, y); g.lineTo(x + 3, y - 3.5); g.moveTo(x, y); g.lineTo(x + 0.3, y - 4.6); g.stroke(); } });
    case "desert": return tile(34, 26, (g) => {
      g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.6;
      g.beginPath(); g.arc(10, 14, 7, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      g.beginPath(); g.arc(26, 25, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
      for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(jit(i, 4) * 34, jit(i, 5) * 26, 0.6, 0, Math.PI * 2); g.fill(); }
    });
    default: return tile(32, 18, (g) => { g.strokeStyle = ink; g.lineWidth = 1; g.globalAlpha = 0.55; for (const [y, x0] of [[6, 2], [14, 17]] as const) { g.beginPath(); for (let x = x0; x <= x0 + 13; x++) { const yy = y + Math.sin((x - x0) / 2.1) * 1.4; if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); } });
  }
}
const REGIONS = regions as GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, { name: string; hi: string; kind: RegionKind }>;

/** Where to letter each region: the mass centre of its largest polygon, turned along long ranges. */
export type RegionLabel = { name: string; hi: string; kind: RegionKind; at: [number, number]; angle: number; major: boolean };
const ANCHOR: Record<string, [number, number]> = { "Indo-Gangetic Plain": [83.4, 26.9], "Deccan Plateau": [76.3, 17.4], "Ganges Delta": [89.4, 22.4], "Thar Desert": [71.6, 27.0], "Himalaya": [79.4, 31.2], "Vindhya Range": [77.6, 23.2], "Satpura Range": [76.6, 21.9] };
const MAJOR = new Set(["Himalaya", "Indo-Gangetic Plain", "Deccan Plateau", "Thar Desert", "Western Ghats", "Eastern Ghats"]);
export function regionLabels(): RegionLabel[] {
  return REGIONS.features.map((f) => {
    const ring = f.geometry.coordinates.map((p) => p[0]).sort((a, b) => b.length - a.length)[0];
    const n = ring.length, mx = ring.reduce((s, p) => s + p[0], 0) / n, my = ring.reduce((s, p) => s + p[1], 0) / n;
    let sxx = 0, syy = 0, sxy = 0;
    for (const [x, y] of ring) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
    const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const d = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy ** 2), l1 = (sxx + syy) / 2 + d, l2 = (sxx + syy) / 2 - d;
    let angle = l2 > 0 && l1 / l2 > 6 && f.properties.kind !== "plain" ? -(theta * 180) / Math.PI : 0;
    if (angle > 90) angle -= 180; if (angle < -90) angle += 180;
    return { name: f.properties.name, hi: f.properties.hi, kind: f.properties.kind, at: ANCHOR[f.properties.name] ?? ([mx, my] as [number, number]), angle: Math.round(angle), major: MAJOR.has(f.properties.name) };
  });
}

/* ── zoom helpers ── */
type Expr = unknown;
const z = (...stops: (number | string)[]): Expr => ["interpolate", ["linear"], ["zoom"], ...stops];
const zx = (...stops: number[]): Expr => ["interpolate", ["exponential", 1.4], ["zoom"], ...stops];

/** Draws the ground beneath every data layer. Data never waits on tiles: the
 *  map opens on the sea colour, India's paper and regions arrive first (local
 *  files), streets slide in when tiles answer. Returns false if tiles fail. */
export async function drawGround(map: MLMap, beforeId?: string): Promise<boolean> {
  const before = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
  const add = (layer: LayerSpecification) => { if (map.getLayer(layer.id)) return; try { map.addLayer(layer, before); } catch { /* a layer this build cannot draw */ } };
  const img = (id: string, i: Img, ratio = 2) => { if (!map.hasImage(id)) map.addImage(id, i, { pixelRatio: ratio }); };
  img("g-sea", seaFill()); img("g-grain", grain(), 2); img("g-park", dotFill(INK.leaf, INK.leafDot)); img("g-wood", dotFill(INK.wood, "#3f7d33")); img("g-ripple", ripple());
  for (const k of Object.keys(RELIEF) as RegionKind[]) img(`g-r-${k}`, reliefMark(k), 1.6);

  if (!map.getSource("india")) map.addSource("india", { type: "geojson", data: "/geo/india-mask.json" });
  if (!map.getSource("g-regions")) map.addSource("g-regions", { type: "geojson", data: REGIONS as GeoJSON.FeatureCollection });

  let ok = true;
  if (!map.getSource("omt")) { try { map.addSource("omt", { type: "vector", url: "https://tiles.openfreemap.org/planet" }); } catch { ok = false; } }
  const S = { source: "omt" } as const;

  /* Land: handmade paper wherever tiles draw no water; at national scale the mask lays the sea over the rest of the world. */
  add({ id: "g-land", type: "background", paint: { "background-pattern": "g-grain" } });
  add({ id: "g-residential", type: "fill", ...S, "source-layer": "landuse", minzoom: 9, filter: ["in", ["get", "class"], ["literal", ["residential", "suburb", "neighbourhood"]]], paint: { "fill-color": INK.residential, "fill-opacity": z(9, 0, 11.5, 0.7) as number } });
  add({ id: "g-wood", type: "fill", ...S, "source-layer": "landcover", minzoom: 7, filter: ["in", ["get", "class"], ["literal", ["wood", "forest", "grass", "scrub"]]], paint: { "fill-pattern": "g-wood", "fill-opacity": z(7, 0, 9, 0.7) as number } });
  add({ id: "g-park", type: "fill", ...S, "source-layer": "park", minzoom: 8, paint: { "fill-pattern": "g-park", "fill-opacity": z(8, 0, 10, 0.95) as number } });
  add({ id: "g-park-edge", type: "line", ...S, "source-layer": "park", minzoom: 11, paint: { "line-color": "#4f8a36", "line-width": 0.9, "line-opacity": 0.6, "line-dasharray": [2, 1.5] } });
  /* Water: rippled fill at street scale, inked twice at every scale. */
  add({ id: "g-water", type: "fill", ...S, "source-layer": "water", paint: { "fill-color": INK.water } });
  add({ id: "g-water-ripple", type: "fill", ...S, "source-layer": "water", minzoom: 12, paint: { "fill-pattern": "g-ripple", "fill-opacity": z(12, 0, 13.5, 0.8) as number } });
  add({ id: "g-water-echo", type: "line", ...S, "source-layer": "water", minzoom: 8, paint: { "line-color": "#9ad7df", "line-width": zx(8, 0.6, 15, 2) as number, "line-translate": [1.6, 1.4], "line-opacity": 0.9 } });
  add({ id: "g-water-ink", type: "line", ...S, "source-layer": "water", minzoom: 8, paint: { "line-color": INK.waterLine, "line-width": zx(8, 0.5, 15, 1.4) as number, "line-opacity": 0.85 } });
  add({ id: "g-river-echo", type: "line", ...S, "source-layer": "waterway", minzoom: 5, filter: ["in", ["get", "class"], ["literal", ["river", "canal"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#9ad7df", "line-width": zx(5, 1.2, 10, 2.6, 15, 7) as number, "line-opacity": z(5, 0.4, 9, 0.9) as number } });
  add({ id: "g-river", type: "line", ...S, "source-layer": "waterway", minzoom: 5, filter: ["in", ["get", "class"], ["literal", ["river", "canal"]]], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": INK.river, "line-width": zx(5, 0.5, 10, 1.3, 15, 3.4) as number, "line-opacity": z(5, 0.55, 9, 1) as number } });
  add({ id: "g-stream", type: "line", ...S, "source-layer": "waterway", minzoom: 12, filter: ["in", ["get", "class"], ["literal", ["stream", "drain", "ditch"]]], paint: { "line-color": INK.river, "line-width": 0.8, "line-opacity": 0.6, "line-dasharray": [3, 1.6] } });
  /* Buildings: terracotta blocks, an ink edge and a printed shadow. */
  add({ id: "g-building-shadow", type: "fill", ...S, "source-layer": "building", minzoom: 14.5, paint: { "fill-color": "#b27b5a", "fill-translate": [1.5, 1.5], "fill-opacity": z(14.5, 0, 15.5, 0.35) as number } });
  add({ id: "g-building", type: "fill", ...S, "source-layer": "building", minzoom: 14.5, paint: { "fill-color": INK.building, "fill-outline-color": INK.buildingEdge, "fill-opacity": z(14.5, 0, 15.5, 0.9) as number } });
  /* Roads, engraved. Lanes are paper lines edged in sepia; arterials turmeric cased in ink; highways vermilion. */
  const T = { ...S, "source-layer": "transportation" } as const;
  const isLine: Expr = ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false];
  const cls = (...c: string[]): Expr => ["all", isLine, ["in", ["get", "class"], ["literal", c]]];
  const round = { "line-cap": "round", "line-join": "round" } as const;
  add({ id: "g-lane-case", type: "line", ...T, minzoom: 12.5, filter: cls("minor", "service") as never, layout: round, paint: { "line-color": INK.laneEdge, "line-width": zx(12.5, 1.6, 16, 7, 18, 16) as number, "line-opacity": z(12.5, 0, 13.4, 0.8) as number } });
  add({ id: "g-lane", type: "line", ...T, minzoom: 12.5, filter: cls("minor", "service") as never, layout: round, paint: { "line-color": INK.lane, "line-width": zx(12.5, 0.8, 16, 5, 18, 13) as number, "line-opacity": z(12.5, 0, 13.4, 1) as number } });
  add({ id: "g-path", type: "line", ...T, minzoom: 14, filter: cls("path", "track") as never, paint: { "line-color": "#a07c55", "line-width": 1, "line-dasharray": [1.5, 1.5], "line-opacity": 0.7 } });
  add({ id: "g-rail", type: "line", ...T, minzoom: 9, filter: cls("rail", "transit") as never, paint: { "line-color": INK.ink, "line-width": 1, "line-opacity": z(9, 0.3, 13, 0.7) as number } });
  add({ id: "g-rail-tie", type: "line", ...T, minzoom: 12, filter: cls("rail", "transit") as never, paint: { "line-color": INK.ink, "line-width": 4, "line-dasharray": [0.18, 2.4], "line-opacity": 0.6 } });
  add({ id: "g-major-case", type: "line", ...T, minzoom: 7, filter: cls("primary", "secondary", "tertiary", "trunk") as never, layout: round, paint: { "line-color": INK.ink, "line-width": zx(7, 0.5, 10, 1.1, 12, 2.6, 14, 6, 18, 26) as number, "line-opacity": z(7, 0.2, 10, 0.35, 12, 0.75) as number } });
  add({ id: "g-major", type: "line", ...T, minzoom: 9.5, filter: cls("primary", "secondary", "tertiary", "trunk") as never, layout: round, paint: { "line-color": INK.turmeric, "line-width": zx(9.5, 0.3, 12, 1.6, 14, 4, 18, 22) as number, "line-opacity": z(9.5, 0.5, 11.5, 1) as number } });
  add({ id: "g-motor-case", type: "line", ...T, minzoom: 5, filter: cls("motorway") as never, layout: round, paint: { "line-color": "#5b1f14", "line-width": zx(5, 0.6, 10, 2.6, 14, 8, 18, 30) as number, "line-opacity": z(5, 0.35, 9, 0.9) as number } });
  add({ id: "g-motor", type: "line", ...T, minzoom: 7.5, filter: cls("motorway") as never, layout: round, paint: { "line-color": INK.highway, "line-width": zx(7.5, 0.5, 14, 5.5, 18, 24) as number } });

  /* Physical relief, then the sea mask over the rest of the world, at national scale only. */
  const order: RegionKind[] = ["plain", "peninsula", "coast", "delta", "desert", "plateau", "range"];
  const fade = (peak: number) => z(3, peak, 6, peak * 0.8, 7.8, 0) as number;
  for (const k of order) {
    add({ id: `g-r-${k}-wash`, type: "fill", source: "g-regions", maxzoom: 8, filter: ["==", ["get", "kind"], k], paint: { "fill-color": RELIEF[k].wash, "fill-opacity": fade(0.75) } });
    add({ id: `g-r-${k}`, type: "fill", source: "g-regions", maxzoom: 8, filter: ["==", ["get", "kind"], k], paint: { "fill-pattern": `g-r-${k}`, "fill-opacity": fade(0.95) } });
  }
  /* States: a running stitch. */
  add({ id: "g-states", type: "line", ...S, "source-layer": "boundary", minzoom: 3, filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]], layout: round, paint: { "line-color": INK.stitch, "line-opacity": z(3, 0.55, 9, 0.35) as number, "line-width": z(3, 1.1, 9, 1.8) as number, "line-dasharray": [2, 2.2] } });
  add({ id: "g-mask", type: "fill", source: "india", paint: { "fill-pattern": "g-sea", "fill-opacity": z(6.5, 1, 8.6, 0) as number } });
  /* Coast ripples: the shore echoed outward, an engraver's sea. */
  [[3, 0.6], [8, 0.38], [14, 0.22]].forEach(([off, op], i) => add({ id: `g-coast-${i}`, type: "line", source: "india", maxzoom: 7.6, paint: { "line-color": "#d8f4ee", "line-opacity": z(3, op, 7.6, 0) as number, "line-width": 1, "line-offset": -off } }));
  add({ id: "g-border-echo", type: "line", source: "india", maxzoom: 10, paint: { "line-color": INK.vermilion, "line-opacity": z(3, 0.85, 9, 0.4, 10, 0) as number, "line-width": z(3, 1.4, 8, 2.4) as number, "line-translate": [2.2, 1.8] } });
  add({ id: "g-border", type: "line", source: "india", paint: { "line-color": INK.ink, "line-opacity": z(3, 0.95, 10, 0.5) as number, "line-width": z(3, 1.3, 8, 2) as number } });

  /* Lettering from the tiles, quiet: towns and villages as you near them, street names close in. */
  add({ id: "g-town", type: "symbol", ...S, "source-layer": "place", minzoom: 9, filter: ["in", ["get", "class"], ["literal", ["town", "village", "suburb"]]], layout: { "text-field": ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": z(9, 10.5, 13, 12.5) as number, "text-letter-spacing": 0.04, "text-max-width": 8 }, paint: { "text-color": INK.label, "text-halo-color": INK.halo, "text-halo-width": 1.6, "text-opacity": z(9, 0, 10, 0.7, 13.2, 0.35) as number } });
  add({ id: "g-street-name", type: "symbol", ...S, "source-layer": "transportation_name", minzoom: 14.2, filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "trunk", "minor"]]], layout: { "symbol-placement": "line", "text-field": ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name"]], "text-font": ["Noto Sans Italic"], "text-size": 11, "text-letter-spacing": 0.05 }, paint: { "text-color": "#6b4a33", "text-halo-color": INK.lane, "text-halo-width": 1.4 } });
  return ok;
}

/** Layers that are national ornament: hidden in the quiet view. */
export const ORNAMENT = ["g-coast-0", "g-coast-1", "g-coast-2", "g-border-echo", ...Object.keys(RELIEF).flatMap((k) => [`g-r-${k}`, `g-r-${k}-wash`])];
