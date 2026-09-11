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

    /* The count itself is the effect now, so it runs the whole way rather
       than nudging the last dozen. From nothing up to the live figure,
       long enough to read as the record filling in and short enough that
       nobody is waiting on it. */
    shown.current = 0;
    el.textContent = "0";
    animateTo(initial, 1600);

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
