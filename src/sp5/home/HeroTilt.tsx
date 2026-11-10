"use client";

/* The hero's product window leans a few degrees toward the pointer, the
   way a card does in the hand. Fine pointers only, never under reduced
   motion, one frame at most per move; it settles back when the pointer
   leaves. Sets --rx / --ry on the hero; CSS does the rest. */

import { useEffect, useRef } from "react";

export function HeroTilt() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hero = ref.current?.closest<HTMLElement>(".s6-hero"); const canvas = hero?.querySelector<HTMLElement>(".s6-canvas");
    if (!hero || !canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches || window.innerWidth < 900) return;
    let raf = 0, x = 0, y = 0;
    const paint = () => { raf = 0; hero.style.setProperty("--rx", `${(x * 3).toFixed(2)}deg`); hero.style.setProperty("--ry", `${(-y * 2).toFixed(2)}deg`); };
    const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)); y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)); if (!raf) raf = requestAnimationFrame(paint); };
    const leave = () => { x = 0; y = 0; if (!raf) raf = requestAnimationFrame(paint); };
    canvas.addEventListener("pointermove", move, { passive: true }); canvas.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); };
  }, []);
  return <span ref={ref} hidden />;
}
