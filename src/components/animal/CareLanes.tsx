/* ════════════════════════════════════════════════════════════════════
   Care lanes: one animal's time on the register, drawn.

   Four lanes on one clock — requests for help as spans (open ones run on
   to today, in flame), care as marks, follow-ups done or missed, and the
   sightings residents sent in. It answers at a glance what a timeline of
   paragraphs cannot: how long each request took, whether care followed,
   and whether anyone has seen the animal since.
   ════════════════════════════════════════════════════════════════════ */

import type { Lane, LivingEvent } from "@/lib/animal/living";

const LANES: { id: Lane; label: string }[] = [
  { id: "case", label: "Requests" },
  { id: "care", label: "Care" },
  { id: "follow", label: "Follow-ups" },
  { id: "sight", label: "Sightings" },
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export function CareLanes({ events, from, label }: { events: LivingEvent[]; from: string | null; label: string }) {
  const now = Date.now();
  const t0 = Math.min(...[from, ...events.map((e) => e.date)].filter(Boolean).map((d) => Date.parse(d as string)), now - 60 * 86_400_000);
  const span = Math.max(60 * 86_400_000, now - t0);
  const W = 1000, padL = 104, padR = 16, laneH = 34, top = 8;
  const H = top + LANES.length * laneH + 28;
  const x = (iso: string) => padL + ((Date.parse(iso) - t0) / span) * (W - padL - padR);
  const xNow = padL + ((now - t0) / span) * (W - padL - padR);
  const y = (lane: Lane) => top + LANES.findIndex((l) => l.id === lane) * laneH + laneH / 2;
  const ticks: { x: number; label: string; year: boolean }[] = [];
  const d0 = new Date(t0);
  for (let d = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 1)); +d <= now; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + (span > 700 * 86_400_000 ? 3 : 1), 1))) {
    const tx = x(d.toISOString());
    if (xNow - tx < 40) continue; // leave room for "today"
    ticks.push({ x: tx, label: d.getUTCMonth() === 0 ? String(d.getUTCFullYear()) : MON[d.getUTCMonth()], year: d.getUTCMonth() === 0 });
  }
  return (
    <figure className="lr-lanes">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        {LANES.map((l) => (
          <g key={l.id}>
            <line x1={padL} x2={W - padR} y1={y(l.id)} y2={y(l.id)} className="lr-lane-rule" />
            <text x={0} y={y(l.id) + 4} className="lr-lane-label">{l.label}</text>
          </g>
        ))}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={top} y2={H - 22} className={`lr-tick ${t.year ? "is-year" : ""}`} />
            <text x={t.x + 3} y={H - 8} className="lr-tick-label">{t.label}</text>
          </g>
        ))}
        <line x1={xNow} x2={xNow} y1={top - 4} y2={H - 22} className="lr-now" />
        <text x={xNow - 4} y={H - 8} className="lr-tick-label is-now" textAnchor="end">today</text>
        {events.map((e) => {
          const cx = x(e.date), cy = y(e.lane);
          if (e.lane === "case") {
            const x2 = e.end ? Math.max(cx + 6, x(e.end)) : xNow;
            return (
              <g key={e.id} className={`lr-case is-${e.tone}`}>
                <rect x={cx} y={cy - 6} width={Math.max(6, x2 - cx)} height={12} rx={6} />
                {!e.end && <polygon points={`${xNow},${cy - 6} ${xNow + 7},${cy} ${xNow},${cy + 6}`} />}
                <title>{`${fmt(e.date)} — ${e.title}`}</title>
              </g>
            );
          }
          if (e.tone === "miss") return <circle key={e.id} cx={cx} cy={cy} r={5.5} className="lr-dot is-miss"><title>{`${fmt(e.date)} — ${e.title}`}</title></circle>;
          if (e.tone === "due") return <circle key={e.id} cx={cx} cy={cy} r={5.5} className="lr-dot is-due"><title>{`${fmt(e.date)} — ${e.title}`}</title></circle>;
          return <circle key={e.id} cx={cx} cy={cy} r={e.lane === "care" ? 6 : 5} className={`lr-dot is-${e.tone}`}><title>{`${fmt(e.date)} — ${e.title}`}</title></circle>;
        })}
      </svg>
      <figcaption>
        <span><i className="is-done" /> request closed after field work</span>
        <span><i className="is-open" /> still open</span>
        <span><i className="is-none" /> closed without action</span>
        <span><i className="is-ster" /> sterilised</span>
        <span><i className="is-vacc" /> vaccinated</span>
        <span><i className="is-care" /> other care</span>
        <span><i className="is-miss" /> follow-up missed</span>
        <span><i className="is-sight" /> seen by a resident</span>
      </figcaption>
    </figure>
  );
}
