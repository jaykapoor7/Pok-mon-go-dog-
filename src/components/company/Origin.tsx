"use client";

/* ════════════════════════════════════════════════════════════════════
   The origin, drawn as it grew. Three states of one picture, moved
   through as it scrolls past (and back):

   01  The first reports: about fifty marks, gathered by hand, the
       community reporting tool StrayPaw began as (the founder's figure).
   02  Today: the fifty marks fly out to India and the record fills in
       around them, one mark per mapped area, live from the record.
   03  Next: the cities on the record are stitched together, the
       connected infrastructure StrayPaw is building toward.

   Positions are real (each area and city where it is); the first fifty
   are drawn as a gathered cluster, not placed anywhere they were not.
   Under reduced motion the finished picture is shown with all three
   captions.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { INDIA_PATH, INDIA_VIEW, indiaXY } from "@/sp/atlas/india-path";
import type { Cell } from "@/components/bindu/mapkit";

export type City = { city: string; c: [number, number]; animals: number };

const FIRST = 50, GOLD = Math.PI * (3 - Math.sqrt(5));
const fmt = (n: number) => n.toLocaleString("en-IN");
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function Origin({ cells, cities, records, cityCount }: { cells: Cell[]; cities: City[]; records: number; cityCount: number }) {
  const root = useRef<HTMLDivElement>(null), firsts = useRef<SVGGElement>(null);
  const [stage, setStage] = useState(0);
  const [still, setStill] = useState(false);

  const top = Math.sqrt(Math.max(1, ...cells.map((c) => c[2])));
  const pts = useMemo(() => cells.map(([lng, lat, n]) => { const [x, y] = indiaXY(lng, lat); return { x, y, r: 0.35 + (Math.sqrt(n) / top) * 1.1 }; }), [cells, top]);
  /* the first fifty: a hand-gathered cluster, then each flies to one of the recorded areas */
  const seeds = useMemo(() => {
    const cx = INDIA_VIEW.w * 0.46, cy = INDIA_VIEW.h * 0.5;
    const targets = [...pts].sort((a, b) => b.r - a.r).slice(0, FIRST);
    return Array.from({ length: FIRST }, (_, i) => { const a = i * GOLD, d = 1.4 * Math.sqrt(i + 1); return { x0: cx + Math.cos(a) * d, y0: cy + Math.sin(a) * d, t: targets[i % Math.max(1, targets.length)] ?? { x: cx, y: cy, r: 0.6 } }; });
  }, [pts]);
  /* the network: the largest registers, each stitched to its nearest neighbour already placed */
  const links = useMemo(() => {
    const big = [...cities].sort((a, b) => b.animals - a.animals).slice(0, 12).map((c) => ({ ...c, p: indiaXY(c.c[0], c.c[1]) }));
    const out: string[] = [];
    big.forEach((c, i) => {
      if (!i) return;
      let best = big[0], bd = 1e9; for (let j = 0; j < i; j++) { const d = Math.hypot(big[j].p[0] - c.p[0], big[j].p[1] - c.p[1]); if (d < bd) { bd = d; best = big[j]; } }
      const [x1, y1] = best.p, [x2, y2] = c.p, mx = (x1 + x2) / 2 - (y2 - y1) * 0.25, my = (y1 + y2) / 2 + (x2 - x1) * 0.25;
      out.push(`M${x1.toFixed(2)},${y1.toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`);
    });
    return { paths: out, nodes: big.map((c) => c.p) };
  }, [cities]);

  useEffect(() => {
    const el = root.current, g = firsts.current; if (!el || !g) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); el.style.setProperty("--o", "1"); return; }
    let raf = 0, last = -1;
    const dots = Array.from(g.querySelectorAll<SVGCircleElement>("circle"));
    const frame = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const o = clamp((vh * 0.78 - r.top) / (r.height * 0.95));
      if (Math.abs(o - last) < 0.002) return; last = o;
      el.style.setProperty("--o", o.toFixed(3));
      const fly = ease(clamp((o - 0.3) / 0.28));
      dots.forEach((d, i) => { const s = seeds[i], x = s.x0 + (s.t.x - s.x0) * fly, y = s.y0 + (s.t.y - s.y0) * fly; d.setAttribute("cx", x.toFixed(2)); d.setAttribute("cy", y.toFixed(2)); });
      setStage(o < 0.33 ? 0 : o < 0.68 ? 1 : 2);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [seeds]);

  const caps = [
    { k: "Where it began", t: <>A small community reporting tool, with roughly <b>50 dogs</b> reported.</> },
    { k: "Today", t: <><b>{fmt(records)} animal records</b> across {fmt(cityCount)} cities. Records, not a count of unique animals.</> },
    { k: "What we are building", t: <>Connected infrastructure, so every city&rsquo;s reports, rescues and records <b>work as one system.</b></> },
  ];

  return (
    <div className={`og${still ? " is-still" : ""}`} ref={root} data-stage={still ? 2 : stage}>
      <svg className="og-map" viewBox={`-6 -6 ${INDIA_VIEW.w + 12} ${INDIA_VIEW.h + 12}`} role="img" aria-label={`From about fifty reports to ${fmt(records)} animal records across ${fmt(cityCount)} cities in India`}>
        <path d={INDIA_PATH} className="og-echo" transform="translate(0.9 0.7)" pathLength={1} />
        <path d={INDIA_PATH} className="og-land" pathLength={1} />
        <circle className="og-ring" cx={INDIA_VIEW.w * 0.46} cy={INDIA_VIEW.h * 0.5} r={12.5} />
        <g className="og-all">{pts.map((p, i) => <circle key={i} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={p.r.toFixed(2)} style={{ ["--d" as string]: (i % 60) / 60 }} />)}</g>
        <g className="og-net">
          {links.paths.map((d, i) => <path key={i} d={d} pathLength={1} style={{ ["--d" as string]: i / Math.max(1, links.paths.length) }} />)}
          {links.nodes.map(([x, y], i) => <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={1.5} />)}
        </g>
        <g className="og-first" ref={firsts}>{seeds.map((s, i) => <circle key={i} cx={(still ? s.t.x : s.x0).toFixed(2)} cy={(still ? s.t.y : s.y0).toFixed(2)} r={0.85} />)}</g>
      </svg>
      <ol className="og-caps">
        {caps.map((c, i) => <li key={c.k} className={still || stage === i ? "is-on" : stage > i ? "is-past" : ""}><i>{String(i + 1).padStart(2, "0")}</i><b>{c.k}</b><span>{c.t}</span></li>)}
      </ol>
    </div>
  );
}
