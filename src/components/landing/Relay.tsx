"use client";

/* ════════════════════════════════════════════════════════════════════
   One report, three screens.

   The most recent real request in the sample city, passed along the
   record: a resident sends it from a phone; it arrives at the top of the
   Field Workspace queue; it lights its cell on the public map. Its
   StrayPaw ID is on all three screens, because it is the same record on
   all three. The screens are drawn, the request is
   the record's own (its condition, its locality, its date), and the rest
   of the queue and the map are the city's real open work. It plays while
   on screen and rests on the last screen under reduced motion. On a phone
   the three screens take turns.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin } from "lucide-react";
import { HexPlate, type Box, type PlateCell } from "@/components/system/HexPlate";
import { StrayPawMark } from "@/components/site/SiteHeader";

type Report = { date: string; condition: string; locality: string; cell: string; critical: boolean; straypawId: string; animalId: string };
type Desk = {
  live: number; critical: number; older: number;
  queue: { condition: string; locality: string; days: number; critical: boolean; overdue: boolean }[];
  cells: { key: string; ring: number[]; open: number }[];
  box: Box;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const waited = (d: number) => (d < 14 ? `${d} day${d === 1 ? "" : "s"}` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`);
const STEPS = ["Report", "Field Workspace", "Public map"];
const HOLD = [2200, 1700, 2600, 3600]; // how long each moment is held, in ms

export function Relay({ city, desk, report }: { city: string; desk: Desk; report: Report | null }) {
  const el = useRef<HTMLElement>(null);
  const [step, setStep] = useState(3);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = el.current; if (!node) return;
    setStep(0);
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.35 });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!live) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % 4), HOLD[step]);
    return () => window.clearTimeout(t);
  }, [live, step]);

  const cells: PlateCell[] = useMemo(() => desk.cells.map((c) => ({
    key: c.key, ring: c.ring,
    fill: report && c.key === report.cell && step >= 3 ? "var(--sp-flame)" : c.open ? "var(--sp-seq-2)" : "var(--sp-seq-1)",
    opacity: report && c.key === report.cell ? 1 : 0.8,
    selected: !!report && c.key === report.cell && step >= 3,
  })), [desk.cells, report, step]);

  /* The report's own cell, found on the plate, ringed in flame once it arrives. */
  const mark = useMemo(() => {
    const c = report ? desk.cells.find((x) => x.key === report.cell) : null;
    if (!c) return null;
    let lng = 0, lat = 0; const n = c.ring.length / 2;
    for (let i = 0; i < c.ring.length; i += 2) { lng += c.ring[i]; lat += c.ring[i + 1]; }
    return { lng: lng / n, lat: lat / n };
  }, [desk.cells, report]);

  if (!report) return null;
  const screen = step <= 1 ? 0 : step === 2 ? 1 : 2; // which screen holds the report now
  const sent = step >= 1;

  return (
    <figure ref={el} className={`rl is-s${step}`} aria-label={`One real request from ${city}, ${report.condition} in ${report.locality} on ${day(report.date)}, record ${report.straypawId}: reported, in the Field Workspace queue, on the public map.`}>
      <ol className="rl-steps" aria-hidden="true">
        {STEPS.map((s, i) => <li key={s} className={i === screen ? "is-on" : i < screen ? "is-past" : ""}><i />{s}</li>)}
      </ol>

      <div className="rl-stage" aria-hidden="true">
        {/* 1 — the resident's phone */}
        <div className={`rl-screen rl-phone ${screen === 0 ? "is-on" : ""}`}>
          <span className="rl-notch" />
          <p className="rl-app"><StrayPawMark size={16} /> Report an animal</p>
          <span className="rl-photo"><span>Photo</span></span>
          <p className="rl-field"><small>What you see</small><b className={report.critical ? "is-hot" : ""}>{report.condition}</b></p>
          <p className="rl-field"><small>Where</small><b><MapPin size={12} /> {report.locality}</b></p>
          <span className={`rl-send ${sent ? "is-sent" : ""}`}>{sent ? <><Check size={13} /> Sent</> : "Send"}</span>
          <p className={`rl-id ${sent ? "is-in" : ""}`}><small>Record</small><b>{report.straypawId}</b></p>
        </div>

        <span className={`rl-link ${step === 1 ? "is-go" : step > 1 ? "is-done" : ""}`}><i /></span>

        {/* 2 — the field team's queue */}
        <div className={`rl-screen rl-desk ${screen === 1 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>Field Workspace</b><span>{city}</span></p>
          <p className="rl-desk-h">What needs attention</p>
          <ul className="rl-queue">
            <li className={`rl-new ${step >= 2 ? "is-in" : ""}`}>
              <i className="is-hot" />
              <span><b>{report.condition}</b><small><span className="rl-id-inline">{report.straypawId}</span> · {report.locality}</small></span>
              <em>New</em>
            </li>
            {desk.queue.slice(0, 3).map((q, i) => (
              <li key={i}>
                <i className={q.critical ? "is-hot" : q.overdue ? "is-due" : ""} />
                <span><b>{q.condition}</b><small>{q.locality}</small></span>
                <small>{waited(q.days)}</small>
              </li>
            ))}
          </ul>
        </div>

        <span className={`rl-link ${step === 3 ? "is-go" : ""}`}><i /></span>

        {/* 3 — the public map */}
        <div className={`rl-screen rl-map ${screen === 2 ? "is-on" : ""}`}>
          <p className="rl-bar"><b>Public map</b><span>{city}</span></p>
          <HexPlate width={240} height={200} box={desk.box} cells={cells} label={`Open requests by cell in ${city}`}
            marks={mark && step >= 3 ? [{ ...mark, r: 9, ring: true }, { ...mark, r: 3.2 }] : []} />
          <p className="rl-map-cap"><i /><span className="rl-id-inline">{report.straypawId}</span> · {report.locality}</p>
        </div>
      </div>

      <figcaption className="rl-cap">
        <span className="sys-mono">A real request · {day(report.date)}</span>
        <span>The same record, <a href={`/dog/${report.animalId}`}>{report.straypawId}</a>, on the resident&apos;s phone, in the Field Workspace and on the public map.</span>
      </figcaption>
    </figure>
  );
}
