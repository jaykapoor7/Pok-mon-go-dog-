"use client";

/* Motion for the public site. Content is visible without script; once this
   mounts it sets html[data-m="on"], and elements marked data-reveal arrive
   as they enter the viewport. Elements with data-progress receive --p (0..1)
   as they scroll through the viewport, for scroll-linked sequences. */
import { useEffect } from "react";

export function SiteMotion() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = [...document.querySelectorAll<HTMLElement>(".s6 [data-reveal]")];
    /* Anything already on screen is shown at once: no flash on load. */
    const vh = window.innerHeight;
    for (const el of els) if (el.getBoundingClientRect().top < vh * 0.92) el.dataset.in = "true";
    root.dataset.m = "on";
    const io = new IntersectionObserver((entries) => { for (const e of entries) if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = "true"; io.unobserve(e.target); } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    const tracks = [...document.querySelectorAll<HTMLElement>(".s6 [data-progress]")];
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        /* Page progress for the thread under the navigation; tilt for the relay. */
        const max = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty("--s6-scroll", (max > 0 ? window.scrollY / max : 0).toFixed(4));
        for (const el of document.querySelectorAll<HTMLElement>(".s6 [data-tilt]")) {
          const r = el.getBoundingClientRect();
          el.style.setProperty("--t", Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight * 0.75))).toFixed(3));
        }
        for (const t of tracks) {
          const r = t.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - r.top) / Math.max(1, r.height)));
          t.style.setProperty("--p", p.toFixed(3));
          const steps = t.querySelectorAll<HTMLElement>("[data-step]");
          steps.forEach((s, i) => { s.dataset.on = String(p >= i / Math.max(1, steps.length - 0.4)); });
        }
      });
    };
    /* Figures travel to their value when first revealed. */
    const counts = [...document.querySelectorAll<HTMLElement>(".s6 [data-count]")];
    const cio = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        const el = e.target as HTMLElement, to = Number(el.dataset.count), t0 = performance.now();
        cio.unobserve(el);
        const tick = (t: number) => { const k = Math.min(1, (t - t0) / 1100), v = Math.round(to * (1 - Math.pow(1 - k, 4))); el.textContent = v.toLocaleString("en-IN"); if (k < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.6 });
    counts.forEach((c) => cio.observe(c));
    /* A soft light follows the pointer across the hero. */
    const spot = document.querySelector<HTMLElement>(".s6 [data-spot]");
    const onMove = (e: PointerEvent) => { if (!spot || e.pointerType !== "mouse") return; const r = spot.getBoundingClientRect(); spot.style.setProperty("--mx", `${e.clientX - r.left}px`); spot.style.setProperty("--my", `${e.clientY - r.top}px`); spot.dataset.lit = "true"; };
    spot?.addEventListener("pointermove", onMove);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { io.disconnect(); cio.disconnect(); spot?.removeEventListener("pointermove", onMove); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); delete root.dataset.m; };
  }, []);
  return null;
}
