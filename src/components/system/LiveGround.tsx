"use client";

/* ════════════════════════════════════════════════════════════════════
   A living ground: a city's honeycomb with its real record replayed.

   The city's own H3 cells, drawn faint on night. Its dated records are
   replayed oldest first: each pings its cell (a report sky, care teal, an
   animal's first record bone) and a cell steps up the night blue ramp as
   records gather — more is brighter, the map's own encoding. A running
   month says how far the replay has reached; when the record is told it
   settles, clears and begins again.

   Painted by touching cells directly (no re-render per tick), only while
   `running`. Under `calm` (reduced motion) the finished record is drawn,
   still. The same ground stands under the landing register and the
   in-app page plates.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef } from "react";
import { projector, type Box } from "@/components/system/HexPlate";

export type GroundData = { city: string; box: Box; rings: number[][]; events: number[] };

const W = 1600, H = 900;
const EPOCH_MS = Date.UTC(2000, 0, 1), DAY_MS = 86_400_000;
const LEVELS = ["var(--sp-nseq-1)", "var(--sp-nseq-2)", "var(--sp-nseq-3)", "var(--sp-nseq-4)"];
const PING = ["is-ping", "is-ping is-care", "is-ping is-first"];
const TICK_MS = 90;
const HOLD_MS = 2600;
const CLEAR_MS = 2000;

const monthOf = (day: number) =>
  new Date(EPOCH_MS + day * DAY_MS).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
const levelOf = (count: number) => LEVELS[Math.min(LEVELS.length - 1, Math.floor(Math.log2(count + 1)) - 1)] ?? LEVELS[0];

export function LiveGround({ data, running, calm, replayMs = 48_000, caption, className = "" }: {
  data: GroundData; running: boolean; calm: boolean;
  /** How long one full replay of the record takes. */
  replayMs?: number;
  /** A line before the running month, e.g. "Coimbatore · the register, replayed". */
  caption?: string | null;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const date = useRef<HTMLSpanElement>(null);
  const pos = useRef(0);
  const counts = useRef<Uint16Array>(new Uint16Array(0));
  const n = Math.floor(data.events.length / 3);

  const paths = useMemo(() => {
    const { p } = projector(data.box, W, H, 0);
    return data.rings.map((r) => {
      let d = "";
      for (let i = 0; i < r.length; i += 2) {
        const [x, y] = p(r[i], r[i + 1]);
        d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return `${d}Z`;
    });
  }, [data]);

  /* A new city starts its replay from the beginning. */
  useEffect(() => {
    counts.current = new Uint16Array(data.rings.length);
    pos.current = 0;
    root.current?.querySelectorAll<SVGPathElement>("path.lg-cell").forEach((el) => { el.style.fill = ""; el.setAttribute("class", "lg-cell"); });
  }, [data]);

  useEffect(() => {
    const host = root.current;
    if (!host || !n) return;
    const cells = host.querySelectorAll<SVGPathElement>("path.lg-cell");
    const ev = data.events;
    const paint = (i: number) => { const el = cells[i]; if (el) el.style.fill = levelOf(counts.current[i]); };
    const stamp = (day: number) => { if (date.current) date.current.textContent = monthOf(day); };

    if (calm) {
      counts.current.fill(0);
      for (let k = 0; k < n; k++) counts.current[ev[k * 3]]++;
      counts.current.forEach((c, i) => { if (c) paint(i); });
      stamp(ev[(n - 1) * 3 + 1]);
      pos.current = n;
      return;
    }
    if (!running) return;

    const perTick = Math.max(1, Math.ceil(n / (replayMs / TICK_MS)));
    let timer: ReturnType<typeof setTimeout>;
    const ping = (i: number, kind: number) => {
      const el = cells[i];
      if (!el) return;
      el.setAttribute("class", "lg-cell");
      void el.getBoundingClientRect(); // restart the ping
      el.setAttribute("class", `lg-cell ${PING[kind] ?? PING[0]}`);
    };
    const clear = () => {
      host.classList.add("is-clearing");
      timer = setTimeout(() => {
        counts.current.fill(0);
        cells.forEach((el) => { el.style.fill = ""; el.setAttribute("class", "lg-cell"); });
        host.classList.remove("is-clearing");
        pos.current = 0;
        timer = setTimeout(step, 400);
      }, CLEAR_MS);
    };
    const step = () => {
      if (pos.current >= n) { timer = setTimeout(clear, HOLD_MS); return; }
      const end = Math.min(n, pos.current + perTick);
      for (let k = pos.current; k < end; k++) {
        const i = ev[k * 3];
        counts.current[i]++;
        paint(i);
        if (k === end - 1 || k % 3 === 0) ping(i, ev[k * 3 + 2]);
      }
      stamp(ev[(end - 1) * 3 + 1]);
      pos.current = end;
      timer = setTimeout(step, TICK_MS);
    };
    step();
    return () => clearTimeout(timer);
  }, [running, calm, n, data, replayMs]);

  if (!data.rings.length) return null;
  return (
    <div ref={root} className={`lg ${className}`} aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {paths.map((d, i) => <path key={i} className="lg-cell" d={d} />)}
      </svg>
      {caption !== null && n > 0 && (
        <p className="lg-cap sys-mono">{caption ?? data.city} · <span ref={date} /></p>
      )}
    </div>
  );
}
