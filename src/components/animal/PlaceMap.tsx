"use client";

/* ════════════════════════════════════════════════════════════════════
   A portrait of where, when there is no portrait of who.

   Most animals on the register have never been photographed. Their
   record opens instead on the streets they are recorded among: a real
   street map at neighbourhood zoom, names and all, with the area the
   register places the animal in drawn as a glowing boundary and a slow
   pulse at its heart. It is the area, never a spot — the register does
   not publish where an animal sleeps — and the caption says so.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { supportsWebGL2, groundStyle, underlay } from "@/components/map/basemap";
import { ATLAS_PAPER as NIGHT } from "@/components/spatial/atlas-palette";
import { roundRing } from "@/lib/spatial/round";
import { HexPlate, type Box } from "@/components/system/HexPlate";

type Cell = { key: string; ring: number[]; n: number; self: boolean };

export function PlaceMap({ center, cells, locality, city, label, others, variant = "portrait" }: {
  center: [number, number]; cells: Cell[]; locality: string | null; city: string | null; label: string; others: number;
  /** portrait: the animal's own area, close; area: its neighbourhood, shaded by what is recorded around it;
      banner: the neighbourhood across the top of the record, its area set to the right of the words on it. */
  variant?: "portrait" | "area" | "banner";
}) {
  const el = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const geometry = cells.filter(c => c.ring.length >= 6 && c.ring.every(Number.isFinite));
  const longs = geometry.flatMap(c => c.ring.filter((_, i) => i % 2 === 0));
  const lats = geometry.flatMap(c => c.ring.filter((_, i) => i % 2 === 1));
  const box: Box = geometry.length ? [Math.min(...longs), Math.min(...lats), Math.max(...longs), Math.max(...lats)] : [center[0] - .005, center[1] - .005, center[0] + .005, center[1] + .005];
  const fallback = <div className="lr-area-fallback" aria-hidden={ready}>
    <HexPlate round cells={geometry.map(c => ({ key: c.key, ring: c.ring, fill: c.self ? "rgba(240,91,64,.2)" : c.n > 0 ? "rgba(79,127,224,.45)" : "transparent", stroke: c.self ? "#f05b40" : "rgba(36,87,206,.35)", dashed: false }))} box={box} width={640} height={360} pad={64} label={`Recorded area for ${label}${locality ? `, around ${locality}` : city ? `, ${city}` : ""}. This boundary does not show an exact location.`} />
  </div>;
  const credit = ready ? "Map © OpenStreetMap contributors · OpenFreeMap" : "Recorded area · StrayPaw";

  useEffect(() => {
    let map: MLMap | null = null, dead = false;
    if (!supportsWebGL2()) return;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current, style: groundStyle(NIGHT), center, zoom: variant === "area" ? 13.35 : variant === "banner" ? 14.1 : 14.55, interactive: false, attributionControl: false,
      });
      /* On the banner the words sit bottom-left: on a wide screen the area moves
         right of them, on a phone it moves up above them. */
      if (variant === "banner") {
        const w = el.current.clientWidth, h = el.current.clientHeight;
        map.jumpTo({ center, padding: w > 760 ? { left: w * 0.42, right: 0, top: 0, bottom: 0 } : { top: 0, bottom: h * 0.38, left: 0, right: 0 } });
      }
      map.on("load", async () => {
        if (!map) return;
        const ring = (c: Cell) => { const r: [number, number][] = []; for (let i = 0; i < c.ring.length; i += 2) r.push([c.ring[i], c.ring[i + 1]]); return roundRing(r); };
        const self = cells.find((c) => c.self);
        map.addSource("area", { type: "geojson", data: { type: "FeatureCollection", features: self ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring(self)] } }] : [] } });
        map.addSource("heart", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: center } } });
        if (variant === "area" || variant === "banner") {
          map.addSource("around", { type: "geojson", data: { type: "FeatureCollection", features: cells.filter((c) => !c.self).map((c) => ({ type: "Feature", properties: { n: c.n }, geometry: { type: "Polygon", coordinates: [ring(c)] } })) } });
          map.addLayer({ id: "around-fill", type: "fill", source: "around", paint: {
            "fill-color": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 0, "rgba(0,0,0,0)", 1, "#c9d8f3", 3, "#93b1f0", 5, "#4f7fe0", 8, "#2457ce"],
            "fill-opacity": ["case", [">", ["get", "n"], 0], 0.55, 0],
          } });
          map.addLayer({ id: "around-line", type: "line", source: "around", paint: { "line-color": "rgba(36,87,206,0.35)", "line-width": 1 } });
        }
        map.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#f05b40", "fill-opacity": variant === "area" ? 0.22 : 0.1 } });
        map.addLayer({ id: "area-glow", type: "line", source: "area", paint: { "line-color": "#f05b40", "line-width": 9, "line-blur": 7, "line-opacity": 0.25 } });
        map.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#f05b40", "line-width": 1.8 } });
        map.addLayer({ id: "heart-pulse", type: "circle", source: "heart", paint: { "circle-radius": 14, "circle-color": "#f05b40", "circle-opacity": 0.3, "circle-blur": 0.5 } });
        map.addLayer({ id: "heart", type: "circle", source: "heart", paint: { "circle-radius": 6, "circle-color": "#f05b40", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
        await underlay(map, { ...NIGHT, labelOpacity: 0.78 }, "area-fill").catch(() => false);
        if (!dead) setReady(true);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const t0 = performance.now();
        const tick = (now: number) => {
          if (dead || !map) return;
          const ph = ((now - t0) % 2600) / 2600;
          try { map.setPaintProperty("heart-pulse", "circle-radius", 8 + ph * 26); map.setPaintProperty("heart-pulse", "circle-opacity", 0.4 * (1 - ph)); } catch { /* ok */ }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }).catch(() => { /* The recorded-area plate remains available. */ });
    return () => { dead = true; map?.remove(); };
    // Drawn once for the record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (variant === "banner") return (
    <div className={`lr-banner-map ${ready ? "is-ready" : ""}`}>
      {fallback}
      <div className="lr-placemap-canvas" ref={el} role="img" aria-hidden={!ready} aria-label={`A street map of the neighbourhood where ${label} is recorded${locality ? `, around ${locality}` : ""}: its area in flame, the areas around it shaded by how many animals are recorded there.`} />
      <small className="lr-placemap-credit">{credit}</small>
    </div>
  );
  if (variant === "area") return (
    <figure className={`lr-placemap is-area ${ready ? "is-ready" : ""}`}>
      {fallback}
      <div className="lr-placemap-canvas" ref={el} role="img" aria-hidden={!ready} aria-label={`A street map of the neighbourhood around ${label}, shaded by how many animals are recorded in each area.`} />
      <figcaption>
        <span className="lr-placemap-key"><i className="is-self" /> its area {cells.length > 1 && <><i className="is-some" /> more recorded <i className="is-none" /> none recorded yet</>}</span>
        <small className="lr-placemap-credit">{credit}</small>
      </figcaption>
    </figure>
  );
  return (
    <figure className={`lr-placemap ${ready ? "is-ready" : ""}`}>
      {fallback}
      <div className="lr-placemap-canvas" ref={el} role="img" aria-hidden={!ready} aria-label={`A street map of the area where ${label} is recorded${locality ? `, around ${locality}` : ""}.`} />
      <figcaption>
        <span className="lr-placemap-k sys-mono">No photograph yet · recorded around</span>
        <b>{locality ?? city ?? "This area"}</b>
        <span>{city && locality ? `${city} · ` : ""}within the area marked, about 0.7 km² — the register does not publish an exact spot.{others > 1 ? ` ${others} animals are recorded in it.` : ""}</span>
        <small className="lr-placemap-credit">{credit}</small>
      </figcaption>
    </figure>
  );
}
