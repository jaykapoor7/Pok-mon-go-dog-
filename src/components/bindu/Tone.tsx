"use client";

/* The header follows the ground beneath it: night over the dark scenes, paper over the light
   ones. One read per frame of whichever scene sits just under the bar. */

import { useEffect } from "react";

export function ToneWatch({ root: sel = ".bindu" }: { root?: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(sel); if (!root) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = (document.querySelector(".sp-header")?.getBoundingClientRect().bottom ?? 64) + 6;
      const hit = document.elementsFromPoint(window.innerWidth / 2, y).map((n) => n.closest<HTMLElement>("[data-tone]")).find(Boolean);
      const night = (hit?.dataset.tone ?? "day") === "night";
      root.classList.toggle("is-night", night); root.classList.toggle("is-day", !night);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [sel]);
  return null;
}

/* A line of type split into characters, each carrying its own deterministic flight
   (--vx, --vy, --vr) for the scene's CSS to play from scroll. Read by screen readers whole. */
export function Split({ text, className = "" }: { text: string; className?: string }) {
  let n = 0;
  return (
    <span className={`sp-split ${className}`} aria-label={text}>
      {text.split(" ").map((w, wi) => (
        <span key={wi} className="sp-w" aria-hidden>
          {[...w].map((ch, ci) => {
            const i = n++, h = (k: number) => { const s = Math.sin((i + k) * 91.7) * 4375.85; return s - Math.floor(s); };
            return <span key={ci} className="sp-c" style={{ ["--i" as string]: i, ["--vx" as string]: (12 + h(1) * 30).toFixed(1), ["--vy" as string]: ((h(2) - 0.5) * 50).toFixed(1), ["--vr" as string]: ((h(3) - 0.5) * 140).toFixed(0) }}>{ch}</span>;
          })}
        </span>
      ))}
    </span>
  );
}
