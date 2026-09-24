"use client";

import { useEffect, useRef, useState } from "react";

/** The rendered width of an element, so a chart can lay itself out in real
    pixels instead of scaling a fixed drawing (which blurs unit squares and
    shrinks labels on a phone). */
export function useWidth<T extends HTMLElement>(fallback = 720) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => setW(Math.max(200, Math.round(el.getBoundingClientRect().width)));
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}
