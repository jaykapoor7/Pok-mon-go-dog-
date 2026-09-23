import "./journal.css";
import { LAB, dateLabel, daysBetween, photo, shortId, fmt } from "../data";
import { projector } from "../geo";
import { Veil } from "../Veil";
import { Mast, Stamp } from "./parts";
import { Slips } from "./Slips";

export function JournalAnimal() {
  const r = LAB.records.rspuram;
  const open = r.cases.find((c) => c.status === "in_progress");
  const day = daysBetween(open?.at ?? r.firstSeen);
  const loc = LAB.cbe.localities.find((l) => l.name.toLowerCase() === r.zone.toLowerCase());
  const [cx, cy] = r.localityCentroid ?? [77.02, 11.02];
  // The locality, sketched from the animals recorded within 2.5 km of it.
  const box: [number, number, number, number] = [cx - 0.025, cy - 0.025, cx + 0.025, cy + 0.025];
  const { p, kmPx } = projector(box, 300, 300, 10);
  const pts = LAB.cbe.animals.filter(([lng, lat]) => lng > box[0] && lng < box[2] && lat > box[1] && lat < box[3]);
  const [mx, my] = p(cx, cy);
  const field = (k: string, v: React.ReactNode) => <div className="fj-field"><span className="k">{k}</span><span>{v}</span></div>;
  const blank = (why: string) => <><i className="blank" aria-hidden />{why}</>;
  return (
    <main className="fj">
      <Mast right={`Record ${shortId(r.id)}`} />
      <div className="fj-desk">
        <div className="fj-specimen">
          <div>
            <Veil className="fj-envelope" noteClass="fj-envelope-n" src={photo(r.photo ?? "", 520)} alt={`The dog reported in ${r.zone}, showing a wound on the face`}
              note="The photograph with this report shows an injury. It is kept in the envelope; it is on the record for the vet." action="Take out the photograph" />
            <p className="t" style={{ marginTop: 12, fontSize: 12.5, color: "var(--fj-grey)" }}>Filed by a resident, {dateLabel(r.firstSeen)} · the reporter is not published.</p>
          </div>
          <article className="fj-index">
            <div className="fj-index-top"><b>{r.name ?? "Unnamed dog"}</b><span className="t">No. {shortId(r.id)}</span></div>
            <div className="fj-index-body fj-ruled" style={{ ["--fj-mx" as string]: "0px" }}>
              {field("Locality", `${r.zone}, Coimbatore`)}
              {field("First seen", dateLabel(r.firstSeen))}
              {field("Last seen", dateLabel(r.lastSeen))}
              {field("Condition", <b style={{ color: "var(--fj-stamp)" }}>Injured — maggot wound</b>)}
              {field("Sterilised", blank("not recorded"))}
              {field("Vaccinated", blank("not recorded"))}
              {field("Case", `in progress · day ${day}`)}
              {field("Held by", r.ngo)}
            </div>
            <div className="fj-stamps-abs" aria-hidden>
              <Stamp r={-8}>Injured</Stamp>
              <Stamp r={5} blue small>3 reports · 1 record</Stamp>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <Slips slips={r.cases.map((c) => ({ title: c.title, status: c.status, at: dateLabel(c.at, "short") }))} />
            </div>
          </article>
        </div>

        <section className="fj-specimen" style={{ marginTop: 56 }} aria-label="The locality">
          <div className="fj-sheet fj-squared" style={{ ["--fj-sq" as string]: "20px", maxWidth: 420 }}>
            <svg viewBox="0 0 300 300" role="img" aria-label={`Animals recorded around ${r.zone}`}>
              {pts.map(([lng, lat, help], i) => { const [x, y] = p(lng, lat); return <circle key={i} cx={x} cy={y} r={help ? 3 : 1.8} fill={help ? "var(--fj-stamp)" : "var(--fj-ink)"} opacity={help ? 0.9 : 0.4} />; })}
              <circle cx={mx} cy={my} r={kmPx} fill="none" stroke="var(--fj-pen)" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
              <text x={mx + kmPx + 6} y={my - 6} style={{ fontFamily: "var(--fj-hand)", fontSize: 20, fill: "var(--fj-pen)" }}>{r.zone}</text>
              <path d={`M16 284 H${16 + kmPx}`} stroke="var(--fj-ink)" strokeWidth="1.5" />
              <text x={20 + kmPx} y="288" style={{ fontFamily: "var(--fj-type)", fontSize: 10, fill: "var(--fj-grey)" }}>1 km</text>
            </svg>
          </div>
          <div className="fj-ruled" style={{ ["--fj-mx" as string]: "0px", padding: "30px 0" }}>
            <h2 className="t" style={{ fontSize: 22, lineHeight: "30px" }}>Around {r.zone}, on the record</h2>
            {loc ? (
              <ul className="fj-ledger" style={{ marginTop: 30 }}>
                <li><span>Animals recorded under this locality</span><b>{fmt(loc.animals)}</b></li>
                <li><span>Cases opened</span><b>{fmt(loc.cases)}</b></li>
                <li><span>Cases open now</span><b>{fmt(loc.open)}</b></li>
                <li><span>Sterilisation recorded</span><b>{fmt(loc.sterilised)}</b></li>
                <li><span>Vaccination recorded</span><b>{fmt(loc.vaccinated)}</b></li>
              </ul>
            ) : <p className="t" style={{ marginTop: 30 }}>No locality summary published.</p>}
            <p className="t" style={{ marginTop: 30, fontSize: 13, lineHeight: "30px", color: "var(--fj-grey)" }}>Dots: {fmt(pts.length)} animals within 2.5 km; flame where help was asked. A blank line means not recorded — never zero.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
