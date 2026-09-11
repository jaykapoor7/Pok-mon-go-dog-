"use client";

import { useEffect } from "react";

/** Progressive enhancement: all content is visible without scripting. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".field-site");
    if (!root) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let disposeMotion = () => {};
    const setup = () => {
      disposeMotion();
      if (preference.matches) return;
      root.dataset.motion = "on";
      const sections = root.querySelectorAll<HTMLElement>(".field-section-heading, .field-steps article, .field-team-copy, .field-workspace-example, .field-paths a, .field-photo-story, .field-closing h2, .record-stage, .record-intro-copy");
      /* Symmetric: enters on the way down, retracts on the way back up.
         unobserve() here made every reveal one-way, so scrolling back up
         showed an already-assembled page — the animation only ever existed
         once. It retracts only when the element leaves past the BOTTOM of
         the viewport; retracting off the top would mean content vanishing
         behind you as you read downward. */
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add("is-in");
        else if (entry.boundingClientRect.top > 0) entry.target.classList.remove("is-in");
      }), { threshold: .12 });
      sections.forEach(section => { section.classList.add("reveal"); observer.observe(section); });
      const hero = root.querySelector<HTMLElement>(".record-hero");
      let raf = 0;
      const update = () => {
        raf = 0;
        if (!hero) return;
        const rect = hero.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const progress = Math.max(0, Math.min(1, -rect.top / Math.max(rect.height - innerHeight, 1)));
        hero.style.setProperty("--record-progress", progress.toFixed(3));
      };
      const scroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      window.addEventListener("scroll", scroll, { passive: true });
      window.addEventListener("resize", scroll);
      update();
      disposeMotion = () => {
        observer.disconnect(); cancelAnimationFrame(raf);
        window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll);
        delete root.dataset.motion; hero?.style.removeProperty("--record-progress");
        sections.forEach(section => section.classList.remove("reveal", "is-in"));
      };
    };
    setup(); preference.addEventListener("change", setup);
    return () => { disposeMotion(); preference.removeEventListener("change", setup); };
  }, []);
  return null;
}
