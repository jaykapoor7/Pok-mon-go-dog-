import Link from "next/link";
import "./sys.css";
import { LAB, fmt, dateLabel, shortId, daysBetween, photo, zoneAt } from "../data";
import type { Box } from "../geo";
import { Veil } from "../Veil";
import { Band, Band100, CellSVG, rampOf } from "./parts";
import { R, STATUSES, STATUS_STYLE, cells, distKm, matrixBy, triage } from "./sdata";

export function SystemCase() {
  const rs = LAB.records.rspuram;
  const q = LAB.queue.find((x) => x.dog === rs.id)!;
  const code = `SPC·${q.id.slice(0, 4).toUpperCase()}·${q.id.slice(4, 8).toUpperCase()}`;
  const day = daysBetween(q.at);
  const tri = triage(q.category);
  const lagWithin3 = Math.round(((R.lag.bins[0][1] + R.lag.bins[1][1]) / R.lag.withPlan) * 100);
  const maggot = matrixBy().find((m) => m.condition === "Maggot wound")!;
  const here = (rs.localityCentroid ?? [77.02, 11.02]) as [number, number];
  const nearby = LAB.queue.filter((x) => x.id !== q.id).map((x) => ({ x, z: zoneAt(x.zone) })).filter((o): o is { x: typeof q; z: [number, number] } => !!o.z && distKm(o.z, here) <= 1.6);
  const box: Box = [here[0] - 0.034, here[1] - 0.03, here[0] + 0.034, here[1] + 0.03];
  const local = cells().filter((c) => c.center[0] > box[0] - 0.008 && c.center[0] < box[2] + 0.008 && c.center[1] > box[1] - 0.008 && c.center[1] < box[3] + 0.008);
  const byKey = new Map(local.map((c) => [c.key, c]));
  const steps: { k: string; state: "done" | "part" | "now" | "miss" | "todo"; v: string }[] = [
    { k: "Reported", state: "done", v: `${rs.cases.length} reports · ${dateLabel(q.at, "short")}` },
    { k: "Verified", state: "part", v: `1 of ${rs.cases.length} verified` },
    { k: "Rescue date", state: "miss", v: "not recorded" },
    { k: "Attended", state: "todo", v: "—" },
    { k: "Treatment", state: "todo", v: "—" },
    { k: "Review", state: "todo", v: "—" },
    { k: "Outcome", state: "todo", v: "—" },
  ];
  return (
    <main className="sx sx-case">
      <Band current="/lab/system/case" crumbs={["India", "Coimbatore", "RS Puram", `Case ${code}`]} />

      <section className="sx-case-top" aria-label="Case">
        <div className="sx-case-code">
          <span className="lbl">Case record</span>
          <b className="m">{code}</b>
        </div>
        <div className="sx-case-title">
          <h1>{q.title}</h1>
          <p><span className="it">RS Puram, Coimbatore</span> · dog · record <Link href="/lab/system/animal" className="m care">{shortId(rs.id)}</Link></p>
        </div>
        <dl className="sx-case-state">
          <div className="hot"><dt>Triage</dt><dd>{tri.cls}</dd></div>
          <div><dt>Status</dt><dd>In progress</dd></div>
          <div className="hot"><dt>Open for</dt><dd className="m">{day} days</dd></div>
          <div className="nil"><dt>Assigned to</dt><dd><i className="blank hatch" />no one</dd></div>
        </dl>
      </section>

      <section className="sx-seq" aria-label="Operational sequence">
        <ol>
          {steps.map((s, i) => (
            <li key={s.k} className={s.state}>
              <i aria-hidden>{s.state === "done" ? "✓" : s.state === "miss" ? "!" : i + 1}</i>
              <span className="lbl">{s.k}</span>
              <b className={s.state === "miss" ? "need" : ""}>{s.v}</b>
            </li>
          ))}
        </ol>
        <p className="sx-seq-note"><b className="need">Stalled at the rescue date.</b> In the rescue register, {lagWithin3}% of requests had a rescue date within three days of the report (median {R.lag.median} day, n = {fmt(R.lag.withPlan)}). This case is at day {day} with none recorded.</p>
      </section>

      <div className="sx-case-grid">
        <section className="sx-case-next" aria-label="Next steps">
          <h2>Next, in order</h2>
          <ol>
            <li><i /><div><b>Set a rescue date</b><span>The step this case is waiting on.</span></div><button type="button" className="sx-btn">Set date</button></li>
            <li><i /><div><b>Assign a responder</b><span>No one holds this case.</span></div><button type="button" className="sx-btn quiet">Assign</button></li>
            <li><i /><div><b>Verify reports 1 and 2</b><span>Both describe the same wound, same place, same day.</span></div><button type="button" className="sx-btn quiet">Verify</button></li>
            <li><i /><div><b>Combine the visit</b><span>{nearby.length} other open {nearby.length === 1 ? "case lies" : "cases lie"} within 1.6 km.</span></div><button type="button" className="sx-btn quiet">Plan route</button></li>
          </ol>
        </section>

        <section className="sx-case-evid" aria-label="Evidence">
          <h2>Evidence</h2>
          <Veil className="sx-veil" noteClass="sx-veil-n" src={photo(rs.photo ?? "", 520)} alt="The reported dog, showing a wound on the face" note="Clinical photograph — an open wound. On the record for triage." />
          <dl>
            <div><dt>Photograph</dt><dd>1 · resident upload · {dateLabel(q.at)}</dd></div>
            <div><dt>Place</dt><dd>RS Puram · published to ~1 km</dd></div>
            <div><dt>Condition</dt><dd>Maggot wound, face</dd></div>
            <div className="nil"><dt>Wound size, age</dt><dd><i className="blank hatch" />not recorded</dd></div>
          </dl>
        </section>

        <section className="sx-case-reports" aria-label="Reports joined">
          <h2>{rs.cases.length} reports → 1 record</h2>
          <svg viewBox="0 0 320 170" width="100%" aria-hidden>
            {rs.cases.map((_, i) => <path key={i} d={`M8 ${24 + i * 56} C 120 ${24 + i * 56}, 150 85, 260 85`} fill="none" stroke="#2457ce" strokeWidth="2.5" />)}
            {rs.cases.map((_, i) => <circle key={`c${i}`} cx="8" cy={24 + i * 56} r="6" fill={rs.cases[i].status === "in_progress" ? "#f05b40" : "#faf7f1"} stroke="#0b1e3d" strokeWidth="1.5" />)}
            <circle cx="268" cy="85" r="14" fill="#2457ce" />
          </svg>
          <ol>
            {rs.cases.map((c, i) => <li key={i}><span className="m dim">Report {i + 1}</span><b>{c.title}</b><span className={c.status === "in_progress" ? "need" : "dim"}>{c.status === "in_progress" ? "opened this case" : "unverified"}</span></li>)}
          </ol>
          <p className="sx-source">Joined on locality, date and condition. The reporters are not shown publicly.</p>
        </section>

        <section className="sx-case-map" aria-label="Where">
          <h2>Where</h2>
          <CellSVG cells={local} box={box} width={320} height={290} pad={0}
            fill={(k) => { const c = byKey.get(k)!; return c.events ? rampOf(c.events, [1, 4, 10, 24, 50]) : "#ece5d8"; }} stroke="rgba(243,237,228,.9)"
            mark={[{ lng: here[0], lat: here[1], r: 10, color: "#f05b40" }, ...nearby.map((n) => ({ lng: n.z[0], lat: n.z[1], r: 6, color: "#0b1e3d" }))]} label="This case and open cases nearby" />
          <ul>{[...new Set(nearby.map((n) => n.x.zone))].map((z) => { const g = nearby.filter((n) => n.x.zone === z); return <li key={z}><span>{g.length > 1 ? `${g.length} × ` : ""}{g[0].x.category}</span><span className="m dim">{z} · oldest {Math.max(...g.map((n) => daysBetween(n.x.at)))} d</span></li>; })}</ul>
        </section>

        <section className="sx-case-comp" aria-label="Comparable cases">
          <h2>What happens to maggot wounds</h2>
          <p className="dim">{fmt(maggot.total)} maggot-wound requests in the rescue register, 2024 – 2026.</p>
          <Band100 height={18} parts={STATUSES.map((s) => ({ n: maggot.by.find((b) => b.s === s)?.n ?? 0, fill: STATUS_STYLE[s].fill, hatch: STATUS_STYLE[s].hatch, label: s }))} />
          <ul className="sx-comp-list">
            {maggot.by.filter((b) => b.n).map((b) => (
              <li key={b.s}><i style={{ background: STATUS_STYLE[b.s].fill }} /><span>{STATUS_STYLE[b.s].label}</span><b className="m">{fmt(b.n)}</b><span className="m dim">{Math.round((b.n / maggot.total) * 100)}%</span></li>
            ))}
          </ul>
        </section>

        <section className="sx-case-log" aria-label="Chronology">
          <h2>Chronology</h2>
          <ol>
            {rs.cases.map((c, i) => <li key={i}><span className="m">{dateLabel(c.at, "short")}</span><span>Report {i + 1} filed — {c.title.toLowerCase()}</span></li>)}
            <li><span className="m">{dateLabel(q.at, "short")}</span><span>Case opened from report 3 · triage {tri.cls.toLowerCase()}</span></li>
            <li className="gap"><span className="m">{day} days</span><span>No entry since</span></li>
            <li className="now"><span className="m">Today</span><span>Waiting on a rescue date</span></li>
          </ol>
        </section>
      </div>
    </main>
  );
}
