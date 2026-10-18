"use client";

/* The page's one cinematic move: as the hero scrolls away, the night ground
   turns to the app's cream. It writes a single CSS variable (--day, 0 → 1)
   on the page root from scroll position; the CSS does the rest, so nothing
   is pinned and nothing waits. Reduced motion: the page is simply day
   below the hero. */

import { useEffect } from "react";

export function Tone({ target, from, span }: { target: string; from: string; span: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(target);
    const a = document.querySelector<HTMLElement>(from);
    const b = document.querySelector<HTMLElement>(span);
    if (!root || !a || !b) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { root.style.setProperty("--day", "1"); root.dataset.calm = ""; }
    let raf = 0;
    const set = () => {
      raf = 0;
      const start = a.offsetTop + a.offsetHeight * 0.35, end = b.offsetTop + b.offsetHeight * 0.45;
      const t = Math.max(0, Math.min(1, (window.scrollY + window.innerHeight * 0.5 - start) / Math.max(1, end - start)));
      if (!("calm" in root.dataset)) root.style.setProperty("--day", t.toFixed(3));
      /* The header follows the ground: night over the hero, paper once the page has turned. */
      root.classList.toggle("is-day", window.scrollY > a.offsetTop + a.offsetHeight - 70);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(set); };
    set();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [target, from, span]);
  return null;
}
