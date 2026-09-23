"use client";

/* Plate I. The city appears one record at a time.

   Every point is a real field event from the public record, placed where
   and when it happened. They arrive in date order, Jan 2024 to Sep 2026.
   A new case flares in flame and cools to paper as care is recorded
   around it; the contour lines are recomputed as the records accumulate,
   so the terrain of the city's care rises out of individual animals
   rather than being drawn first and populated after. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification } from "maplibre-gl";
import { LabMap, NIGHT } from "../LabMap";
import { contours, type Box } from "../geo";

type Ev = [number, number, number, number];
const DURATION = 15000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EPOCH = Date.UTC(2024, 0, 1);

export function HeroPlate({ events, box, total, children }: { events: Ev[]; box: Box; total: number; children?: React.ReactNode }) {
  const [day, setDay] = useState(events[events.length - 1]?.[2] ?? 0);
  const [n, setN] = useState({ all: total, cases: 0, abc: 0, vacc: 0 });
  const [ticks, setTicks] = useState<{ t: { x: number; label: string }[]; l: { y: number; label: string }[]; km: number; west: number } | null>(null);
  const run = useRef<() => void>(() => {});

  const onLoad = useCallback((map: MLMap) => {
    // The city is fitted beside the headline, not behind it.
    // Fit to where the records are, not to the bounding box of the city.
    const q = (a: number[], f: number) => a[Math.floor(f * (a.length - 1))];
    const xs = events.map((e) => e[0]).sort((a, b) => a - b), ys = events.map((e) => e[1]).sort((a, b) => a - b);
    const extent: [number, number, number, number] = [q(xs, 0.01) - 0.01, q(ys, 0.01) - 0.01, q(xs, 0.99) + 0.01, q(ys, 0.99) + 0.01];
    const fit = () => {
      const w = map.getContainer().clientWidth;
      const pad = w > 1100 ? { top: 76, bottom: 56, left: Math.min(660, w * 0.45), right: 320 }
        : w > 760 ? { top: 90, bottom: 60, left: w * 0.46, right: 36 }
        : { top: 76, bottom: 44, left: 22, right: 22 };
      map.fitBounds(extent, { padding: pad, animate: false });
    };
    fit();
    const feats = events.map(([lng, lat, d, k]) => ({ type: "Feature" as const, properties: { d, k }, geometry: { type: "Point" as const, coordinates: [lng, lat] } }));
    map.addSource("ev", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
    map.addSource("ct", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "ct", type: "line", source: "ct", layout: { "line-join": "round", "line-cap": "round" }, paint: {
      "line-color": "#efe7da",
      "line-width": ["case", ["get", "index"], 1.15, 0.6],
      "line-opacity": ["interpolate", ["linear"], ["/", ["get", "l"], ["get", "of"]], 0, 0.14, 1, 0.62],
    } });
    map.addLayer({ id: "ev", type: "circle", source: "ev", paint: { "circle-radius": 1.4, "circle-color": "#efe7da", "circle-opacity": 0.4, "circle-stroke-width": 0 } });

    // Graticule ticks and a scale, measured from the map itself.
    const measure = () => {
      const t: { x: number; label: string }[] = [], l: { y: number; label: string }[] = [];
      const dm = (v: number) => { const m = Math.round(v * 60); return `${Math.floor(m / 60)}°${String(m % 60).padStart(2, "0")}′`; };
      const W = map.getContainer().clientWidth, H = map.getContainer().clientHeight;
      for (let s = Math.ceil(box[0] * 20); s <= box[2] * 20; s++) { const x = map.project([s / 20, box[1]]).x; if (x > 60 && x < W - 60) t.push({ x, label: `${dm(s / 20)}E` }); }
      for (let s = Math.ceil(box[1] * 20); s <= box[3] * 20; s++) { const y = map.project([box[0], s / 20]).y; if (y > 70 && y < H - 30) l.push({ y, label: `${dm(s / 20)}N` }); }
      // Latitudes are lettered on the neatline of the city, not across the copy.
      const west = W > 760 ? Math.max(8, map.project([extent[0], extent[1]]).x - 70) : 6;
      const c = map.getCenter();
      const a = map.project([c.lng, c.lat]), b = map.project([c.lng + 1 / (111 * Math.cos((c.lat * Math.PI) / 180)), c.lat]);
      setTicks({ t, l, km: Math.abs(b.x - a.x), west });
    };
    measure();
    map.on("resize", () => { fit(); measure(); });

    const sorted = events; // already in date order
    const first = sorted[0][2], last = sorted[sorted.length - 1][2];
    let raf = 0, start = 0, lastPaint = 0, lastContour = 0, idx = 0;
    const pts: [number, number][] = [];
    const tally = { all: 0, cases: 0, abc: 0, vacc: 0 };

    const paint = (cursor: number) => {
      map.setFilter("ev", ["<=", ["get", "d"], cursor]);
      const age = ["-", cursor, ["get", "d"]] as ExpressionSpecification;
      map.setPaintProperty("ev", "circle-radius", ["interpolate", ["linear"], age, 0, 4.4, 18, 2.4, 120, 1.35] as ExpressionSpecification);
      map.setPaintProperty("ev", "circle-color", ["case", ["all", ["==", ["get", "k"], 0], ["<", age, 60]], "#f05b40", "#efe7da"] as ExpressionSpecification);
      map.setPaintProperty("ev", "circle-opacity", ["interpolate", ["linear"], age, 0, 1, 40, 0.62, 360, 0.34] as ExpressionSpecification);
    };
    const redrawContours = () => (map.getSource("ct") as GeoJSONSource | undefined)?.setData(contours(pts, box, { res: 0.0035, sigma: 2.4, levels: 10 }));

    const frame = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const cursor = first + (last - first) * e;
      while (idx < sorted.length && sorted[idx][2] <= cursor) {
        const [lng, lat, , k] = sorted[idx++];
        pts.push([lng, lat]);
        tally.all++; if (k === 0) tally.cases++; if (k === 2) tally.abc++; if (k === 3) tally.vacc++;
      }
      if (now - lastPaint > 40) { paint(cursor); lastPaint = now; setDay(cursor); setN({ ...tally }); }
      if (now - lastContour > 260 || t === 1) { redrawContours(); lastContour = now; }
      if (t < 1) raf = requestAnimationFrame(frame);
      else paint(cursor + 400); // everything settles to the terrain once the clock stops
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    run.current = () => {
      cancelAnimationFrame(raf);
      start = 0; lastPaint = 0; lastContour = 0; idx = 0; pts.length = 0;
      Object.assign(tally, { all: 0, cases: 0, abc: 0, vacc: 0 });
      if (reduce) {
        for (const [lng, lat, , k] of sorted) { pts.push([lng, lat]); tally.all++; if (k === 0) tally.cases++; if (k === 2) tally.abc++; if (k === 3) tally.vacc++; }
        paint(last + 400); redrawContours(); setDay(last); setN({ ...tally });
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    run.current();
    return () => cancelAnimationFrame(raf);
  }, [events, box]);

  const date = new Date(EPOCH + day * 86400000);
  const when = `${MON[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

  return (
    <>
      <div className="la-hero-map">
        <LabMap palette={NIGHT} bounds={box} interactive={false} padding={{ top: 70, bottom: 40, left: 40, right: 40 }} onLoad={onLoad} />
        {ticks && (
          <div className="la-grat" aria-hidden>
            {ticks.t.map((t) => <span key={t.label} className="t" style={{ left: t.x }}>{t.label}</span>)}
            {ticks.l.map((l) => <span key={l.label} className="l" style={{ top: l.y, left: ticks.west }}>{l.label}</span>)}
          </div>
        )}
        <div className="la-mobile-when" aria-hidden>
          <b className="mono">{when}</b>
          <span>{n.all.toLocaleString("en-IN")} field records<br />sample city: Coimbatore</span>
        </div>
      </div>
      <aside className="la-legend" aria-label="Plate legend">
        <div className="la-when">{when}<small>Sample city: Coimbatore · field records to date</small></div>
        <div className="la-counts">
          <div><span>Field records</span><b>{n.all.toLocaleString("en-IN")}</b></div>
          <div><span>Cases opened</span><b>{n.cases.toLocaleString("en-IN")}</b></div>
          <div><span>Sterilisations · ABC</span><b>{n.abc.toLocaleString("en-IN")}</b></div>
          <div><span>Vaccinations</span><b>{n.vacc.toLocaleString("en-IN")}</b></div>
        </div>
        <button type="button" className="la-replay" onClick={() => run.current()}>Replay 2024 → 2026</button>
        {children}
        <div className="la-key">
          <div><svg width="28" height="10"><circle cx="5" cy="5" r="4" fill="#f05b40" /></svg><span>A case, while it is new</span></div>
          <div><svg width="28" height="10"><circle cx="5" cy="5" r="1.6" fill="#efe7da" opacity=".6" /></svg><span>Care recorded</span></div>
          <div><svg width="28" height="10"><path d="M0 7 Q7 1 14 5 T28 3" fill="none" stroke="#efe7da" strokeOpacity=".6" /></svg><span>Terrain of care: each line, more work per km²</span></div>
          <p>Public record, snapshot 23 Sep 2026. Positions published to ~1 km.</p>
        </div>
      </aside>
      {ticks && (
        <div className="la-hero-scale" aria-hidden>
          <div className="la-scale" style={{ width: ticks.km * 4 }}><i /><i /><i /><i /></div>
          <div className="la-scale-l" style={{ width: ticks.km * 4 }}><span>0</span><span>2</span><span>4 km</span></div>
        </div>
      )}
    </>
  );
}
