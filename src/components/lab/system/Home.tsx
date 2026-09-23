import Link from "next/link";
import "./sys.css";
import { LAB, fmt, daysBetween, zoneAt, dateLabel } from "../data";
import { Band } from "./parts";
import { NearbyMap, type NCell } from "./NearbyMap";
import { cells, isGap, distKm, NOW_DAY, kindName, dayLabel, triage } from "./sdata";

const RADIUS = 1.5;

export function SystemHome() {
  const rs = LAB.records.rspuram;
  const centre = (rs.localityCentroid ?? [77.02, 11.02]) as [number, number];
  const near = (p: [number, number], r = RADIUS) => distKm(p, centre) <= r;
  const local = cells().filter((c) => distKm(c.center, centre) <= RADIUS + 0.4);
  const ev90 = LAB.cbe.events.filter((e) => e[2] > NOW_DAY - 90 && near([e[0], e[1]]));
  const ncells: NCell[] = local.map((c) => ({ ring: c.ring, gap: isGap(c), w: ev90.filter((e) => distKm([e[0], e[1]], c.center) < 0.32).length }));
  const help = LAB.cbe.animals.filter((a) => a[2] && near([a[0], a[1]])).map((a) => [a[0], a[1]] as [number, number]);
  const animals = LAB.cbe.animals.filter((a) => near([a[0], a[1]]));
  const openQ = LAB.queue.map((q) => ({ q, z: zoneAt(q.zone) })).filter((x): x is { q: (typeof LAB.queue)[number]; z: [number, number] } => !!x.z && near(x.z, RADIUS + 0.3));
  const pins = [...new Map(openQ.map((o) => [o.q.zone, o])).values()].map((o) => ({ lng: o.z[0], lat: o.z[1], n: openQ.filter((x) => x.q.zone === o.q.zone).length }));
  const gaps = local.filter(isGap);
  // What changed: field records in the last 90 days, week by week.
  const weeks = Array.from({ length: 13 }, (_, i) => { const end = NOW_DAY - i * 7; return { end, list: ev90.filter((e) => e[2] <= end && e[2] > end - 7) }; }).reverse();
  const latest = [...ev90].sort((a, b) => b[2] - a[2]).slice(0, 6);
  const sterilised = animals.filter((a) => a[3]).length;
  return (
    <main className="sx sx-home">
      <Band current="/lab/system/home" crumbs={["India", "Coimbatore", "RS Puram"]} />
      <section className="sx-home-top">
        <div className="sx-home-map sx-mapbox paper">
          <NearbyMap centre={centre} radiusKm={RADIUS} cells={ncells} help={help} open={pins} />
          <div className="sx-home-where"><span className="lbl">Around you</span><b>RS Puram</b><span className="m">1.5 km · Coimbatore</span><button type="button">Change area</button></div>
        </div>
        <div className="sx-home-now">
          <span className="lbl">Today · {dateLabel(LAB.snapshot)}</span>
          <h1>{openQ.length} open cases near you. <span className="it">{help.length} animals marked as needing help.</span></h1>
          <dl className="sx-home-facts">
            <div><dt>Animals on record within 1.5 km</dt><dd className="m">{fmt(animals.length)}</dd></div>
            <div><dt>Sterilised</dt><dd className="m">{sterilised}<span className="dim"> · rest not recorded</span></dd></div>
            <div><dt>Field records, last 90 days</dt><dd className="m">{ev90.length}</dd></div>
            <div><dt>Cells with no work in a year</dt><dd className="m need">{gaps.length}</dd></div>
          </dl>
        </div>
      </section>

      <section className="sx-home-open" aria-label="Being helped now">
        <div className="sx-rec-h"><h2>Being helped now</h2><span className="m dim">open cases within 1.8 km</span></div>
        <ol>
          {openQ.sort((a, b) => triage(a.q.category).rank - triage(b.q.category).rank || daysBetween(b.q.at) - daysBetween(a.q.at)).map(({ q, z }) => (
            <li key={q.id} className={`c${triage(q.category).rank}`}>
              <Link href={q.dog === rs.id ? "/lab/system/case" : "/lab/system/ngo"}>
                <span className="tri" aria-hidden />
                <span className="what"><b>{q.category}</b><span className="it">{q.zone.replace(/[,(].*$/, "").trim()}</span></span>
                <span className="m">{distKm(z, centre).toFixed(1)} km</span>
                <span className="m dim">day {daysBetween(q.at)}</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="sx-note">Only the condition and the locality are public. Each case is held by a field team; reporting the same animal again joins its record.</p>
      </section>

      <section className="sx-home-changed" aria-label="What changed">
        <div className="sx-rec-h"><h2>What changed nearby</h2><span className="m dim">field records, last 13 weeks</span></div>
        <div className="sx-weeks" role="img" aria-label="Field records per week near you">
          {weeks.map((w) => (
            <div key={w.end} className="wk">
              <div className="stack">{w.list.map((e, i) => <i key={i} className={e[3] === 0 ? "case" : e[3] === 2 || e[3] === 3 ? "abc" : ""} />)}</div>
              <span className="m">{dayLabel(w.end).split(" ").slice(0, 2).join(" ")}</span>
            </div>
          ))}
        </div>
        <div className="sx-key" style={{ margin: "10px 0 18px" }}><span><i style={{ background: "#f05b40" }} />case opened</span><span><i style={{ background: "#2457ce" }} />ABC or vaccination</span><span><i style={{ background: "#93aee9" }} />other care</span></div>
        <ol className="sx-latest">
          {latest.map((e, i) => <li key={i}><span className="m dim">{dayLabel(e[2])}</span><b>{kindName(e[3])}</b><span className="dim">{distKm([e[0], e[1]], centre).toFixed(1)} km away</span></li>)}
        </ol>
      </section>

      <section className="sx-home-att" aria-label="Where attention is needed">
        <div className="sx-rec-h"><h2>Where no one has looked in a year</h2><span className="m dim">{gaps.length} {gaps.length === 1 ? "cell" : "cells"} · {gaps.reduce((a, g) => a + g.animals, 0)} animals recorded</span></div>
        <p className="sx-note">These cells hold animals on the record but no field work since September 2025. A sighting from a resident is often the first sign of what is happening there.</p>
        <ol className="sx-gaplist">{gaps.sort((a, b) => b.animals - a.animals).slice(0, 5).map((g) => <li key={g.key}><b>{g.locality}</b><span className="m">{g.animals} animals</span><span className="m dim">last work {g.lastDay >= 0 ? dayLabel(g.lastDay) : "never recorded"}</span></li>)}</ol>
      </section>

      <section className="sx-report" id="report" aria-label="Report an animal">
        <div>
          <span className="lbl">Report an animal</span>
          <h2>A place is required. <span className="it">A photograph helps. Everything else is optional.</span></h2>
          <p>Your report joins the animal&apos;s record if StrayPaw already knows it — three reports of the same dog become one record, not three. You will see what happens next.</p>
        </div>
        <ol className="sx-report-steps">
          <li><i>1</i><b>Place</b><span>Your location, to ~1 km in public</span></li>
          <li><i>2</i><b>Photograph</b><span>Clinical photos stay closed</span></li>
          <li><i>3</i><b>What you see</b><span>Injured, sick, or just seen</span></li>
        </ol>
        <button type="button" className="sx-btn">Start a report</button>
      </section>
    </main>
  );
}
