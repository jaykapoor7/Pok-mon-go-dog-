"use client";

/* What happens to each kind of case. Every row is one condition from the
   rescue register: its volume, and the whole of its outcomes as one band,
   the unrecorded share hatched. Selecting a row shows the same condition
   year by year, so change and outcome are read together. */

import { useState } from "react";

type Row = { condition: string; total: number; by: { s: string; n: number }[] };
type Style = Record<string, { fill: string; hatch?: boolean; label: string }>;

export function ConditionExplorer({ rows, byYear, styles, years }: { rows: Row[]; byYear: Record<number, Row[]>; styles: Style; years: number[] }) {
  const [sel, setSel] = useState(rows[0].condition);
  const max = Math.max(...rows.map((r) => r.total));
  const band = (r: Row, h = 14) => {
    let x = 0;
    return (
      <svg viewBox={`0 0 1000 ${h}`} preserveAspectRatio="none" width="100%" height={h} aria-hidden style={{ display: "block" }}>
        <defs><pattern id={`ce${h}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" stroke="rgba(11,30,61,.4)" strokeWidth="1.6" /></pattern></defs>
        {r.by.map((b) => { const w = r.total ? (b.n / r.total) * 1000 : 0; const el = <rect key={b.s} x={x} width={Math.max(0, w - 1.5)} height={h} fill={styles[b.s].hatch ? `url(#ce${h})` : styles[b.s].fill} />; x += w; return el; })}
      </svg>
    );
  };
  const S = rows.find((r) => r.condition === sel)!;
  return (
    <div className="sx-ce">
      <table className="sx-ce-table">
        <thead><tr><th>Condition</th><th>Requests</th><th>What happened</th><th className="r">No action</th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const na = r.by.find((b) => b.s === "Closed, no action")?.n ?? 0;
            return (
              <tr key={r.condition} className={sel === r.condition ? "on" : ""} onClick={() => setSel(r.condition)} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") setSel(r.condition); }}>
                <td><b>{r.condition}</b></td>
                <td><span className="vol"><i style={{ width: `${(r.total / max) * 100}%` }} /><span className="m">{r.total.toLocaleString("en-IN")}</span></span></td>
                <td>{band(r)}</td>
                <td className="m r">{Math.round((na / r.total) * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <aside className="sx-ce-side" aria-live="polite">
        <span className="lbl">Selected</span>
        <h3>{S.condition}</h3>
        <p className="m dim">{S.total.toLocaleString("en-IN")} requests, 2024 – Sep 2026</p>
        <ol>
          {years.map((y) => {
            const r = byYear[y].find((x) => x.condition === sel);
            return (
              <li key={y}>
                <span className="m">{y}{y === 2026 ? " to Sep" : ""}</span>
                <b className="m">{r?.total ?? 0}</b>
                {r ? band(r, 12) : <span className="dim">none</span>}
              </li>
            );
          })}
        </ol>
        <ul className="sx-ce-key">{Object.entries(styles).map(([k, v]) => <li key={k}><i className={v.hatch ? "hatch" : ""} style={v.hatch ? { outline: "1px solid rgba(11,30,61,.3)" } : { background: v.fill }} />{v.label}</li>)}</ul>
      </aside>
    </div>
  );
}
