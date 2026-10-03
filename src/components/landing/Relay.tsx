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
  cells: { key: string; ring: number[]; open: number; crit?: number; name?: string }[];
  edge?: number[][];
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

  /* The municipality's screen: a ward plate around the report, drawn in the
     map's own honeycomb and encodings. Cells are shaded by open requests on
     the record (sequential blue), the ring past the last record is dashed
     (not mapped), a few localities are named, and a locator shows where in
     the city the plate sits. The report's own cell takes the one flame mark
     when it arrives — never finer than the cell. */
  const muni = useMemo(() => buildPlate(desk, report), [desk, report]);
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
            {desk.queue.slice(0, 4).map((q, i) => (
              <li key={i}>
                <i className={q.critical ? "is-hot" : q.overdue ? "is-due" : ""} />
                <span><b>{q.condition}</b><small>{q.locality}</small></span>
                <small>{waited(q.days)}</small>
              </li>
            ))}
          </ul>
          <p className="rl-desk-foot"><b>{desk.live}</b> open in {city}{desk.critical ? <> · <b className="is-hot">{desk.critical}</b> critical</> : null}</p>
        </div>

        <span className={`rl-link ${step === 3 ? "is-go" : ""}`}><b>{report.straypawId}</b><i /></span>

        {/* 3 — the municipality's ward plate */}
        <div className={`rl-screen rl-map ${screen === 2 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>Municipality · wards</b><span>{city}</span></p>
          {muni && (
            <div className={`rl-plate ${step >= 3 ? "is-lit" : ""}`}>
              <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={`Wards around ${report.locality}, shaded by open requests on the record, with the report's own area marked`}>
                <defs><clipPath id="rl-frame"><rect width={PW} height={PH} /></clipPath></defs>
                <g clipPath="url(#rl-frame)">
                  {muni.grat.map((g, i) => <line key={i} className="rl-grat" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />)}
                  {muni.edge.map((d, i) => <path key={i} d={d} className="rl-edge" />)}
                  {muni.cells.filter((c) => !c.own).map((c) => <path key={c.key} d={c.d} className={`rl-ward o${Math.min(c.open, 3)}`} />)}
                  {muni.cells.filter((c) => c.own).map((c) => <path key={c.key} d={c.d} className={`rl-ward o${Math.min(c.open, 3)} is-own`} />)}
                  {muni.labels.map((l) => <text key={l.name} x={l.x} y={l.y} className="rl-place">{l.name}</text>)}
                  {muni.ticks.map((t, i) => <text key={i} x={t.x} y={t.y} className={`rl-tick ${t.v ? "is-v" : ""}`}>{t.t}</text>)}
                  <g className="rl-scale" transform={`translate(10 ${PH - 12})`}>
                    <path d={`M0 -4V0H${muni.scale.px.toFixed(1)}V-4`} />
                    <text x={muni.scale.px + 5} y="0">{muni.scale.label}</text>
                  </g>
                  <g className="rl-locator" transform={`translate(${PW - LW - 8} 8)`}>
                    <rect width={LW} height={LH} />
                    {muni.locator.cells.map((d, i) => <path key={i} d={d} />)}
                    <rect className="rl-view" x={muni.locator.view[0]} y={muni.locator.view[1]} width={muni.locator.view[2]} height={muni.locator.view[3]} />
                  </g>
                </g>
                {step >= 3 && <>
                  <circle className="rl-pulse" cx={muni.at[0]} cy={muni.at[1]} r="9" />
                  <circle className="rl-pin" cx={muni.at[0]} cy={muni.at[1]} r="3" />
                  <path className="rl-leader" d={`M${muni.at[0]} ${muni.at[1]}L${muni.call.x} ${muni.call.y}`} />
                </>}
              </svg>
              <p className={`rl-call ${muni.call.left ? "is-left" : ""}`} style={{ left: `${(muni.call.x / PW) * 100}%`, top: `${(muni.call.y / PH) * 100}%` }}>
                <small>New · {report.straypawId}</small>
                <b>{report.condition}</b>
                <span>{report.locality}</span>
              </p>
            </div>
          )}
          <div className="rl-legend">
            <span className="rl-ramp"><i className="o0" /><i className="o1" /><i className="o2" /><i className="o3" /></span>
            <span>open requests: none, 1, 2, 3+</span>
            <span className="rl-nm"><i />not mapped</span>
          </div>
          {muni && (
            <div className="rl-read">
              <p className="rl-share">
                <span>Open work in <b>{muni.withWork}</b> of {muni.total} mapped areas</span>
                <i><em style={{ width: `${Math.max(2, (muni.withWork / Math.max(1, muni.total)) * 100)}%` }} /></i>
              </p>
              {muni.first && (
                <p className="rl-first"><small>Act first</small><b>{muni.first.name}</b><span className="sys-mono">{muni.first.open} open{muni.first.crit ? ` · ${muni.first.crit} critical` : ""}</span></p>
              )}
            </div>
          )}
        </div>
      </div>

      <figcaption className="rl-cap">
        <span className="sys-mono">A real request · {day(report.date)}</span>
        <span>The same record, <a href={`/dog/${report.animalId}`}>{report.straypawId}</a>, reported by a resident, worked by an NGO and available in municipal coverage.</span>
      </figcaption>
    </figure>
  );
}

/* ── The ward plate ─────────────────────────────────────────────────── */
const PW = 320, PH = 236, LW = 64, LH = 50;
const centreOf = (ring: number[]) => { let lng = 0, lat = 0; const n = ring.length / 2; for (let i = 0; i < ring.length; i += 2) { lng += ring[i]; lat += ring[i + 1]; } return { lng: lng / n, lat: lat / n }; };

function buildPlate(desk: Desk, report: Report | null) {
  const own = report ? desk.cells.find((x) => x.key === report.cell) ?? null : null;
  if (!own) return null;
  const o = centreOf(own.ring);
  const k = Math.cos((o.lat * Math.PI) / 180);
  const placed = desk.cells.map((c) => ({ c, m: centreOf(c.ring) }));
  // The plate's extent: the nearest sixty mapped cells, widened to the frame.
  const near = placed.map((x) => ({ ...x, d: Math.hypot((x.m.lng - o.lng) * k, x.m.lat - o.lat) })).sort((a, b) => a.d - b.d).slice(0, 60);
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const { m } of near) { w = Math.min(w, m.lng); e = Math.max(e, m.lng); s = Math.min(s, m.lat); n = Math.max(n, m.lat); }
  const cx = (w + e) / 2, cy = (s + n) / 2;
  let hw = ((e - w) / 2) * k, hh = (n - s) / 2;
  if (hw / hh > PW / PH) hh = (hw * PH) / PW; else hw = (hh * PW) / PH;
  hw *= 1.08; hh *= 1.08;
  const box: Box = [cx - hw / k, cy - hh, cx + hw / k, cy + hh];
  const { p, km } = projector(box, PW, PH, 0);
  const path = (ring: number[]) => { let d = ""; for (let i = 0; i < ring.length; i += 2) { const [x, y] = p(ring[i], ring[i + 1]); d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; } return d + "Z"; };
  const inside = (m: { lng: number; lat: number }) => m.lng > box[0] - 0.01 && m.lng < box[2] + 0.01 && m.lat > box[1] - 0.01 && m.lat < box[3] + 0.01;
  const shown = placed.filter((x) => inside(x.m));
  const [ax, ay] = p(o.lng, o.lat);

  const callLeft = ax > PW * 0.55;
  const call = { x: callLeft ? ax - 26 : ax + 26, y: Math.min(PH - 46, Math.max(LH + 34, ay - 30)), left: callLeft };
  const callBox = { x0: callLeft ? call.x - 140 : call.x, x1: callLeft ? call.x : call.x + 140, y0: call.y - 30, y1: call.y + 30 };
  // Localities to name: the busiest cells in view, kept apart from each other and the report.
  const labels: { name: string; x: number; y: number }[] = [];
  for (const x of [...shown].filter((x) => x.c.name && x.c.key !== own.key && x.c.open > 0).sort((a, b) => b.c.open - a.c.open)) {
    const [lx, ly] = p(x.m.lng, x.m.lat);
    const name = (x.c.name as string).split(/[,/(]/)[0].trim();
    const half = name.length * 2.3 + 4;
    if (name.length < 3 || name.length > 22 || lx - half < 30 || lx + half > PW - 6 || ly < LH + 22 || ly > PH - 28) continue;
    if (Math.hypot(lx - ax, ly - ay) < 64 || labels.some((l) => Math.abs(l.x - lx) < half + 40 && Math.abs(l.y - ly) < 20)) continue;
    if (labels.some((l) => l.name === name)) continue;
    if (lx + half > callBox.x0 && lx - half < callBox.x1 && ly + 6 > callBox.y0 && ly - 6 < callBox.y1) continue;
    labels.push({ name, x: lx, y: ly + 3 });
    if (labels.length === 3) break;
  }

  // Graticule at a round step, labelled on the frame's edges.
  const step = (box[3] - box[1]) > 0.06 ? 0.02 : 0.01;
  const grat: { x1: number; y1: number; x2: number; y2: number }[] = [], ticks: { x: number; y: number; t: string; v?: boolean }[] = [];
  for (let lng = Math.ceil(box[0] / step) * step; lng < box[2]; lng += step) { const [x] = p(lng, box[1]); grat.push({ x1: x, y1: 0, x2: x, y2: PH }); if (x > 20 && x < PW - LW - 30) ticks.push({ x: x + 3, y: 9, t: `${lng.toFixed(2)}°E` }); }
  for (let lat = Math.ceil(box[1] / step) * step; lat < box[3]; lat += step) { const [, y] = p(box[0], lat); grat.push({ x1: 0, y1: y, x2: PW, y2: y }); if (y > 20 && y < PH - 30) ticks.push({ x: 4, y: y - 3, t: `${lat.toFixed(2)}°N`, v: true }); }

  const pick = [0.5, 1, 2].find((d) => km(d) >= 34) ?? 2;
  const first = [...desk.cells].filter((c) => c.name && c.open > 0).sort((a, b) => ((b.crit ?? 0) * 2 + b.open) - ((a.crit ?? 0) * 2 + a.open))[0];

  // The locator: the whole city, small, with the plate's extent drawn on it.
  const [W, S, E, N] = desk.box;
  const L = projector([W, S, E, N], LW, LH, 5);
  const lpath = (ring: number[]) => { let d = ""; for (let i = 0; i < ring.length; i += 2) { const [x, y] = L.p(ring[i], ring[i + 1]); d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`; } return d + "Z"; };
  const [vx0, vy0] = L.p(box[0], box[3]), [vx1, vy1] = L.p(box[2], box[1]);
  const clampV = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const vx = clampV(vx0, LW), vy = clampV(vy0, LH);

  return {
    cells: shown.map(({ c }) => ({ key: c.key, d: path(c.ring), open: c.open, own: c.key === own.key })),
    edge: (desk.edge ?? []).filter((r) => inside(centreOf(r))).map(path),
    labels, grat, ticks,
    scale: { px: km(pick), label: pick < 1 ? "500 m" : `${pick} km` },
    at: [ax, ay] as [number, number],
    call,
    withWork: desk.cells.filter((c) => c.open > 0).length,
    total: desk.cells.length,
    first: first ? { name: first.name as string, open: first.open, crit: first.crit ?? 0 } : null,
    locator: { cells: desk.cells.filter((c) => { const m = centreOf(c.ring); return m.lng >= W && m.lng <= E && m.lat >= S && m.lat <= N; }).map((c) => lpath(c.ring)), view: [vx, vy, Math.max(3, clampV(vx1, LW) - vx), Math.max(3, clampV(vy1, LH) - vy)] as [number, number, number, number] },
  };
}
