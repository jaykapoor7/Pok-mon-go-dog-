import "./journal.css";
import { LAB, fmt, dateLabel, pct } from "../data";
import { Mast, Stamp, Tally, PenBar } from "./parts";

export function JournalNgo() {
  const t = LAB.totals;
  const ngo = LAB.records.veerakeralam.ngo ?? "The Pawsome People Project";
  const q = LAB.queue.slice().sort((a, b) => (a.status === "unverified" ? -1 : 0) - (b.status === "unverified" ? -1 : 0) || b.at.localeCompare(a.at));
  const months = LAB.cbe.monthly.slice(-24);
  const thisMonth = months[months.length - 1];
  const W = 640, H = 220, pad = 28;
  const max = Math.max(...months.map((m) => Math.max(m.cases, m.resolved)));
  const x = (i: number) => pad + (i * (W - pad * 2)) / (months.length - 1);
  const y = (v: number) => H - pad - (v / max) * (H - pad * 2);
  const line = (k: "cases" | "resolved") => months.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(m[k]).toFixed(1)}`).join("");
  const ticks = [0, Math.round(max / 2 / 10) * 10, Math.floor(max / 10) * 10];
  const causes = LAB.cbe.categories.slice(0, 8);
  const cmax = causes[0][1];
  return (
    <main className="fj">
      <Mast current="/lab/journal/ngo" right={ngo} />
      <div className="fj-spread">
        <section className="fj-page fj-ruled" aria-label="Open cases">
          <div className="fj-pagehead"><span>Duty log · {dateLabel(LAB.snapshot)}</span><span>p. 1</span></div>
          <h1 className="t" style={{ fontSize: "clamp(26px, 3vw, 40px)", lineHeight: "60px", marginTop: 30 }}>To do, from the record</h1>
          <p className="t" style={{ fontSize: 15, lineHeight: "30px", color: "var(--fj-grey)" }}>{fmt(t.inProgress)} cases in progress, {t.unverified} waiting to be verified. The {q.length} most recent, newest first.</p>
          <ul className="fj-checks" style={{ marginTop: 30 }}>
            {q.map((c) => (
              <li key={c.id}>
                <span><i className="fj-box" aria-hidden /></span>
                <span className="z">{dateLabel(c.at, "short")}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><b>{c.category}</b> <span className="z">· {c.zone.replace(/[,(].*$/, "").trim()}</span></span>
                {c.status === "unverified" ? <Stamp r={-4}>Verify</Stamp> : <span className="z" style={{ fontSize: 12.5 }}>in progress</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="fj-page fj-ruled" aria-label="The organisation's record">
          <div className="fj-pagehead"><span>{ngo} · Coimbatore</span><span>p. 2</span></div>
          <div className="fj-tallies">
            <div className="fj-tally"><span className="caps">To verify</span><Tally n={t.unverified} color="var(--fj-stamp)" /><span className="t">{t.unverified} reports</span></div>
            <div className="fj-tally"><span className="caps">Opened in {dateLabel(thisMonth.m + "-01", "month").split(" ")[0]}</span><Tally n={thisMonth.cases} /><span className="t">{thisMonth.cases} cases · {thisMonth.resolved} closed</span></div>
            <div className="fj-tally"><span className="caps">Cases closed, all time</span><b>{fmt(t.resolved)}</b></div>
            <div className="fj-tally"><span className="caps">Animals on record, Coimbatore</span><b>{fmt(t.coimbatore)}</b></div>
          </div>

          <h2 className="caps" style={{ marginTop: 30, lineHeight: "30px" }}>Programme, of {fmt(t.animals)} animals</h2>
          <ul className="fj-ledger">
            <li><span>Sterilised · ABC recorded</span><b>{fmt(t.sterilised)} · {pct(t.sterilised, t.animals)}%</b></li>
            <li style={{ display: "block" }}><PenBar of={t.animals} parts={[{ n: t.sterilised, color: "var(--fj-pen)" }]} /></li>
            <li><span>Vaccination recorded</span><b>{fmt(t.vaccinated)} · {pct(t.vaccinated, t.animals)}%</b></li>
            <li style={{ display: "block" }}><PenBar of={t.animals} parts={[{ n: t.vaccinated, color: "var(--fj-pen)" }]} /></li>
          </ul>
          <p className="t" style={{ fontSize: 12.5, lineHeight: "30px", color: "var(--fj-grey)" }}>Hatched: not recorded. That is not the same as not done.</p>

          <h2 className="caps" style={{ marginTop: 30, lineHeight: "30px" }}>Cases by month, {dateLabel(months[0].m + "-01", "month")} – {dateLabel(thisMonth.m + "-01", "month")}</h2>
          <div className="fj-graph fj-squared">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cases opened and closed by month">
              {ticks.map((v) => <text key={v} x={4} y={y(v) + 4}>{v}</text>)}
              <path d={line("resolved")} fill="none" stroke="var(--fj-ink)" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round" />
              <path d={line("cases")} fill="none" stroke="var(--fj-pen)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
              {months.map((m, i) => (i % 6 === 0 || i === months.length - 1) && <text key={m.m} x={x(i)} y={H - 8} textAnchor="middle">{dateLabel(m.m + "-01", "month")}</text>)}
              <circle cx={x(months.length - 1)} cy={y(thisMonth.cases)} r="4" fill="var(--fj-pen)" />
            </svg>
          </div>
          <p className="t" style={{ fontSize: 12.5, lineHeight: "30px", color: "var(--fj-grey)" }}>Pen: cases opened. Dotted: cases closed. {dateLabel(thisMonth.m + "-01", "month")} is to the {dateLabel(LAB.snapshot, "short")}.</p>

          <h2 className="caps" style={{ marginTop: 30, lineHeight: "30px" }}>What the cases were</h2>
          <ul className="fj-ledger">
            {causes.map(([k, n]) => (
              <li key={k} style={{ gridTemplateColumns: "minmax(0,1fr) 110px auto", alignItems: "center" }}>
                <span>{k}</span>
                <svg width="110" height="10" aria-hidden><path d={`M1 5 H${1 + (n / cmax) * 108}`} stroke={k === "Not recorded" ? "rgba(26,36,55,.3)" : "var(--fj-pen)"} strokeWidth="6" strokeDasharray={k === "Not recorded" ? "2 3" : undefined} /></svg>
                <b>{fmt(n)}</b>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
