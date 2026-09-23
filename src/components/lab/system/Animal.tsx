import Link from "next/link";
import "./sys.css";
import { LAB, fmt, dateLabel, shortId, daysBetween, veeraEntries } from "../data";
import { projector, type Box } from "../geo";
import { Band, CellSVG, rampOf } from "./parts";
import { Lanes } from "./Lanes";
import { veeraLanes } from "./Landing";
import { cells, distKm } from "./sdata";

export function SystemAnimal() {
  const r = LAB.records.veerakeralam;
  const v = veeraEntries();
  const lanes = veeraLanes();
  const c = r.cases[0];
  const vacc = v.entries.filter((e) => e.kind === "vacc");
  const lastDose = vacc[vacc.length - 1]?.date ?? r.lastSeen;
  const boosterDue = new Date(Date.parse(lastDose + "T00:00:00Z") + 365 * 86400000);
  const overdue = daysBetween(boosterDue.toISOString().slice(0, 10));
  const sinceLast = daysBetween(c?.resolved ?? r.lastSeen);
  const here: [number, number] = [r.lng ?? 76.91, r.lat ?? 11.02];
  const near = LAB.cbe.animals.filter(([lng, lat]) => distKm([lng, lat], here) <= 1);
  const nearEv = LAB.cbe.events.filter(([lng, lat]) => distKm([lng, lat], here) <= 1);
  const box: Box = [here[0] - 0.03, here[1] - 0.03, here[0] + 0.03, here[1] + 0.03];
  const local = cells().filter((x) => x.center[0] > box[0] - 0.01 && x.center[0] < box[2] + 0.01 && x.center[1] > box[1] - 0.01 && x.center[1] < box[3] + 0.01);
  const byKey = new Map(local.map((x) => [x.key, x]));
  const { kmPx } = projector(box, 320, 320, 0);
  const evidence: { k: string; v: string | null; ok: boolean }[] = [
    { k: "Photograph", v: null, ok: false },
    { k: "Place", v: "Anantha Nagar, Veerakeralam · to ~1 km", ok: true },
    { k: "Condition", v: "Maggot wound", ok: true },
    { k: "Sterilisation", v: `ABC recorded · ${dateLabel(v.start)}`, ok: true },
    { k: "Vaccination", v: `${vacc.length} doses · day ${vacc.map((x) => x.day).join(", ")}`, ok: true },
    { k: "Treatment", v: "1 entry", ok: true },
    { k: "Outcome", v: `Rescued · ${dateLabel(c?.resolved ?? r.lastSeen)}`, ok: true },
    { k: "Sex", v: null, ok: false },
    { k: "Ear notch", v: null, ok: false },
  ];
  const have = evidence.filter((e) => e.ok).length;
  return (
    <main className="sx sx-animal">
      <Band current="/lab/system/animal" crumbs={["India", "Coimbatore", "Veerakeralam", `Record ${shortId(r.id)}`]} />

      <section className="sx-id" aria-label="Identity">
        <figure className="sx-id-photo hatch">
          <figcaption><b>No photograph on this record</b><span>A photograph is how a field team recognises this dog next time.</span><button type="button" className="sx-btn">Add a photograph</button></figcaption>
        </figure>
        <div className="sx-id-main">
          <span className="lbl">Animal record · dog · StrayPaw register</span>
          <h1><span className="it">Unnamed dog of</span> Anantha Nagar</h1>
          <p className="sx-id-code m">{shortId(r.id)}<span>·{r.id.slice(9, 13)}</span></p>
          <dl className="sx-id-facts">
            <div><dt>Status</dt><dd>Case closed · <b className="care">rescued</b></dd></div>
            <div><dt>Sterilised</dt><dd>Yes · ABC</dd></div>
            <div><dt>Vaccinated</dt><dd>{vacc.length} doses</dd></div>
            <div><dt>Sex</dt><dd><i className="blank hatch" />not recorded</dd></div>
            <div><dt>First entry</dt><dd className="m">{dateLabel(v.start)}</dd></div>
            <div><dt>Last entry</dt><dd className="m">{dateLabel(c?.resolved ?? r.lastSeen)} <span className="dim">· {sinceLast} days ago</span></dd></div>
          </dl>
          <div className="sx-id-acts"><Link href={`/lab/system/spatial?animal=${r.id.slice(0, 8)}&view=3d`} className="sx-btn">View in city</Link><Link href={`/lab/system/spatial?animal=${r.id.slice(0, 8)}`} className="sx-btn quiet">View on map</Link></div>
          <ol className="sx-line sx-id-line" style={{ ["--n" as string]: 4 }} aria-label="Where this animal is on the line">
            <li className="sx-stn here"><i /><span className="lbl">Report</span><b>Field intake</b></li>
            <li className="sx-stn here"><i /><span className="lbl">Record</span><b className="m">{shortId(r.id)}</b></li>
            <li className="sx-stn here"><i /><span className="lbl">Case</span><b>Maggot wound</b></li>
            <li className="sx-stn here"><i /><span className="lbl">Outcome</span><b>Rescued, day 29</b></li>
          </ol>
        </div>
      </section>

      <section className="sx-due" aria-label="Unresolved">
        <div className="sx-due-h"><span className="lbl need">Open on this record</span><b className="num need">3</b></div>
        <ol>
          <li className="hot">
            <b>Annual rabies booster</b>
            <span>Due {dateLabel(boosterDue)} — a year after the last dose. No booster is recorded; <b className="need m">{overdue} days overdue</b>.</span>
            <svg viewBox="0 0 400 40" width="100%" aria-hidden className="sx-gapbar">
              <line x1="4" x2="396" y1="22" y2="22" stroke="rgba(11,30,61,.25)" />
              <rect x={4} y="17" width={(365 / (365 + overdue)) * 392} height="10" fill="#2457ce" opacity=".2" />
              <rect x={4 + (365 / (365 + overdue)) * 392} y="17" width={(overdue / (365 + overdue)) * 392} height="10" fill="#f05b40" />
              <circle cx="4" cy="22" r="5" fill="#2457ce" /><text x="4" y="10" className="t">last dose</text>
              <text x={4 + (365 / (365 + overdue)) * 392} y="10" textAnchor="middle" className="t">due</text>
              <text x="396" y="10" textAnchor="end" className="t">today</text>
            </svg>
            <button type="button" className="sx-btn">Schedule booster</button>
          </li>
          <li><b>Photograph</b><span>None on the record. The next sighting should add one.</span><button type="button" className="sx-btn quiet">Add</button></li>
          <li><b>Sex and ear notch</b><span>Not recorded at intake. Record them at the next visit.</span><button type="button" className="sx-btn quiet">Record</button></li>
        </ol>
      </section>

      <section className="sx-rec" aria-label="Care history">
        <div className="sx-rec-h"><h2>Care history</h2><span className="m dim">{v.entries.length} entries · {v.entries[v.entries.length - 1].day} days · every mark is an entry on the record</span></div>
        <Lanes entries={lanes.entries} span={lanes.span} ticks={lanes.ticks} />
        <div className="sx-key" style={{ marginTop: 14 }}>
          <span><i style={{ background: "#f05b40" }} />case open</span><span><i style={{ background: "#2457ce" }} />case closed · care recorded</span>
          <span><i style={{ border: "3px solid #2457ce", background: "transparent", borderRadius: 999, width: 12, height: 12 }} />sterilisation</span>
          <span><i style={{ background: "#0b1e3d", transform: "rotate(45deg)", width: 9, height: 9 }} />treatment</span>
        </div>
      </section>

      <div className="sx-rec-cols">
        <section className="sx-evid" aria-label="Evidence">
          <div className="sx-rec-h"><h2>Evidence</h2><span className="m dim">{have} of {evidence.length} recorded</span></div>
          <div className="sx-evid-meter" aria-hidden>{evidence.map((e) => <i key={e.k} className={e.ok ? "ok" : "hatch"} />)}</div>
          <dl>
            {evidence.map((e) => (
              <div key={e.k} className={e.ok ? "" : "no"}><dt>{e.k}</dt><dd>{e.v ?? <><i className="blank hatch" />not recorded</>}</dd></div>
            ))}
          </dl>
        </section>

        <section className="sx-where" aria-label="Where">
          <div className="sx-rec-h"><h2>Where</h2><span className="m dim">published to ~1 km</span></div>
          <div className="sx-where-map">
            <CellSVG cells={local} box={box} width={320} height={320} pad={0} fill={(k) => { const x = byKey.get(k)!; return x.events ? rampOf(x.events, [1, 4, 10, 24, 50]) : "#ece5d8"; }} stroke="rgba(243,237,228,.9)" mark={[{ lng: here[0], lat: here[1], r: kmPx, color: "#f05b40" }]} label="Cells around this animal" />
          </div>
          <dl className="sx-where-facts">
            <div><dt>Within 1 km</dt><dd className="m">{fmt(near.length)} animals</dd></div>
            <div><dt>Needing help</dt><dd className="m need">{near.filter((a) => a[2]).length}</dd></div>
            <div><dt>Field records</dt><dd className="m">{fmt(nearEv.length)}</dd></div>
            <div><dt>Sterilised</dt><dd className="m">{near.filter((a) => a[3]).length} <span className="dim">of {near.length}</span></dd></div>
          </dl>
          <Link href="/lab/system/coverage" className="sx-more">Coverage of this ward →</Link>
        </section>

        <section className="sx-who-rec" aria-label="Recorded by">
          <div className="sx-rec-h"><h2>Recorded by</h2></div>
          <ul>
            <li><span className="lbl">Field partner · Coimbatore</span><b>Intake, treatment, ABC, {vacc.length} vaccinations, outcome</b><span className="m dim">{v.entries.length} entries · {dateLabel(v.start, "short")} – {dateLabel(c?.resolved ?? r.lastSeen, "short")} {new Date(v.start).getUTCFullYear()}</span></li>
            <li><span className="lbl">Residents</span><b>No reports yet</b><span className="dim">A resident&apos;s sighting would join this record, not start a new one.</span></li>
          </ul>
        </section>
      </div>

      <section className="sx-register" aria-label="The register">
        <div className="sx-rec-h"><h2>The register</h2><span className="m dim">as entered, in order</span></div>
        <table>
          <thead><tr><th>Date</th><th>Day</th><th>Entry</th><th>Kind</th></tr></thead>
          <tbody>
            {v.entries.map((e, i) => (
              <tr key={i}><td className="m">{dateLabel(e.date)}</td><td className="m">{e.day}</td><td>{e.label}</td><td><span className={`k k-${e.kind}`}>{{ case: "Case", abc: "ABC", vacc: "Vaccination", treat: "Treatment", close: "Outcome" }[e.kind]}</span></td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
