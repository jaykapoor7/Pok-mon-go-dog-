"use client";

/* ════════════════════════════════════════════════════════════════════
   The landing's motion, in one place.

   [data-rv]   reveals once as it enters: "up", "left", "right", "scale" or
               "unfurl" (a folk cutout unrolling from its foot). Sections
               alternate direction, so the page turns as it is read.
   [data-par]  drifts against the scroll by its factor (a few px), so folk
               art and product panels sit at slightly different depths.
   Nothing is pinned and nothing waits. Without JavaScript or under reduced
   motion every element is simply shown.
   ════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";

export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("rv-on");
    /* A cutout starts fully clipped, so it is revealed when its section arrives, not when it does. */
    const proxy = new Map<Element, Element[]>();
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { for (const n of proxy.get(e.target) ?? [e.target]) n.classList.add("is-in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.05 });
    document.querySelectorAll("[data-rv]").forEach((n) => {
      const t = n.getAttribute("data-rv") === "unfurl" && n.parentElement ? n.parentElement : n;
      if (t !== n) proxy.set(t, [...(proxy.get(t) ?? []), n]);
      io.observe(t);
    });

    const par = [...document.querySelectorAll<HTMLElement>("[data-par]")];
    let raf = 0;
    const page = document.querySelector<HTMLElement>(".home3");
    const tick = () => {
      raf = 0;
      /* The header follows the ground: night over the hero, paper once the page has turned. */
      page?.classList.toggle("is-day", window.scrollY > window.innerHeight * 1.2);
      const vh = window.innerHeight;
      for (const n of par) {
        const r = n.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const k = Number(n.dataset.par) || 0.1;
        n.style.setProperty("--par", `${((r.top + r.height / 2 - vh / 2) * -k).toFixed(1)}px`);
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    /* Not only scroll: [data-tilt] leans toward the pointer in 3D, [data-mag] buttons drift toward it. */
    const offs: (() => void)[] = [];
    if (window.matchMedia("(pointer: fine)").matches) {
      const bind = (sel: string, move: (n: HTMLElement, e: PointerEvent) => void, rest: (n: HTMLElement) => void) =>
        document.querySelectorAll<HTMLElement>(sel).forEach((n) => {
          const mv = (e: PointerEvent) => move(n, e), lv = () => rest(n);
          n.addEventListener("pointermove", mv); n.addEventListener("pointerleave", lv);
          offs.push(() => { n.removeEventListener("pointermove", mv); n.removeEventListener("pointerleave", lv); });
        });
      bind("[data-tilt]", (n, e) => {
        const r = n.getBoundingClientRect(), k = Number(n.dataset.tilt) || 6;
        n.style.setProperty("--rx", `${(-((e.clientY - r.top) / r.height - 0.5) * k).toFixed(2)}deg`);
        n.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width - 0.5) * k).toFixed(2)}deg`);
      }, (n) => { n.style.setProperty("--rx", "0deg"); n.style.setProperty("--ry", "0deg"); });
      bind("[data-mag]", (n, e) => {
        const r = n.getBoundingClientRect();
        n.style.setProperty("--mx", `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px`);
        n.style.setProperty("--my", `${((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1)}px`);
      }, (n) => { n.style.setProperty("--mx", "0px"); n.style.setProperty("--my", "0px"); });
    }
    return () => { offs.forEach((f) => f()); io.disconnect(); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); root.classList.remove("rv-on"); };
  }, []);
  return null;
}
