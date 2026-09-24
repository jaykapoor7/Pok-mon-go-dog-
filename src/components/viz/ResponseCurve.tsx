"use client";

/* How fast field work starts: of the requests where the day is recorded,
   the share that had seen field work by each day after the request. A
   rising step, read left to right — "by the next day, most had" — with the
   requests whose day was never written down standing beside it, hatched,
   at their real size. */

import { HatchDef } from "@/components/system/Hatch";
import { useWidth } from "./useWidth";
import "./viz.css";

export function ResponseCurve({ days, unknown, marks = [0, 1, 3, 7], span = 30, idPrefix = "rc" }: {
  /** Days from request to first field action, recorded ones only. */
  days: number[]; unknown: number; marks?: number[]; span?: number; idPrefix?: string;
}) {
  const [box, W] = useWidth<HTMLDivElement>(640);
  const n = days.length, total = n + unknown;
  const H = 180, padL = 34, padB = 26, padT = 10;
  const uw = total ? Math.max(18, Math.min(90, (unknown / total) * 220)) : 0;
  const plotW = Math.max(120, W - padL - uw - 56);
  const x = (d: number) => padL + (Math.min(d, span) / span) * plotW;
  const y = (f: number) => padT + (1 - f) * (H - padT - padB);
  const sorted = [...days].sort((a, b) => a - b);
  const by = (d: number) => { let lo = 0, hi = sorted.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] <= d) lo = mid + 1; else hi = mid; } return n ? lo / n : 0; };
  let d = `M${x(0)} ${y(0)}`;
  for (let k = 0; k <= span; k++) d += `L${x(k)} ${y(k === 0 ? 0 : by(k - 1))}L${x(k)} ${y(by(k))}`;
  const hatch = `${idPrefix}-h`;
  const unkH = total ? (unknown / total) * (H - padT - padB) : 0;
  return (
    <div className="vz-resp" ref={box}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Of ${n} requests with a recorded day, ${Math.round(by(0) * 100)}% saw field work the same day and ${Math.round(by(1) * 100)}% by the next. ${unknown} requests have no recorded day.`}>
        <defs><HatchDef id={hatch} /></defs>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={padL} x2={padL + plotW} y1={y(f)} y2={y(f)} className="vz-grid" />
            <text x={padL - 6} y={y(f) + 3.5} className="vz-axis" textAnchor="end">{Math.round(f * 100)}%</text>
          </g>
        ))}
        <path d={`${d}L${x(span)} ${y(0)}Z`} className="vz-resp-fill" />
        <path d={d} className="vz-resp-line" />
        {marks.map((m) => (
          <g key={m}>
            <circle cx={x(m)} cy={y(by(m))} r="3.2" className="vz-resp-dot" />
            <text x={x(m) + 6} y={y(by(m)) + (m === 0 ? -6 : 13)} className="vz-resp-lab">{Math.round(by(m) * 100)}%{m === 0 ? " same day" : ` by day ${m}`}</text>
          </g>
        ))}
        {[0, 7, 14, 21, 30].map((t) => <text key={t} x={x(t)} y={H - 8} className="vz-axis" textAnchor="middle">{t === 30 ? "30+" : t}</text>)}
        {unknown > 0 && (
          <g transform={`translate(${padL + plotW + 44} 0)`}>
            <rect x={0} y={y(0) - unkH} width={uw} height={unkH} style={{ fill: `url(#${hatch})` }} className="vz-unk" />
            <text x={uw / 2} y={H - 8} className="vz-axis" textAnchor="middle">not recorded</text>
          </g>
        )}
      </svg>
    </div>
  );
}
