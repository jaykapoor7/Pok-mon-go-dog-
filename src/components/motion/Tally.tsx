"use client";

import { useLayoutEffect, useRef } from "react";
import { DUR, decel, prefersReducedMotion } from "@/lib/motion";

/* ════════════════════════════════════════════════════════════════════
   A figure that arrives at its value.

   retarget-motion from the catalogue: when a figure's value changes
   (another city, another lens) it travels from the figure it is showing
   to the new one, so a reader sees the difference rather than a swap.
   In the app a figure is primary data and is never delayed (DESIGN.md):
   it appears at its true value. `countIn` opts a marketing or story
   surface into count-up, from zero the first time it is on screen.

   The server renders the final figure and the digits are written straight
   to the text node, so React does not re-render sixty times a second and
   a reader with reduced motion, no JavaScript or a screen reader only ever
   meets the true number. tabular-nums keeps the width still while it runs.
   ════════════════════════════════════════════════════════════════════ */

const fmtIN = (n: number) => Math.round(n).toLocaleString("en-IN");

export function Tally({ value, format = fmtIN, ms = DUR.count, countIn = false, className }: { value: number; format?: (n: number) => string; ms?: number; countIn?: boolean; className?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  /* Layout effect: the starting digit is written before paint, so a changed
     value never flashes its final figure for a frame first. */
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const to = value;
    /* Write into React's own text node; replacing it would orphan the node
       React updates on the next render. */
    const write = (n: number) => { if (node.firstChild) node.firstChild.nodeValue = format(n); else node.textContent = format(n); };
    if (prefersReducedMotion() || !Number.isFinite(to)) { shown.current = to; write(to); return; }
    let raf = 0;
    let io: IntersectionObserver | null = null;
    const run = () => {
      const from = shown.current ?? 0;
      if (from === to) { write(to); return; }
      /* A small change gets a short run: a figure moving by 3 should not
         take as long as one arriving from zero. */
      const span = Math.abs(to - from) / Math.max(1, Math.abs(to));
      const dur = shown.current === null ? ms : Math.max(DUR.base, ms * Math.min(1, 0.35 + span));
      write(from);
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const v = from + (to - from) * decel(p);
        shown.current = v;
        write(v);
        if (p < 1) raf = requestAnimationFrame(step); else shown.current = to;
      };
      raf = requestAnimationFrame(step);
    };
    if (shown.current === null && !countIn) { shown.current = to; write(to); return; }
    if (shown.current === null) {
      /* Only count from zero where it will be seen. */
      write(0);
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io?.disconnect(); run(); } }, { threshold: 0.3 });
      io.observe(node);
    } else run();
    return () => { cancelAnimationFrame(raf); io?.disconnect(); };
  }, [value, ms, format, countIn]);

  return <span ref={el} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>{format(value)}</span>;
}
