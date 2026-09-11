"use client";

import { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   The animals-on-record tally.

   Three numbers sat here before, two of which were 85 — the count and the
   photographed count happened to be the same, so the row read as padding.
   One number, and it is the one that means something: how many animals are
   on the record, climbing while you watch.

   It arrives server-rendered so the real figure is in the HTML for a reader
   with no JavaScript and for anything scraping the page, then counts up
   from a little below it, then asks the server again on a slow interval.
   When somebody files a report the number ticks over on its own.

   Everything is written straight to the DOM. A tally that re-rendered React
   on every animation frame would be the same mistake as the scroll handler
   two files over.
   ════════════════════════════════════════════════════════════════════ */

const POLL_MS = 45_000;

export function LiveTally({ initial }: { initial: number }) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [bumped, setBumped] = useState(false);
  /* The value currently painted, kept in a ref so the poll can compare
     without re-rendering anything. */
  const shown = useRef(initial);

  useEffect(() => {
    const el = numberRef.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    /** Ease to `to` over `ms`, writing the integer straight to the node. */
    const animateTo = (to: number, ms: number) => {
      const from = shown.current;
      if (reduce || from === to) {
        shown.current = to;
        el.textContent = String(to);
        return;
      }
      const start = performance.now();
      cancelAnimationFrame(raf);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        /* easeOutCubic: quick at first, settles rather than stopping dead. */
        const eased = 1 - Math.pow(1 - t, 3);
        const v = Math.round(from + (to - from) * eased);
        el.textContent = String(v);
        if (t < 1) raf = requestAnimationFrame(step);
        else shown.current = to;
      };
      raf = requestAnimationFrame(step);
    };

    /* Count in on arrival, from a little below so it reads as a tally
       catching up rather than a number spinning for decoration. */
    shown.current = Math.max(0, initial - Math.min(12, Math.round(initial * 0.15)));
    el.textContent = String(shown.current);
    animateTo(initial, 900);

    let timer = 0;
    const poll = async () => {
      /* A background tab should not keep asking. */
      if (document.hidden) return;
      try {
        const res = await fetch("/api/stats/animals", { cache: "no-store" });
        if (!res.ok) return;
        const { count } = (await res.json()) as { count: number | null };
        if (typeof count !== "number" || count === shown.current) return;
        animateTo(count, 700);
        /* Flash the label only when the number actually grew. */
        if (count > shown.current) {
          setBumped(true);
          window.setTimeout(() => setBumped(false), 1400);
        }
      } catch {
        /* Offline, or the count endpoint is unhappy. The number already on
           screen is the last true one, so leaving it is the right answer. */
      }
    };
    timer = window.setInterval(poll, POLL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial]);

  return (
    <div className={`hero-tally${bumped ? " is-new" : ""}`}>
      {/* A tally mark, because that is what this is.
          What was here before was a small green circle pulsing on a timer,
          which is the live-status dot every dashboard ships and says
          nothing about street animals. Five strokes is the oldest way of
          counting things one at a time as you come across them, which is
          also exactly how this number goes up. The fifth stroke, the one
          that closes a group of five, draws itself when the count moves. */}
      <svg className="hero-tally-mark" viewBox="0 0 32 30" aria-hidden focusable="false">
        <g strokeLinecap="round">
          <path d="M4 4V26" />
          <path d="M11 4V26" />
          <path d="M18 4V26" />
          <path d="M25 4V26" />
          <path className="hero-tally-fifth" d="M2 25.5L27 4.5" />
        </g>
      </svg>
      <p className="hero-tally-figure">
        {/* The server value is the text content until the effect runs, so
            this is never a blank or a zero on first paint. */}
        <span ref={numberRef} aria-hidden>
          {initial}
        </span>
        <span className="sr-only">{initial} animals on the record</span>
      </p>
      <p className="hero-tally-label">
        animals on the record
        <span>and counting. Every one of them reported by somebody.</span>
      </p>
    </div>
  );
}
