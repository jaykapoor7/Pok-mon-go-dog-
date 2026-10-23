"use client";

import { useEffect, useState, type RefObject } from "react";

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/* Progress through a pinned story, 0 to 1. The story plays by itself
   while its stage is pinned on screen, taking `seconds` from start to
   end; scrolling moves it ahead faster. Leaving it above starts it over
   next time, leaving it below leaves it finished. Under reduced motion
   it only follows the scroll. */
export function useStory(track: RefObject<HTMLElement | null>, seconds: number) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, played = 0;
    const frame = (now: number) => {
      raf = 0;
      const el = track.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const scrolled = clamp(-r.top / Math.max(1, r.height - vh));
      /* "On screen": the stage fills most of the view, pinned or nearly. */
      const pinned = r.top <= vh * 0.15 && r.bottom >= vh * 0.85;
      if (r.top > vh) played = 0;
      else if (r.bottom < 0) played = 1;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      const auto = pinned && !reduce && !document.hidden && played < 1;
      if (auto) played = Math.min(1, Math.max(played, scrolled) + dt / seconds);
      const v = Math.max(scrolled, reduce ? 0 : played);
      setP((o) => (Math.abs(o - v) < 0.0005 ? o : v));
      if (auto) { last = now; raf = requestAnimationFrame(frame); } else last = 0;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    document.addEventListener("visibilitychange", on);
    return () => {
      window.removeEventListener("scroll", on); window.removeEventListener("resize", on);
      document.removeEventListener("visibilitychange", on); cancelAnimationFrame(raf);
    };
  }, [track, seconds]);
  return p;
}
