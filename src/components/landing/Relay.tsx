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
import type { Box } from "@/components/system/HexPlate";
import { projector } from "@/components/system/HexPlate";
import { sized } from "@/lib/photo/src";
import { StrayPawMark } from "@/components/site/SiteHeader";

type Report = { date: string; condition: string; locality: string; cell: string; critical: boolean; straypawId: string; animalId: string; photo?: string | null };
type Desk = {
  live: number; critical: number; older: number;
  queue: { condition: string; locality: string; days: number; critical: boolean; overdue: boolean }[];
  cells: { key: string; ring: number[]; open: number }[];
  box: Box;
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const waited = (d: number) => (d < 14 ? `${d} day${d === 1 ? "" : "s"}` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`);
const STEPS = ["Resident", "NGO", "Municipality"];
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

  /* The municipality's screen: the wards around the report, drawn in the
     map's own honeycomb. Each cell is shaded by the open requests recorded
     in it; the report's own cell is outlined in flame when it arrives, never
     finer than the cell. */
  const centre = (ring: number[]) => { let lng = 0, lat = 0; const n = ring.length / 2; for (let i = 0; i < ring.length; i += 2) { lng += ring[i]; lat += ring[i + 1]; } return { lng: lng / n, lat: lat / n }; };
  const muni = useMemo(() => {
    const own = report ? desk.cells.find((x) => x.key === report.cell) ?? null : null;
    if (!own) return null;
    const o = centre(own.ring);
    const near = desk.cells
      .map((c) => ({ c, m: centre(c.ring) }))
      .map((x) => ({ ...x, d: Math.hypot(x.m.lng - o.lng, x.m.lat - o.lat) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 70);
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    for (const { c } of near) for (let i = 0; i < c.ring.length; i += 2) { w = Math.min(w, c.ring[i]); e = Math.max(e, c.ring[i]); s = Math.min(s, c.ring[i + 1]); n = Math.max(n, c.ring[i + 1]); }
    const { p } = projector([w, s, e, n], 320, 220, 10);
    const path = (ring: number[]) => { let d = ""; for (let i = 0; i < ring.length; i += 2) { const [x, y] = p(ring[i], ring[i + 1]); d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; } return d + "Z"; };
    const [ox, oy] = p(o.lng, o.lat);
    return {
      cells: near.map(({ c }) => ({ key: c.key, d: path(c.ring), open: c.open, own: c.key === own.key })),
      at: [ox, oy] as [number, number],
      withWork: desk.cells.filter((c) => c.open > 0).length,
      total: desk.cells.length,
    };
  }, [desk.cells, report]);

  if (!report) return null;
  const screen = step <= 1 ? 0 : step === 2 ? 1 : 2; // which screen holds the report now
  const sent = step >= 1;

  return (
    <figure ref={el} className={`rl is-s${step}`} aria-label={`One real request from ${city}, ${report.condition} in ${report.locality} on ${day(report.date)}, record ${report.straypawId}: reported by a resident, worked by an NGO and visible to the municipality.`}>
      <ol className="rl-steps" aria-hidden="true">
        {STEPS.map((s, i) => <li key={s} className={i === screen ? "is-on" : i < screen ? "is-past" : ""}><i />{s}</li>)}
      </ol>

      <div className="rl-stage" aria-hidden="true">
        <svg className="rl-wire" viewBox="0 0 1200 420" preserveAspectRatio="none">
          <path d="M150 210 C280 210 292 92 430 92 H760 C902 92 905 258 1050 258" />
          <path className="is-echo" d="M150 226 C280 226 302 110 438 110 H752 C890 110 918 274 1050 274" />
        </svg>
        {/* 1 — the resident's phone */}
        <div className={`rl-screen rl-phone ${screen === 0 ? "is-on" : ""}`}>
          <span className="rl-notch" />
          <p className="rl-app"><StrayPawMark size={16} /> Resident report</p>
          {/* The report's own photograph when the record has one; otherwise an
              example photograph (Pinky, from the Bengaluru record), labelled
              as the example it is. */}
          <span className="rl-photo has-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.photo ? sized(report.photo, 480) : "/pinky-bengaluru.jpg"} alt="" loading="lazy" />
            {!report.photo && <em className="rl-photo-tag">Example photo</em>}
          </span>
          <p className="rl-field"><small>What you see</small><b className={report.critical ? "is-hot" : ""}>{report.condition}</b></p>
          <p className="rl-field"><small>Where</small><b><MapPin size={12} /> {report.locality}</b></p>
          <span className={`rl-send ${sent ? "is-sent" : ""}`}>{sent ? <><Check size={13} /> Sent</> : "Send"}</span>
          <p className={`rl-id ${sent ? "is-in" : ""}`}><small>Record</small><b>{report.straypawId}</b></p>
        </div>

        <span className={`rl-link ${step === 1 ? "is-go" : step > 1 ? "is-done" : ""}`}><b>{report.straypawId}</b><i /></span>

        {/* 2 — the field team's queue */}
        <div className={`rl-screen rl-desk ${screen === 1 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>NGO · Field Workspace</b><span>{city}</span></p>
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

        <span className={`rl-link ${step === 3 ? "is-go" : ""}`}><b>{report.straypawId}</b><i /></span>

        {/* 3 — the municipality's coverage view */}
        <div className={`rl-screen rl-map ${screen === 2 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>Municipality · coverage</b><span>{city}</span></p>
          {muni && (
            <svg className={`rl-wards ${step >= 3 ? "is-lit" : ""}`} viewBox="0 0 320 220" role="img" aria-label={`Wards around ${report.locality}, shaded by open requests on the record, with the report's own area outlined`}>
              {muni.cells.map((c) => <path key={c.key} d={c.d} className={`rl-ward o${Math.min(c.open, 3)}${c.own ? " is-own" : ""}`} />)}
              {step >= 3 && <>
                <circle className="rl-pulse" cx={muni.at[0]} cy={muni.at[1]} r="9" />
                <circle className="rl-pin" cx={muni.at[0]} cy={muni.at[1]} r="3.4" />
              </>}
            </svg>
          )}
          <div className="rl-key"><span><i className="o1" />1</span><span><i className="o2" />2</span><span><i className="o3" />3+ open</span><span><i className="o0" />on record, none open</span></div>
          <dl className="rl-figs">
            <div><dt>Open, 90 days</dt><dd>{desk.live.toLocaleString("en-IN")}</dd></div>
            <div><dt>Critical</dt><dd className="is-hot">{desk.critical.toLocaleString("en-IN")}</dd></div>
            <div><dt>Areas with work</dt><dd>{muni ? `${muni.withWork}/${muni.total}` : "—"}</dd></div>
          </dl>
          <p className="rl-map-cap"><i /><span className="rl-id-inline">{report.straypawId}</span> · {report.locality}</p>
        </div>
      </div>

      <figcaption className="rl-cap">
        <span className="sys-mono">A real request · {day(report.date)}</span>
        <span>The same record, <a href={`/dog/${report.animalId}`}>{report.straypawId}</a>, reported by a resident, worked by an NGO and available in municipal coverage.</span>
      </figcaption>
    </figure>
  );
}
