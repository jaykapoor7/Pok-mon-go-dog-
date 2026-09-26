"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HexPlate, type Box, type PlateCell } from "@/components/system/HexPlate";
import { StrayPawMark } from "@/components/site/SiteHeader";
import { useCount } from "./useCount";

/* ════════════════════════════════════════════════════════════════════
   The organisation's dashboard, in miniature, on the hero's night ground.

   The same headline, the same queue with its waiting bars, the same map of
   where the open work is, drawn from the sample city's public record: every
   row is a real open case and nothing names the organisation that keeps it.

   It moves only with real events. The city's latest requests, first
   actions and closures replay in order, each with its own date: the event
   slides in above the queue, its cell lights on the map (flame for a new
   request, blue for a team on site, cream for a close) and rings, the cells
   of the events just before it keep a fading afterglow, and the strip along
   the foot marks every event on its date. The figures are today's; the
   replay does not change them. It plays while on screen and holds still,
   on the latest event, under reduced motion.
   ════════════════════════════════════════════════════════════════════ */

type FeedItem = { kind: "report" | "action" | "closed"; date: string; condition: string; locality: string; cell: string; critical: boolean };
type Desk = {
  live: number; critical: number; older: number;
  queue: { condition: string; locality: string; days: number; critical: boolean; overdue: boolean }[];
  cells: { key: string; ring: number[]; open: number }[];
  box: Box;
  feed?: FeedItem[];
};

const fmt = (n: number) => n.toLocaleString("en-IN");
const waited = (d: number) => (d < 14 ? `${d} day${d === 1 ? "" : "s"}` : d < 60 ? `${Math.round(d / 7)} weeks` : `${Math.round(d / 30)} months`);
const RAMP = ["var(--sp-nseq-1)", "var(--sp-nseq-2)", "var(--sp-nseq-3)", "var(--sp-nseq-4)"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const longDate = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const KIND = {
  report: { t: "New request", c: "is-new", light: "var(--sp-flame)" },
  action: { t: "Field team on site", c: "is-act", light: "var(--sp-sky)" },
  closed: { t: "Closed after field work", c: "is-done", light: "var(--sp-night-text)" },
} as const;
const STEP_MS = 3000;
const GLOW = 5; // how many events back a cell keeps its afterglow

export function DeskMock({ city, desk }: { city: string; desk: Desk }) {
  const el = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [calm, setCalm] = useState(true);
  const feed = useMemo(() => desk.feed ?? [], [desk.feed]);
  const [at, setAt] = useState(feed.length ? feed.length - 1 : -1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(reduce);
    if (!reduce && feed.length > 1) setAt(0);
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => { setOnScreen(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.3 });
    io.observe(node);
    return () => io.disconnect();
  }, [feed.length]);

  /* One real event every few seconds, oldest to newest, then round again. */
  useEffect(() => {
    if (calm || !onScreen || feed.length < 2) return;
    const id = setInterval(() => setAt((i) => (i + 1) % feed.length), STEP_MS);
    return () => clearInterval(id);
  }, [calm, onScreen, feed.length]);

  const live = useCount(desk.live, seen && !calm);
  const crit = useCount(desk.critical, seen && !calm);
  const older = useCount(desk.older, seen && !calm);
  const ev = at >= 0 ? feed[at] : null;

  /* Where each cell sits on the plate, for the rings. */
  const centre = useMemo(() => {
    const m = new Map<string, { lng: number; lat: number }>();
    for (const c of desk.cells) {
      let x = 0, y = 0; const n = c.ring.length / 2;
      for (let i = 0; i < c.ring.length; i += 2) { x += c.ring[i]; y += c.ring[i + 1]; }
      m.set(c.key, { lng: x / n, lat: y / n });
    }
    return m;
  }, [desk.cells]);

  /* The afterglow: the cells of the events just replayed, fading with age. */
  const glow = useMemo(() => {
    const g = new Map<string, { age: number; kind: FeedItem["kind"] }>();
    if (at < 0) return g;
    for (let k = 0; k <= GLOW && at - k >= 0; k++) { const e = feed[at - k]; if (!g.has(e.cell)) g.set(e.cell, { age: k, kind: e.kind }); }
    return g;
  }, [at, feed]);

  const max = Math.max(1, ...desk.cells.map((c) => c.open));
  const cells: PlateCell[] = desk.cells.map((c) => {
    const lit = glow.get(c.key);
    return {
      key: c.key, ring: c.ring,
      fill: lit ? KIND[lit.kind].light : c.open ? RAMP[Math.min(3, Math.floor(Math.sqrt(c.open / max) * 4))] : "var(--sp-nseq-0, rgba(143,183,255,0.14))",
      opacity: lit ? Math.max(0.35, 1 - lit.age / (GLOW + 1)) : 0.9,
      stroke: "var(--sp-night)",
    };
  });

  /* The foot strip: every replayed event on its own date. */
  const span = useMemo(() => {
    if (feed.length < 2) return null;
    const t = feed.map((e) => Date.parse(e.date));
    const lo = Math.min(...t), hi = Math.max(...t);
    return { lo, hi, x: (iso: string) => (hi > lo ? ((Date.parse(iso) - lo) / (hi - lo)) * 100 : 50) };
  }, [feed]);
  const c = ev ? centre.get(ev.cell) : null;

  return (
    <figure ref={el} className={`ld-desk ${seen ? "is-seen" : ""} ${calm ? "is-calm" : ""}`} aria-label={`The Field Workspace, drawn from ${city}'s public record`}>
      <div className="ld-desk-bar" aria-hidden>
        <StrayPawMark size={18} />
        <b>Field Workspace</b>
        <span className="ld-desk-city sys-mono">Sample city · {city}</span>
        {ev && <span className="ld-desk-clock sys-mono"><i />{longDate(ev.date)}</span>}
      </div>
      <div className="ld-desk-body">
        <div className="ld-desk-main">
          <p className="ld-desk-h">What needs attention</p>
          <p className="ld-desk-lede">
            <b>{fmt(live)}</b> cases are live, <b className="is-hot">{fmt(crit)}</b> of them critical.
            {desk.older > 0 && <> <b>{fmt(older)}</b> older ones need a decision.</>}
          </p>
          <div className="ld-desk-inbox" aria-live="off">
            {ev && (
              <p key={at} className={`ld-desk-ev ${KIND[ev.kind].c}`}>
                <i aria-hidden />
                <span><b>{KIND[ev.kind].t}</b><small>{ev.condition === "Not recorded" ? "Case" : ev.condition}{ev.locality ? ` · ${ev.locality}` : ""}</small></span>
                <time className="sys-mono" dateTime={ev.date}>{shortDate(ev.date)}</time>
              </p>
            )}
          </div>
          <ol className="ld-desk-queue">
            {desk.queue.map((q, i) => (
              <li key={i} style={{ ["--i" as string]: i }}>
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
          <HexPlate cells={cells} box={desk.box} width={300} height={270} pad={6} label={`Open cases across ${city}, by cell`}>
            {(p) => c && ev ? (() => {
              const [x, y] = p(c.lng, c.lat);
              return (
                <g key={at} className={`ld-desk-ping ${KIND[ev.kind].c}`}>
                  <circle cx={x} cy={y} r="5" className="ld-desk-ring" />
                  <circle cx={x} cy={y} r="5" className="ld-desk-ring is-late" />
                  <circle cx={x} cy={y} r="2.6" className="ld-desk-dot" />
                </g>
              );
            })() : null}
          </HexPlate>
          <p className="ld-desk-legend" aria-hidden>
            <span><i className="is-new" />New request</span>
            <span><i className="is-act" />Team on site</span>
            <span><i className="is-done" />Closed</span>
          </p>
        </div>
      </div>
      {span && (
        <div className="ld-desk-strip" aria-hidden>
          <span className="sys-mono">{shortDate(feed[0].date)}</span>
          <span className="ld-desk-track">
            {feed.map((e, i) => <i key={i} className={`${KIND[e.kind].c} ${i === at ? "is-now" : i < at ? "is-past" : ""}`} style={{ left: `${span.x(e.date)}%` }} />)}
          </span>
          <span className="sys-mono">{shortDate(feed[feed.length - 1].date)}</span>
        </div>
      )}
      <figcaption className="ld-desk-replay">Replaying the latest {feed.length} events on the public record, each on its own date. The figures are today&apos;s.</figcaption>
    </figure>
  );
}
