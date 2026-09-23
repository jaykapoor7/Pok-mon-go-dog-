"use client";

/* The field map. The map is the whole composition; the rail asks four
   questions of it and the panel answers for the city or for one cell.

   Every question is drawn on the same 0.55 km cell, so switching lenses
   never moves the city: work (field records), need (animals marked as
   needing help and open cases), care (sterilisation and vaccination) and
   gaps (animals recorded, no field work in the period). The year scrubber
   re-counts every cell from the records, and selecting a cell turns the
   panel into that cell's register. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap, GeoJSONSource, ExpressionSpecification, MapMouseEvent } from "maplibre-gl";
import { LabMap, NIGHT } from "../LabMap";
import { hexbin, contours, type Box } from "../geo";

type Ev = [number, number, number, number];
type Pt = [number, number, number, number, number];
export type OpenPin = { lng: number; lat: number; cat: string; days: number; zone: string; unverified: boolean };
type Lens = "work" | "need" | "care" | "gaps";
type Period = "all" | 2024 | 2025 | 2026;

const KINDS = ["Case opened", "Treatment", "Sterilisation · ABC", "Vaccination", "Surgery", "Diagnostic", "Rescue", "Wound care"];
const LENSES: { id: Lens; q: string; a: string }[] = [
  { id: "work", q: "Where is the work?", a: "Field records per cell" },
  { id: "need", q: "Where do animals need help?", a: "Animals needing help · open cases" },
  { id: "care", q: "Where is ABC and vaccination done?", a: "Sterilisations + vaccinations per cell" },
  { id: "gaps", q: "Where are the gaps?", a: "Animals recorded, no field work in the period" },
];
const RAMPS: Record<Lens, string[]> = {
  work: ["#16305e", "#23479a", "#2f63d6", "#6f93e6", "#b7caf2"],
  care: ["#123a4f", "#1d5c77", "#2d86a3", "#63b2c9", "#b4dde8"],
  need: ["#3a1d2a", "#6b2a2a", "#a8392a", "#e05537", "#f7a08c"],
  gaps: ["#f05b40", "#f05b40", "#f05b40", "#f05b40", "#f05b40"],
};
const EPOCH = Date.UTC(2024, 0, 1);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const yearOf = (d: number) => new Date(EPOCH + d * 86400000).getUTCFullYear();
const dateOf = (d: number) => { const x = new Date(EPOCH + d * 86400000); return `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");

export function FieldAtlas({ events, animals, open, localities, box, nowDay }: {
  events: Ev[]; animals: Pt[]; open: OpenPin[]; localities: { name: string; lng: number; lat: number }[]; box: Box; nowDay: number;
}) {
  const [lens, setLens] = useState<Lens>("work");
  const [period, setPeriod] = useState<Period>("all");
  const [sel, setSel] = useState<number | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(0);

  const grid = useMemo(() => {
    type It = { t: 0 | 1 | 2; i: number };
    const items: It[] = [...events.map((_, i) => ({ t: 0 as const, i })), ...animals.map((_, i) => ({ t: 1 as const, i })), ...open.map((_, i) => ({ t: 2 as const, i }))];
    const ll = (x: It): [number, number] => (x.t === 0 ? [events[x.i][0], events[x.i][1]] : x.t === 1 ? [animals[x.i][0], animals[x.i][1]] : [open[x.i].lng, open[x.i].lat]);
    return hexbin(items, ll, 11, 0.55).map((h) => {
      let best = "", bd = Infinity;
      for (const l of localities) { const d = (l.lng - h.center[0]) ** 2 + (l.lat - h.center[1]) ** 2; if (d < bd) { bd = d; best = l.name; } }
      return { ring: h.ring, center: h.center, ev: h.items.filter((x) => x.t === 0).map((x) => x.i), an: h.items.filter((x) => x.t === 1).map((x) => x.i), op: h.items.filter((x) => x.t === 2).map((x) => x.i), locality: best };
    });
  }, [events, animals, open, localities]);

  const inPeriod = useCallback((d: number) => (period === "all" ? true : yearOf(d) === period), [period]);
  const metrics = useMemo(() => grid.map((c) => {
    const ev = c.ev.filter((i) => inPeriod(events[i][2]));
    const care = ev.filter((i) => events[i][3] === 2 || events[i][3] === 3).length;
    const help = c.an.filter((i) => animals[i][2]).length;
    const recent = period === "all" ? c.ev.filter((i) => events[i][2] > nowDay - 365).length : ev.length;
    const gap = c.an.length > 0 && recent === 0;
    return { work: ev.length, care, need: help + c.op.length, gap, help, animals: c.an.length, ev };
  }), [grid, events, animals, inPeriod, period, nowDay]);

  const value = useCallback((i: number) => { const m = metrics[i]; return lens === "work" ? m.work : lens === "care" ? m.care : lens === "need" ? m.need : m.gap ? 1 : 0; }, [metrics, lens]);
  const steps = useMemo(() => {
    const vals = grid.map((_, i) => value(i)).filter((v) => v > 0).sort((a, b) => a - b);
    const q = (f: number) => vals[Math.floor(f * (vals.length - 1))] ?? 1;
    return [q(0.2), q(0.45), q(0.7), q(0.9)];
  }, [grid, value]);
  const stepOf = useCallback((v: number) => (v <= 0 ? -1 : steps.findIndex((s) => v <= s) === -1 ? 4 : steps.findIndex((s) => v <= s)), [steps]);

  const onLoad = useCallback((map: MLMap) => {
    mapRef.current = map;
    const fit = () => { const w = map.getContainer().clientWidth; map.fitBounds(box, { padding: w > 1100 ? { top: 40, bottom: 40, left: 380, right: 400 } : w > 760 ? { top: 40, bottom: 40, left: 40, right: 380 } : { top: 120, bottom: 220, left: 10, right: 10 }, animate: false }); };
    fit(); map.on("resize", fit);
    map.addSource("cells", { type: "geojson", data: { type: "FeatureCollection", features: grid.map((c, i) => ({ type: "Feature", id: i, properties: {}, geometry: { type: "Polygon", coordinates: [c.ring] } })) } });
    map.addSource("ct", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addSource("help", { type: "geojson", data: { type: "FeatureCollection", features: animals.filter((a) => a[2]).map((a) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [a[0], a[1]] } })) } });
    map.addSource("open", { type: "geojson", data: { type: "FeatureCollection", features: open.map((o) => ({ type: "Feature", properties: { d: o.days, u: o.unverified ? 1 : 0 }, geometry: { type: "Point", coordinates: [o.lng, o.lat] } })) } });
    const s = ["coalesce", ["feature-state", "s"], -1] as ExpressionSpecification;
    map.addLayer({ id: "cells", type: "fill", source: "cells", paint: { "fill-color": "#16305e", "fill-opacity": ["case", ["<", s, 0], 0.05, 0.92] as ExpressionSpecification } });
    map.addLayer({ id: "cells-edge", type: "line", source: "cells", paint: {
      "line-color": ["case", ["boolean", ["feature-state", "sel"], false], "#f3ede4", "#081631"] as ExpressionSpecification,
      "line-width": ["case", ["boolean", ["feature-state", "sel"], false], 3, 1] as ExpressionSpecification,
    } });
    map.addLayer({ id: "ct", type: "line", source: "ct", paint: { "line-color": "#f3ede4", "line-width": 0.7, "line-opacity": 0.18 } });
    map.addLayer({ id: "help", type: "circle", source: "help", layout: { visibility: "none" }, paint: { "circle-radius": 2.6, "circle-color": "#f7a08c", "circle-opacity": 0.9 } });
    map.addLayer({ id: "open", type: "circle", source: "open", layout: { visibility: "none" }, paint: {
      "circle-radius": ["interpolate", ["linear"], ["get", "d"], 0, 6, 60, 12] as ExpressionSpecification,
      "circle-color": ["case", ["==", ["get", "u"], 1], "#081631", "#f05b40"] as ExpressionSpecification,
      "circle-stroke-color": "#f3ede4", "circle-stroke-width": 2,
    } });
    map.on("click", "cells", (e: MapMouseEvent & { features?: { id?: string | number }[] }) => { const id = e.features?.[0]?.id; if (typeof id === "number") setSel(id); });
    map.on("mouseenter", "cells", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "cells", () => (map.getCanvas().style.cursor = ""));
    setReady((r) => r + 1);
  }, [grid, animals, open, box]);

  // Repaint when the lens, the period or the data changes.
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    const ramp = RAMPS[lens];
    const s = ["coalesce", ["feature-state", "s"], -1] as ExpressionSpecification;
    map.setPaintProperty("cells", "fill-color", ["match", s, 0, ramp[0], 1, ramp[1], 2, ramp[2], 3, ramp[3], 4, ramp[4], "#16305e"] as ExpressionSpecification);
    map.setPaintProperty("cells", "fill-opacity", lens === "gaps" ? (["case", ["<", s, 0], 0.08, 0.85] as ExpressionSpecification) : (["case", ["<", s, 0], 0.05, 0.92] as ExpressionSpecification));
    grid.forEach((_, i) => map.setFeatureState({ source: "cells", id: i }, { s: lens === "gaps" ? (metrics[i].gap ? 2 : -1) : stepOf(value(i)) }));
    map.setLayoutProperty("help", "visibility", lens === "need" ? "visible" : "none");
    map.setLayoutProperty("open", "visibility", lens === "need" ? "visible" : "none");
    const pts = events.filter((e) => inPeriod(e[2])).map((e) => [e[0], e[1]] as [number, number]);
    (map.getSource("ct") as GeoJSONSource | undefined)?.setData(contours(pts.length ? pts : [[box[0], box[1]]], box, { res: 0.004, sigma: 2.6, levels: 7 }));
  }, [lens, period, metrics, value, stepOf, grid, events, inPeriod, box, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    grid.forEach((_, i) => map.setFeatureState({ source: "cells", id: i }, { sel: i === sel }));
    if (sel != null) map.easeTo({ center: grid[sel].center, duration: 600 });
  }, [sel, grid, ready]);

  const L = LENSES.find((l) => l.id === lens)!;
  const ranked = grid.map((c, i) => ({ c, i, v: value(i) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const total = ranked.reduce((a, x) => a + x.v, 0);
  const gapCount = metrics.filter((m) => m.gap).length;
  const gapAnimals = metrics.filter((m) => m.gap).reduce((a, m) => a + m.animals, 0);
  const answer = lens === "gaps"
    ? `${gapCount} cells hold ${fmt(gapAnimals)} recorded animals and no field work ${period === "all" ? "in the last twelve months" : `in ${period}`}.`
    : lens === "need" ? `${fmt(animals.filter((a) => a[2]).length)} animals marked as needing help; ${open.length} open cases, the oldest ${Math.max(...open.map((o) => o.days))} days.`
    : `${fmt(total)} ${lens === "care" ? "sterilisations and vaccinations" : "field records"} in ${ranked.length} cells${period === "all" ? "" : ` in ${period}`}. Busiest: ${ranked[0]?.c.locality ?? "—"} (${fmt(ranked[0]?.v ?? 0)}).`;

  const S = sel != null ? { c: grid[sel], m: metrics[sel] } : null;
  const byKind = S ? KINDS.map((k, ki) => ({ k, n: S.m.ev.filter((i) => events[i][3] === ki).length })).filter((x) => x.n) : [];
  const monthly = S ? (() => { const arr = new Array(33).fill(0); S.c.ev.forEach((i) => { const d = new Date(EPOCH + events[i][2] * 86400000); const k = (d.getUTCFullYear() - 2024) * 12 + d.getUTCMonth(); if (k >= 0 && k < 33) arr[k]++; }); return arr; })() : [];
  const last = S && S.c.ev.length ? Math.max(...S.c.ev.map((i) => events[i][2])) : null;

  return (
    <div className="sx-atlas">
      <div className="sx-atlas-map"><LabMap palette={NIGHT} bounds={box} onLoad={onLoad} /></div>

      <aside className="sx-atlas-rail" aria-label="Questions">
        <span className="lbl">Field map · sample city: Coimbatore</span>
        <h1>Ask the map.</h1>
        <ol>
          {LENSES.map((l) => (
            <li key={l.id}><button type="button" aria-pressed={lens === l.id} onClick={() => setLens(l.id)}><b>{l.q}</b><span>{l.a}</span></button></li>
          ))}
        </ol>
        <div className="sx-atlas-time" role="group" aria-label="Period">
          <span className="lbl">Period</span>
          <div className="sx-seg">{(["all", 2024, 2025, 2026] as Period[]).map((p) => <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)}>{p === "all" ? "2024–26" : p}</button>)}</div>
        </div>
      </aside>

      <aside className="sx-atlas-panel" aria-label="Answer" aria-live="polite">
        {!S ? (
          <>
            <span className="lbl">{L.q}</span>
            <p className="ans">{answer}</p>
            <div className="sx-atlas-legend" aria-hidden>
              {lens === "gaps"
                ? <span><i style={{ background: "#f05b40" }} />gap cell</span>
                : RAMPS[lens].map((c, i) => <span key={c + i}><i style={{ background: c }} />{i === 0 ? `≤${steps[0]}` : i === 4 ? `>${steps[3]}` : `≤${steps[i]}`}</span>)}
              {lens === "need" && <><span><i className="pin" />open case</span><span><i className="pin u" />unverified</span></>}
            </div>
            <h2 className="lbl">{lens === "gaps" ? "Largest gaps" : "Highest cells"} · select one</h2>
            <ol className="sx-atlas-rank">
              {(lens === "gaps" ? grid.map((c, i) => ({ c, i, v: metrics[i].gap ? metrics[i].animals : 0 })).filter((x) => x.v).sort((a, b) => b.v - a.v) : ranked).slice(0, 8).map((x, r) => (
                <li key={x.i}><button type="button" onClick={() => setSel(x.i)}><span className="m">{String(r + 1).padStart(2, "0")}</span><b>{x.c.locality}</b><span className="m">{fmt(x.v)}{lens === "gaps" ? " animals" : ""}</span></button></li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <button type="button" className="back" onClick={() => setSel(null)}>← City</button>
            <span className="lbl">Cell · 0.55 km · {S.c.center[1].toFixed(3)}°N {S.c.center[0].toFixed(3)}°E</span>
            <h2 className="cellname">{S.c.locality}</h2>
            <dl className="sx-cell-facts">
              <div><dt>Animals</dt><dd className="m">{S.m.animals}</dd></div>
              <div><dt>Need help</dt><dd className={`m${S.m.help ? " need" : ""}`}>{S.m.help}</dd></div>
              <div><dt>Open cases</dt><dd className={`m${S.c.op.length ? " need" : ""}`}>{S.c.op.length}</dd></div>
              <div><dt>Field records</dt><dd className="m">{S.m.work}</dd></div>
            </dl>
            {S.m.animals > 0 && (
              <div className="sx-cell-abc">
                <span className="lbl">Of {S.m.animals} animals</span>
                <div className="bar"><i style={{ width: `${(S.c.an.filter((i) => animals[i][3]).length / S.m.animals) * 100}%` }} /></div>
                <span>{S.c.an.filter((i) => animals[i][3]).length} sterilised · {S.c.an.filter((i) => animals[i][4]).length} vaccinated · the rest not recorded</span>
              </div>
            )}
            <span className="lbl">Records by kind{period === "all" ? "" : ` · ${period}`}</span>
            <ul className="sx-cell-kinds">{byKind.length ? byKind.map((k) => <li key={k.k}><span>{k.k}</span><i style={{ width: `${(k.n / Math.max(...byKind.map((x) => x.n))) * 100}%` }} /><b className="m">{k.n}</b></li>) : <li className="dim">No field records in this period.</li>}</ul>
            <span className="lbl">Monthly, Jan 2024 – Sep 2026</span>
            <svg viewBox="0 0 330 44" width="100%" className="sx-cell-spark" aria-hidden>
              {monthly.map((v, i) => { const h = (v / Math.max(1, ...monthly)) * 36; return <rect key={i} x={i * 10} y={40 - h} width="7" height={Math.max(h, v ? 2 : 0.8)} fill={v ? "#9fb9ef" : "rgba(243,237,228,.2)"} />; })}
            </svg>
            <p className="m dim">{last != null ? `Last record ${dateOf(last)} · ${nowDay - last} days ago` : "No field record in this cell."}</p>
            {S.c.op.length > 0 && <ul className="sx-cell-open">{S.c.op.map((i) => <li key={i}><b>{open[i].cat}</b><span className="m">{open[i].zone} · {open[i].days} d{open[i].unverified ? " · to verify" : ""}</span></li>)}</ul>}
          </>
        )}
        <p className="sx-source">Public register · positions to ~1 km, spread within their cell.</p>
      </aside>
    </div>
  );
}
