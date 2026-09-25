import { HexPlate, type Box, type PlateCell } from "@/components/system/HexPlate";
import { StrayPawMark } from "@/components/site/SiteHeader";

/* The organisation's dashboard, in miniature: the same headline, the same
   queue with its waiting bars, the same map of where the open work is. It is
   drawn from the sample city's public record, so every row is a real open
   case (condition, locality, how long it has waited) and nothing names the
   organisation that keeps it. Labelled as the sample, like the plate above. */

type Desk = {
  live: number; critical: number; older: number;
  queue: { condition: string; locality: string; days: number; critical: boolean; overdue: boolean }[];
  cells: { key: string; ring: number[]; open: number }[];
  box: Box;
};

const fmt = (n: number) => n.toLocaleString("en-IN");
const waited = (d: number) => (d < 14 ? `${d} day${d === 1 ? "" : "s"}` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`);
const RAMP = ["var(--sp-att-1)", "var(--sp-att-2)", "var(--sp-att-3)", "var(--sp-att-4)"];

export function DeskMock({ city, desk }: { city: string; desk: Desk }) {
  const max = Math.max(1, ...desk.cells.map((c) => c.open));
  const cells: PlateCell[] = desk.cells.map((c) => ({
    key: c.key, ring: c.ring,
    fill: c.open ? RAMP[Math.min(3, Math.floor(Math.sqrt(c.open / max) * 4))] : "var(--sp-seq-0)",
  }));
  return (
    <figure className="ld-desk" aria-label={`The organisation dashboard, drawn from ${city}'s public record`}>
      <div className="ld-desk-bar" aria-hidden>
        <StrayPawMark size={18} />
        <b>Field workspace</b>
        <span className="sys-mono">Sample city · {city}</span>
      </div>
      <div className="ld-desk-body">
        <div className="ld-desk-main">
          <p className="ld-desk-h">What needs attention</p>
          <p className="ld-desk-lede">
            <b>{fmt(desk.live)}</b> cases are live, <b className="is-hot">{fmt(desk.critical)}</b> of them critical.
            {desk.older > 0 && <> <b>{fmt(desk.older)}</b> older ones need a decision.</>}
          </p>
          <ol className="ld-desk-queue">
            {desk.queue.map((q, i) => (
              <li key={i}>
                <i className={`ld-desk-mark ${q.overdue ? "is-due" : q.critical ? "is-crit" : ""}`} aria-hidden />
                <span className="ld-desk-what">
                  <b>{q.overdue ? "Follow-up overdue" : q.condition === "Not recorded" ? "Open case" : q.condition}</b>
                  <small>{q.locality || city}</small>
                </span>
                <span className="ld-desk-age">
                  <i style={{ width: `${Math.min(100, (q.days / 90) * 100)}%` }} className={q.days > 30 ? "is-long" : ""} aria-hidden />
                  <small>Open · {waited(q.days)}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="ld-desk-geo">
          <p className="ld-desk-eyebrow">Where the open work is</p>
          <HexPlate cells={cells} box={desk.box} width={280} height={250} pad={4} label={`Open cases across ${city}, by cell`} />
        </div>
      </div>
    </figure>
  );
}
