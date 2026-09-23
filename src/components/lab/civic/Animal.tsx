import "./civic.css";
import { LAB, dateLabel, daysBetween, fmt, photo, shortId } from "../data";
import { Band, HexSVG, ramp } from "./parts";
import { Veil } from "../Veil";

export function CivicAnimal() {
  const r = LAB.records.rspuram;
  const [lng, lat] = r.localityCentroid ?? [76.95, 11.01];
  const loc = LAB.cbe.localities.find((l) => l.name.toLowerCase() === "rs puram");
  const reports = [...r.cases].sort((a, b) => (a.status === "in_progress" ? 1 : 0) - (b.status === "in_progress" ? 1 : 0));
  const day = daysBetween(r.firstSeen);
  const ys = [40, 110, 180];
  return (
    <main className="ci">
      <Band current="/lab/civic/map" code={`REC ${shortId(r.id).toUpperCase()}`} />
      <div className="ci-recband">
        <div>
          <span className="lbl">Animal record · Coimbatore · RS Puram</span>
          <h1>{shortId(r.id)}</h1>
          <p>Dog · injured · case open, day {day}</p>
        </div>
        <button type="button" className="ci-btn">Add a sighting of this animal →</button>
      </div>
      <div className="ci-rec">
        <div>
          {r.photo && (
            <Veil className="ci-veil" noteClass="ci-veil-n" src={photo(r.photo, 440)} alt="Clinical photographs of the dog's facial wound"
              note="Clinical photograph filed with the report. Shows an open wound on the face." action="View photograph" />
          )}
          <p className="lbl" style={{ marginTop: 10, color: "#6b7485" }}>Plate 1 of 1 · filed {dateLabel(r.firstSeen)}</p>
        </div>
        <div>
          <div className="ci-fields">
            <div className="ci-field alert"><span className="lbl">Condition</span><b>Injured</b></div>
            <div className="ci-field"><span className="lbl">Case</span><b>Open · day {day}</b></div>
            <div className="ci-field unknown"><span className="lbl">Sterilisation · ABC</span><b>Not recorded</b></div>
            <div className="ci-field unknown"><span className="lbl">Vaccination</span><b>Not recorded</b></div>
            <div className="ci-field"><span className="lbl">Locality</span><b>RS Puram</b></div>
            <div className="ci-field"><span className="lbl">Held by</span><b style={{ fontSize: 17 }}>{r.ngo}</b></div>
          </div>
          <div className="ci-junction">
            <h2>3 reports → 1 record</h2>
            <p>Three reports of this dog were filed on {dateLabel(r.firstSeen)}. They join one line, not three: one case is being worked, two reports wait to be verified against it.</p>
            <svg viewBox="0 0 640 220" role="img" aria-label="Three reports merging into one record">
              {reports.map((c, i) => (
                <g key={i}>
                  <path className="j-line" style={{ animationDelay: `${i * 200}ms` }} d={`M 150 ${ys[i]} H 260 Q 300 ${ys[i]} 320 ${(ys[i] + 110) / 2} T 380 110`} fill="none" stroke="#2457ce" strokeWidth={8} strokeLinejoin="round" />
                  <circle cx={150} cy={ys[i]} r={11} fill="#fff" stroke="#0b1e3d" strokeWidth={5} />
                  <text x={130} y={ys[i] - 2} textAnchor="end" fontSize={14} fontWeight={700} fill="#0b1e3d">REPORT {i + 1}</text>
                  <text x={130} y={ys[i] + 15} textAnchor="end" fontSize={11} fill="#6b7485">{c.status === "in_progress" ? "in progress" : "unverified"}</text>
                </g>
              ))}
              <path className="j-line" style={{ animationDelay: "700ms" }} d="M 380 110 H 560" stroke="#2457ce" strokeWidth={12} fill="none" />
              <rect x={364} y={94} width={32} height={32} fill="#fff" stroke="#0b1e3d" strokeWidth={5} />
              <text x={380} y={150} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b1e3d" letterSpacing={1}>ONE RECORD</text>
              <circle cx={572} cy={110} r={16} fill="#f05b40" stroke="#0b1e3d" strokeWidth={5} />
              <text x={572} y={150} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b1e3d" letterSpacing={1}>CASE OPEN</text>
            </svg>
          </div>
        </div>
        <div className="ci-side">
          <span className="lbl" style={{ color: "#6b7485" }}>Locality hexagon · 1.5 km</span>
          <HexSVG items={LAB.cbe.animals} ll={(a) => [a[0], a[1]]} box={[76.86, 10.9, 77.06, 11.1]} width={320} height={320} sizeKm={1.5}
            fill={(n) => ramp(n, 60)} highlight={[lng, lat]} />
          <p className="note">Flame: the hexagon holding RS Puram. The animal&apos;s own position is withheld while it is injured.</p>
          <h3>RS Puram on the register</h3>
          <div className="ci-kv">
            <div><span>Animals recorded</span><b>{fmt(loc?.animals ?? 0)}</b></div>
            <div><span>Cases on record</span><b>{fmt(loc?.cases ?? 0)}</b></div>
            <div><span>Sterilised · ABC</span><b>{fmt(loc?.sterilised ?? 0)}</b></div>
            <div><span>First recorded (this animal)</span><b>{dateLabel(r.firstSeen)}</b></div>
          </div>
        </div>
      </div>
    </main>
  );
}
