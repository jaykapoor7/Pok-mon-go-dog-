import Link from "next/link";
import "./atlas.css";
import { LAB, dateLabel, fmt, photo, shortId, daysBetween } from "../data";
import { Masthead, ContourSVG, cbePoints } from "./parts";
import { Veil } from "../Veil";

export function AtlasAnimal() {
  const r = LAB.records.rspuram;
  const [lng, lat] = r.localityCentroid ?? [76.95, 11.01];
  const loc = LAB.cbe.localities.find((l) => l.name.toLowerCase() === "rs puram");
  const reports = [...r.cases].sort((a, b) => (a.status === "in_progress" ? 1 : 0) - (b.status === "in_progress" ? 1 : 0));
  const open = daysBetween(r.firstSeen);
  const nearby = LAB.outcomes.filter((o) => /rs puram|r\.?s\.? puram/i.test(o.zone)).slice(0, 4);
  const ys = [44, 120, 196];
  return (
    <main className="la">
      <Masthead current="/lab/atlas/map" />
      <div className="la-page">
        <div className="la-title">
          <div>
            <span className="cap"><Link href="/lab/atlas/map">Atlas</Link> › Coimbatore › RS Puram › Record {shortId(r.id)}</span>
            <h1>Dog, RS Puram</h1>
            <p><span className="it">Reported three times on {dateLabel(r.firstSeen)}. Case in progress, day {open}.</span></p>
          </div>
          <div className="la-desk-cta">
            <button type="button" className="la-cta"><span className="dot" />Add a sighting of this dog</button>
          </div>
        </div>

        <div className="la-entry">
          <div>
            {r.photo && (
              <Veil className="la-veil" noteClass="la-veil-note" src={photo(r.photo, 520)} alt="Clinical photographs of the dog's facial wound, filed with the report"
                note="Clinical photograph, filed with the report. It shows an open wound on the dog's face." />
            )}
            <p className="la-veil-cap">Fig. — filed {dateLabel(r.firstSeen)} · kept closed until you choose to see it</p>
          </div>

          <div>
            <dl className="la-reg">
              <dt>Record</dt><dd><span className="mono">{shortId(r.id)}</span> · one identity for this animal</dd>
              <dt>Held by</dt><dd>{r.ngo}</dd>
              <dt>Where</dt><dd>RS Puram, Coimbatore <span className="it dim">— exact position withheld while injured</span></dd>
              <dt>Condition</dt><dd>Injured · maggot wound to the face</dd>
              <dt>Sterilisation</dt><dd><span className="la-open" />Not yet recorded</dd>
              <dt>Vaccination</dt><dd><span className="la-open" />Not yet recorded</dd>
              <dt>First recorded</dt><dd>{dateLabel(r.firstSeen)}</dd>
            </dl>

            <div className="la-conv">
              <h3>Three reports, <span className="it">one animal.</span></h3>
              <p>Three reports of the same dog arrived on one day. All three sit on one animal&apos;s record rather than three: one is being worked, two wait to be verified against it.</p>
              <svg viewBox="0 0 640 240" role="img" aria-label="Three reports joining one record">
                {reports.map((c, i) => (
                  <g key={i}>
                    <path className="draw" style={{ animationDelay: `${i * 260}ms` }} d={`M 200 ${ys[i]} C 330 ${ys[i]}, 330 120, 440 120`} fill="none" stroke="#0b1e3d" strokeWidth={1} />
                    <circle cx={188} cy={ys[i]} r={5} fill={c.status === "in_progress" ? "#0b1e3d" : "#efe7da"} stroke="#0b1e3d" strokeWidth={1.2} />
                    <text x={176} y={ys[i] - 2} textAnchor="end" fontSize={19} fill="#0b1e3d" fontFamily="var(--la-serif)">Report {i + 1}</text>
                    <text x={176} y={ys[i] + 18} textAnchor="end" fontSize={13} fill="#5c6a7f">{c.title} · {c.status === "in_progress" ? "in progress" : "unverified"}</text>
                  </g>
                ))}
                <path className="draw" style={{ animationDelay: "900ms" }} d="M 452 120 H 560" stroke="#0b1e3d" strokeWidth={1.6} fill="none" />
                <circle cx={446} cy={120} r={8} fill="#f05b40" />
                <text x={446} y={150} textAnchor="middle" fontSize={12} fill="#0b1e3d" letterSpacing="1.5">ONE RECORD</text>
                <rect x={560} y={106} width={78} height={28} fill="#0b1e3d" />
                <text x={599} y={124} textAnchor="middle" fontSize={11} fill="#efe7da" letterSpacing="1">CASE OPEN</text>
              </svg>
            </div>
          </div>

          <aside className="la-side">
            <figure>
              <span className="cap">Locality</span>
              <ContourSVG points={cbePoints()} box={LAB.cbe.box} width={320} height={320} mark={{ lng, lat, label: "RS Puram" }} levels={9} />
              <figcaption>The ring marks the locality, not the animal. Lines: the city&apos;s recorded care, Jan 2024 – Sep 2026.</figcaption>
            </figure>
            <div className="la-near">
              <span className="cap">Also on the record in RS Puram</span>
              <ul>
                <li><span>Animals recorded</span><small>{fmt(loc?.animals ?? 0)}</small></li>
                <li><span>Cases on record</span><small>{fmt(loc?.cases ?? 0)}</small></li>
                {nearby.map((o) => <li key={o.id}><span>{o.category} · {o.outcome}</span><small>{dateLabel(o.at, "short")}</small></li>)}
              </ul>
            </div>
          </aside>
        </div>
      </div>
      <div className="la-mobile-cta"><button type="button" className="la-cta"><span className="dot" />Add a sighting of this dog</button></div>
    </main>
  );
}
