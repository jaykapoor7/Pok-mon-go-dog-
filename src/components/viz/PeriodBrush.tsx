"use client";

/* The period, chosen on the record's own rhythm: a bar per month, and a
   drag across them sets "from" and "to". Presets cover the common asks;
   the two selects are the keyboard and screen-reader way to the same
   state. */

import { useRef, useState } from "react";
import { monthLabel, yearOfMonth } from "@/lib/spatial/engine";
import { useWidth } from "./useWidth";
import "./viz.css";

export function PeriodBrush({ series, m0, from, to, onChange }: {
  series: number[]; m0: number; from: number; to: number; onChange: (from: number, to: number) => void;
}) {
  const [box, W] = useWidth<HTMLDivElement>(600);
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const n = Math.max(1, series.length);
  const H = 38;
  const max = Math.max(1, ...series);
  const bw = W / n;
  const mLast = m0 + n - 1;
  const at = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return m0;
    return m0 + Math.min(n - 1, Math.max(0, Math.floor(((clientX - r.left) / r.width) * n)));
  };
  const years: number[] = [];
  for (let m = m0; m <= mLast; m++) if (m % 12 === 0 || m === m0) years.push(m);
  const presets: { label: string; f: number; t: number }[] = [
    { label: "All", f: m0, t: mLast },
    { label: "Last 12 months", f: Math.max(m0, mLast - 11), t: mLast },
    ...[...new Set(Array.from({ length: n }, (_, k) => yearOfMonth(m0 + k)))].map((y) => {
      const f = Math.max(m0, (y - yearOfMonth(0)) * 12), t = Math.min(mLast, f - (f % 12) + 11);
      return { label: String(y), f, t };
    }),
  ];
  const isAll = from === m0 && to === mLast;

  return (
    <div className="vz-brush">
      <div className="vz-brush-presets" role="group" aria-label="Period">
        {presets.map((p) => (
          <button key={p.label} type="button" aria-pressed={from === p.f && to === p.t} className={from === p.f && to === p.t ? "is-on" : ""} onClick={() => onChange(p.f, p.t)}>{p.label}</button>
        ))}
      </div>
      <div ref={box} className="vz-brush-track">
        <svg
          ref={svg} width={W} height={H + 16} viewBox={`0 0 ${W} ${H + 16}`} aria-hidden
          onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); const m = at(e.clientX); setDrag(m); onChange(m, m); }}
          onPointerMove={(e) => { if (drag === null) return; const m = at(e.clientX); onChange(Math.min(drag, m), Math.max(drag, m)); }}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        >
          {series.map((v, k) => {
            const h = v ? Math.max(2, (v / max) * (H - 4)) : 1;
            const on = m0 + k >= from && m0 + k <= to;
            return <rect key={k} x={k * bw + 0.5} y={H - h} width={Math.max(1, bw - 1.5)} height={h} className={on ? "is-on" : ""} />;
          })}
          {!isAll && <rect x={(from - m0) * bw} y={0} width={(to - from + 1) * bw} height={H} className="vz-brush-sel" />}
          {years.map((m) => <text key={m} x={(m - m0) * bw + 1} y={H + 13} className="vz-brush-year">{yearOfMonth(m)}</text>)}
        </svg>
      </div>
      <div className="vz-brush-selects">
        <label><span className="sys-sr">From</span>
          <select value={from} onChange={(e) => { const f = Number(e.target.value); onChange(f, Math.max(f, to)); }}>
            {series.map((_, k) => <option key={k} value={m0 + k}>{monthLabel(m0 + k)}</option>)}
          </select>
        </label>
        <span aria-hidden>–</span>
        <label><span className="sys-sr">To</span>
          <select value={to} onChange={(e) => { const t = Number(e.target.value); onChange(Math.min(from, t), t); }}>
            {series.map((_, k) => <option key={k} value={m0 + k}>{monthLabel(m0 + k)}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
