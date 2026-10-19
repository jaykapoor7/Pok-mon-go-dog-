"use client";

/* ════════════════════════════════════════════════════════════════════
   The hero: India at night, on the record.

   The first frame is vector and needs nothing to load: India's outline
   and every recorded area as a point, drawn on the server. The live 3D
   map then rises through it (the points hand over to columns of light,
   each as tall as its animals on the record) and the registers are
   joined by paths of light: one system across cities. The pointer leans
   the camera; scrolling dives it from India to the sample city, where
   the next section's message is sent from.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource } from "maplibre-gl";
import { groundStyle, underlay, supportsWebGL2, PLATE, GLYPHS } from "@/components/map/basemap";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import { useStage, span, ease } from "@/components/bindu/stage";
import { addRecord, areasGeo, camBetween, edgeGlow, fromCentres, heightExpr, setNight, type Cam, type Cell } from "@/components/bindu/mapkit";

export type Pin = { city: string; c: [number, number]; animals: number };

/* A gentle arc between two places, as a line of points (for the paths between registers). */
function arc(a: [number, number], b: [number, number], k = 0.22, n = 48): [number, number][] {
  const mx = (a[0] + b[0]) / 2 - (b[1] - a[1]) * k, my = (a[1] + b[1]) / 2 + (b[0] - a[0]) * k, out: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * mx + t * t * b[0], u * u * a[1] + 2 * u * t * my + t * t * b[1]]); }
  return out;
}

export function HeroMap({ cells, pins, focus }: { cells: Cell[]; pins: Pin[]; focus: [number, number] | null }) {
  const el = useRef<HTMLDivElement>(null);
  const { p, listen, still } = useStage();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const box = el.current; if (!box || !supportsWebGL2()) return;
    let map: MLMap | null = null, raf = 0, alive = true, on = true, grown = -1, dash = 0, lastDash = 0;
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const t0 = performance.now();
    const phone = () => box.clientWidth < 760;
    const keys = (): [Cam, Cam] => {
      const d = phone() ? -0.9 : 0, f = focus ?? [76.96, 11.01];
      return [{ c: [80.5, 21.8], z: 4.1 + d, pitch: 38, bearing: -12 }, { c: f, z: 11.2 + d * 0.5, pitch: 62, bearing: 24 }];
    };
    const frame = (now: number) => {
      raf = 0; if (!map || !alive) return;
      const P = still ? 0 : p.current, [a, b] = keys();
      const cam = camBetween(a, b, ease.inOut(span(P, 0.05, 0.92)));
      lean.x += (lean.tx - lean.x) * 0.05; lean.y += (lean.ty - lean.y) * 0.05;
      const sway = still ? 0 : Math.sin((now - t0) / 9000) * 4 * (1 - span(P, 0, 0.2));
      const W = box.clientWidth, H = box.clientHeight, off = 1 - ease.inOut(span(P, 0, 0.5));
      const padding = phone() ? { top: H * 0.38 * off, bottom: 0, left: 0, right: 0 } : { left: W * 0.42 * off, top: 0, bottom: 0, right: 0 };
      map.jumpTo({ center: cam.c, zoom: cam.z, padding, pitch: Math.max(0, Math.min(72, cam.pitch + lean.y * 5)), bearing: cam.bearing + sway + lean.x * 8 });
      const g = still ? 1 : ease.out(Math.min(1, (now - t0) / 2600));
      if (Math.abs(g - grown) > 0.004) { grown = g; try { map.setPaintProperty("rec-3d", "fill-extrusion-height", heightExpr(g)); } catch { /* not ready */ } }
      /* paths of light flow along the arcs */
      if (!still && now - lastDash > 70) { lastDash = now; dash = (dash + 1) % 14; try { map.setPaintProperty("arcs-flow", "line-dasharray", [dash * 0.25, 1.2, 3.5 - dash * 0.25 + 0.01, 0]); } catch { /* not ready */ } }
      try { map.setPaintProperty("arcs-flow", "line-opacity", 0.85 * (1 - span(P, 0.35, 0.6))); map.setPaintProperty("arcs", "line-opacity", 0.35 * (1 - span(P, 0.35, 0.6))); } catch { /* not ready */ }
      if (on && (!still || g < 1)) raf = requestAnimationFrame(frame);
    };
    (async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const m = new ml.Map({ container: box, style: { ...groundStyle(PLATE), glyphs: GLYPHS }, center: [80.5, 21.8], zoom: 4, pitch: 38, interactive: false, attributionControl: { compact: true }, fadeDuration: 0, maxPitch: 78, pixelRatio: Math.min(phone() ? 1.5 : 2, window.devicePixelRatio || 1) });
      map = m;
      m.on("load", () => {
        setNight(m);
        addRecord(m, areasGeo(fromCentres(cells)), 0);
        /* the registers, joined: each to the next largest, a chain across the country */
        const order = [...pins].sort((x, y) => y.animals - x.animals).slice(0, 7);
        const lines = order.slice(1).map((q, i) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: arc(order[i].c, q.c, i % 2 ? 0.2 : -0.2) } }));
        m.addSource("arcs", { type: "geojson", data: { type: "FeatureCollection", features: lines } });
        m.addLayer({ id: "arcs", type: "line", source: "arcs", layout: { "line-cap": "round" }, paint: { "line-color": "#5b8cf0", "line-width": 1.2, "line-opacity": 0.35 } }, "rec-glow");
        m.addLayer({ id: "arcs-flow", type: "line", source: "arcs", layout: { "line-cap": "round" }, paint: { "line-color": "#ffb199", "line-width": 2.2, "line-opacity": 0.85, "line-dasharray": [0, 1.2, 3.5, 0] } }, "rec-glow");
        (m.getSource("arcs") as GeoJSONSource).setData({ type: "FeatureCollection", features: lines });
        setReady(true);
        frame(performance.now());
        underlay(m, PLATE, "arcs").then(() => { edgeGlow(m); frame(performance.now()); });
      });
    })();
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); });
    io.observe(box);
    const off = listen(() => { if (on && !raf) raf = requestAnimationFrame(frame); });
    const move = (e: PointerEvent) => { lean.tx = e.clientX / innerWidth - 0.5; lean.ty = -(e.clientY / innerHeight - 0.5); if (on && !raf) raf = requestAnimationFrame(frame); };
    if (window.matchMedia("(pointer: fine)").matches && !still) window.addEventListener("pointermove", move, { passive: true });
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); off(); window.removeEventListener("pointermove", move); map?.remove(); };
  }, [cells, pins, focus, p, listen, still]);

  return (
    <div className={`h3-map${ready ? " is-ready" : ""}`}>
      <VectorIndia cells={cells} />
      <div ref={el} className="h3-gl" aria-hidden />
    </div>
  );
}

/* The vector first frame: India's outline and every recorded area, drawn without WebGL. */
export function VectorIndia({ cells, className = "h3-vec" }: { cells: Cell[]; className?: string }) {
  const top = Math.sqrt(Math.max(1, ...cells.map((c) => c[2])));
  return (
    <svg className={className} viewBox={`-4 -4 ${INDIA_VIEW.w + 8} ${INDIA_VIEW.h + 8}`} aria-hidden>
      <path d={INDIA_PATH} className="vi-land" />
      {cells.map(([lng, lat, n], i) => { const [x, y] = indiaXY(lng, lat); return <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={(0.35 + (Math.sqrt(n) / top) * 1.1).toFixed(2)} className="vi-pt" style={{ ["--i" as string]: i % 40 }} />; })}
    </svg>
  );
}
