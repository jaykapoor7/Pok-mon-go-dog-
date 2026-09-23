import Link from "next/link";
import "./civic.css";
import { LAB, fmt, dateLabel, photo, shortId, veeraEntries } from "../data";
import { hexbin, projector } from "../geo";
import { Band } from "./parts";
import { Machine, type MItem, type MHex } from "./Machine";

function machineData() {
  const delhi = LAB.sightings.filter((s) => s.city === "Delhi");
  const box: [number, number, number, number] = [77.03, 28.49, 77.33, 28.77];
  const hx = hexbin(delhi, (s) => [s.lng, s.lat], 28.6, 1.6);
  const { p } = projector(box, 200, 200, 6);
  const hexes: MHex[] = hx.map((h) => ({ key: h.key, points: h.ring.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(",")).join(" ") }));
  const keyOf = new Map(hx.flatMap((h) => h.items.map((s) => [s.id, h.key] as const)));
  const picks = ["89fd89e1", "6c2067f1", "58b60f89", "bd746113", "b70a2fc4", "d811de7b", "8cc8bdf7", "484be161", "c181f740", "ba4d195a"];
  const items: MItem[] = picks.map((id) => delhi.find((s) => s.id.startsWith(id))).filter(Boolean).map((s) => ({
    id: s!.id, img: photo(s!.photo, 110), zone: s!.zone, at: `${dateLabel(s!.at)} · ${s!.at.slice(11, 16)}`, record: shortId(s!.dog), status: s!.status, hex: keyOf.get(s!.id) ?? "",
  }));
  return { items, hexes };
}

export function CivicLanding() {
  const t = LAB.totals;
  const m = machineData();
  const v = veeraEntries();
  const vr = LAB.records.veerakeralam;
  let vaccN = 0;
  return (
    <main className="ci">
      <Band current="/lab/civic/landing" code="REGISTER OPEN · 23 SEP 2026" />
      <div className="ci-sub"><span className="lbl">Public register of street animals · India</span><span className="lbl mono">{fmt(t.animals)} records · {fmt(t.localities)} localities</span></div>

      <section className="ci-hero" aria-label="Introduction">
        <h1><span>Every stray</span><span>animal.</span></h1>
        <div className="ci-verbs">
          <div className="ci-verb"><h2>Seen.</h2><b>{fmt(t.animals)}</b><p>animals with one permanent record each, whoever reported them</p></div>
          <div className="ci-verb"><h2>Tracked.</h2><b>{fmt(t.fieldEvents)}</b><p>field records filed against those animals: every treatment, every visit</p></div>
          <div className="ci-verb"><h2 className="blue">Cared for.</h2><b>{fmt(t.resolved)}</b><p>cases carried through to a recorded outcome</p></div>
        </div>
      </section>

      <Machine items={m.items} hexes={m.hexes} />
      <div className="ci-cta-row">
        <Link href="/lab/civic/home" className="ci-btn">Report an animal <span className="arr">→</span></Link>
        <Link href="/lab/civic/map" className="ci-btn ghost">Open the register <span className="arr">→</span></Link>
        <Link href="/lab/civic/ngo" className="ci-btn ghost">For organisations and municipalities <span className="arr">→</span></Link>
      </div>

      <section className="ci-line-sec" aria-label="How the register works">
        <div className="ci-sec-h">
          <span className="num">02</span>
          <h2>One line, four stations.</h2>
          <p>Every animal travels the same line whoever meets it: a resident, a feeder, a field team. The figures are the register today.</p>
        </div>
        <ol className="ci-line">
          <li className="ci-stn"><i /><span className="lbl">Report</span><b>{fmt(t.publicReports)}</b><p>public reports from residents, with a photograph and a location</p><span className="sub">+ field intakes by organisations</span></li>
          <li className="ci-stn"><i /><span className="lbl">Record</span><b>{fmt(t.animals)}</b><p>animals, each with one identity that every later report joins</p><span className="sub">{fmt(t.localities)} localities</span></li>
          <li className="ci-stn"><i /><span className="lbl">Case</span><b>{fmt(t.cases)}</b><p>cases opened when an animal needs something done</p><span className="sub">{fmt(t.inProgress)} in progress now</span></li>
          <li className="ci-stn"><i /><span className="lbl">Outcome</span><b>{fmt(t.resolved)}</b><p>cases closed with the outcome written down</p><span className="sub">{fmt(t.sterilised)} animals sterilised · ABC</span></li>
        </ol>

        <div className="ci-form">
          <div className="ci-form-h"><span className="lbl">Form 07</span><b>Animal medical record · worked example</b><span className="lbl mono">REC {shortId(vr.id)}</span></div>
          <table>
            <thead><tr><th>Date</th><th>Day</th><th>Entry</th><th>Programme</th></tr></thead>
            <tbody>
              {v.entries.map((e, i) => {
                const n = e.kind === "vacc" ? ++vaccN : 0;
                return (
                  <tr key={i} className={e.kind === "abc" ? "abc" : ""}>
                    <td className="mono">{dateLabel(e.date)}</td>
                    <td className="mono">D{e.day}</td>
                    <td>{e.kind === "vacc" ? `Vaccination, dose ${n}` : e.label}</td>
                    <td>{e.kind === "abc" ? <span className="tag">ABC</span> : e.kind === "vacc" ? <span className="tag o">Vaccination</span> : e.kind === "case" ? <span className="tag f">Case</span> : e.kind === "close" ? <span className="tag">Closed</span> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="ci-form-f">{v.place}, Coimbatore · held by {vr.ngo} · vaccinations on days 0, 4, 8, 16, 29 follow the spacing of an anti-rabies (ARV) schedule · every row is the organisation&apos;s own entry</div>
        </div>
      </section>
    </main>
  );
}
