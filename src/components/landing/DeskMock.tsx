"use client";

import { useEffect, useRef, useState } from "react";
import { HexPlate, type Box, type PlateCell } from "@/components/system/HexPlate";
import { StrayPawMark } from "@/components/site/SiteHeader";

/* The organisation's dashboard, in miniature: the same headline, the same
   queue with its waiting bars, the same map of where the open work is. It is
   drawn from the sample city's public record, so every row is a real open
   case (condition, locality, how long it has waited) and nothing names the
   organisation that keeps it. Labelled as the sample, like the plate above.

   It moves the way the real one does, and only with real events: the line
   under the queue replays the city's most recent requests, first actions and
   closures, each with its own date, and the cell each one happened in pulses
   on the map. Nothing is invented and nothing is timed to look live: it
   plays while it is on screen, and holds still under reduced motion. */

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
const RAMP = ["var(--sp-att-1)", "var(--sp-att-2)", "var(--sp-att-3)", "var(--sp-att-4)"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => { const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`; };
const KIND = { report: { t: "New request", c: "is-new" }, action: { t: "Field team on site", c: "is-act" }, closed: { t: "Closed after field work", c: "is-done" } } as const;

/** Counts up to n once, when first shown; shows n straight away without motion. */
function useCount(n: number, run: boolean) {
  const [v, setV] = useState(n);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current) return;
    done.current = true;
    let raf = 0; const t0 = performance.now(), D = 900;
    const step = (t: number) => { const p = Math.min(1, (t - t0) / D); setV(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    setV(0); raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, run]);
  return v;
}

export function DeskMock({ city, desk }: { city: string; desk: Desk }) {
  const el = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [calm, setCalm] = useState(true);
  const feed = desk.feed ?? [];
  const [at, setAt] = useState(feed.length ? feed.length - 1 : -1);

  useEffect(() => {
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => { setOnScreen(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { threshold: 0.35 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  /* One real event every few seconds, oldest to newest, then round again. */
  useEffect(() => {
    if (calm || !onScreen || feed.length < 2) return;
    const id = setInterval(() => setAt((i) => (i + 1) % feed.length), 3200);
    return () => clearInterval(id);
  }, [calm, onScreen, feed.length]);

  const live = useCount(desk.live, seen && !calm);
  const crit = useCount(desk.critical, seen && !calm);
  const older = useCount(desk.older, seen && !calm);
  const ev = at >= 0 ? feed[at] : null;

  const max = Math.max(1, ...desk.cells.map((c) => c.open));
  const cells: PlateCell[] = desk.cells.map((c) => ({
    key: c.key, ring: c.ring,
    fill: c.open ? RAMP[Math.min(3, Math.floor(Math.sqrt(c.open / max) * 4))] : "var(--sp-seq-0)",
    selected: !!ev && ev.cell === c.key,
  }));

  return (
    <figure ref={el} className={`ld-desk ${seen ? "is-seen" : ""} ${calm ? "is-calm" : ""}`} aria-label={`The organisation dashboard, drawn from ${city}'s public record`}>
      <div className="ld-desk-bar" aria-hidden>
        <StrayPawMark size={18} />
        <b>Field workspace</b>
        <span className="sys-mono">Sample city · {city}</span>
      </div>
      <div className="ld-desk-body">
        <div className="ld-desk-main">
          <p className="ld-desk-h">What needs attention</p>
          <p className="ld-desk-lede">
            <b>{fmt(live)}</b> cases are live, <b className="is-hot">{fmt(crit)}</b> of them critical.
            {desk.older > 0 && <> <b>{fmt(older)}</b> older ones need a decision.</>}
          </p>
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
          {ev && (
            <p className="ld-desk-feed" aria-live="off">
              <span key={at} className={`ld-desk-ev ${KIND[ev.kind].c}`}>
                <i aria-hidden /><b>{KIND[ev.kind].t}</b>
                <span>{ev.condition === "Not recorded" ? "Case" : ev.condition}{ev.locality ? ` · ${ev.locality}` : ""}</span>
                <small className="sys-mono">{shortDate(ev.date)}</small>
              </span>
            </p>
          )}
          {feed.length > 1 && <p className="ld-desk-replay">Replaying the latest {feed.length} events on the public record</p>}
        </div>
        <div className="ld-desk-geo">
          <p className="ld-desk-eyebrow">Where the open work is</p>
          <HexPlate cells={cells} box={desk.box} width={280} height={250} pad={4} label={`Open cases across ${city}, by cell`} />
        </div>
      </div>
    </figure>
  );
}
