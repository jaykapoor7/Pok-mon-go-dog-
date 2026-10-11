"use client";

/* ════════════════════════════════════════════════════════════════════
   The record over time, mirrored: requests for help opened above the
   line, dated care below it, one column a month. Drag across it (or
   pick a preset) to read the map for that period only. Months with no
   record are drawn as a gap on the axis, not as zero bars.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from "react";
import { MR, monthName, type MonthRow } from "@/lib/livingmap/types";
import type { Range } from "@/lib/livingmap/questions";

export function Timeline({ months, cell, range, onRange, careLabel = "Dated care" }: {
  months: MonthRow[]; cell?: number; range: Range; onRange?: (r: Range) => void; careLabel?: string;
}) {
  const { from, to, up, down, maxUp, maxDown } = useMemo(() => {
    const rows = cell === undefined ? months : months.filter((r) => r[MR.cell] === cell);
    const up = new Map<number, number>(), down = new Map<number, number>();
    for (const r of rows) {
      if (r[MR.opened]) up.set(r[MR.m], (up.get(r[MR.m]) ?? 0) + r[MR.opened]);
      if (r[MR.care]) down.set(r[MR.m], (down.get(r[MR.m]) ?? 0) + r[MR.care]);
    }
    const all = [...up.keys(), ...down.keys()].sort((a, b) => a - b);
    /* Start where the record really starts: skip a long tail of stray early dates. */
    const total = [...up.values(), ...down.values()].reduce((a, b) => a + b, 0);
    let acc = 0, start = all[0] ?? 0;
    const counts = new Map<number, number>();
    for (const m of all) counts.set(m, (up.get(m) ?? 0) + (down.get(m) ?? 0));
    for (const m of [...new Set(all)]) { acc += counts.get(m) ?? 0; if (acc >= total * 0.01) { start = m; break; } }
    const now = new Date(); const end = (now.getUTCFullYear() - 2000) * 12 + now.getUTCMonth();
    return { from: Math.min(start, end - 11), to: end, up, down, maxUp: Math.max(1, ...up.values()), maxDown: Math.max(1, ...down.values()) };
  }, [months, cell]);

  const n = to - from + 1;
  const W = 600, H = 92, mid = 52;
  const bw = W / n;
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ a: number; b: number } | null>(null);
  const monthAt = (clientX: number) => {
    const r = svg.current!.getBoundingClientRect();
    return Math.max(from, Math.min(to, from + Math.floor(((clientX - r.left) / r.width) * n)));
  };
  const sel = drag ? { from: Math.min(drag.a, drag.b), to: Math.max(drag.a, drag.b) } : range;
  const hasDown = down.size > 0;
  const years: number[] = [];
  for (let m = from; m <= to; m++) if (m % 12 === 0) years.push(m);
  const total = (map: Map<number, number>, r: Range) => { let s = 0; for (const [m, v] of map) if (!r || (m >= r.from && m <= r.to)) s += v; return s; };

  const now = to;
  const presets: { label: string; r: Range }[] = [
    { label: "All time", r: null },
    { label: "Last 12 months", r: { from: now - 11, to: now } },
    { label: String(2000 + Math.floor(now / 12)), r: { from: now - (now % 12), to: now } },
    { label: String(1999 + Math.floor(now / 12)), r: { from: now - (now % 12) - 12, to: now - (now % 12) - 1 } },
  ];

  return (
    <figure className="lm-tl">
      <figcaption className="lm-tl-cap">
        <span><i className="is-up" aria-hidden />Requests opened <b>{total(up, sel).toLocaleString("en-IN")}</b></span>
        {hasDown && <span><i className="is-down" aria-hidden />{careLabel} <b>{total(down, sel).toLocaleString("en-IN")}</b></span>}
        <span className="lm-tl-when">{sel ? `${monthName(sel.from, true)} – ${monthName(sel.to, true)}` : `${monthName(from, true)} – now`}</span>
      </figcaption>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={onRange ? "is-live" : ""}
        role="img" aria-label={`Requests opened and dated care each month, ${monthName(from, true)} to now.`}
        onPointerDown={onRange ? (e) => { (e.target as Element).setPointerCapture?.(e.pointerId); const m = monthAt(e.clientX); setDrag({ a: m, b: m }); } : undefined}
        onPointerMove={onRange ? (e) => { if (drag) setDrag({ ...drag, b: monthAt(e.clientX) }); } : undefined}
        onPointerUp={onRange ? () => { if (drag) { const r = { from: Math.min(drag.a, drag.b), to: Math.max(drag.a, drag.b) }; onRange(r.from === r.to && range && range.from === r.from && range.to === r.to ? null : r); setDrag(null); } } : undefined}>
        {sel && <rect className="lm-tl-sel" x={(sel.from - from) * bw} y={0} width={(sel.to - sel.from + 1) * bw} height={H} />}
        <line className="lm-tl-axis" x1={0} x2={W} y1={mid} y2={mid} />
        {Array.from({ length: n }, (_, j) => {
          const m = from + j, u = up.get(m) ?? 0, d = down.get(m) ?? 0;
          const inSel = !sel || (m >= sel.from && m <= sel.to);
          return (
            <g key={m} className={inSel ? "" : "is-out"}>
              {u > 0 && <rect className="lm-tl-up" x={j * bw + bw * 0.12} width={Math.max(1, bw * 0.76)} y={mid - 2 - (u / maxUp) * (mid - 6)} height={(u / maxUp) * (mid - 6)} />}
              {d > 0 && <rect className="lm-tl-down" x={j * bw + bw * 0.12} width={Math.max(1, bw * 0.76)} y={mid + 2} height={(d / maxDown) * (H - mid - 6)} />}
            </g>
          );
        })}
        {years.map((m) => <text key={m} className="lm-tl-yr" x={(m - from) * bw + 2} y={H - 1}>{2000 + m / 12}</text>)}
      </svg>
      {onRange && (
        <div className="lm-tl-presets" role="group" aria-label="Period">
          {presets.map((p) => {
            const on = (!p.r && !range) || (p.r && range && p.r.from === range.from && p.r.to === range.to);
            return <button key={p.label} type="button" aria-pressed={!!on} onClick={() => onRange(p.r)}>{p.label}</button>;
          })}
        </div>
      )}
    </figure>
  );
}
