"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Adds `is-live` once its content scrolls into view, so the fragments
   inside can play their small entry sequence (ticks appearing, a reply
   arriving, a ring filling), as the reference's tiles do. Without
   JavaScript or with reduced motion the final state shows. */
export function Live({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") { setLive(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLive(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`s4-live${live ? " is-live" : ""} ${className}`.trim()}>{children}</div>;
}

/** A number that counts up once when it scrolls into view. */
export function CountUp({ n, ms = 1400 }: { n: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(n);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setV(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => { const p = Math.min(1, (now - t0) / ms); setV(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [n, ms]);
  return <span ref={ref}>{v.toLocaleString("en-IN")}</span>;
}
