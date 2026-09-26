"use client";

/* ════════════════════════════════════════════════════════════════════
   One request, followed to the end: a dive from the city into one cell.

   The section holds still while it scrolls. First the city's cells, as the
   hero drew them, close in on the one cell a real request came from. Then
   the request is told by its own dates: a day counter runs from the report
   to the close, and each step is written in on the day it happened, the
   cell changing with it (reported, a team on site, care, closed).

   Everything is the record's own: the condition, the locality, the days.
   The cell is the finest place the public record gives. Under reduced
   motion the section does not hold: it opens on the cell with every step
   written in.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { projector, type Box } from "@/components/system/HexPlate";

type Journey = {
  condition: string; locality: string; ring: number[];
  reported: string; acted: string; actedAfter: number; closed: string; days: number;
  closure: string;
  care: { count: number; kinds: string[]; first: string | null };
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const when = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const DAY = 86_400_000;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const V = 1000; // the plate's square viewBox

export function CaseDive({ j, city, box, rings, note }: { j: Journey; city: string; box: Box; rings: number[][]; note?: string }) {
  const steps = useMemo(() => {
    const start = Date.parse(j.reported);
    const day = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - start) / DAY));
    return [
      { key: "r", day: 0, at: j.reported, what: "Reported", detail: `${j.condition}, ${j.locality}` },
      { key: "a", day: day(j.acted), at: j.acted, what: "Field team on site", detail: j.actedAfter === 0 ? "The same day as the report" : `${plural(j.actedAfter, "day")} after the report` },
      ...(j.care.count && j.care.first ? [{ key: "c", day: day(j.care.first), at: j.care.first, what: "Care recorded", detail: `${j.care.kinds.map((k) => k.replace(/_/g, " ")).join(", ").replace(/^./, (c) => c.toUpperCase())} · ${j.care.count === 1 ? "1 entry" : `${j.care.count} entries`}` }] : []),
      { key: "e", day: j.days, at: j.closed, what: j.closure === "recovered" ? "Recovered, case closed" : "Closed after field work", detail: `${plural(j.days, "day")} from the first report` },
    ];
  }, [j]);

  /* The plate: the city projected into a square, and the request's cell. */
  const plate = useMemo(() => {
    // The opening frame holds the whole city and the request's own cell, even one at the edge of it.
    let [w0, s0, e0, n0] = box;
    for (let i = 0; i < j.ring.length; i += 2) { w0 = Math.min(w0, j.ring[i]); e0 = Math.max(e0, j.ring[i]); s0 = Math.min(s0, j.ring[i + 1]); n0 = Math.max(n0, j.ring[i + 1]); }
    const p = projector([w0, s0, e0, n0], V, V, 90).p;
    const path = (ring: number[]) => { let d = ""; for (let i = 0; i < ring.length; i += 2) { const [x, y] = p(ring[i], ring[i + 1]); d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; } return d + "Z"; };
    const pts = (ring: number[]) => { const out: [number, number][] = []; for (let i = 0; i < ring.length; i += 2) out.push(p(ring[i], ring[i + 1])); return out; };
    const cell = pts(j.ring);
    const cx = cell.reduce((s, q) => s + q[0], 0) / cell.length, cy = cell.reduce((s, q) => s + q[1], 0) / cell.length;
    const w = Math.max(...cell.map((q) => q[0])) - Math.min(...cell.map((q) => q[0]));
    return { cells: rings.map(path), target: path(j.ring), c: [cx, cy] as [number, number], w: Math.max(4, w) };
  }, [box, rings, j.ring]);

  const spans = useMemo(() => {
    const edge = [0];
    for (let k = 1; k < steps.length; k++) edge.push(edge[k - 1] + 1 + (3 * (steps[k].day - steps[k - 1].day)) / Math.max(1, j.days));
    return { edge, total: edge[edge.length - 1] };
  }, [steps, j.days]);

  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cam = useRef<SVGGElement>(null);
  const [calm, setCalm] = useState(false);
  const [t, setT] = useState({ step: 0, day: 0, zoom: 0 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) { setCalm(true); setT({ step: steps.length - 1, day: j.days, zoom: 1 }); }
    const s = sec.current, st = stage.current, g = cam.current;
    if (!s || !st || !g) return;
    let raf = 0, last = "";
    const frame = () => {
      raf = 0;
      const calmNow = reduce.matches;
      const r = s.getBoundingClientRect(), vh = window.innerHeight;
      const prog = calmNow ? 1 : clamp(-r.top / Math.max(1, r.height - vh));
      const zoom = calmNow ? 1 : ease(clamp(prog / 0.32));
      // The camera: from the whole city at the middle of the stage to the cell at the focus point.
      const W = st.clientWidth, H = st.clientHeight, phone = W < 760;
      const k = Math.max(W / V, H / V); // viewBox "slice"
      const visW = W / k, visH = H / k;
      const s0 = Math.min(1, (visW * 0.92) / V, ((phone ? visH * 0.52 : visH) * 0.94) / V);
      // Close enough to read the cell among its neighbours, not so close it becomes a shape.
      const s1 = Math.min(9, ((phone ? visW : visW * 0.46) * 0.16) / plate.w);
      const sc = s0 * Math.pow(s1 / s0, zoom);
      const x0 = (V - visW) / 2, y0 = (V - visH) / 2;
      const A0: [number, number] = [x0 + visW * (phone ? 0.5 : 0.62), y0 + visH * (phone ? 0.27 : 0.5)];
      const Lx = V / 2 + (plate.c[0] - V / 2) * zoom, Ly = V / 2 + (plate.c[1] - V / 2) * zoom;
      const tx = A0[0] - sc * Lx, ty = A0[1] - sc * Ly;
      const tr = `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${sc.toFixed(4)})`;
      if (tr !== last) { g.setAttribute("transform", tr); last = tr; }
      // The record: each stretch between two steps takes scroll in proportion to the days it spans,
      // with a floor, so two steps on the same day still each get a moment.
      const tl = calmNow ? 1 : clamp((prog - 0.36) / 0.56);
      const pos = tl * spans.total;
      let i = 0;
      while (i < steps.length - 2 && pos > spans.edge[i + 1]) i++;
      const f = clamp((pos - spans.edge[i]) / Math.max(1e-6, spans.edge[i + 1] - spans.edge[i]));
      const day = tl >= 1 ? steps[steps.length - 1].day : Math.round(steps[i].day + (steps[i + 1].day - steps[i].day) * f);
      const step = tl >= 1 ? steps.length - 1 : f > 0.98 ? i + 1 : i;
      setT((o) => (o.step === step && o.day === day && Math.abs(o.zoom - zoom) < 0.02 ? o : { step, day, zoom }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    reduce.addEventListener("change", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); reduce.removeEventListener("change", on); cancelAnimationFrame(raf); };
  }, [plate, steps, spans, j.days]);

  const state = steps[t.step]?.key ?? "r";
  const arrived = t.zoom > 0.9;

  return (
    <section ref={sec} className={`ld-dive ${calm ? "is-calm" : ""}`} aria-labelledby="ld-dive-title">
      <div ref={stage} className="ld-dive-stage">
        <svg className="ld-dive-plate" viewBox={`0 0 ${V} ${V}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g ref={cam}>
            {plate.cells.map((d, i) => <path key={i} d={d} className="ld-dive-cell" />)}
            <path d={plate.target} className={`ld-dive-target is-${state}`} />
            {arrived && <circle cx={plate.c[0]} cy={plate.c[1]} r={plate.w * 0.95} className={`ld-dive-ring is-${state}`} />}
          </g>
        </svg>

        <div className="ld-dive-panel">
          <p className="ld-dive-kicker sys-mono">A real request · {j.locality}, {city}</p>
          <h2 id="ld-dive-title">One request, <em>followed to the&nbsp;end.</em></h2>
          <p className="ld-dive-day" aria-hidden="true"><span>Day</span> <b>{t.day}</b></p>
          <ol className="ld-dive-steps" aria-label={`The request, from report to close, over ${plural(j.days, "day")}`}>
            {steps.map((s, i) => (
              <li key={s.key} className={i < t.step ? "is-past" : i === t.step ? "is-now" : ""}>
                <i aria-hidden />
                <span className="ld-dive-what"><b>{s.what}</b><time className="sys-mono" dateTime={s.at}>{when(s.at)} · day {s.day}</time></span>
                <span className="ld-dive-detail">{s.detail}</span>
              </li>
            ))}
          </ol>
          {note && <p className="ld-dive-note">{note}</p>}
        </div>
      </div>
    </section>
  );
}
