"use client";

/* Motion for the inner pages (Platform, Pricing, the audience pages, Kaju),
   in the landing's own language: a reading-progress line, a hero whose words
   rise and whose product tile leans a little toward the pointer, and product
   windows whose rows arrive one after another as they scroll into view.
   Without JavaScript nothing is hidden; under reduced motion nothing moves. */
import { useEffect, useRef } from "react";

export function PageMotion() {
  const bar = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    root.classList.add("pm-on");
    let raf = 0;
    const paint = () => { raf = 0; const max = root.scrollHeight - window.innerHeight; if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`; root.classList.toggle("pm-scrolled", window.scrollY > 24); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(paint); };
    paint(); window.addEventListener("scroll", onScroll, { passive: true });

    /* product windows and tiles: seen once, then their parts arrive in turn */
    const seen = [...document.querySelectorAll<HTMLElement>("main .s4u-mini, main .s4u-pg, main .s4-tile, main .s4-pp-split-ui")];
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { (e.target as HTMLElement).dataset.seen = ""; io.unobserve(e.target); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 });
    seen.forEach((el) => io.observe(el));

    /* the hero tile leans toward the pointer */
    const art = document.querySelector<HTMLElement>(".s4-pp-hero .s4-pp-art");
    const fine = window.matchMedia("(pointer: fine)").matches && window.innerWidth >= 900;
    let tr = 0, tx = 0, ty = 0;
    const lean = () => { tr = 0; art?.style.setProperty("--tx", tx.toFixed(3)); art?.style.setProperty("--ty", ty.toFixed(3)); };
    const move = (e: PointerEvent) => { if (!art) return; const r = art.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; if (!tr) tr = requestAnimationFrame(lean); };
    const rest = () => { tx = 0; ty = 0; if (!tr) tr = requestAnimationFrame(lean); };
    if (art && fine) { art.addEventListener("pointermove", move); art.addEventListener("pointerleave", rest); }

    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(tr); io.disconnect(); art?.removeEventListener("pointermove", move); art?.removeEventListener("pointerleave", rest); root.classList.remove("pm-on", "pm-scrolled"); };
  }, []);
  return <span className="pm-progress" aria-hidden><span ref={bar} /></span>;
}
