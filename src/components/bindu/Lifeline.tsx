"use client";

/* ════════════════════════════════════════════════════════════════════
   One life. A real animal's recorded history laid on a line that runs
   corner to corner across a sheet larger than the screen. Scrolling
   moves the camera diagonally along it while the line is drawn ahead,
   and each event lights as the line reaches it. Positions are measured
   from the drawn path itself, so they hold at any size.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { useStage, span, ease } from "./stage";

export type LifeEvent = { id: string; date: string; title: string; lane: "case" | "care" | "seen" };
export type LifeCard = { id: string; label: string; sid: string | null; place: string; photo: string | null; art: { src: string; ground: string; title: string }; events: LifeEvent[] };


export function Lifeline({ life }: { life: LifeCard }) {
  const { p, listen, still } = useStage();
  const world = useRef<HTMLDivElement>(null);
  const river = useRef<SVGPathElement>(null);
  const reveal = useRef<SVGPathElement>(null);
  const ink = useRef<SVGPathElement>(null);
  const evs = life.events;

  useEffect(() => {
    const w = world.current, path = river.current, rv = reveal.current, nk = ink.current; if (!w || !path || !rv || !nk) return;
    const frame = w.parentElement!;
    let L = 1, pts: { x: number; y: number }[] = [], ts: number[] = [], W = 0, H = 0, WW = 0, WH = 0;
    const layout = () => {
      W = frame.clientWidth; H = frame.clientHeight;
      const phone = W < 760;
      WW = phone ? W * 2.2 : W * 2.3; WH = phone ? H * 2.6 : H * 2.2;
      w.style.width = `${WW}px`; w.style.height = `${WH}px`;
      const svg = path.ownerSVGElement!; svg.setAttribute("viewBox", `0 0 ${WW} ${WH}`); svg.setAttribute("width", `${WW}`); svg.setAttribute("height", `${WH}`);
      /* corner to corner, meandering: points swing either side of the diagonal, joined by a Catmull-Rom curve */
      const N = 8, P: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, s = i && i < N ? (i % 2 ? 1 : -1) * (phone ? 0.16 : 0.13) : 0;
        P.push([WW * (0.07 + t * 0.86 + s * 0.55), WH * (0.08 + t * 0.84 - s * 0.6)]);
      }
      let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[i - 1] ?? P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] ?? p2;
        d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
      }
      path.setAttribute("d", d); rv.setAttribute("d", d); nk.setAttribute("d", d);
      L = path.getTotalLength();
      ts = evs.map((_, i) => 0.06 + (i / Math.max(1, evs.length - 1)) * 0.86);
      pts = ts.map((t) => { const q = path.getPointAtLength(t * L); return { x: q.x, y: q.y }; });
      const ks = w.querySelectorAll<HTMLElement>(".ll-knot");
      w.querySelectorAll<HTMLElement>(".ll-ev").forEach((n, i) => {
        const pt = pts[i], q = path.getPointAtLength(Math.min(L, ts[i] * L + 2)), ang = Math.atan2(q.y - pt.y, q.x - pt.x);
        const side = i % 2 ? 1 : -1, off = phone ? 22 : 40;
        n.style.left = `${pt.x - Math.sin(ang) * off * side}px`; n.style.top = `${pt.y + Math.cos(ang) * off * side}px`;
        n.dataset.side = side > 0 ? "r" : "l";
        ks[i].style.left = `${pt.x}px`; ks[i].style.top = `${pt.y}px`;
      });
      draw();
    };
    const knots = () => [...w.querySelectorAll<HTMLElement>(".ll-ev, .ll-knot")];
    const draw = () => {
      const t = still ? 1 : ease.inOut(span(p.current, 0.04, 0.92));
      rv.style.strokeDashoffset = String(1 - Math.min(1, t + 0.04));
      const q = path.getPointAtLength(Math.max(0.0001, t) * L), phone = W < 760;
      if (!still) w.style.transform = `translate3d(${(W * (phone ? 0.5 : 0.56) - q.x).toFixed(1)}px, ${(H * 0.55 - q.y).toFixed(1)}px, 0)`;
      knots().forEach((n) => n.classList.toggle("is-on", t + 0.04 >= ts[Number(n.dataset.i)]));
    };
    layout();
    const ro = new ResizeObserver(layout); ro.observe(frame);
    const off = listen(draw);
    return () => { ro.disconnect(); off(); };
  }, [evs, p, listen, still]);

  return (
    <div className="ll">
      <div className="ll-world" ref={world}>
        <svg className="ll-svg" aria-hidden>
          <path ref={river} className="ll-bed" />
          <mask id="ll-m" maskUnits="userSpaceOnUse"><path ref={reveal} className="ll-mask" pathLength={1} /></mask>
          <path ref={ink} className="ll-ink" mask="url(#ll-m)" />
        </svg>
        {evs.map((e, i) => <i key={`k${e.id}`} className={`ll-knot is-${e.lane}`} data-i={i} aria-hidden />)}
        {evs.map((e, i) => (
          <div key={e.id} className={`ll-ev is-${e.lane}`} data-i={i}><time>{e.date}</time><span>{e.title}</span></div>
        ))}
      </div>
      {/* Under reduced motion the river is not travelled: the same events, read as a list. */}
      <ol className="ll-list">{evs.map((e) => <li key={e.id} className={`is-${e.lane}`}><time>{e.date}</time><span>{e.title}</span></li>)}</ol>
      <aside className="ll-id">
        <p className="ll-k">On the record</p>
        <div className="ll-who">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={life.photo ?? life.art.src} alt={life.photo ? `${life.label}, as photographed` : ""} className={life.photo ? "" : "is-art"} style={life.photo ? undefined : { background: life.art.ground }} />
          <div><h3>{life.label}</h3><small>{life.place}{life.sid && life.sid !== life.label ? ` · ${life.sid}` : ""}</small></div>
        </div>
        {!life.photo && <small className="ll-art">No photograph on the record. Illustration, not this animal: {life.art.title}.</small>}
        <Link className="b-btn is-ink" href={`/animal/${life.id}`}>Read the full record <ArrowUpRight size={15} aria-hidden /></Link>
      </aside>
    </div>
  );
}
