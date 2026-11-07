"use client";

/* Research workbench: filter, chart and export the public monthly series.
   Everything here is an aggregate of public records; record-level and
   partner data stay behind the access request. */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Workbench as Data } from "./workbench";

const KIND_LABEL: Record<string, string> = { sterilisation: "Sterilisation", vaccination: "Vaccination", treatment: "Treatment", surgery: "Surgery", diagnostic: "Diagnostic", wound_care: "Wound care", rescue: "Rescue", chemotherapy: "Chemotherapy" };
const COLOURS = ["#2457ce", "#0f7b8a", "#c8791a", "#7a4fd8", "#1f9d55", "#b03a48", "#5b6476", "#8a6400"];
const STATUS_LABEL: Record<string, string> = { closed: "Closed", no_action: "Closed without action", other_ngo: "Passed to another organisation", in_progress: "In progress", not_attended: "Not attended", open: "Open", "not recorded": "Status not recorded" };
const status = (k: string) => STATUS_LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const label = (k: string) => KIND_LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
const mLabel = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }); };

function csv(rows: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}
function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Lines({ months, series, colours }: { months: string[]; series: { name: string; values: number[] }[]; colours: string[] }) {
  const W = 760, H = 240, P = { l: 44, r: 12, t: 12, b: 28 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const x = (i: number) => P.l + (months.length > 1 ? (i * (W - P.l - P.r)) / (months.length - 1) : 0);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const every = Math.max(1, Math.ceil(months.length / 8));
  return (
    <svg className="wb-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monthly records by series">
      {ticks.map((t) => <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#e6e9ee" /><text x={P.l - 6} y={y(t) + 4} textAnchor="end">{t.toLocaleString("en-IN")}</text></g>)}
      {months.map((m, i) => i % every === 0 && <text key={m} x={x(i)} y={H - 8} textAnchor="middle">{mLabel(m)}</text>)}
      {series.map((s, si) => <polyline key={s.name} fill="none" stroke={colours[si % colours.length]} strokeWidth={1.8} strokeLinejoin="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />)}
    </svg>
  );
}

export function Workbench({ data }: { data: Data }) {
  const care = data.care, cases = data.cases;
  const [view, setView] = useState<"care" | "cases">("care");
  const allMonths = care?.months ?? [];
  const [from, setFrom] = useState(() => allMonths[Math.max(0, allMonths.length - 36)] ?? "");
  const [to, setTo] = useState(() => allMonths[allMonths.length - 1] ?? "");
  const [kinds, setKinds] = useState<string[]>(() => (care?.kinds ?? []).filter((k) => ["sterilisation", "vaccination", "treatment"].includes(k)));
  const caseMonths = cases?.months ?? [];
  const [cFrom, setCFrom] = useState(() => caseMonths[0] ?? "");
  const [cTo, setCTo] = useState(() => caseMonths[caseMonths.length - 1] ?? "");
  const [city, setCity] = useState("all");

  const careView = useMemo(() => {
    if (!care) return null;
    const i0 = Math.max(0, care.months.indexOf(from)), i1 = care.months.indexOf(to) < 0 ? care.months.length - 1 : care.months.indexOf(to);
    const months = care.months.slice(i0, i1 + 1);
    const series = kinds.map((k) => ({ name: k, values: care.series[k].slice(i0, i1 + 1) }));
    return { months, series, totals: series.map((s) => ({ name: s.name, total: s.values.reduce((a, b) => a + b, 0) })) };
  }, [care, from, to, kinds]);

  const caseView = useMemo(() => {
    if (!cases) return null;
    const rows = cases.rows.filter((r) => r.month >= cFrom && r.month <= cTo && (city === "all" || r.city === city));
    const i0 = Math.max(0, cases.months.indexOf(cFrom)), i1 = cases.months.indexOf(cTo) < 0 ? cases.months.length - 1 : cases.months.indexOf(cTo);
    const months = cases.months.slice(i0, i1 + 1);
    const byStatus = new Map<string, number[]>();
    for (const r of rows) { const a = byStatus.get(r.status) ?? months.map(() => 0); a[months.indexOf(r.month)] += r.n; byStatus.set(r.status, a); }
    const n = rows.reduce((a, r) => a + r.n, 0), known = rows.reduce((a, r) => a + r.actedKnown, 0), fast = rows.reduce((a, r) => a + r.actedWithin2d, 0);
    const fuDone = rows.reduce((a, r) => a + r.fuDone, 0), fuMissed = rows.reduce((a, r) => a + r.fuMissed, 0);
    const byCondition = new Map<string, number>(); for (const r of rows) byCondition.set(r.condition, (byCondition.get(r.condition) ?? 0) + r.n);
    return { rows, months, series: [...byStatus].map(([name, values]) => ({ name, values })), n, known, fast, fuDone, fuMissed, conditions: [...byCondition].sort((a, b) => b[1] - a[1]).slice(0, 8) };
  }, [cases, cFrom, cTo, city]);

  return (
    <div className="wb">
      <div className="wb-tabs" role="tablist" aria-label="Series">
        <button role="tab" aria-selected={view === "care"} onClick={() => setView("care")}>Recorded interventions</button>
        <button role="tab" aria-selected={view === "cases"} onClick={() => setView("cases")}>Requests for help</button>
      </div>

      {view === "care" && care && care.total === 0 && <p className="wb-empty">No public intervention records yet. Series appear here once organisations publish their records.</p>}
      {view === "care" && (care && care.total > 0 && careView ? (
        <section className="wb-panel" aria-label="Recorded interventions by month">
          <div className="wb-filters">
            <label><span>From</span><select value={from} onChange={(e) => setFrom(e.target.value)}>{care.months.map((m) => <option key={m} value={m}>{mLabel(m)}</option>)}</select></label>
            <label><span>To</span><select value={to} onChange={(e) => setTo(e.target.value)}>{care.months.filter((m) => m >= from).map((m) => <option key={m} value={m}>{mLabel(m)}</option>)}</select></label>
            <fieldset><legend>Interventions</legend>{care.kinds.map((k) => <label key={k} className="wb-chip"><input type="checkbox" checked={kinds.includes(k)} onChange={(e) => setKinds((v) => e.target.checked ? [...v, k] : v.filter((x) => x !== k))} />{label(k)}</label>)}</fieldset>
          </div>
          {careView.series.length ? <>
            <Lines months={careView.months} series={careView.series} colours={COLOURS} />
            <ul className="wb-legend">{careView.totals.map((t, i) => <li key={t.name}><i style={{ background: COLOURS[i % COLOURS.length] }} />{label(t.name)} <b>{t.total.toLocaleString("en-IN")}</b></li>)}</ul>
          </> : <p className="wb-empty">Choose at least one intervention.</p>}
          <div className="wb-act">
            <button className="s4-btn is-line" onClick={() => download(`straypaw-interventions-${from}-to-${to}.csv`, csv([["month", ...careView.series.map((s) => s.name)], ...careView.months.map((m, i) => [m, ...careView.series.map((s) => s.values[i])])]))}><Download size={15} aria-hidden /> Download this series (CSV)</button>
            <p>{care.total.toLocaleString("en-IN")} public care records{care.undated ? `, ${care.undated.toLocaleString("en-IN")} without a date (left out)` : ""}{care.complete ? "" : ". The read was cut short; figures are a lower bound"}.</p>
          </div>
        </section>
      ) : !care && <p className="wb-empty" role="alert">The public care series could not be read just now. Nothing is shown rather than a zero.</p>)}

      {view === "cases" && cases && cases.total === 0 && <p className="wb-empty">No public request records yet.</p>}
      {view === "cases" && (cases && cases.total > 0 && caseView ? (
        <section className="wb-panel" aria-label="Requests for help by month">
          <div className="wb-filters">
            <label><span>From</span><select value={cFrom} onChange={(e) => setCFrom(e.target.value)}>{cases.months.map((m) => <option key={m} value={m}>{mLabel(m)}</option>)}</select></label>
            <label><span>To</span><select value={cTo} onChange={(e) => setCTo(e.target.value)}>{cases.months.filter((m) => m >= cFrom).map((m) => <option key={m} value={m}>{mLabel(m)}</option>)}</select></label>
            <label><span>City</span><select value={city} onChange={(e) => setCity(e.target.value)}><option value="all">All cities</option>{cases.cities.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          </div>
          <dl className="wb-stats">
            <div><dt>Requests</dt><dd>{caseView.n.toLocaleString("en-IN")}</dd></div>
            <div><dt>First action within 2 days</dt><dd>{caseView.known ? `${Math.round((100 * caseView.fast) / caseView.known)}%` : "not recorded"}</dd><small>of {caseView.known.toLocaleString("en-IN")} with a recorded first action</small></div>
            <div><dt>Follow-ups done</dt><dd>{caseView.fuDone.toLocaleString("en-IN")}</dd><small>{caseView.fuMissed.toLocaleString("en-IN")} missed</small></div>
          </dl>
          {caseView.series.length ? <>
            <Lines months={caseView.months} series={caseView.series} colours={COLOURS} />
            <ul className="wb-legend">{caseView.series.map((s, i) => <li key={s.name}><i style={{ background: COLOURS[i % COLOURS.length] }} />{status(s.name)} <b>{s.values.reduce((a, b) => a + b, 0).toLocaleString("en-IN")}</b></li>)}</ul>
          </> : <p className="wb-empty">No requests in this period.</p>}
          {caseView.conditions.length > 0 && <div className="wb-table-wrap"><table className="wb-table"><thead><tr><th>Condition recorded</th><th>Requests</th><th>Share</th></tr></thead><tbody>{caseView.conditions.map(([c, n]) => <tr key={c}><td>{c}</td><td>{n.toLocaleString("en-IN")}</td><td>{Math.round((100 * n) / Math.max(1, caseView.n))}%</td></tr>)}</tbody></table></div>}
          <div className="wb-act">
            <button className="s4-btn is-line" onClick={() => download(`straypaw-requests-${city === "all" ? "all-cities" : city}-${cFrom}-to-${cTo}.csv`, csv([["month", "city", "condition", "status", "source", "requests", "first_action_known", "first_action_within_2_days", "followups_done", "followups_missed"], ...caseView.rows.map((r) => [r.month, r.city, r.condition, r.status, r.source, r.n, r.actedKnown, r.actedWithin2d, r.fuDone, r.fuMissed])]))}><Download size={15} aria-hidden /> Download this table (CSV)</button>
            <p>{cases.total.toLocaleString("en-IN")} public request records{cases.undated ? `, ${cases.undated.toLocaleString("en-IN")} without a date (left out)` : ""}{cases.complete ? "" : ". The read was cut short; figures are a lower bound"}.</p>
          </div>
        </section>
      ) : !cases && <p className="wb-empty" role="alert">The public request series could not be read just now. Nothing is shown rather than a zero.</p>)}

      <section className="wb-method" aria-labelledby="wb-m">
        <h2 id="wb-m">Method and limits</h2>
        <ul>
          <li><b>Counts are of records, not animals in a place.</b> There is no population denominator in these series, so they cannot show coverage. A coverage estimate needs a census, unique identification and a boundary.</li>
          <li><b>Most records are imported historical registers</b> from partner organisations, kept as they were supplied. They are not live field activity, and StrayPaw has not independently verified each one.</li>
          <li><b>Intervention records carry no place</b> in the public view, by design. Requests carry a city where one was recorded; others appear as &ldquo;Place not recorded&rdquo;.</li>
          <li><b>A gap is a gap.</b> A month with no records means nothing was recorded, not that nothing happened. Undated records are counted above and left out of the series.</li>
          <li>Downloads are aggregates of public records. Record-level and partner data are available only under an agreed protocol: <Link href="/research/access">request access</Link>.</li>
        </ul>
        <p className="wb-built">Built {new Date(data.builtAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })} IST from the public views; refreshed hourly.</p>
      </section>
    </div>
  );
}
