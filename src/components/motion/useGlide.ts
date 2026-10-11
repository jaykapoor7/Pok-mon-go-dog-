"use client";

import { useLayoutEffect, type RefObject } from "react";

/* ════════════════════════════════════════════════════════════════════
   active-indicator-glide.

   One indicator per bar of tabs or list of destinations, which travels
   to the item that is now current rather than blinking out under one
   item and on under another — so a change of section reads as movement
   between places on the same strip. The item's own geometry is measured
   every time (tabs are never assumed equal), and written to CSS custom
   properties that the indicator reads in a transform, so the glide runs
   on the compositor. The first placement is instant: an indicator only
   glides from somewhere it was seen.
   ════════════════════════════════════════════════════════════════════ */
export function useGlide(container: RefObject<HTMLElement | null>, selector: string, key: unknown) {
  useLayoutEffect(() => {
    const box = container.current;
    if (!box) return;
    const place = () => {
      const on = box.querySelector<HTMLElement>(selector);
      if (!on) { box.style.setProperty("--glide-o", "0"); return; }
      box.style.setProperty("--glide-x", `${on.offsetLeft}px`);
      box.style.setProperty("--glide-y", `${on.offsetTop}px`);
      box.style.setProperty("--glide-w", `${on.offsetWidth}`);
      box.style.setProperty("--glide-h", `${on.offsetHeight}`);
      box.style.setProperty("--glide-o", "1");
    };
    place();
    /* Arm the transition only after the first placement has painted. */
    const arm = requestAnimationFrame(() => box.setAttribute("data-glide", "on"));
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => { cancelAnimationFrame(arm); ro.disconnect(); };
  }, [container, selector, key]);
}
