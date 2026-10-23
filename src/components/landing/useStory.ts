"use client";

import { useEffect, useState, type RefObject } from "react";

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/* Progress through a pinned story, 0 to 1. The story plays by itself while
   its stage is pinned on screen, taking `seconds` from start to end;
   scrolling moves it ahead faster. Leaving it above starts it over next
   time, leaving it below leaves it finished. Under reduced motion it only
   follows the scroll.

   When the story finishes playing on its own, if `nextId` is supplied, the
   page smoothly scrolls to that section so a reader can move on without
   touching the scroll wheel. Only triggered once per entry (reset when the
   stage leaves above the viewport) and never while the reader is actively
   scrolling or when reduced motion is on. */
export function useStory(track: RefObject<HTMLElement | null>, seconds: number, nextId?: string) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, last = 0, played = 0, advanced = false, scrollingAt = 0;
    const onUserScroll = () => { scrollingAt = performance.now(); };
    const frame = (now: number) => {
      raf = 0;
      const el = track.current; if (!el) return;
      const r = el.getBoundingClientRect(), vh = window.innerHeight;
      const scrolled = clamp(-r.top / Math.max(1, r.height - vh));
      /* "On screen": the stage fills most of the view, pinned or nearly. */
      const pinned = r.top <= vh * 0.15 && r.bottom >= vh * 0.85;
      if (r.top > vh) { played = 0; advanced = false; }
      else if (r.bottom < 0) played = 1;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      const auto = pinned && !reduce && !document.hidden && played < 1;
      if (auto) played = Math.min(1, Math.max(played, scrolled) + dt / seconds);
      const v = Math.max(scrolled, reduce ? 0 : played);
      setP((o) => (Math.abs(o - v) < 0.0005 ? o : v));
      /* Auto-advance: hold the finished state for 900ms, then if the reader
         hasn't scrolled in the last 600ms, scroll smoothly to the next
         section. The second scroll handler ignores programmatic scrolls. */
      if (!advanced && nextId && played >= 1 && pinned && !reduce) {
        const idle = now - scrollingAt > 600;
        if (idle) {
          advanced = true;
          window.setTimeout(() => {
            const t = document.getElementById(nextId); if (!t) return;
            const rect = t.getBoundingClientRect();
            if (rect.top < vh * 0.5) return; // reader got there anyway
            window.scrollTo({ top: window.scrollY + rect.top, behavior: "smooth" });
          }, 900);
        }
      }
      if (auto) { last = now; raf = requestAnimationFrame(frame); } else last = 0;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    window.addEventListener("keydown", onUserScroll);
    window.addEventListener("resize", on);
    document.addEventListener("visibilitychange", on);
    return () => {
      window.removeEventListener("scroll", on); window.removeEventListener("resize", on);
      window.removeEventListener("wheel", onUserScroll); window.removeEventListener("touchmove", onUserScroll);
      window.removeEventListener("keydown", onUserScroll);
      document.removeEventListener("visibilitychange", on); cancelAnimationFrame(raf);
    };
  }, [track, seconds, nextId]);
  return p;
}
