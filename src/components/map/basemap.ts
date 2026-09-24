/* ════════════════════════════════════════════════════════════════════
   The basemap, repainted.

   StrayPaw's maps take OpenFreeMap's vector tiles (OpenStreetMap, no key,
   no account) and repaint every layer to one of two grounds, so the
   streets become the paper the records sit on rather than a borrowed
   product competing with them:

   NIGHT  the landing plate and the intelligence map: the city as a
          quiet navy ground, streets as faint hairlines, no borrowed
          lettering, so the cells carry all the colour.
   PAPER  warm and light, for reading in sunlight and for printing.

   The map always opens on a style of our own — one background layer —
   so the records draw the moment the page does; the streets are fetched
   afterwards and slid in *beneath* them. Slow tiles never block the
   data, and no tiles at all still leaves a legible plate.
   ════════════════════════════════════════════════════════════════════ */

import type { Map as MLMap, StyleSpecification } from "maplibre-gl";

export type Palette = {
  name: "night" | "paper";
  bg: string; water: string; land: string; park: string; building: string;
  road: string; roadMajor: string; roadCasing?: string; rail: string; boundary: string;
  label: string; labelHalo: string; labelOpacity?: number; showRoadNames?: boolean;
  labels?: boolean; minorRoads?: boolean; buildings?: boolean;
  /** Colours the data layers use on this ground. */
  cellEdge: string; ink: string; dim: string; seq: string[]; att: string[]; arv: string; hatch: string;
};

export const NIGHT: Palette = {
  name: "night",
  bg: "#07142b", water: "#0c2548", land: "#07142b", park: "#081733", building: "#0b1c3a",
  road: "rgba(239,231,218,0.045)", roadMajor: "rgba(239,231,218,0.10)", rail: "rgba(239,231,218,0.06)",
  boundary: "rgba(239,231,218,0.12)", label: "#efe7da", labelHalo: "#07142b", labelOpacity: 0.34,
  labels: true, minorRoads: true, buildings: true, showRoadNames: false,
  cellEdge: "rgba(7,20,43,0.95)", ink: "#efe7da", dim: "rgba(239,231,218,0.55)",
  seq: ["#132b55", "#1b3f80", "#2a5bb8", "#4f7fe0", "#93b1f0"],
  att: ["#3b1f2c", "#6d2a2c", "#a8392b", "#e05537", "#f7a08c"],
  arv: "#7fc9d6",
  hatch: "rgba(239,231,218,0.30)",
};

/** The landing plate: night, with no borrowed lettering competing with the headline. */
export const PLATE: Palette = { ...NIGHT, labels: false, road: "rgba(239,231,218,0.05)", roadMajor: "rgba(239,231,218,0.11)" };

export const PAPER: Palette = {
  name: "paper",
  bg: "#efe7da", water: "#d3dde6", land: "#ece3d5", park: "#e2e0cb", building: "#e2d8c8",
  road: "rgba(11,30,61,0.10)", roadMajor: "rgba(11,30,61,0.22)", rail: "rgba(11,30,61,0.14)",
  boundary: "rgba(11,30,61,0.22)", label: "#0b1e3d", labelHalo: "#efe7da", labelOpacity: 0.6, showRoadNames: true,
  cellEdge: "rgba(239,231,218,0.95)", ink: "#0b1e3d", dim: "rgba(11,30,61,0.55)",
  seq: ["#c8d4f0", "#93aee9", "#5b82dc", "#2457ce", "#16398f"],
  att: ["#f6d2c7", "#f0b09c", "#f0957c", "#f05b40", "#b93a1d"],
  arv: "#3c98a8",
  hatch: "rgba(11,30,61,0.34)",
};

export const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";
export const FONT = ["Noto Sans Regular"];
export const FONT_BOLD = ["Noto Sans Bold"];

export function groundStyle(p: Palette): StyleSpecification {
  return { version: 8, glyphs: GLYPHS, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": p.bg } }] };
}

export function restyle(map: MLMap, p: Palette) {
  const set = (id: string, prop: string, v: unknown) => { try { (map.setPaintProperty as (i: string, pr: string, val: unknown) => void).call(map, id, prop, v); } catch { /* absent */ } };
  const vis = (id: string, on: boolean) => { try { map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } catch { /* absent */ } };
  for (const l of map.getStyle().layers ?? []) {
    const id = l.id;
    const src = (l as { source?: string }).source;
    if (l.type === "background") { set(id, "background-color", p.bg); continue; }
    if (src !== "openmaptiles") continue;
    if (l.type === "symbol") {
      if (p.labels === false || id.includes("shield") || id.includes("poi") || id === "airport" || (!p.showRoadNames && id.startsWith("highway-name"))) { vis(id, false); continue; }
      vis(id, true);
      set(id, "text-color", p.label);
      set(id, "text-halo-color", p.labelHalo);
      set(id, "text-opacity", p.labelOpacity ?? 0.8);
      set(id, "icon-opacity", 0);
      continue;
    }
    if (p.minorRoads === false && l.type === "line" && /minor|path|service|pier|tunnel|track/.test(id)) { vis(id, false); continue; }
    if (id === "building" || id.startsWith("building")) { if (p.buildings === false) vis(id, false); else { set(id, "fill-color", p.building); set(id, "fill-outline-color", p.building); } continue; }
    if (id === "water" || id.startsWith("water")) { if (l.type === "fill") set(id, "fill-color", p.water); else if (l.type === "line") set(id, "line-color", p.water); continue; }
    if (id === "park" || id.startsWith("landcover")) { set(id, "fill-color", p.park); set(id, "fill-opacity", 1); continue; }
    if (id.startsWith("landuse")) { set(id, "fill-color", p.land); continue; }
    if (id.startsWith("aeroway")) { vis(id, false); continue; }
    if (l.type === "line" && id.startsWith("boundary")) { set(id, "line-color", p.boundary); continue; }
    if (l.type === "line" && id.includes("railway")) { set(id, "line-color", p.rail); continue; }
    if (l.type === "line" && id.endsWith("casing")) { set(id, "line-color", p.roadCasing ?? "rgba(0,0,0,0)"); continue; }
    if (l.type === "line" && (id.includes("major") || id.includes("motorway") || id.includes("trunk") || id.includes("primary"))) { set(id, "line-color", p.roadMajor); continue; }
    if (l.type === "line") set(id, "line-color", p.road);
  }
}

let styleCache: Promise<{ sources: Record<string, unknown>; layers: { id: string; type: string }[] } | null> | null = null;
const fetchStyle = () => {
  if (!styleCache) {
    styleCache = fetch("https://tiles.openfreemap.org/styles/positron")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return styleCache;
};

/** Slides the street basemap in beneath whatever data layers are already on the map. */
export async function underlay(map: MLMap, p: Palette, beforeId?: string) {
  const style = await fetchStyle();
  if (!style || !map.getStyle()) return false;
  const ours = (map.getStyle().layers ?? []).filter((l) => l.id !== "background").map((l) => l.id);
  const before = beforeId ?? ours[0];
  for (const [id, src] of Object.entries(style.sources)) if (!map.getSource(id)) { try { map.addSource(id, src as never); } catch { /* ok */ } }
  for (const layer of style.layers) {
    if (layer.type === "background" || map.getLayer(layer.id)) continue;
    try { map.addLayer(layer as never, before && map.getLayer(before) ? before : undefined); } catch { /* a layer this build cannot draw */ }
  }
  restyle(map, p);
  return true;
}
