"use client";

/* ════════════════════════════════════════════════════════════════════
   The hero plate: the sample city, filling in.

   Every field record in the sample city lands where and when it was made,
   as a point of light inside its cell; where records gather the city
   glows, and a new case flares in flame for a moment. The streets
   underneath are OpenStreetMap, repainted to the night ground — the same
   lights the live map draws.

   It plays once, on arrival, and can be replayed. Under reduced motion it
   simply shows the city as it stands today. Nothing is drawn that the
   register does not hold.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { PLATE, groundStyle, underlay } from "@/components/map/basemap";
import { EPOCH_MS } from "@/lib/spatial/types";
import { pointInCell } from "@/components/spatial/data";

const DURATION = 15000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthOf = (day: number) => { const d = new Date(EPOCH_MS + day * 86_400_000); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

type Props = {
  city: string;
  box: [number, number, number, number];
  rings: number[][];
  /** Flat [cellIndex, day, kind(0 case, 1 care)], sorted by day. */
  events: number[];
};

type Tally = { day: number; records: number; cases: number; care: number; cells: number };

export function HeroPlate({ city, box, rings, events }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const run = useRef<() => void>(() => {});
  const n = events.length / 3;
  const lastDay = n ? events[(n - 1) * 3 + 1] : 0;
  const finalTally = (): Tally => {
    const cells = new Set<number>(); let cases = 0, care = 0;
    for (let i = 0; i < n; i++) { cells.add(events[i * 3]); if (events[i * 3 + 2] === 0) cases++; else care++; }
    return { day: lastDay, records: n, cases, care, cells: cells.size };
  };
  const [t, setT] = useState<Tally>(finalTally);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let map: MLMap | null = null;
    let raf = 0;
    let dead = false;
    let io: IntersectionObserver | null = null;
    import("maplibre-gl").then((ml) => {
      if (dead || !el.current) return;
      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      map = new ml.Map({
        container: el.current,
        style: groundStyle(PLATE),
        bounds: box,
        interactive: false,
        attributionControl: { compact: true, customAttribution: "© OpenStreetMap contributors · OpenFreeMap · H3" },
        fadeDuration: 0,
      });
      const fit = () => {
        if (!map) return;
        const w = map.getContainer().clientWidth, h = map.getContainer().clientHeight;
        const pad = w > 1100
          ? { top: 70, bottom: 150, left: Math.min(620, w * 0.44), right: 40 }
          : w > 760 ? { top: 60, bottom: 150, left: w * 0.4, right: 24 } : { top: 20, bottom: 20, left: 12, right: 12 };
        if (pad.left + pad.right > w - 80 || pad.top + pad.bottom > h - 80) { pad.top = pad.bottom = 20; }
        map.fitBounds(box, { padding: pad, animate: false });
      };
      map.on("load", () => {
        const m = map!;
        el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
        fit();
        m.on("resize", fit);
        const ringPts = rings.map((r) => { const ring: [number, number][] = []; for (let k = 0; k < r.length; k += 2) ring.push([r[k], r[k + 1]]); return ring; });
        const lights = Array.from({ length: n }, (_, i) => ({
          type: "Feature" as const, properties: { d: events[i * 3 + 1], k: events[i * 3 + 2] },
          geometry: { type: "Point" as const, coordinates: pointInCell(ringPts[events[i * 3]], i + 7) },
        }));
        m.addSource("lights", { type: "geojson", data: { type: "FeatureCollection", features: lights } });
        m.addSource("new", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const shown = (cursor: number) => ["<=", ["get", "d"], cursor] as ExpressionSpecification;
        m.addLayer({ id: "glow", type: "heatmap", source: "lights", filter: shown(-1), paint: {
          "heatmap-weight": 0.35, "heatmap-intensity": 0.16, "heatmap-radius": 16, "heatmap-opacity": 0.65,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(19,43,85,0)", 0.15, "rgba(27,63,128,0.35)", 0.35, "rgba(42,91,184,0.55)", 0.6, "rgba(79,127,224,0.65)", 0.85, "rgba(147,177,240,0.7)", 1, "rgba(219,231,255,0.8)"] as ExpressionSpecification,
        } });
        m.addLayer({ id: "halo", type: "circle", source: "lights", filter: shown(-1), paint: { "circle-radius": 4.5, "circle-blur": 1, "circle-color": "#4f7fe0", "circle-opacity": 0.22 } });
        m.addLayer({ id: "lights", type: "circle", source: "lights", filter: shown(-1), paint: { "circle-radius": 1.3, "circle-color": ["case", ["==", ["get", "k"], 0], "#c9d8ff", "#eef3ff"] as ExpressionSpecification, "circle-opacity": 0.85 } });
        m.addLayer({
          id: "new", type: "circle", source: "new", paint: {
            "circle-radius": ["interpolate", ["linear"], ["get", "a"], 0, 9, 1, 2] as ExpressionSpecification,
            "circle-color": "#f05b40",
            "circle-opacity": ["interpolate", ["linear"], ["get", "a"], 0, 0.95, 1, 0] as ExpressionSpecification,
          },
        });
        const reveal = (cursor: number) => ["glow", "halo", "lights"].forEach((id) => { try { m.setFilter(id, shown(cursor)); } catch { /* ok */ } });

        const counts = new Float32Array(rings.length);
        let idx = 0, start = 0, lastPaint = 0;
        const tally = { records: 0, cases: 0, care: 0, cells: 0 };
        const touched = new Set<number>();
        const recent: { c: number; d: number; p: [number, number] }[] = [];
        const first = n ? events[1] : 0;
        const step = (cursor: number) => {
          while (idx < n && events[idx * 3 + 1] <= cursor) {
            const c = events[idx * 3], k = events[idx * 3 + 2];
            counts[c]++;
            if (!touched.has(c)) { touched.add(c); tally.cells++; }
            tally.records++;
            if (k === 0) { tally.cases++; recent.push({ c, d: events[idx * 3 + 1], p: lights[idx].geometry.coordinates }); } else tally.care++;
            idx++;
          }
        };
        const flush = (cursor: number) => {
          const live = recent.filter((r) => cursor - r.d < 40);
          recent.length = 0; recent.push(...live);
          (m.getSource("new") as GeoJSONSource | undefined)?.setData({
            type: "FeatureCollection",
            features: live.map((r) => ({ type: "Feature", properties: { a: (cursor - r.d) / 40 }, geometry: { type: "Point", coordinates: r.p } })),
          });
          reveal(cursor);
        };
        const frame = (now: number) => {
          if (!start) start = now;
          const p = Math.min(1, (now - start) / DURATION);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          const cursor = first + (lastDay - first) * e;
          step(cursor);
          if (now - lastPaint > 70 || p === 1) { flush(cursor); lastPaint = now; setT({ day: cursor, ...tally }); }
          if (p < 1) raf = requestAnimationFrame(frame);
          else { flush(cursor + 100); setPlaying(false); }
        };
        run.current = () => {
          cancelAnimationFrame(raf);
          idx = 0; start = 0; lastPaint = 0; counts.fill(0); touched.clear(); recent.length = 0;
          Object.assign(tally, { records: 0, cases: 0, care: 0, cells: 0 });
          reveal(-1);
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            step(lastDay); flush(lastDay + 100); setT({ day: lastDay, ...tally }); setPlaying(false); return;
          }
          setPlaying(true);
          raf = requestAnimationFrame(frame);
        };
        setReady(true);
        // Play when the plate is actually on screen; a hidden tab or a reader
        // who has already scrolled past sees the finished city.
        io = new IntersectionObserver((entries) => {
          if (entries.some((x) => x.isIntersecting)) { run.current(); io?.disconnect(); }
        }, { threshold: 0.25 });
        io.observe(m.getContainer());
        underlay(m, PLATE, "glow").catch(() => {});
      });
    });
    return () => { dead = true; cancelAnimationFrame(raf); io?.disconnect(); map?.remove(); };
    // The plate is built once per page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={`ld-plate ${ready ? "is-ready" : ""}`} ref={el} aria-hidden />
      <div className="ld-meter" aria-live="off">
        <p className="ld-meter-when">
          <span>Sample city · {city}</span>
          <b className="sys-mono">{monthOf(t.day)}</b>
        </p>
        <button type="button" className="ld-replay" onClick={() => run.current()} disabled={!ready || playing}>
          {playing ? "Filling in…" : "Replay"}
        </button>
      </div>
    </>
  );
}
