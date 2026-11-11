"use client";

/* Landing motion, second layer: a reading-progress line, the product window
   that leans toward the pointer, and a kind for each revealed element so
   headings, cards and rows do not all arrive the same way. Everything is
   off under reduced motion, and without JavaScript nothing is hidden. */

import { useEffect, useRef } from "react";

export function LandingMotion() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("s8-on");
    /* reading progress */
    let raf = 0;
    const paint = () => { raf = 0; const max = root.scrollHeight - window.innerHeight; if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`; root.classList.toggle("s8-scrolled", window.scrollY > 24); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint(); window.addEventListener("scroll", onScroll, { passive: true });

    /* each revealed element gets a kind (after Reveal has tagged them) */
    const KIND: [string, string][] = [
      [".s4-h2, .s4-sechead, .s4-int-head", "blur"],
      [".s4-wall > *, .s7-agent, .s7-mate-small > *, .s7-why-grid > *, .s7-res-stats > *, .s7-tacc", "pop"],
      [".s7-mate-big > *:nth-child(odd), .s7-rec-copy > *, .s7-audit-caps li", "left"],
      [".s7-mate-big > *:nth-child(even), .s7-audit-win, .s7-q-art", "right"],
    ];
    const tag = window.setTimeout(() => { for (const [sel, kind] of KIND) document.querySelectorAll<HTMLElement>(sel).forEach((e) => { if (e.dataset.rv !== undefined && !e.dataset.rvk) e.dataset.rvk = kind; }); }, 60);

    /* the product window leans a little toward the pointer */
    const stage = document.querySelector<HTMLElement>(".s6-hero .s6-stage");
    const fine = window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 900;
    let tr = 0, tx = 0, ty = 0;
    const lean = () => { tr = 0; stage?.style.setProperty("--tx", tx.toFixed(3)); stage?.style.setProperty("--ty", ty.toFixed(3)); };
    const move = (e: PointerEvent) => { if (!stage) return; const r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (!tr) tr = requestAnimationFrame(lean); };
    const rest = () => { tx = 0; ty = 0; if (!tr) tr = requestAnimationFrame(lean); };
    if (stage && fine) { stage.addEventListener("pointermove", move); stage.addEventListener("pointerleave", rest); }

    /* a soft light follows the pointer across the blueprint */
    const canvas = document.querySelector<HTMLElement>(".s6-hero .s6-canvas");
    let lr = 0, lx = 0, ly = 0;
    const paintLight = () => { lr = 0; canvas?.style.setProperty("--lx", `${lx}px`); canvas?.style.setProperty("--ly", `${ly}px`); };
    const light = (e: PointerEvent) => { if (!canvas) return; const r = canvas.getBoundingClientRect(); lx = e.clientX - r.left; ly = e.clientY - r.top; canvas.dataset.lit = "true"; if (!lr) lr = requestAnimationFrame(paintLight); };
    const dark = () => { if (canvas) canvas.dataset.lit = "false"; };
    if (canvas && fine) { canvas.addEventListener("pointermove", light); canvas.addEventListener("pointerleave", dark); }

    return () => { window.clearTimeout(tag); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(tr); stage?.removeEventListener("pointermove", move); stage?.removeEventListener("pointerleave", rest); cancelAnimationFrame(lr); canvas?.removeEventListener("pointermove", light); canvas?.removeEventListener("pointerleave", dark); root.classList.remove("s8-on", "s8-scrolled"); };
  }, []);
  return <span className="s8-progress" aria-hidden><span ref={bar} /></span>;
}
