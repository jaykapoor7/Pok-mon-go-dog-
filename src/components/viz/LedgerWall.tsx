"use client";

/* ════════════════════════════════════════════════════════════════════
   The ledger wall: every request, one square each.

   A column per month, the squares stacked from the ground up in the order
   of what happened — closed after field work at the foot, still open at
   the top, "not recorded" hatched above that. It reads three ways at
   once: how much came in each month, what became of it, and how that has
   changed. Nothing is binned or smoothed; a square is a request somebody
   made, which is the point.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { HatchDef } from "@/components/system/Hatch";
import { monthLabel, MONTHS, yearOfMonth } from "@/lib/spatial/engine";
import { FATES, FATE_META, type Fate } from "@/lib/spatial/report";
import { useWidth } from "./useWidth";
import "./viz.css";

type Month = { m: number; total: number; by: Record<Fate, number> };

export function LedgerWall({ months, focus, peaks = [], maxHeight = 260, idPrefix = "lw", label }: {
  months: Month[];
  /** One fate brought forward; the rest recede. */
  focus: Fate | null;
  /** Calendar months (0–11) that are busier than usual. */
  peaks?: number[];
  maxHeight?: number;
  idPrefix?: string;
  label: string;
}) {
  const [box, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(1, months.length);
  const max = Math.max(1, ...months.map((x) => x.total));

  /* Pick the largest square that keeps the tallest month under maxHeight. */
  const lay = useMemo(() => {
    const colW = W / n;
    for (let p = 9; p >= 2; p--) {
      const per = Math.floor((colW - 1.5) / p);
      if (per < 1) continue;
      const rows = Math.ceil(max / per);
      if (rows * p <= maxHeight || p === 2) return { p, per, rows, colW, u: p > 3 ? p - 1 : p - 0.6 };
    }
    return { p: 2, per: 1, rows: max, colW, u: 1.4 };
  }, [W, n, max, maxHeight]);

  const H = lay.rows * lay.p;
  const axis = 30;
  const hatch = `${idPrefix}-hatch`;

  /* Two thousand squares are drawn once per layout, not once per hover. */
  const columns = useMemo(() => months.map((mo, k) => {
          const x0 = k * lay.colW + (lay.colW - lay.per * lay.p) / 2;
          const rects: React.ReactNode[] = [];
          let j = 0;
          for (const f of FATES) {
            const cnt = mo.by[f];
            for (let q = 0; q < cnt; q++, j++) {
              const row = Math.floor(j / lay.per), col = j % lay.per;
              const x = x0 + col * lay.p, y = H - (row + 1) * lay.p;
              const meta = FATE_META[f];
              rects.push(
                <rect
                  key={j} x={x} y={y} width={lay.u} height={lay.u}
                  style={{ fill: meta.hatch ? `url(#${hatch})` : meta.color, opacity: focus && focus !== f ? 0.13 : 1 }}
                  className={meta.hatch ? "is-hatch" : undefined}
                />,
              );
            }
          }
          const cal = ((mo.m % 12) + 12) % 12;
          return (
            <g key={mo.m} onPointerEnter={() => setHover(k)} onFocus={() => setHover(k)}>
              <rect x={k * lay.colW} y={0} width={lay.colW} height={H + axis} fill="transparent" />
              {rects}
              {peaks.includes(cal) && <line x1={k * lay.colW + 1} x2={(k + 1) * lay.colW - 1} y1={H + 4} y2={H + 4} className="vz-wall-peak" />}
              {(cal === 0 || k === 0) && (
                <text x={k * lay.colW + 1} y={H + 22} className="vz-wall-year">{cal === 0 ? yearOfMonth(mo.m) : `${MONTHS[cal]} ${yearOfMonth(mo.m)}`}</text>
              )}
            </g>
          );
        }), [months, focus, peaks, lay, H, hatch]);

  return (
    <div className="vz-wall" ref={box}>
      <svg width={W} height={H + axis} viewBox={`0 0 ${W} ${H + axis}`} role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        <defs><HatchDef id={hatch} size={Math.max(3, lay.p)} /></defs>
        {columns}
        {hover !== null && <rect x={hover * lay.colW} y={0} width={lay.colW} height={H} className="vz-wall-col" />}
      </svg>
      {hover !== null && months[hover] && (
        <div className="vz-tip" style={{ left: Math.min(W - 210, Math.max(0, hover * lay.colW - 90)), top: 0 }} role="status">
          <b>{monthLabel(months[hover].m, true)}</b>
          <span className="sys-mono">{months[hover].total.toLocaleString("en-IN")} requests</span>
          <ul>
            {FATES.filter((f) => months[hover].by[f]).map((f) => (
              <li key={f}><i className={FATE_META[f].hatch ? "is-hatch" : ""} style={{ background: FATE_META[f].hatch ? undefined : FATE_META[f].color }} />{FATE_META[f].short}<b className="sys-mono">{months[hover].by[f]}</b></li>
            ))}
          </ul>
        </div>
      )}
      <details className="vz-table">
        <summary>Read the wall as a table</summary>
        <div className="vz-table-scroll">
          <table>
            <thead><tr><th>Month</th><th>Requests</th>{FATES.map((f) => <th key={f}>{FATE_META[f].short}</th>)}</tr></thead>
            <tbody>{months.map((mo) => <tr key={mo.m}><td>{monthLabel(mo.m)}</td><td>{mo.total}</td>{FATES.map((f) => <td key={f}>{mo.by[f]}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
