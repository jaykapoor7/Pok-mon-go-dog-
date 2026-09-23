"use client";

/* A real vector basemap, repainted.

   The live site uses OpenFreeMap. The lab takes the same tiles and repaints
   every layer to the direction's palette, so the basemap stops looking like
   a borrowed product and becomes the ground the records sit on. What the
   direction adds — contours, hexes, points — goes on top as ordinary
   MapLibre layers, so it pans and zooms with the city instead of being a
   picture laid over it. */

import { useEffect, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";

export type Palette = {
  bg: string; water: string; land: string; park: string; building: string;
  road: string; roadMajor: string; roadCasing?: string; rail: string; boundary: string;
  label: string; labelHalo: string; labelOpacity?: number; showRoadNames?: boolean;
  /** Night plates carry no borrowed lettering and no street grain. */
  labels?: boolean; minorRoads?: boolean; buildings?: boolean;
};

export const NIGHT: Palette = {
  bg: "#07142b", water: "#0c2548", land: "#07142b", park: "#07142b", building: "#07142b",
  road: "rgba(239,231,218,0.035)", roadMajor: "rgba(239,231,218,0.075)", rail: "rgba(239,231,218,0.05)",
  boundary: "rgba(239,231,218,0.1)", label: "#efe7da", labelHalo: "#07142b", labelOpacity: 0.3,
  labels: false, minorRoads: false, buildings: false,
};
export const CIVIC: Palette = {
  bg: "#e9ebec", water: "#c3d2e8", land: "#e4e7e8", park: "#dde3df", building: "#d8dce1",
  road: "#ffffff", roadMajor: "#ffffff", roadCasing: "#cfd4da", rail: "#b9c0c9", boundary: "#9aa4b1",
  label: "#3d4a5c", labelHalo: "#e9ebec", labelOpacity: 0.9, showRoadNames: true,
};
export const PAPER: Palette = {
  bg: "#efe7da", water: "#d6dfe6", land: "#ece3d5", park: "#e3e0cc", building: "#e2d8c8",
  road: "rgba(11,30,61,0.10)", roadMajor: "rgba(11,30,61,0.22)", rail: "rgba(11,30,61,0.14)",
  boundary: "rgba(11,30,61,0.2)", label: "#0b1e3d", labelHalo: "#efe7da", labelOpacity: 0.55,
};

export function restyle(map: MLMap, p: Palette) {
  // Paint names vary by layer type; the style decides which apply.
  const set = (id: string, prop: string, v: unknown) => { try { (map.setPaintProperty as (i: string, p: string, v: unknown) => void).call(map, id, prop, v); } catch { /* layer absent */ } };
  const hide = (id: string) => { try { map.setLayoutProperty(id, "visibility", "none"); } catch { /* absent */ } };
  for (const l of map.getStyle().layers ?? []) {
    const id = l.id;
    // Only the borrowed basemap is repainted; the direction's own layers
    // (contours, points, hexes) keep the colours they were drawn with.
    const src = (l as { source?: string }).source;
    if (l.type !== "background" && src !== "openmaptiles") continue;
    if (p.labels === false && l.type === "symbol") { hide(id); continue; }
    if (p.minorRoads === false && l.type === "line" && /minor|path|service|pier|tunnel/.test(id)) { hide(id); continue; }
    if (p.buildings === false && id === "building") { hide(id); continue; }
    if (l.type === "background") set(id, "background-color", p.bg);
    else if (id === "water") set(id, "fill-color", p.water);
    else if (id === "park" || id.startsWith("landcover")) { set(id, "fill-color", p.park); set(id, "fill-opacity", 1); }
    else if (id.startsWith("landuse")) set(id, "fill-color", p.land);
    else if (id === "building") { set(id, "fill-color", p.building); set(id, "fill-outline-color", p.building); }
    else if (id.startsWith("aeroway")) hide(id);
    else if (id === "waterway") set(id, "line-color", p.water);
    else if (l.type === "line" && id.startsWith("boundary")) set(id, "line-color", p.boundary);
    else if (l.type === "line" && id.includes("railway")) set(id, "line-color", p.rail);
    else if (l.type === "line" && id.endsWith("casing")) set(id, "line-color", p.roadCasing ?? "rgba(0,0,0,0)");
    else if (l.type === "line" && (id.includes("major") || id.includes("motorway"))) set(id, "line-color", p.roadMajor);
    else if (l.type === "line") set(id, "line-color", p.road);
    else if (l.type === "symbol") {
      if (id.includes("shield") || id === "airport" || (!p.showRoadNames && id.startsWith("highway-name"))) { hide(id); continue; }
      set(id, "text-color", p.label);
      set(id, "text-halo-color", p.labelHalo);
      set(id, "text-opacity", p.labelOpacity ?? 0.8);
    }
  }
}

/* The basemap is an underlay, never a dependency.

   The map opens on a style of our own — one background layer, the
   direction's ground — so the records draw the moment the page does. The
   vector basemap is fetched afterwards and slid in *beneath* them. If the
   tiles are slow, the plate is already legible; if they never arrive, it
   still is, because the city's shape comes from its records. */
export async function underlay(map: MLMap, palette: Palette) {
  const res = await fetch("https://tiles.openfreemap.org/styles/positron");
  if (!res.ok) return;
  const style = (await res.json()) as { sources: Record<string, unknown>; layers: { id: string; type: string }[]; sprite?: string };
  if (!map.getStyle()) return;
  const ours = (map.getStyle().layers ?? []).filter((l) => l.id !== "background").map((l) => l.id);
  const before = ours[0];
  for (const [id, src] of Object.entries(style.sources)) if (!map.getSource(id)) map.addSource(id, src as never);
  if (style.sprite) { try { map.setSprite(style.sprite); } catch { /* optional */ } }
  for (const layer of style.layers) {
    if (layer.type === "background" || map.getLayer(layer.id)) continue;
    try { map.addLayer(layer as never, before); } catch { /* a layer this build cannot draw */ }
  }
  restyle(map, palette);
}

export function LabMap({
  palette, bounds, center, zoom, interactive = true, className, padding = 24, onLoad, attribution = true, basemap = true,
}: {
  palette: Palette;
  bounds?: [number, number, number, number];
  center?: [number, number];
  zoom?: number;
  interactive?: boolean;
  className?: string;
  padding?: number | { top: number; bottom: number; left: number; right: number };
  onLoad?: (map: MLMap, ml: typeof import("maplibre-gl")) => void | (() => void);
  attribution?: boolean;
  basemap?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const loadRef = useRef(onLoad);
  loadRef.current = onLoad;

  useEffect(() => {
    let map: MLMap | null = null;
    let cleanup: void | (() => void);
    let dead = false;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      // Same worker the live map uses; without it GeoJSON is never tiled
      // and the data layers render nothing, silently.
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current,
        style: {
          version: 8,
          glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
          sources: {},
          layers: [{ id: "background", type: "background", paint: { "background-color": palette.bg } }],
        },
        bounds: bounds as [number, number, number, number] | undefined,
        center, zoom,
        fitBoundsOptions: { padding },
        interactive,
        attributionControl: attribution ? { compact: true, customAttribution: "© OpenStreetMap · OpenFreeMap" } : false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      if (process.env.NODE_ENV !== "production") (window as unknown as { __labmaps?: MLMap[] }).__labmaps = [...((window as unknown as { __labmaps?: MLMap[] }).__labmaps ?? []), map];
      map.on("load", () => {
        if (!map) return;
        // Attribution stays one tap away rather than printed across the plate.
        el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        try { cleanup = loadRef.current?.(map, ml); } catch (e) { console.error("lab layers", e); }
        if (basemap) underlay(map, palette).catch(() => { /* the plate stands without it */ });
      });
    });
    return () => { dead = true; if (typeof cleanup === "function") cleanup(); map?.remove(); };
    // The map is built once; palettes and bounds are fixed per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={el} className={className} style={{ position: "absolute", inset: 0, background: palette.bg }} />;
}
