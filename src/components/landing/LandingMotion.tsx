"use client";

import { useEffect } from "react";

/* One-shot section reveals complement the page's true scroll-scrubbed map
   story. Once revealed, content stays revealed: fast scrolling, browser
   back/forward and full-page captures never leave a section blank. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ld");
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-ld-reveal]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach((node) => node.classList.add("is-revealed"));
      return;
    }

    root.classList.add("ld-motion-ready");
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}
