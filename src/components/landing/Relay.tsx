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
const NOW = ["Sent by a resident", "In the rescue queue", "On the city map"];
const HOLD = [2200, 1700, 2600, 3600]; // how long each moment is held, in ms

export function Relay({ city, desk, report }: { city: string; desk: Desk; report: Report | null }) {
  const el = useRef<HTMLElement>(null);
  const [step, setStep] = useState(3);
  const [live, setLive] = useState(false);
  /* Phone layout: which of the three stacked steps has come into view. */
  const stackRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [seen, setSeen] = useState([true, true, true]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const nodes = stackRefs.current.filter(Boolean) as HTMLLIElement[];
    if (!nodes.length || !window.matchMedia("(max-width: 760px)").matches) return;
    setSeen([false, false, false]);
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { const i = nodes.indexOf(e.target as HTMLLIElement); setSeen((s) => s.map((v, k) => v || k === i)); }
    }, { rootMargin: "0px 0px -35% 0px", threshold: 0.2 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

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
     when it arrives, never finer than the cell. */
  const muni = useMemo(() => buildPlate(desk, report), [desk, report]);
  if (!report) return null;
  const screen = step <= 1 ? 0 : step === 2 ? 1 : 2; // which screen holds the report now
  const sent = step >= 1;

  return (
    <figure ref={el} className={`rl is-s${step}`} data-ld-reveal="stage" aria-label={`One real request from ${city}, ${report.condition} in ${report.locality} on ${day(report.date)}, record ${report.straypawId}: reported by a resident, worked by an NGO and visible to the municipality.`}>
      <ol className="rl-steps" aria-hidden="true">
        {STEPS.map((s, i) => <li key={s} className={i === screen ? "is-on" : i < screen ? "is-past" : ""} style={{ ["--hold" as string]: `${i === 0 ? HOLD[0] + HOLD[1] : i === 1 ? HOLD[2] : HOLD[3]}ms` }}><i />{s}<b className="rl-fill" /></li>)}
      </ol>
      {/* On a phone, one line says what is happening on the screen shown. */}
      <p className="rl-now" key={screen} aria-hidden="true">{NOW[screen]}</p>

      <div className="rl-stage" aria-hidden="true">
        <svg className="rl-wire" viewBox="0 0 1200 420" preserveAspectRatio="none">
          <path d="M150 210 C280 210 292 92 430 92 H760 C902 92 905 258 1050 258" />
          <path className="is-echo" d="M150 226 C280 226 302 110 438 110 H752 C890 110 918 274 1050 274" />
        </svg>
        {/* 1. The resident's phone. */}
        <div className={`rl-screen rl-phone ${screen === 0 ? "is-on" : ""}`}>
          <span className="rl-notch" />
          <p className="rl-app"><StrayPawMark size={16} /> Resident report</p>
          {/* The report's own photograph when the record has one; otherwise an
              example photograph (Pinky, from the Bengaluru record), labelled
              as the example it is. */}
          <span className="rl-photo has-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.photo ? sized(report.photo, 480) : "/seed-dogs/dog3.jpg"} alt="" loading="lazy" />
            {!report.photo && <em className="rl-photo-tag">Example photo</em>}
          </span>
          <p className="rl-field"><small>What you see</small><b className={report.critical ? "is-hot" : ""}>{report.condition}</b></p>
          <p className="rl-field"><small>Where</small><b><MapPin size={12} /> {report.locality}</b></p>
          <span className={`rl-send ${sent ? "is-sent" : ""}`}>{sent ? <><Check size={13} /> Sent</> : "Send"}</span>
          <p className={`rl-id ${sent ? "is-in" : ""}`}><small>Record</small><b>{report.straypawId}</b></p>
        </div>

        <span className={`rl-link ${step === 1 ? "is-go" : step > 1 ? "is-done" : ""}`}><b>{report.straypawId}</b><i /></span>

        {/* 2. The field team's queue. */}
        <div className={`rl-screen rl-desk ${screen === 1 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>NGO · Field Workspace</b><span>{city}</span></p>
          <p className="rl-desk-h">Needs attention</p>
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
          <p className="rl-desk-foot"><b>{desk.live}</b> marked open in {city} in the last 90 days{desk.critical ? <> · <b className="is-hot">{desk.critical}</b> critical</> : null}</p>
        </div>

        <span className={`rl-link ${step === 3 ? "is-go" : ""}`}><b>{report.straypawId}</b><i /></span>

        {/* 3. The municipality's city view. */}
        <div className={`rl-screen rl-map ${screen === 2 ? "is-on" : ""}`}>
          <p className="rl-bar"><StrayPawMark size={16} /> <b>Municipality · city view</b><span>{city}</span></p>
          {muni && (
            <Plate muni={muni} report={report} lit={step >= 3} />
          )}
          <div className="rl-legend">
            <span className="rl-ramp"><i className="o0" /><i className="o1" /><i className="o2" /><i className="o3" /></span>
            <span>open requests: none, 1, 2, 3+</span>
            <span className="rl-nm"><i />critical</span>
          </div>
          {muni && (
            <div className="rl-read">
              <p className="rl-share">
                <span>Open in <b>{muni.withWork}</b> of {muni.total} mapped areas</span>
                <i><em style={{ width: `${Math.max(2, (muni.withWork / Math.max(1, muni.total)) * 100)}%` }} /></i>
              </p>
              {muni.first && (
                <p className="rl-first"><small>Priority</small><b>{muni.first.name}</b><span className="sys-mono">{muni.first.open} open{muni.first.crit ? ` · ${muni.first.crit} critical` : ""}</span></p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* On a phone: the same three moments as one scroll, top to bottom. Nothing
          waits on a timer; each step lights as it comes into view. */}
      <ol className="rl-stack" aria-hidden="true">
        <li ref={(n) => { stackRefs.current[0] = n; }} className={seen[0] ? "is-seen" : ""}>
          <p className="rl-sk-h"><span className="rl-sk-n">1</span><b>Resident</b><span>sends the report</span></p>
          <div className="rl-sk-card rl-sk-report">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={report.photo ? sized(report.photo, 240) : "/seed-dogs/dog3.jpg"} alt="" loading="lazy" />
            <span><small>What you see</small><b className={report.critical ? "is-hot" : ""}>{report.condition}</b><small><MapPin size={11} /> {report.locality}</small></span>
            <em><Check size={12} /> Sent</em>
            {!report.photo && <i className="rl-sk-tag">Example photo</i>}
          </div>
        </li>
        <li ref={(n) => { stackRefs.current[1] = n; }} className={seen[1] ? "is-seen" : ""}>
          <p className="rl-sk-h"><span className="rl-sk-n">2</span><b>NGO</b><span>takes the case</span></p>
          <div className="rl-sk-card rl-sk-queue">
            <p className="rl-sk-new"><i className="is-hot" /><span><b>{report.condition}</b><small>{report.locality}</small></span><em>New</em></p>
            {desk.queue.slice(0, 2).map((q, i) => <p key={i}><i className={q.critical ? "is-hot" : ""} /><span><b>{q.condition}</b><small>{q.locality}</small></span><small>{waited(q.days)}</small></p>)}
            <p className="rl-sk-foot"><b>{desk.live}</b> marked open in the last 90 days</p>
          </div>
        </li>
        <li ref={(n) => { stackRefs.current[2] = n; }} className={seen[2] ? "is-seen" : ""}>
          <p className="rl-sk-h"><span className="rl-sk-n">3</span><b>Municipality</b><span>sees the pattern</span></p>
          <div className="rl-sk-card rl-sk-map">{muni ? <Plate muni={muni} report={report} lit={seen[2]} /> : null}</div>
        </li>
      </ol>

      <figcaption className="rl-cap">
        <span className="sys-mono">Real request · {day(report.date)}</span>
        <span>Record <a href={`/dog/${report.animalId}`}>{report.straypawId}</a>. One identity from report to field work to city view.</span>
      </figcaption>
    </figure>
  );
}


/* The municipality's ward plate, shared by the desktop relay and the phone's stacked steps. */
type Muni = NonNullable<ReturnType<typeof buildPlate>>;
function Plate({ muni, report, lit }: { muni: Muni; report: Report; lit: boolean }) {
  return (
    <div className={`rl-plate ${lit ? "is-lit" : ""}`}>
      <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label={`Areas around ${report.locality}, sized by open requests on the record, with the report's own area marked`}>
        <defs><clipPath id="rl-frame"><rect width={PW} height={PH} /></clipPath></defs>
        <g clipPath="url(#rl-frame)">
          {/* Ripples from the report's area: the reach of one record. */}
          {[44, 78, 116, 158].map((r, i) => <circle key={r} className={`rl-ripple r${i}`} cx={muni.at[0]} cy={muni.at[1]} r={r} />)}
          {/* Each mapped area as a dot, larger with more open requests. */}
          {muni.dots.filter((c) => !c.own).map((c) => <circle key={c.key} className={`rl-dot o${Math.min(c.open, 3)}${c.crit ? " is-crit" : ""}`} cx={c.x} cy={c.y} r={c.r} />)}
          {muni.dots.filter((c) => c.own).map((c) => <circle key={c.key} className="rl-dot is-own" cx={c.x} cy={c.y} r={Math.max(c.r, 5)} />)}
          {muni.labels.map((l) => <text key={l.name} x={l.x} y={l.y} className="rl-place">{l.name}</text>)}
          <g className="rl-scale" transform={`translate(10 ${PH - 12})`}>
            <path d={`M0 -4V0H${muni.scale.px.toFixed(1)}V-4`} />
            <text x={muni.scale.px + 5} y="0">{muni.scale.label}</text>
          </g>
        </g>
        {lit && <>
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
    dots: shown.map(({ c, m }) => {
      const [x, y] = p(m.lng, m.lat);
      const [ex, ey] = p(c.ring[0], c.ring[1]);
      const cell = Math.hypot(ex - x, ey - y) * 0.86;
      const r = c.open > 0 ? cell * (0.42 + 0.16 * Math.min(c.open, 3)) : Math.max(1.4, cell * 0.22);
      return { key: c.key, x, y, r, open: c.open, crit: (c.crit ?? 0) > 0, own: c.key === own.key };
    }),
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
