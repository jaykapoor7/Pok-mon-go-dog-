"use client";

/* A very faint blue light that follows the pointer across the page ground.
   It is the page ground's own background, so forms, maps and tables are untouched. Only on
   devices with a precise pointer, never under reduced motion, never when
   the person has asked Kaju to stay still. One rAF per frame at most; it
   stops listening when the tab is hidden. */

import { useEffect } from "react";
import { useKajuAmbient } from "@/kaju/ambient";
import { useReducedMotion } from "@/kaju/controller";

export function AmbientLight() {
  const [ambient] = useKajuAmbient();
  const reduced = useReducedMotion();
  useEffect(() => {
    const root = document.documentElement;
    if (!ambient || reduced || !window.matchMedia("(pointer: fine)").matches) return;
    let frame = 0, x = 0, y = 0;
    const paint = () => { frame = 0; root.style.setProperty("--ax", `${x}px`); root.style.setProperty("--ay", `${y}px`); root.dataset.ambient = "on"; };
    const move = (e: PointerEvent) => { x = e.clientX; y = e.clientY; if (!frame) frame = requestAnimationFrame(paint); };
    const leave = () => { delete root.dataset.ambient; };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); delete root.dataset.ambient; };
  }, [ambient, reduced]);
  return null;
}

/** Kaju's moment when a prepared action is saved AND read back. */
export const KAJU_VERIFIED = "kaju:verified";
