"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to n once, when `run` first turns true. Renders n
    until then, so the server and a reader without motion see the figure. */
export function useCount(n: number, run: boolean, duration = 900) {
  const [v, setV] = useState(n);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current) return;
    done.current = true;
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const p = Math.min(1, (t - t0) / duration); setV(Math.round(n * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    setV(0); raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [n, run, duration]);
  return v;
}
