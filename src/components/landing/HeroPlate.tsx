"use client";

/* ════════════════════════════════════════════════════════════════════
   The hero plate: the sample city, filling in.

   Every field record in the sample city lands where and when it was made.
   The H3 cell it falls in deepens from the night ground towards blue as
   records accumulate, and a new case flares in flame for a moment. The
   streets underneath are OpenStreetMap, repainted to the night ground;
   the cells are the same ones the live map draws.

   It plays once, on arrival, and can be replayed. Under reduced motion it
   simply shows the city as it stands today. Nothing is drawn that the
   register does not hold.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { PLATE, groundStyle, underlay } from "@/components/map/basemap";
import { EPOCH_MS } from "@/lib/spatial/types";

const DURATION = 15000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthOf = (day: number) => { const d = new Date(EPOCH_MS + day * 86_400_000); return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const yearOf = (day: number) => new Date(EPOCH_MS + day * 86_400_000).getUTCFullYear();

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
        const features = rings.map((r, i) => {
          const ring: [number, number][] = [];
          for (let k = 0; k < r.length; k += 2) ring.push([r[k], r[k + 1]]);
          return { type: "Feature" as const, id: i, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } };
        });
        m.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features } });
        m.addSource("new", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        const v = ["coalesce", ["feature-state", "n"], 0] as ExpressionSpecification;
        m.addLayer({
          id: "cells", type: "fill", source: "cells", paint: {
            "fill-color": ["interpolate", ["linear"], v, 0, "#07142b", 1, "#16305e", 4, "#23479a", 10, "#2f63d6", 24, "#6f93e6", 60, "#b7caf2"] as ExpressionSpecification,
            "fill-opacity": ["case", [">", v, 0], 0.9, 0] as ExpressionSpecification,
          },
        });
        m.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: { "line-color": "#07142b", "line-width": 1, "line-opacity": ["case", [">", v, 0], 0.95, 0] as ExpressionSpecification } });
        m.addLayer({
          id: "new", type: "circle", source: "new", paint: {
            "circle-radius": ["interpolate", ["linear"], ["get", "a"], 0, 7, 1, 2] as ExpressionSpecification,
            "circle-color": "#f05b40",
            "circle-opacity": ["interpolate", ["linear"], ["get", "a"], 0, 0.95, 1, 0] as ExpressionSpecification,
          },
        });

        const counts = new Float32Array(rings.length);
        const centre = (c: number) => { const r = rings[c]; let x = 0, y = 0; const k = r.length / 2 - 1; for (let i = 0; i < k; i++) { x += r[i * 2]; y += r[i * 2 + 1]; } return [x / k, y / k] as [number, number]; };
        let idx = 0, start = 0, lastPaint = 0;
        const tally = { records: 0, cases: 0, care: 0, cells: 0 };
        const touched = new Set<number>();
        const recent: { c: number; d: number }[] = [];
        const first = n ? events[1] : 0;
        const step = (cursor: number) => {
          while (idx < n && events[idx * 3 + 1] <= cursor) {
            const c = events[idx * 3], k = events[idx * 3 + 2];
            counts[c]++;
            m.setFeatureState({ source: "cells", id: c }, { n: counts[c] });
            if (!touched.has(c)) { touched.add(c); tally.cells++; }
            tally.records++;
            if (k === 0) { tally.cases++; recent.push({ c, d: events[idx * 3 + 1] }); } else tally.care++;
            idx++;
          }
        };
        const flush = (cursor: number) => {
          const live = recent.filter((r) => cursor - r.d < 40);
          recent.length = 0; recent.push(...live);
          (m.getSource("new") as GeoJSONSource | undefined)?.setData({
            type: "FeatureCollection",
            features: live.map((r) => ({ type: "Feature", properties: { a: (cursor - r.d) / 40 }, geometry: { type: "Point", coordinates: centre(r.c) } })),
          });
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
          for (let i = 0; i < rings.length; i++) m.setFeatureState({ source: "cells", id: i }, { n: 0 });
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
        underlay(m, PLATE, "cells").catch(() => {});
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
          <span className="sys-eyebrow is-night">Sample city · {city}</span>
          <b className="sys-mono">{monthOf(t.day)}</b>
        </p>
        <dl>
          <div><dt>Field records</dt><dd className="sys-mono">{t.records.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="ld-dot is-case" aria-hidden />Cases opened</dt><dd className="sys-mono">{t.cases.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="ld-dot is-care" aria-hidden />Care recorded</dt><dd className="sys-mono">{t.care.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="ld-hexi" aria-hidden />Cells with work</dt><dd className="sys-mono">{t.cells.toLocaleString("en-IN")}</dd></div>
        </dl>
        <div className="ld-ramp" aria-hidden><span>1</span><i /><span>60+ records in a cell</span></div>
        <button type="button" className="ld-replay" onClick={() => run.current()} disabled={!ready || playing}>
          {playing ? "Filling in…" : `Replay ${events.length ? yearOf(events[1]) : ""} → today`}
        </button>
      </div>
    </>
  );
}
