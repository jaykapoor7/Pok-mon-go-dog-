import "./atlas.css";
import { LAB, fmt, pct, dateLabel, daysBetween, zoneAt } from "../data";
import { Masthead } from "./parts";
import { OpsPlate, type OpsItem } from "./OpsPlate";

function MonthlyChart() {
  const M = LAB.cbe.monthly;
  const W = 760, H = 250, L = 34, R = 10, T = 18, B = 34;
  const tot = M.map((m) => m.cases + m.care + m.sterilised + m.vaccinated + m.rescue);
  const max = Math.max(...tot);
  const x = (i: number) => L + ((W - L - R) * i) / (M.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const area = `M${x(0)} ${y(0)} ` + tot.map((v, i) => `L${x(i)} ${y(v)}`).join(" ") + ` L${x(M.length - 1)} ${y(0)} Z`;
  const cases = M.map((m, i) => `${i ? "L" : "M"}${x(i)} ${y(m.cases)}`).join(" ");
  const peak = M.reduce((a, m, i) => (m.cases > M[a].cases ? i : a), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Field records per month">
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#0b1e3d" strokeOpacity={0.08} />)}
      {[0.5, 1].map((f) => <text key={f} x={L - 6} y={y(max * f) + 3} textAnchor="end">{Math.round(max * f)}</text>)}
      <path d={area} fill="#0b1e3d" fillOpacity={0.08} />
      <path d={cases} fill="none" stroke="#0b1e3d" strokeWidth={1.5} />
      {M.map((m, i) => m.sterilised > 0 && <line key={m.m} x1={x(i)} x2={x(i)} y1={H - B + 4} y2={H - B + 4 + Math.min(14, m.sterilised * 1.2)} stroke="#0b1e3d" strokeWidth={3} />)}
      {M.map((m, i) => m.m.endsWith("-01") && (
        <g key={m.m}><line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#0b1e3d" strokeOpacity={0.25} strokeDasharray="2 3" /><text x={x(i) + 4} y={T + 8}>{m.m.slice(0, 4)}</text></g>
      ))}
      <circle cx={x(peak)} cy={y(M[peak].cases)} r={3.5} fill="#0b1e3d" />
      <text x={x(peak) + 8} y={y(M[peak].cases) + 4} style={{ fontFamily: "var(--la-serif)", fontSize: 13, fontStyle: "italic", fill: "#0b1e3d" }}>{dateLabel(M[peak].m + "-01", "month")}: {M[peak].cases} cases opened</text>
      <text x={L} y={H - 4}>ticks below the axis: sterilisations (ABC) that month</text>
    </svg>
  );
}

export function AtlasNgo() {
  const t = LAB.totals;
  const items: OpsItem[] = LAB.queue.slice(0, 14).map((q) => {
    const z = zoneAt(q.zone);
    return { id: q.id, title: q.category, zone: q.zone, days: daysBetween(q.at), status: q.status, lng: z?.[0] ?? null, lat: z?.[1] ?? null };
  });
  const recent = LAB.cbe.events.filter((e) => e[2] >= 731).map((e) => [e[0], e[1]] as [number, number]);
  const month = LAB.cbe.monthly[LAB.cbe.monthly.length - 1];
  const reg = t.coimbatore;
  return (
    <main className="la night">
      <section className="la-ops" aria-label="Operations plate">
        <Masthead over current="/lab/atlas/ngo" />
        <div className="la-ops-head">
          <span className="cap">Operations plate · Tue 23 Sep 2026</span>
          <h1>The Pawsome People Project</h1>
          <div className="la-ops-figs">
            <div><b className="hot">{fmt(t.unverified)}</b><span>reports waiting to be verified</span></div>
            <div><b>{fmt(t.inProgress)}</b><span>cases in progress</span></div>
            <div><b>{fmt(month.cases)}</b><span>cases opened this month</span></div>
          </div>
        </div>
        <OpsPlate items={items} recent={recent} box={LAB.cbe.box} />
      </section>

      <section className="la-sheet" aria-label="Programme sheet">
        <span className="cap">Programme sheet · the register, not a sample</span>
        <h2>Of {fmt(reg)} animals on the register, <span className="it">what has been done.</span></h2>
        <div className="la-cover">
          <div className="la-cover-row">
            <div><b>Sterilised · ABC</b><small>animal birth control</small></div>
            <div className="la-bar" aria-hidden><i style={{ width: `${(t.sterilised / reg) * 100}%` }} /></div>
            <span className="mono">{fmt(t.sterilised)} · {pct(t.sterilised, reg)}%</span>
          </div>
          <div className="la-cover-row">
            <div><b>Vaccinated</b><small>any vaccination recorded</small></div>
            <div className="la-bar" aria-hidden><i style={{ width: `${(t.vaccinated / reg) * 100}%` }} /></div>
            <span className="mono">{fmt(t.vaccinated)} · {pct(t.vaccinated, reg)}%</span>
          </div>
          <p className="la-cover-note">Hatched: not recorded. For most animals on this register nobody has examined the question yet — that is not the same as “not sterilised”, and the sheet does not count it as zero.</p>
        </div>
        <div className="la-sheet-grid">
          <div className="la-chart">
            <span className="cap">Field records per month</span>
            <h3>Cases opened (line) inside all field work (shade)</h3>
            <MonthlyChart />
          </div>
          <div>
            <span className="cap">Casework by cause</span>
            <h3>What the {fmt(t.cases)} cases were</h3>
            <ul className="la-causes">
              {LAB.cbe.categories.filter(([c]) => c !== "Other" && c !== "Not recorded").slice(0, 10).map(([c, n]) => (
                <li key={c}><span>{c}</span><i style={{ width: `${(n / LAB.cbe.categories[0][1]) * 100}%` }} /><small>{fmt(n)}</small></li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
