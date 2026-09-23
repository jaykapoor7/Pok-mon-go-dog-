import Link from "next/link";
import "./sys.css";
import { LAB, fmt, dateLabel, photo, shortId, featured, veeraEntries, zoneAt } from "../data";
import { projector, type Box } from "../geo";
import { IndiaLocator } from "../India";
import { Band, CellSVG, RAMP, rampOf } from "./parts";
import { HeroCells } from "./HeroCells";
import { LineStory } from "./LineStory";
import { Lanes, type LaneEntry } from "./Lanes";
import { R, cells, CBE_BOX, matrixBy, distKm } from "./sdata";

export function veeraLanes(): { entries: LaneEntry[]; span: number; ticks: { day: number; label: string }[] } {
  const v = veeraEntries();
  const entries: LaneEntry[] = v.entries.map((e) => ({ day: e.day, label: e.label, kind: e.kind, date: e.date }));
  const vac = entries.filter((e) => e.kind === "vacc");
  vac.forEach((e) => (e.note = `D${e.day}`));
  return { entries, span: 32, ticks: [0, 7, 14, 21, 28].map((d) => ({ day: d, label: `day ${d}` })) };
}

export function SystemLanding() {
  const t = LAB.totals;
  const rs = LAB.records.rspuram;
  const openCase = rs.cases.find((c) => c.status === "in_progress");
  const day = Math.round((Date.UTC(2026, 8, 23) - Date.parse(openCase?.at ?? rs.firstSeen)) / 86400000);
  const lanes = veeraLanes();
  const v = veeraEntries();
  const all = cells();
  const byKey = new Map(all.map((c) => [c.key, c]));
  const steps = [1, 4, 10, 24, 50];
  const fillCell = (k: string) => { const c = byKey.get(k)!; return c.events ? rampOf(c.events, steps) : "#ece5d8"; };
  const centre: [number, number] = [76.91, 11.02];
  const boxAround = (kmHalf: number): Box => { const dLat = kmHalf / 111, dLng = kmHalf / (111 * Math.cos((11 * Math.PI) / 180)); return [centre[0] - dLng, centre[1] - dLat, centre[0] + dLng, centre[1] + dLat]; };
  const within = (b: Box) => all.filter((c) => c.center[0] > b[0] - 0.006 && c.center[0] < b[2] + 0.006 && c.center[1] > b[1] - 0.006 && c.center[1] < b[3] + 0.006);
  const streetBox = boxAround(0.5), locBox = boxAround(1.8), wardBox = boxAround(4.5);
  const streetPts = LAB.cbe.animals.filter(([lng, lat]) => lng > streetBox[0] && lng < streetBox[2] && lat > streetBox[1] && lat < streetBox[3]);
  const streetEv = LAB.cbe.events.filter(([lng, lat]) => lng > streetBox[0] && lng < streetBox[2] && lat > streetBox[1] && lat < streetBox[3]);
  const sp = projector(streetBox, 220, 220, 6);
  const count = (list: typeof all) => list.reduce((a, c) => a + c.events, 0);
  const rsC = rs.localityCentroid ?? [77.02, 11.02];
  const nearOpen = LAB.queue.filter((q) => { const z = zoneAt(q.zone); return z && distKm(z, rsC as [number, number]) <= 1.5; }).length;
  const m = matrixBy();
  const reqs = m.reduce((a, r) => a + r.total, 0);
  const noAction = m.reduce((a, r) => a + (r.by.find((b) => b.s === "Closed, no action")?.n ?? 0), 0);
  const figs = featured(6);
  return (
    <main className="sx">
      <section className="sx-hero night" aria-label="StrayPaw">
        <Band over current="/lab/system/landing" crumbs={["India", "Coimbatore"]} />
        <HeroCells events={LAB.cbe.events.filter(([lng, lat]) => lng >= CBE_BOX[0] && lng <= CBE_BOX[2] && lat >= CBE_BOX[1] && lat <= CBE_BOX[3])} box={CBE_BOX} />
        <div className="sx-hero-copy">
          <span className="lbl">The register of India&apos;s street animals</span>
          <h1><span className="big">Every stray animal.</span><span className="it">Seen. Tracked. Cared&nbsp;for.</span></h1>
          <p>One permanent record for every street animal — where it was seen, what was done, by whom — kept by residents, field teams and organisations together, so a city can see its animals one at a time and all at once.</p>
          <div className="acts">
            <Link href="/lab/system/home#report" className="sx-btn">Report an animal</Link>
            <Link href="/lab/system/map" className="sx-btn quiet">Open the field map</Link>
          </div>
          <p className="where m">{fmt(t.animals)} animals on the register · Delhi, Bengaluru, Coimbatore · the plate is the sample city</p>
        </div>
      </section>

      <section className="sx-sec" aria-label="The line">
        <div className="sx-sec-h">
          <div><span className="lbl">Report → Record → Case → Outcome</span><h2>One line, from a street to an outcome.<span className="it">Every animal travels it.</span></h2></div>
          <p>Three residents reported the same injured dog in RS Puram on {dateLabel(openCase?.at ?? rs.firstSeen)}. StrayPaw joined the three reports to one record, the record opened one case, and the case is being worked now. The last leg is dashed because it has not happened yet.</p>
        </div>
        <LineStory
          slips={rs.cases.map((c) => ({ title: c.title, status: c.status, at: dateLabel(c.at, "short") }))}
          record={shortId(rs.id)} caseCode={`SPC·${(LAB.queue.find((q) => q.dog === rs.id)?.id ?? rs.id).slice(0, 4).toUpperCase()}`} day={day}
          totals={{ reports: t.publicReports, rescue: R.requests, records: t.animals, cases: t.cases, outcomes: t.resolved }}
        />
        <p className="sx-source" style={{ marginTop: 22 }}>Totals: the StrayPaw register, 23 Sep 2026. Resident reports exclude seeded demonstration records. Rescue requests: the rescue register imported into StrayPaw, 2024 – Sep 2026.</p>
      </section>

      <section className="sx-sec sx-dark night" aria-label="One animal">
        <div className="sx-sec-h">
          <div><span className="lbl">Animal → sightings → care history</span><h2>One animal, twenty-nine days.<span className="it">Every entry on its record.</span></h2></div>
          <p>A dog found with a maggot wound in {v.place}, {dateLabel(v.start)}. Treated and sterilised the day it was found; vaccinated on days 0, 4, 8, 16 and 29 — the spacing of an anti-rabies schedule; the case closed on day 29, rescued.</p>
        </div>
        <Lanes entries={lanes.entries} span={lanes.span} ticks={lanes.ticks} dark />
        <div className="sx-dark-foot">
          <Link href="/lab/system/animal" className="sx-btn quiet">Open the full record</Link>
          <span className="sx-source">Record {shortId(LAB.records.veerakeralam.id)} · StrayPaw register · every mark is an entry, unedited</span>
        </div>
      </section>

      <section className="sx-sec" aria-label="Scale">
        <div className="sx-sec-h">
          <div><span className="lbl">Street → locality → ward → city → India</span><h2>City intelligence is made of single records.<span className="it">Zoom out and nothing is invented.</span></h2></div>
          <p>The same place at five scales. Each frame is drawn from the records inside it; the cell — half a kilometre across — is the unit from a street to a city. Where nothing is recorded, the frame stays paper.</p>
        </div>
        <ol className="sx-ladder">
          <li>
            <figure>
              <svg viewBox="0 0 220 220" width="100%" role="img" aria-label="Street scale">
                <rect width="220" height="220" fill="#ece5d8" />
                {streetEv.map(([lng, lat], i) => { const [x, y] = sp.p(lng, lat); return <circle key={`e${i}`} cx={x} cy={y} r="2.2" fill="#2457ce" opacity=".75" />; })}
                {streetPts.map(([lng, lat, help], i) => { const [x, y] = sp.p(lng, lat); return <circle key={`a${i}`} cx={x} cy={y} r={help ? 4.5 : 3.2} fill={help ? "#f05b40" : "#0b1e3d"} />; })}
                <circle cx={sp.p(...centre)[0]} cy={sp.p(...centre)[1]} r="12" fill="none" stroke="#f05b40" strokeWidth="2" />
                <path d={`M10 206H${10 + sp.kmPx * 0.25}`} stroke="#0b1e3d" strokeWidth="2" /><text x={14 + sp.kmPx * 0.25} y="209" className="sc">250 m</text>
              </svg>
              <figcaption><b>Street</b><span className="m">{streetPts.length} animals · {streetEv.length} records</span></figcaption>
            </figure>
          </li>
          {[{ n: "Locality", b: locBox, s: "1 km" }, { n: "Ward", b: wardBox, s: "2 km" }, { n: "City", b: CBE_BOX, s: "5 km" }].map((f) => {
            const list = within(f.b);
            return (
              <li key={f.n}>
                <figure>
                  <div className="frame"><CellSVG cells={list} box={f.b} width={220} height={220} pad={0} fill={fillCell} stroke="rgba(243,237,228,.9)" mark={[{ lng: centre[0], lat: centre[1], r: f.n === "City" ? 5 : 8 }]} label={`${f.n} scale`} /></div>
                  <figcaption><b>{f.n}</b><span className="m">{list.length} cells · {fmt(count(list))} records</span></figcaption>
                </figure>
              </li>
            );
          })}
          <li>
            <figure>
              <div className="frame india"><IndiaLocator width={180} ink="#0b1e3d" accent="#f05b40" font="var(--sx-mono)" size={10} /></div>
              <figcaption><b>India</b><span className="m">{fmt(t.animals)} animals · 3 cities</span></figcaption>
            </figure>
          </li>
        </ol>
        <div className="sx-key" style={{ marginTop: 20 }}>
          {RAMP.slice(1).map((c, i) => <span key={c}><i style={{ background: c }} />{["1", "2–4", "5–10", "11–24", "25+"][i]}</span>)}
          <span>field records per cell</span>
          <span><i style={{ background: "#ece5d8", outline: "1px solid rgba(11,30,61,.2)" }} />nothing recorded</span>
        </div>
      </section>

      <section className="sx-sec sx-who" aria-label="Who it is for">
        <div className="sx-sec-h">
          <div><span className="lbl">Resident → NGO → institution</span><h2>The same records answer three different questions.</h2></div>
          <p>A resident needs to know what is near them. A field team needs to know what is open and where. A commissioner needs to know where the gaps are. StrayPaw answers each from one register.</p>
        </div>
        <ol className="sx-who-grid">
          <li>
            <span className="lbl">Resident</span>
            <h3>What is happening near me?</h3>
            <p className="fig"><b className="num need">{nearOpen}</b><span>open cases within 1.5 km of RS Puram today</span></p>
            <Link href="/lab/system/home">Your area →</Link>
          </li>
          <li>
            <span className="lbl">Field team · NGO</span>
            <h3>What is open, and what is unfinished?</h3>
            <p className="fig"><b className="num">{fmt(t.inProgress)}</b><span>cases in progress · {R.tvt.open} TVT courses mid-schedule</span></p>
            <Link href="/lab/system/ngo">Operations →</Link>
          </li>
          <li>
            <span className="lbl">Institution · funder · researcher</span>
            <h3>Where are the gaps, and what is working?</h3>
            <p className="fig"><b className="num">{Math.round((noAction / reqs) * 100)}%</b><span>of {fmt(reqs)} rescue requests closed with no action — a gap only a register can show</span></p>
            <Link href="/lab/system/analytics">Analytics →</Link>
          </li>
        </ol>
      </section>

      <section className="sx-sec sx-plates" aria-label="Photographs">
        <div className="sx-sec-h">
          <div><span className="lbl">Evidence</span><h2>Every figure starts as a photograph from a street.</h2></div>
          <p>Each is a resident&apos;s report, filed from a phone. It opened — or joined — an animal&apos;s record, and it stays on that record as evidence.</p>
        </div>
        <ol className="sx-plate-row">
          {figs.map((s, i) => (
            <li key={s.id} style={{ ["--h" as string]: `${[380, 300, 340, 280, 360, 300][i]}px` }}>
              <img src={photo(s.photo, 320)} alt={`Dog reported in ${s.zone}, ${s.city}`} loading="lazy" />
              <span className="m">{shortId(s.dog)}</span>
              <span className="it">{s.zone}, {s.city}</span>
              <span className="m dim">{dateLabel(s.at)}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="sx-foot night">
        <div><b className="sx-mark" style={{ color: "#f3ede4" }}>StrayPaw</b><p className="it">The register of India&apos;s street animals.</p></div>
        <p className="sx-source">Design lab. Every figure is read from the StrayPaw register (public views, 23 Sep 2026) or from anonymised counts of the rescue register imported into it. Positions are published to about a kilometre. Nothing here is invented.</p>
      </footer>
    </main>
  );
}
