import "./sys.css";
import { LAB, fmt } from "../data";
import { Band, Band100, CellSVG } from "./parts";
import { ConditionExplorer } from "./ConditionExplorer";
import { R, STATUS_STYLE, YEARS, matrixBy, cells, months, CBE_BOX, isGap, yearTotal } from "./sdata";
import { hexbin } from "../geo";

const MON = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function SystemAnalytics() {
  const t = LAB.totals;
  const rows = matrixBy();
  const byYear = Object.fromEntries(YEARS.map((y) => [y, matrixBy(y)]));
  const reqs = rows.reduce((a, r) => a + r.total, 0);
  const noAction = rows.reduce((a, r) => a + (r.by.find((b) => b.s === "Closed, no action")?.n ?? 0), 0);
  const notRec = rows.find((r) => r.condition === "Not recorded")?.total ?? 0;
  const ms = months();
  const maxM = Math.max(...ms.map((m) => m.cases));
  const peak = ms.reduce((a, m) => (m.cases > a.cases ? m : a), ms[0]);
  const MONN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const all = cells();
  // Where: the footprint of field work, year by year, on the same cells.
  const evBins = hexbin(LAB.cbe.events.map((e) => e), (e) => [e[0], e[1]], 11, 0.55);
  const yearOfDay = (d: number) => new Date(Date.UTC(2024, 0, 1) + d * 86400000).getUTCFullYear();
  const footprint = YEARS.map((y) => ({ y, keys: new Set(evBins.filter((b) => b.items.some((e) => yearOfDay(e[2]) === y)).map((b) => b.key)) }));
  const lagMax = Math.max(...R.lag.bins.map((b) => b[1]));
  const styles = Object.fromEntries(Object.entries(STATUS_STYLE).map(([k, v]) => [k, { fill: v.fill, hatch: v.hatch, label: v.label }]));
  const shares = rows.filter((r) => r.condition !== "Not recorded" && r.condition !== "Other").slice(0, 8).map((r) => ({ c: r.condition, s: YEARS.map((y) => { const tot = yearTotal(y); const n = byYear[y].find((x) => x.condition === r.condition)?.total ?? 0; return (n / tot) * 100; }) }));
  const smax = Math.max(...shares.flatMap((s) => s.s));
  const gaps = all.filter(isGap).length;
  return (
    <main className="sx sx-an">
      <Band current="/lab/system/analytics" crumbs={["India", "Coimbatore", "Analytics"]} />
      <section className="sx-an-hero">
        <div>
          <span className="lbl">Analytics · sample city: Coimbatore · Jan 2024 – Sep 2026</span>
          <h1>The city, <span className="it">read from its records.</span></h1>
        </div>
        <ol className="sx-an-index">
          <li><a href="#what">What happens</a></li><li><a href="#when">When</a></li><li><a href="#response">Response</a></li><li><a href="#where">Where</a></li><li><a href="#intervention">Intervention</a></li><li><a href="#evidence">Evidence quality</a></li>
        </ol>
      </section>

      <section className="sx-an-find" aria-label="Findings">
        <p><b className="num">{fmt(reqs)}</b><span>rescue requests, 2024 – Sep 2026, across {rows.length} recorded conditions</span></p>
        <p><b className="num">{Math.round((noAction / reqs) * 100)}%</b><span>closed with no action — {fmt(noAction)} requests. Where it happens, and why, is the first question for a city.</span></p>
        <p><b className="num">{R.lag.median}<small> day</small></b><span>median from request to rescue date (IQR {R.lag.p25}–{R.lag.p75}); {Math.round((R.lag.noPlan / reqs) * 100)}% have no rescue date at all</span></p>
        <p><b className="num">{Math.round((notRec / reqs) * 100)}%</b><span>of requests have no condition recorded — the largest single evidence gap</span></p>
      </section>

      <section className="sx-an-sec" id="what" aria-label="What happens">
        <div className="sx-an-h"><span className="lbl">What · outcome</span><h2>What happens to each kind of case</h2><p>Each row is a condition. The band is every request with that condition, split by what the register says happened. Select a row to see it year by year.</p></div>
        <ConditionExplorer rows={rows} byYear={byYear} styles={styles} years={YEARS} />
      </section>

      <section className="sx-an-sec two" aria-label="Change in mix">
        <div className="sx-an-h"><span className="lbl">Change</span><h2>The mix is shifting</h2><p>Share of each year&apos;s requests, by condition — 2024, 2025, 2026 to September. Road accidents stay around a fifth to a quarter of all requests; TVT has grown from about one in ten to one in eight.</p></div>
        <ol className="sx-mix">
          {shares.map((sh) => (
            <li key={sh.c}>
              <b>{sh.c}</b>
              <svg viewBox="0 0 150 70" width="100%" aria-label={`${sh.c}: ${sh.s.map((v, i) => `${YEARS[i]} ${v.toFixed(0)}%`).join(", ")}`} role="img">
                {sh.s.map((v, i) => { const h = (v / smax) * 50; return <g key={i}><rect x={8 + i * 48} y={56 - h} width="34" height={h} fill={i === 2 ? "#2457ce" : "#93aee9"} /><text x={25 + i * 48} y={52 - h} textAnchor="middle" className="v">{v.toFixed(0)}%</text><text x={25 + i * 48} y="68" textAnchor="middle" className="ax">{String(YEARS[i]).slice(2)}</text></g>; })}
              </svg>
            </li>
          ))}
        </ol>
      </section>

      <section className="sx-an-sec" id="when" aria-label="When">
        <div className="sx-an-h"><span className="lbl">When</span><h2>Cases opened, month by month</h2><p>Each square is a month; darker is more cases. The heaviest month was {MONN[+peak.m.slice(5) - 1]} {peak.m.slice(0, 4)}, with {peak.cases} cases opened.</p></div>
        <div className="sx-heat">
          <div className="yrs">{[2024, 2025, 2026].map((y) => <span key={y} className="m">{y}</span>)}</div>
          <div className="grid">
            {[2024, 2025, 2026].map((y) => (
              <div key={y} className="row">
                {MON.map((mn, i) => {
                  const m = ms.find((x) => x.m === `${y}-${String(i + 1).padStart(2, "0")}`);
                  const v = m?.cases ?? -1;
                  return <span key={i} className={v < 0 ? "none" : ""} style={v >= 0 ? { background: `rgba(36,87,206,${0.12 + (v / maxM) * 0.88})`, color: v / maxM > 0.45 ? "#fff" : "#0b1e3d" } : undefined} title={`${y}-${i + 1}: ${v < 0 ? "not yet" : v}`}>{v >= 0 ? v : ""}</span>;
                })}
              </div>
            ))}
            <div className="row mons">{MON.map((m, i) => <span key={i}>{m}</span>)}</div>
          </div>
        </div>
      </section>

      <section className="sx-an-sec two" id="response" aria-label="Response">
        <div className="sx-an-h"><span className="lbl">Response</span><h2>How fast a rescue is planned</h2><p>Days from the request to the recorded rescue date, for the {fmt(R.lag.withPlan)} requests that have one. The {fmt(R.lag.noPlan)} without a date are drawn hatched — they are the ones to chase.</p></div>
        <div className="sx-lag">
          {R.lag.bins.map(([l, n]) => (
            <div key={l} className="b"><span className="lbl">{l}</span><i style={{ width: `${(n / lagMax) * 100}%` }} /><b className="m">{fmt(n)}</b></div>
          ))}
          <div className="b nil"><span className="lbl">No date</span><i className="hatch" style={{ width: `${(R.lag.noPlan / lagMax) * 100}%` }} /><b className="m">{fmt(R.lag.noPlan)}</b></div>
        </div>
      </section>

      <section className="sx-an-sec" id="where" aria-label="Where">
        <div className="sx-an-h"><span className="lbl">Where · change</span><h2>The footprint of field work, year by year</h2><p>The same {fmt(all.length)} cells each year. Blue: a field record that year. Paper: none. {gaps} cells hold animals and have had no work in the last twelve months.</p></div>
        <ol className="sx-foot3">
          {footprint.map((f) => (
            <li key={f.y}>
              <CellSVG cells={all} box={CBE_BOX} width={300} height={280} pad={4} fill={(k) => (f.keys.has(k) ? "#2457ce" : "#e6ddcf")} stroke="#faf7f1" label={`Cells with field work in ${f.y}`} />
              <b>{f.y}{f.y === 2026 ? " to Sep" : ""}</b><span className="m">{f.keys.size} cells with work</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="sx-an-sec two" id="intervention" aria-label="Intervention">
        <div className="sx-an-h"><span className="lbl">Intervention</span><h2>Sterilisation and vaccination</h2><p>Recorded procedures per month on the register. A month with none recorded is drawn at the baseline, not left out.</p></div>
        <div>
          <svg viewBox="0 0 660 190" width="100%" role="img" aria-label="Sterilisations and vaccinations per month" className="sx-int">
            {ms.map((m, i) => {
              const x = 8 + i * 19.6, ms2 = Math.max(...months().map((q) => Math.max(q.sterilised, q.vaccinated)), 1);
              return <g key={m.m}><rect x={x} y={80 - (m.sterilised / ms2) * 70} width="8" height={(m.sterilised / ms2) * 70} fill="#2457ce" /><rect x={x + 9} y={80 - (m.vaccinated / ms2) * 70} width="8" height={(m.vaccinated / ms2) * 70} fill="#93aee9" /><line x1={x} x2={x + 17} y1="81" y2="81" stroke="#0b1e3d" /></g>;
            })}
            <text x="8" y="100" className="ax">Jan 2024</text><text x="652" y="100" textAnchor="end" className="ax">Sep 2026</text>
            <g transform="translate(8 128)">
              <text className="ax" y="0">Programmes on the register</text>
              <text y="22" className="big">{fmt(t.sterilisationEvents)}</text><text x="70" y="22" className="ax">ABC procedures</text>
              <text x="200" y="22" className="big">{fmt(t.vaccinationEvents)}</text><text x="250" y="22" className="ax">vaccinations</text>
              <text x="380" y="22" className="big">{R.abc.enrolled}</text><text x="420" y="22" className="ax">in one sterilisation drive</text>
              <text y="48" className="big">{R.tvt.courses}</text><text x="40" y="48" className="ax">TVT dose courses</text>
            </g>
          </svg>
          <div className="sx-key"><span><i style={{ background: "#2457ce" }} />sterilisation · ABC</span><span><i style={{ background: "#93aee9" }} />vaccination</span></div>
        </div>
      </section>

      <section className="sx-an-sec" id="evidence" aria-label="Evidence quality">
        <div className="sx-an-h"><span className="lbl">Evidence quality</span><h2>What the records hold, and what they do not</h2><p>How often each field is filled in the rescue register, and on the public register. Hatched is missing — the shape of what a funder or researcher can and cannot claim.</p></div>
        <div className="sx-evq">
          <div>
            <span className="lbl">Rescue register · {fmt(R.requests)} requests</span>
            <ul>{R.fields.map(([k, n]) => <li key={k}><span>{k}</span><div><Band100 height={12} parts={[{ n, fill: "#2457ce" }, { n: R.requests - n, fill: "", hatch: true }]} /></div><b className="m">{Math.round((n / R.requests) * 100)}%</b></li>)}</ul>
          </div>
          <div>
            <span className="lbl">Public register · {fmt(t.animals)} animals</span>
            <ul>
              <li><span>Sterilisation status</span><div><Band100 height={12} parts={[{ n: t.sterilised, fill: "#2457ce" }, { n: t.animals - t.sterilised, fill: "", hatch: true }]} /></div><b className="m">{Math.round((t.sterilised / t.animals) * 100)}%</b></li>
              <li><span>Vaccination status</span><div><Band100 height={12} parts={[{ n: t.vaccinated, fill: "#2457ce" }, { n: t.animals - t.vaccinated, fill: "", hatch: true }]} /></div><b className="m">{Math.round((t.vaccinated / t.animals) * 100)}%</b></li>
              <li><span>Photograph</span><div><Band100 height={12} parts={[{ n: t.sightingPhotos, fill: "#2457ce" }, { n: t.animals - t.sightingPhotos, fill: "", hatch: true }]} /></div><b className="m">{Math.round((t.sightingPhotos / t.animals) * 100)}%</b></li>
              <li><span>Place, to ~1 km</span><div><Band100 height={12} parts={[{ n: t.animals - 1, fill: "#2457ce" }, { n: 1, fill: "", hatch: true }]} /></div><b className="m">100%</b></li>
            </ul>
            <p className="sx-note" style={{ marginTop: 14 }}>A status that was never examined is not the same as an unsterilised animal. StrayPaw never reports hatched as zero.</p>
          </div>
        </div>
      </section>
      <p className="sx-source" style={{ padding: "0 var(--sx-g) 48px" }}>Sources: the StrayPaw register (public views, 23 Sep 2026); anonymised counts from the rescue register imported into StrayPaw, de-duplicated. No names, contacts or free text are used.</p>
    </main>
  );
}
