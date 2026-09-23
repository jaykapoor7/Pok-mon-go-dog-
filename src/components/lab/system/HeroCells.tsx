"use client";

/* The landing's plate. The sample city fills in, cell by cell, from its
   own field records: every record lands where and when it was made, the
   0.55 km cell it falls in deepens from ink to blue as care accumulates,
   and a new case flares in flame until care is recorded near it. The
   headline sits on the city it describes. Nothing is drawn that the
   records do not hold. */

import { useCallback, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { LabMap, NIGHT } from "../LabMap";
import { hexbin, contours, type Box } from "../geo";

type Ev = [number, number, number, number];
const DURATION = 14000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EPOCH = Date.UTC(2024, 0, 1);

export function HeroCells({ events, box }: { events: Ev[]; box: Box }) {
  const [s, setS] = useState({ day: events[events.length - 1][2], records: events.length, cases: 0, care: 0, cells: 0 });
  const run = useRef<() => void>(() => {});
  const [done, setDone] = useState(false);

  const onLoad = useCallback((map: MLMap) => {
    const fit = () => {
      const w = map.getContainer().clientWidth;
      const pad = w > 1100 ? { top: 90, bottom: 70, left: Math.min(640, w * 0.44), right: 300 } : w > 760 ? { top: 90, bottom: 60, left: w * 0.42, right: 30 } : { top: 64, bottom: 110, left: 12, right: 12 };
      map.fitBounds(box, { padding: pad, animate: false });
    };
    fit();
    map.on("resize", fit);

    const bins = hexbin(events.map((e, i) => ({ e, i })), (x) => [x.e[0], x.e[1]], 11, 0.55);
    const cellOf = new Int32Array(events.length);
    bins.forEach((b, bi) => b.items.forEach((x) => (cellOf[x.i] = bi)));
    const counts = new Float32Array(bins.length);
    const feats = bins.map((b, bi) => ({ type: "Feature" as const, id: bi, properties: {}, geometry: { type: "Polygon" as const, coordinates: [b.ring] } }));
    map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
    map.addSource("ct", { type: "geojson", data: contours(events.map((e) => [e[0], e[1]]), box, { res: 0.004, sigma: 2.6, levels: 8 }) });
    map.addSource("new", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    const n = ["coalesce", ["feature-state", "n"], 0] as ExpressionSpecification;
    map.addLayer({ id: "cells", type: "fill", source: "cells", paint: {
      "fill-color": ["interpolate", ["linear"], n, 0, "#081631", 1, "#16305e", 4, "#23479a", 10, "#2f63d6", 24, "#6f93e6", 50, "#b7caf2"] as ExpressionSpecification,
      "fill-opacity": ["case", [">", n, 0], 0.92, 0] as ExpressionSpecification,
    } });
    map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: { "line-color": "#081631", "line-width": 1, "line-opacity": ["case", [">", n, 0], 0.9, 0] as ExpressionSpecification } });
    map.addLayer({ id: "ct", type: "line", source: "ct", paint: { "line-color": "#f3ede4", "line-width": 0.7, "line-opacity": 0.16 } });
    map.addLayer({ id: "new", type: "circle", source: "new", paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "a"], 0, 7, 1, 2.5] as ExpressionSpecification,
      "circle-color": "#f05b40", "circle-opacity": ["interpolate", ["linear"], ["get", "a"], 0, 1, 1, 0] as ExpressionSpecification,
      "circle-stroke-width": 0,
    } });

    const first = events[0][2], last = events[events.length - 1][2];
    let raf = 0, start = 0, idx = 0, lastPaint = 0;
    const tally = { records: 0, cases: 0, care: 0, cells: 0 };
    const recent: { lng: number; lat: number; d: number }[] = [];
    const touched = new Set<number>();

    const flush = (cursor: number) => {
      const src = map.getSource("new") as GeoJSONSource | undefined;
      const live = recent.filter((r) => cursor - r.d < 45);
      recent.length = 0; recent.push(...live);
      src?.setData({ type: "FeatureCollection", features: live.map((r) => ({ type: "Feature", properties: { a: (cursor - r.d) / 45 }, geometry: { type: "Point", coordinates: [r.lng, r.lat] } })) });
    };
    const step = (cursor: number) => {
      while (idx < events.length && events[idx][2] <= cursor) {
        const [lng, lat, d, k] = events[idx];
        const c = cellOf[idx++];
        counts[c]++;
        map.setFeatureState({ source: "cells", id: c }, { n: counts[c] });
        if (!touched.has(c)) { touched.add(c); tally.cells++; }
        tally.records++;
        if (k === 0) { tally.cases++; recent.push({ lng, lat, d }); } else tally.care++;
      }
    };
    const frame = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const cursor = first + (last - first) * e;
      step(cursor);
      if (now - lastPaint > 60 || t === 1) { flush(cursor); lastPaint = now; setS({ day: cursor, ...tally }); }
      if (t < 1) raf = requestAnimationFrame(frame);
      else { flush(cursor + 100); setDone(true); }
    };
    run.current = () => {
      cancelAnimationFrame(raf);
      start = 0; idx = 0; lastPaint = 0; counts.fill(0); touched.clear(); recent.length = 0;
      Object.assign(tally, { records: 0, cases: 0, care: 0, cells: 0 });
      bins.forEach((_, bi) => map.setFeatureState({ source: "cells", id: bi }, { n: 0 }));
      setDone(false);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { step(last); flush(last + 100); setS({ day: last, ...tally }); setDone(true); return; }
      raf = requestAnimationFrame(frame);
    };
    run.current();
  }, [events, box]);

  const d = new Date(EPOCH + s.day * 86400000);
  return (
    <>
      <div className="sx-hero-map"><LabMap palette={NIGHT} bounds={box} interactive={false} onLoad={onLoad} /></div>
      <aside className="sx-hero-meter" aria-label="The sample city, filling in">
        <div className="when"><span className="lbl">Sample city · Coimbatore</span><b className="m">{MON[d.getUTCMonth()]} {d.getUTCFullYear()}</b></div>
        <dl>
          <div><dt>Field records</dt><dd className="m">{s.records.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="dot need" />Cases opened</dt><dd className="m">{s.cases.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="dot care" />Care recorded</dt><dd className="m">{s.care.toLocaleString("en-IN")}</dd></div>
          <div><dt><i className="hexi" />Cells with work</dt><dd className="m">{s.cells.toLocaleString("en-IN")}</dd></div>
        </dl>
        <div className="ramp" aria-hidden><span>1</span><i /><span>50+ records per cell</span></div>
        <button type="button" className="replay" onClick={() => run.current()} disabled={!done}>{done ? "Replay 2024 → 2026" : "Filling in…"}</button>
      </aside>
    </>
  );
}
