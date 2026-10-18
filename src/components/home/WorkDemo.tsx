"use client";

/* ════════════════════════════════════════════════════════════════════
   The NGO workspace in brief: Work · Animals · Map, the three places an
   organisation works from. The rows are sample data in the product's own
   layout; actions change the sample, never anything real.
   ════════════════════════════════════════════════════════════════════ */

import { useState } from "react";

type Row = { code: string; t: string; place: string; age: string; sev: "critical" | "high" | "normal"; who: string | null; next: string };
const START: Row[] = [
  { code: "SP-24117", t: "Leg wound, cannot bear weight", place: "Gandhipuram", age: "2h", sev: "critical", who: null, next: "Assign a team" },
  { code: "SP-24109", t: "Skin infection, needs medication", place: "RS Puram", age: "1d", sev: "high", who: "Asha", next: "Record treatment" },
  { code: "SP-24098", t: "Sterilisation, female, adult", place: "Ganapathy", age: "3d", sev: "normal", who: "Ravi", next: "Book surgery" },
  { code: "SP-24071", t: "Post-surgery recheck", place: "Peelamedu", age: "6d", sev: "normal", who: "Meena", next: "Recheck due today" },
];
const ANIMALS = [
  ["Bholu", "Male · adult", "Gandhipuram", "Sterilised", "Vaccinated"],
  ["SP-8K2D1", "Female · puppy", "RS Puram", "Not recorded", "Due"],
  ["Rani", "Female · adult", "Ganapathy", "Booked", "Vaccinated"],
  ["SP-3M7Q9", "Male · adult", "Peelamedu", "Sterilised", "Booster due"],
];
const TABS = ["Work", "Animals", "Map"] as const;

export type WorkTab = (typeof TABS)[number];
export function WorkDemo({ start = "Work" }: { start?: WorkTab }) {
  const [tab, setTab] = useState<WorkTab>(start);
  const [rows, setRows] = useState(START);
  const [sel, setSel] = useState(0);
  const r = rows[sel];
  const act = () => setRows((rs) => rs.map((x, i) => (i !== sel ? x : !x.who ? { ...x, who: "Field team", next: "Record treatment" } : x.next === "Record treatment" ? { ...x, next: "Follow-up in 3 days" } : x)));

  return (
    <div className="wd" aria-label="The NGO workspace, with sample data">
      <header className="wd-bar">
        <b>StrayPaw</b><span className="wd-ws">NGO</span>
        <nav role="tablist" aria-label="Workspace">{TABS.map((t) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</nav>
        <span className="wd-sample">Sample data</span>
      </header>
      {tab === "Work" && (
        <div className="wd-work">
          <div className="wd-day"><b>Today&rsquo;s work</b><span><i className="is-crit">1 critical</i> · 1 follow-up due · 1 nobody holds</span></div>
          <ol className="wd-queue">
            {rows.map((x, i) => (
              <li key={x.code}><button type="button" aria-pressed={i === sel} onClick={() => setSel(i)} className={`is-${x.sev}`}>
                <span className="wd-code">{x.code}</span><b>{x.t}</b><small>{x.place} · {x.age}</small><em>{x.who ?? "Unassigned"}</em>
              </button></li>
            ))}
          </ol>
          <aside className="wd-insp" aria-live="polite">
            <small className="wd-code">{r.code}</small>
            <b>{r.t}</b>
            <dl><div><dt>Place</dt><dd>{r.place}, by area</dd></div><div><dt>Held by</dt><dd>{r.who ?? "Nobody yet"}</dd></div><div><dt>Waiting</dt><dd>{r.age}</dd></div></dl>
            <div className="wd-next"><small>Next step</small><b>{r.next}</b><button type="button" className="h-btn" onClick={act}>{!r.who ? "Assign to field team" : r.next === "Record treatment" ? "Record treatment" : "Done for now"}</button></div>
          </aside>
        </div>
      )}
      {tab === "Animals" && (
        <div className="wd-table" role="region" aria-label="Animal register, sample" tabIndex={0}>
          <table><thead><tr><th>Animal</th><th>Recorded</th><th>Locality</th><th>Sterilisation</th><th>Vaccination</th></tr></thead>
            <tbody>{ANIMALS.map((a) => <tr key={a[0]}>{a.map((c, i) => <td key={i} className={i === 0 ? "is-id" : /not recorded/i.test(c) ? "is-unk" : ""}>{c}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      {tab === "Map" && (
        <div className="wd-map">
          <svg viewBox="0 0 400 220" role="img" aria-label="Open work by area, sample">
            {[[80, 70, 22, 3], [150, 120, 30, 5], [230, 80, 16, 1], [300, 140, 26, 4], [190, 175, 12, 1], [330, 60, 14, 2]].map(([x, y, s, n], i) => (
              <g key={i}><circle cx={x} cy={y} r={s} className="wd-bloom" />{i === 1 && <circle cx={x} cy={y} r={7} className="wd-hot" />}<text x={x} y={y + 4}>{n}</text></g>
            ))}
          </svg>
          <p>Open work by area. Areas, never addresses; a choice on the map narrows the queue.</p>
        </div>
      )}
    </div>
  );
}
