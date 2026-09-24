"use client";

/* ════════════════════════════════════════════════════════════════════
   Every request, a square.

   Each square is one call for help on the register, grouped by what was
   wrong and coloured by what became of it. Nothing is summarised away:
   the 324 requests whose condition nobody wrote down are a row of their
   own, and a request whose status was never entered is hatched.

   Choosing an outcome in the legend isolates it across every row, so
   "which problems most often end without field action?" is one tap.
   ════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { HatchDef } from "@/components/system/Hatch";
import { CONDITION_GROUP, STATUS_META, type Condition, type StatusClass } from "@/lib/register/taxonomy";

const ORDER: StatusClass[] = ["closed", "other_ngo", "in_progress", "open", "no_action", "not_attended", "unknown"];
const COLOR: Record<StatusClass, string> = {
  closed: "var(--sp-st-closed)",
  other_ngo: "var(--sp-st-other)",
  in_progress: "var(--sp-st-progress)",
  open: "var(--sp-st-open)",
  no_action: "var(--sp-st-noaction)",
  not_attended: "var(--sp-st-unattended)",
  unknown: "url(#ld-units-hatch)",
};

type Row = { condition: Condition; total: number; by: Record<StatusClass, number> };

export function EveryRequest({ rows }: { rows: Row[] }) {
  const [only, setOnly] = useState<StatusClass | null>(null);
  const grouped = useMemo(() => {
    const m = new Map<string, { label: string; total: number; by: Record<StatusClass, number> }>();
    for (const r of rows) {
      const g = CONDITION_GROUP[r.condition] ?? "Other";
      const v = m.get(g) ?? { label: g, total: 0, by: Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<StatusClass, number> };
      v.total += r.total;
      for (const s of ORDER) v.by[s] += r.by[s] ?? 0;
      m.set(g, v);
    }
    return [...m.values()].sort((a, b) => (a.label === "Not recorded" ? 1 : 0) - (b.label === "Not recorded" ? 1 : 0) || (a.label === "Other" ? 1 : 0) - (b.label === "Other" ? 1 : 0) || b.total - a.total);
  }, [rows]);
  const totals = useMemo(() => {
    const t = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<StatusClass, number>;
    for (const g of grouped) for (const s of ORDER) t[s] += g.by[s];
    return t;
  }, [grouped]);
  const all = grouped.reduce((a, g) => a + g.total, 0);
  const PER = 50, U = 8, G = 2;

  return (
    <div className="ld-units">
      <div className="ld-units-legend" role="group" aria-label="Show one outcome">
        <button type="button" aria-pressed={only === null} onClick={() => setOnly(null)} className={only === null ? "is-on" : ""}>
          All outcomes <b className="sys-mono">{all.toLocaleString("en-IN")}</b>
        </button>
        {ORDER.filter((s) => totals[s] > 0).map((s) => (
          <button key={s} type="button" aria-pressed={only === s} onClick={() => setOnly(only === s ? null : s)} className={only === s ? "is-on" : ""}>
            <i className={s === "unknown" ? "is-hatch" : ""} style={{ background: s === "unknown" ? undefined : COLOR[s] }} aria-hidden />
            {STATUS_META[s].short} <b className="sys-mono">{totals[s].toLocaleString("en-IN")}</b>
          </button>
        ))}
      </div>
      <svg width="0" height="0" className="sys-sr" aria-hidden><defs><HatchDef id="ld-units-hatch" size={4} /></defs></svg>
      <ol className="ld-units-rows">
        {grouped.map((g) => {
          const lines = Math.max(1, Math.ceil(g.total / PER));
          const width = PER * (U + G) - G;
          const height = lines * (U + G) - G;
          let k = 0;
          const squares: { x: number; y: number; s: StatusClass }[] = [];
          for (const s of ORDER) for (let i = 0; i < g.by[s]; i++, k++) squares.push({ x: (k % PER) * (U + G), y: Math.floor(k / PER) * (U + G), s });
          const na = g.by.no_action + g.by.not_attended;
          return (
            <li key={g.label} className={g.label === "Not recorded" ? "is-unknown" : ""}>
              <div className="ld-units-label">
                <b>{g.label === "Not recorded" ? "Condition not recorded" : g.label}</b>
                <span className="sys-mono">{g.total.toLocaleString("en-IN")}</span>
                {na > 0 && <small>{Math.round((na / g.total) * 100)}% closed without field action</small>}
              </div>
              <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${g.label}: ${g.total} requests. ${ORDER.filter((s) => g.by[s]).map((s) => `${g.by[s]} ${STATUS_META[s].short.toLowerCase()}`).join(", ")}`} className="ld-units-grid">
                {squares.map((q, i) => (
                  <rect key={i} x={q.x} y={q.y} width={U} height={U} rx={1}
                    style={{ fill: COLOR[q.s], opacity: only && only !== q.s ? 0.12 : 1 }}
                    className={q.s === "unknown" ? "is-hatch" : ""} />
                ))}
              </svg>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
