"use client";

/* Two small matrices that read as tables first and pictures second.

   CareCalendar — kinds of care down the side, months across: a square per
   month whose depth says how much was recorded. Gaps are gaps.

   YearDots — places down the side, years across: a dot per year the place
   asked for help, sized by how many times. A full row is a place that
   calls every year: "repeat places", which this register can see, where
   "repeat dogs" it cannot yet. */

import { monthLabel, MONTHS, yearOfMonth } from "@/lib/spatial/engine";
import "./viz.css";

export function CareCalendar({ rows, m0, label }: {
  rows: { key: string; label: string; values: number[]; total: number }[]; m0: number; label: string;
}) {
  const n = Math.max(1, ...rows.map((r) => r.values.length));
  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  return (
    <div className="vz-cal" role="table" aria-label={label}>
      <div className="vz-cal-row is-head" role="row">
        <span role="columnheader" className="sys-sr">Care</span>
        <div className="vz-cal-cells" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          {Array.from({ length: n }, (_, k) => {
            const m = m0 + k, cal = ((m % 12) + 12) % 12;
            return <span key={k} role="columnheader" aria-label={monthLabel(m)}>{cal === 0 || k === 0 ? (cal === 0 ? yearOfMonth(m) : MONTHS[cal]) : ""}</span>;
          })}
        </div>
        <span role="columnheader" className="sys-sr">Total</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="vz-cal-row" role="row">
          <span role="rowheader">{r.label}</span>
          <div className="vz-cal-cells" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {Array.from({ length: n }, (_, k) => {
              const v = r.values[k] ?? 0;
              return <i key={k} role="cell" aria-label={`${monthLabel(m0 + k)}: ${v}`} style={{ opacity: v ? 0.18 + 0.82 * Math.sqrt(v / max) : 1 }} className={v ? "is-on" : ""} />;
            })}
          </div>
          <b role="cell" className="sys-mono">{r.total.toLocaleString("en-IN")}</b>
        </div>
      ))}
    </div>
  );
}

export function YearDots({ rows, years, onPick, label, few }: {
  rows: { key: string; name: string; years: Map<number, number>; total: number; noAction: number }[];
  years: number[]; onPick?: (key: string) => void; label: string;
  /** Formats a count, so a public screen can print "few". */
  few: (n: number) => string;
}) {
  const max = Math.max(1, ...rows.flatMap((r) => [...r.years.values()]));
  return (
    <table className="vz-years" aria-label={label}>
      <thead>
        <tr><th scope="col">Place</th>{years.map((y) => <th key={y} scope="col">{y}</th>)}<th scope="col">Requests</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{onPick ? <button type="button" onClick={() => onPick(r.key)}>{r.name}</button> : r.name}</th>
            {years.map((y) => {
              const v = r.years.get(y) ?? 0;
              const d = v ? 6 + 16 * Math.sqrt(v / max) : 0;
              return <td key={y}>{v ? <i style={{ width: d, height: d }} title={`${r.name}, ${y}: ${few(v)}`} /> : <em aria-label="none">·</em>}</td>;
            })}
            <td className="sys-mono">{few(r.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Courses of treatment: one row of pips per animal, a pip per expected
    session, filled for each session on record. */
export function CourseRows({ counts, expected = 4, label }: { counts: number[]; expected?: number; label: string }) {
  return (
    <div className="vz-course" role="img" aria-label={label}>
      {counts.map((c, i) => (
        <span key={i} className="vz-course-row">
          {Array.from({ length: Math.max(expected, c) }, (_, k) => <i key={k} className={k < c ? "is-on" : ""} />)}
        </span>
      ))}
    </div>
  );
}
