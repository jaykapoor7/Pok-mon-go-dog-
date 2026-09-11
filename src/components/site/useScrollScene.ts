"use client";

import { useEffect, useRef } from "react";

/**
 * Scroll progress through an element, published as a CSS custom property.
 *
 * THE RULE THIS EXISTS TO ENFORCE
 *
 * Nothing scroll-linked on this site may re-render React during the gesture.
 *
 * The section this replaced quantised its progress and called setProgress on
 * every step, which meant React reconciled a 300vh tree roughly once every
 * five pixels of scroll — on a phone, once a frame. That is the same mistake
 * the map made with DOM markers and mid-gesture state, and it produces the
 * same symptom: a page that stutters precisely when someone is looking at it
 * move.
 *
 * So progress goes out as a custom property on the element, and every
 * animation derived from it is a CSS calc() off that one number. The
 * compositor interpolates; React does nothing at all while you scroll.
 *
 * Returns a ref to put on the tall outer section. Inside it, style anything
 * off var(--p), which runs 0 → 1 across the section's scrollable travel.
 *
 * Under prefers-reduced-motion the property is pinned to `restProgress` and
 * the listener is never attached, so the scene renders composed and still.
 */
export function useScrollScene<T extends HTMLElement>(restProgress = 1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const setP = (v: number) => el.style.setProperty("--p", v.toFixed(4));

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setP(restProgress);
      return;
    }

    let raf = 0;
    let last = -1;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      /* Travel is the section's height beyond one viewport — the distance
         over which a sticky child stays put while the page moves past it. */
      const travel = rect.height - window.innerHeight;
      const p = travel <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / travel));
      /* Writing the same string again still invalidates style, so the
         comparison is worth the two lines. */
      if (Math.abs(p - last) > 0.0005) {
        last = p;
        setP(p);
      }
      raf = 0;
    };

    const onScroll = () => {
      if (raf) return; // already scheduled; coalesce to one read per frame
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [restProgress]);

  return ref;
}
