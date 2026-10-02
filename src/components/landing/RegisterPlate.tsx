"use client";

/* ════════════════════════════════════════════════════════════════════
   The ground under the register: the register being written.

   The sample city's own honeycomb (the H3 cells the live map uses), drawn
   faint on the night ground. Its real records are replayed in date order:
   each report or care event pings its cell, and a cell steps up the night
   blue ramp as records gather there — the map's own encoding, more is
   brighter. A running date says how far the replay has reached. When the
   record is told it settles, clears, and begins again.

   Painted by touching the cells directly (no re-render per tick), only
   while the section is on screen. Under reduced motion the finished
   record is drawn, still.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef } from "react";
import { projector, type Box } from "@/components/system/HexPlate";

export type RegisterPlateData = { city: string; box: Box; rings: number[][]; events: number[] };

const W = 1600, H = 900;
const EPOCH_MS = Date.UTC(2000, 0, 1), DAY_MS = 86_400_000;
const LEVELS = ["var(--sp-nseq-1)", "var(--sp-nseq-2)", "var(--sp-nseq-3)", "var(--sp-nseq-4)"];
const TICK_MS = 90;
const REPLAY_MS = 48_000;
const HOLD_MS = 2600;
const CLEAR_MS = 2000;

const monthOf = (day: number) =>
  new Date(EPOCH_MS + day * DAY_MS).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
const levelOf = (count: number) => LEVELS[Math.min(LEVELS.length - 1, Math.floor(Math.log2(count + 1)) - 1)] ?? LEVELS[0];

export function RegisterPlate({ plate, running, calm }: { plate: RegisterPlateData; running: boolean; calm: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const date = useRef<HTMLSpanElement>(null);
  const pos = useRef(0);
  const counts = useRef<Uint16Array>(new Uint16Array(plate.rings.length));
  const n = Math.floor(plate.events.length / 3);

  const paths = useMemo(() => {
    const { p } = projector(plate.box, W, H, 0);
    return plate.rings.map((r) => {
      let d = "";
      for (let i = 0; i < r.length; i += 2) {
        const [x, y] = p(r[i], r[i + 1]);
        d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return `${d}Z`;
    });
  }, [plate]);

  useEffect(() => {
    const host = root.current;
    if (!host || !n) return;
    const cells = host.querySelectorAll<SVGPathElement>("path.rp-cell");
    const ev = plate.events;
    const paint = (i: number) => { const el = cells[i]; if (el) el.style.fill = levelOf(counts.current[i]); };
    const stamp = (day: number) => { if (date.current) date.current.textContent = monthOf(day); };

    /* Reduced motion: the whole record, drawn once, nothing moving. */
    if (calm) {
      counts.current.fill(0);
      for (let k = 0; k < n; k++) counts.current[ev[k * 3]]++;
      counts.current.forEach((c, i) => { if (c) paint(i); });
      stamp(ev[(n - 1) * 3 + 1]);
      pos.current = n;
      return;
    }
    if (!running) return;

    const perTick = Math.max(1, Math.ceil(n / (REPLAY_MS / TICK_MS)));
    let timer: ReturnType<typeof setTimeout>;
    const ping = (i: number) => {
      const el = cells[i];
      if (!el) return;
      el.classList.remove("is-ping");
      void el.getBoundingClientRect(); // restart the ping
      el.classList.add("is-ping");
    };
    const clear = () => {
      host.classList.add("is-clearing");
      timer = setTimeout(() => {
        counts.current.fill(0);
        cells.forEach((el) => { el.style.fill = ""; el.classList.remove("is-ping"); });
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
        if (k === end - 1 || k % 3 === 0) ping(i);
      }
      stamp(ev[(end - 1) * 3 + 1]);
      pos.current = end;
      timer = setTimeout(step, TICK_MS);
    };
    step();
    return () => clearTimeout(timer);
  }, [running, calm, n, plate.events]);

  if (!n || !plate.rings.length) return null;
  return (
    <div ref={root} className="rp" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        {paths.map((d, i) => <path key={i} className="rp-cell" d={d} />)}
      </svg>
      <p className="rp-cap sys-mono">{plate.city} · the register, replayed · <span ref={date} /></p>
    </div>
  );
}
