import "./civic.css";
import { LAB, fmt, pct, dateLabel, daysBetween, zoneAt } from "../data";
import { hexbin } from "../geo";
import { Band } from "./parts";
import { OpsMap, type OHex, type OPin } from "./OpsMap";

function Bars() {
  const M = LAB.cbe.monthly;
  const W = 720, H = 240, L = 30, B = 44, T = 14;
  const max = Math.max(...M.map((m) => m.cases));
  const sMax = Math.max(1, ...M.map((m) => m.sterilised));
  const bw = (W - L) / M.length;
  const y = (v: number) => T + (H - T - B - 34) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cases opened per month, with sterilisations beneath">
      {[0.5, 1].map((f) => <g key={f}><line x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#0b1e3d" strokeOpacity={0.12} /><text x={L - 4} y={y(max * f) + 3} textAnchor="end">{Math.round(max * f)}</text></g>)}
      {M.map((m, i) => (
        <g key={m.m}>
          <rect x={L + i * bw + 1} y={y(m.cases)} width={bw - 2} height={y(0) - y(m.cases)} fill={i === M.length - 1 ? "#0b1e3d" : "#2457ce"} />
          {m.sterilised > 0 && <rect x={L + i * bw + 1} y={y(0) + 6} width={bw - 2} height={(m.sterilised / sMax) * 26} fill="#0b1e3d" />}
          {m.m.endsWith("-01") && <text x={L + i * bw} y={H - 4}>{m.m.slice(0, 4)}</text>}
        </g>
      ))}
      <line x1={L} x2={W} y1={y(0)} y2={y(0)} stroke="#0b1e3d" strokeWidth={2} />
      <text x={W} y={T + 4} textAnchor="end">blue: cases opened · beneath the axis: sterilisations (ABC)</text>
    </svg>
  );
}

export function CivicNgo() {
  const t = LAB.totals;
  const month = LAB.cbe.monthly[LAB.cbe.monthly.length - 1];
  const q = LAB.queue.slice(0, 12);
  const pins: OPin[] = q.map((x, i) => { const z = zoneAt(x.zone); return z ? { n: i + 1, lng: z[0], lat: z[1], hot: x.status === "unverified" } : null; }).filter(Boolean) as OPin[];
  const recent = LAB.cbe.events.filter((e) => e[2] >= 731);
  const hexes: OHex[] = hexbin(recent, (e) => [e[0], e[1]], 11, 0.55).map((h) => ({ ring: h.ring, c: h.items.length }));
  const reg = t.animals;
  return (
    <main className="ci">
      <Band current="/lab/civic/ngo" code="OPERATIONS · TUE 23 SEP 2026" />
      <div className="ci-sub"><span className="lbl">Field operations · sample desk: Coimbatore, our densest register</span><span className="lbl mono">{fmt(reg)} animals on the StrayPaw register · India</span></div>
      <section className="ci-kpis" aria-label="Today">
        <div className="ci-kpi alert"><span className="lbl">To verify</span><b>{t.unverified}</b><p>reports waiting to be checked against a record</p></div>
        <div className="ci-kpi"><span className="lbl">In progress</span><b>{t.inProgress}</b><p>cases being worked</p></div>
        <div className="ci-kpi"><span className="lbl">Opened · Sep</span><b>{month.cases}</b><p>new cases this month</p></div>
        <div className="ci-kpi"><span className="lbl">Resolved</span><b className="x">{fmt(t.resolved)}</b><p>cases closed with an outcome</p></div>
      </section>
      <section className="ci-ops" aria-label="Open work">
        <div className="ci-ops-map"><OpsMap hexes={hexes} pins={pins} /></div>
        <div className="ci-docket">
          <div className="ci-docket-h"><b>Docket · open now</b><span className="lbl mono" style={{ color: "#6b7485" }}>newest first</span></div>
          <div className="ci-drow h"><span>№</span><span>Opened</span><span>Days</span><span>Case</span><span>Locality</span><span>Status</span></div>
          {q.map((x, i) => (
            <div key={x.id} className="ci-drow">
              <span className="mono no">{String(i + 1).padStart(2, "0")}</span>
              <span className="mono">{dateLabel(x.at, "short")}</span>
              <span className="mono">{daysBetween(x.at)}</span>
              <span>{x.category}</span>
              <span>{x.zone}</span>
              <span className={`st${x.status === "unverified" ? " f" : ""}`}>{x.status === "unverified" ? "Verify" : "In progress"}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="ci-prog" aria-label="Programme">
        <div>
          <span className="lbl">Programme coverage</span>
          <h2>ABC and vaccination, against the register</h2>
          {[{ k: "Sterilised · ABC", n: t.sterilised }, { k: "Vaccinated", n: t.vaccinated }].map((m) => (
            <div key={m.k} className="ci-meter">
              <div className="ci-meter-h"><b>{m.k}</b><span>{fmt(m.n)} of {fmt(reg)} · {pct(m.n, reg)}%</span></div>
              <div className="ci-meter-bar">
                <i style={{ width: `${(m.n / reg) * 100}%` }} />
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => <s key={v} style={{ left: `${v}%` }} />)}
              </div>
              <p>hatched: not recorded — not examined yet, not zero</p>
            </div>
          ))}
        </div>
        <div className="ci-bars">
          <span className="lbl">Cases opened per month · Jan 2024 – Sep 2026</span>
          <Bars />
        </div>
      </section>
    </main>
  );
}
