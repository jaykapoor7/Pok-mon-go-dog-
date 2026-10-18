"use client";

/* ════════════════════════════════════════════════════════════════════
   The flight. The Earth at night in an electric-blue atmosphere, India
   lit by every recorded area. Scrolling flies the camera down: the
   columns of records rise, the globe flattens into India, the camera
   dives to the sample city and then to its fullest locality, banking as
   it goes. The pointer leans the camera a few degrees. Every frame is a
   pure function of scroll, so it plays the same backwards.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { groundStyle, underlay, supportsWebGL2, PLATE, GLYPHS } from "@/components/map/basemap";
import { useStage, span, ease } from "./stage";
import { addRecord, areasGeo, edgeGlow, camBetween, fromCentres, heightExpr, setNight, type Cam, type Cell } from "./mapkit";

export type Focus = { city: { name: string; c: [number, number] }; place: { name: string; c: [number, number]; h3s: string[] } | null } | null;
export type Pin = { city: string; c: [number, number] };

export function Flight({ cells, pins, focus }: { cells: Cell[]; pins: Pin[]; focus: Focus }) {
  const el = useRef<HTMLDivElement>(null);
  const { p, listen, still } = useStage();
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const box = el.current; if (!box) return;
    if (!supportsWebGL2()) { setFlat(true); return; }
    let map: MLMap | null = null, raf = 0, alive = true, on = true, grown = -1;
    const lean = { x: 0, y: 0, tx: 0, ty: 0 };
    const t0 = performance.now();
    const phone = () => box.clientWidth < 760;
    const keys = (): [number, Cam][] => {
      const d = phone() ? -0.75 : 0, city = focus?.city.c ?? [76.96, 11.01], place = focus?.place?.c ?? city;
      return [
        [0, { c: [80, 18], z: 2.25 + d * 0.9, pitch: 0, bearing: 0 }],
        [0.24, { c: [80.6, 22.4], z: 4.05 + d, pitch: 42, bearing: -14 }],
        [0.5, { c: city, z: 10.7 + d * 0.6, pitch: 58, bearing: 16 }],
        [0.78, { c: place, z: 13.3 + d * 0.5, pitch: 66, bearing: 58 }],
        [1, { c: place, z: 13.8 + d * 0.5, pitch: 70, bearing: 78 }],
      ];
    };
    const frame = (now: number) => {
      raf = 0; if (!map || !alive) return;
      const P = still ? 0.5 : p.current, K = keys();
      let i = 0; while (i < K.length - 2 && P > K[i + 1][0]) i++;
      const [pa, a] = K[i], [pb, b] = K[i + 1];
      const cam = camBetween(a, b, ease.inOut(span(P, pa, pb)));
      /* a slow sway of the globe before the flight begins */
      const idle = still ? 0 : 1 - span(P, 0, 0.08);
      cam.c = [cam.c[0] + Math.sin((now - t0) / 7000) * 14 * idle, cam.c[1]];
      lean.x += (lean.tx - lean.x) * 0.06; lean.y += (lean.ty - lean.y) * 0.06;
      /* the globe opens to the side of the words (below them on a phone), and comes to centre as the flight begins */
      const off = 1 - ease.inOut(span(P, 0, 0.24)), W = box.clientWidth, H = box.clientHeight;
      const padding = phone() ? { top: H * 0.42 * off, bottom: 0, left: 0, right: 0 } : { left: W * 0.46 * off, top: 0, bottom: 0, right: 0 };
      map.jumpTo({ center: cam.c, zoom: cam.z, padding, pitch: Math.max(0, Math.min(75, cam.pitch + lean.y * 4)), bearing: cam.bearing + lean.x * 7 });
      const g = still ? 1 : ease.out(span(P, 0.06, 0.32));
      if (Math.abs(g - grown) > 0.004) { grown = g; try { map.setPaintProperty("rec-3d", "fill-extrusion-height", heightExpr(g)); } catch { /* not ready */ } }
      if (on && !still) raf = requestAnimationFrame(frame);
    };
    (async () => {
      const ml = await import("maplibre-gl");
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      if (!alive) return;
      const m = new ml.Map({ container: box, style: { ...groundStyle(PLATE), glyphs: GLYPHS }, center: [80, 16], zoom: 1.7, interactive: false, attributionControl: { compact: true }, fadeDuration: 0, maxPitch: 78, pixelRatio: Math.min(2, window.devicePixelRatio || 1) });
      map = m;
      m.on("load", async () => {
        const map = m;
        setNight(map);
        const focusSet = new Set(focus?.place?.h3s ?? []);
        addRecord(map, areasGeo(fromCentres(cells), focusSet), 0);
        map.addSource("pins", { type: "geojson", data: { type: "FeatureCollection", features: pins.map((c) => ({ type: "Feature", properties: { name: c.city }, geometry: { type: "Point", coordinates: c.c } })) } });
        map.addLayer({ id: "pins", type: "symbol", source: "pins", minzoom: 3.4, maxzoom: 8.5, layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-offset": [0, 1.4], "text-allow-overlap": false },
          paint: { "text-color": "#dbe6ff", "text-halo-color": "#061127", "text-halo-width": 1.4, "text-opacity": ["interpolate", ["linear"], ["zoom"], 3.4, 0, 4, 0.85, 7.5, 0.85, 8.5, 0] } });
        frame(performance.now());
        underlay(map, PLATE, "rec-glow").then(() => { edgeGlow(map); frame(performance.now()); });
      });
    })();
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); });
    io.observe(box);
    const off = listen(() => { if (on && !raf) raf = requestAnimationFrame(frame); });
    const move = (e: PointerEvent) => { lean.tx = e.clientX / innerWidth - 0.5; lean.ty = -(e.clientY / innerHeight - 0.5); if (on && !raf) raf = requestAnimationFrame(frame); };
    if (window.matchMedia("(pointer: fine)").matches && !still) window.addEventListener("pointermove", move, { passive: true });
    return () => { alive = false; cancelAnimationFrame(raf); io.disconnect(); off(); window.removeEventListener("pointermove", move); map?.remove(); };
  }, [cells, pins, focus, p, listen, still]);

  return <div ref={el} className={`fl-map${flat ? " is-flat" : ""}`} aria-hidden />;
}
