import Link from "next/link";
import "./sys.css";
import { LAB, fmt, daysBetween, zoneAt, dateLabel } from "../data";
import { Band, Band100 } from "./parts";
import { OpsBoard, type OpsItem, type OpsCell } from "./OpsBoard";
import { R, cells, isGap, triage, months, NOW_DAY, CBE_BOX } from "./sdata";

export function SystemNgo() {
  const t = LAB.totals;
  const items: OpsItem[] = LAB.queue.map((q) => {
    const z = zoneAt(q.zone); const tr = triage(q.category);
    return { id: q.id, code: `SPC·${q.id.slice(0, 4).toUpperCase()}`, cat: q.category, zone: q.zone.replace(/[,(].*$/, "").trim(), days: daysBetween(q.at), cls: tr.cls, rank: tr.rank, unverified: q.status === "unverified", lng: z?.[0] ?? null, lat: z?.[1] ?? null, recent: daysBetween(q.at) <= 7 };
  }).sort((a, b) => a.rank - b.rank || b.days - a.days);
  const all = cells();
  const opsCells: OpsCell[] = all.map((c) => ({ ring: c.ring, work30: 0, gap: isGap(c) }));
  const ev30 = LAB.cbe.events.filter((e) => e[2] > NOW_DAY - 30);
  // Count last-30-day work per cell by nearest centre.
  for (const e of ev30) { let bi = 0, bd = Infinity; all.forEach((c, i) => { const d = (c.center[0] - e[0]) ** 2 + (c.center[1] - e[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); opsCells[bi].work30++; }
  const crit = items.filter((i) => i.rank === 0);
  const oldest = items.reduce((a, i) => (i.days > a.days ? i : a), items[0]);
  const ms = months().slice(-24);
  const mx = Math.max(...ms.map((m) => Math.max(m.cases, m.resolved)));
  const gaps = all.filter(isGap);
  const gapBy = new Map<string, { cells: number; animals: number }>();
  gaps.forEach((g) => { const o = gapBy.get(g.locality) ?? { cells: 0, animals: 0 }; o.cells++; o.animals += g.animals; gapBy.set(g.locality, o); });
  const gapList = [...gapBy].sort((a, b) => b[1].animals - a[1].animals).slice(0, 7);
  const tvt = R.tvt.entries.map((n, i) => ({ n, miss: R.tvt.missed[i] })).sort((a, b) => b.n - a.n);
  const cm = ms[ms.length - 1];
  return (
    <main className="sx sx-ngo">
      <Band current="/lab/system/ngo" crumbs={["India", "Coimbatore", "Operations"]} />
      <section className="sx-head">
        <div>
          <span className="lbl">Operations · sample desk: Coimbatore · {dateLabel(LAB.snapshot)}</span>
          <h1>What is open, <span className="it">and where.</span></h1>
        </div>
        <div className="sx-head-tools"><Link href="/lab/system/case" className="sx-btn">Open the oldest critical case</Link></div>
      </section>

      <section className="sx-brief" aria-label="Today">
        <p>
          <b className="num need">{crit.length}</b><span>critical cases open — road accidents, maggot wounds, bites</span>
        </p>
        <p>
          <b className="num">{oldest.days}<small>d</small></b><span>oldest open case · {oldest.cat === "Not recorded" ? "condition not recorded" : oldest.cat.toLowerCase()}, {oldest.zone}</span>
        </p>
        <p>
          <b className="num">{fmt(t.inProgress)}</b><span>cases in progress on the whole register; {t.unverified} reports waiting to be verified</span>
        </p>
        <p>
          <b className="num">{R.tvt.open}</b><span>TVT courses mid-schedule · weekly doses due</span>
        </p>
      </section>

      <OpsBoard items={items} cells={opsCells} box={CBE_BOX} />

      <div className="sx-ngo-grid">
        <section className="sx-tvt" aria-label="TVT courses">
          <div className="sx-rec-h"><h2>Unfinished: TVT courses</h2><span className="m dim">{R.tvt.courses} courses · {R.tvt.open} open</span></div>
          <p className="sx-note">Transmissible venereal tumour is treated with weekly doses until it regresses. Each row is one course; each mark a dated entry. Missed weeks are drawn open; the register counts them but does not say which week.</p>
          <ol className="sx-dose-rows">
            {tvt.map((c, i) => (
              <li key={i}>
                <span className="m dim">{String(i + 1).padStart(2, "0")}</span>
                <span className="doses">{Array.from({ length: c.n }, (_, k) => <i key={k} className={k >= c.n - c.miss ? "miss" : ""} />)}</span>
                <span className="m">{c.n - c.miss}/{c.n}</span>
              </li>
            ))}
          </ol>
          <div className="sx-key"><span><i style={{ background: "#2457ce", borderRadius: 999, width: 10, height: 10 }} />dose recorded</span><span><i style={{ border: "2px solid #f05b40", borderRadius: 999, width: 10, height: 10 }} />missed</span></div>
        </section>

        <section className="sx-flow" aria-label="Opened and closed">
          <div className="sx-rec-h"><h2>Opened and closed, by month</h2><span className="m dim">{ms[0].m} – {cm.m}</span></div>
          <svg viewBox="0 -18 480 236" width="100%" role="img" aria-label="Cases opened and closed per month">
            <line x1="0" x2="480" y1="100" y2="100" stroke="#0b1e3d" strokeWidth="1" />
            {ms.map((m, i) => {
              const x = 6 + i * 19.6, ho = (m.cases / mx) * 92, hc = (m.resolved / mx) * 92;
              return (
                <g key={m.m}>
                  <rect x={x} y={100 - ho} width="12" height={ho} fill="#f05b40" opacity={i === ms.length - 1 ? 1 : 0.8} />
                  <rect x={x} y={101} width="12" height={hc} fill="#2457ce" opacity={i === ms.length - 1 ? 1 : 0.8} />
                </g>
              );
            })}
            <text x="0" y="-6" className="ax">opened ↑</text><text x="0" y="212" className="ax">closed ↓</text>
            <text x="480" y="-6" textAnchor="end" className="ax">peak {mx} a month</text>
          </svg>
          <p className="sx-note">This month so far: <b>{cm.cases}</b> opened, <b>{cm.resolved}</b> closed. Closing outpaced opening in {ms.filter((m) => m.resolved >= m.cases).length} of {ms.length} months.</p>
        </section>

        <section className="sx-follow" aria-label="Follow-up">
          <div className="sx-rec-h"><h2>Where cases go quiet</h2><span className="m dim">rescue register · {fmt(R.requests)} requests</span></div>
          <ul className="sx-follow-list">
            <li><span>Had a rescue date</span><b className="m">{Math.round((R.lag.withPlan / R.requests) * 100)}%</b><div><Band100 height={10} parts={[{ n: R.lag.withPlan, fill: "#2457ce" }, { n: R.requests - R.lag.withPlan, fill: "", hatch: true }]} /></div></li>
            <li><span>Had any follow-up entry</span><b className="m">{Math.round((R.chronology.withFollowup / R.requests) * 100)}%</b><div><Band100 height={10} parts={[{ n: R.chronology.withFollowup, fill: "#2457ce" }, { n: R.requests - R.chronology.withFollowup, fill: "", hatch: true }]} /></div></li>
            <li><span>Recorded an outcome note</span><b className="m">{Math.round(((R.fields.find((f) => f[0] === "Outcome note")?.[1] ?? 0) / R.requests) * 100)}%</b><div><Band100 height={10} parts={[{ n: R.fields.find((f) => f[0] === "Outcome note")?.[1] ?? 0, fill: "#2457ce" }, { n: R.requests - (R.fields.find((f) => f[0] === "Outcome note")?.[1] ?? 0), fill: "", hatch: true }]} /></div></li>
          </ul>
          <p className="sx-note">Hatched: nothing written. StrayPaw asks for the next entry at the moment it is due — a review date becomes a follow-up on the case, not a note in a cell.</p>
        </section>

        <section className="sx-gaps" aria-label="Gaps">
          <div className="sx-rec-h"><h2>Gaps: animals, no work in 12 months</h2><span className="m dim">{gaps.length} cells · {fmt(gaps.reduce((a, g) => a + g.animals, 0))} animals</span></div>
          <ol>
            {gapList.map(([name, g]) => (
              <li key={name}><b>{name}</b><span className="m">{g.animals} animals</span><span className="m dim">{g.cells} {g.cells === 1 ? "cell" : "cells"}</span></li>
            ))}
          </ol>
          <Link href="/lab/system/coverage" className="sx-more">Open ward coverage →</Link>
        </section>
      </div>
    </main>
  );
}
