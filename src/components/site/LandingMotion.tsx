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
      const sections = root.querySelectorAll<HTMLElement>(".field-section-heading, .field-steps article, .field-team-copy, .field-workspace-example, .field-paths a, .field-photo-story, .field-closing h2");
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); }
      }), { threshold: .12 });
      sections.forEach(section => { section.classList.add("reveal"); observer.observe(section); });
      const frame = root.querySelector<HTMLElement>(".street-hero-frame");
      let raf = 0;
      const update = () => {
        raf = 0;
        if (!frame) return;
        const rect = frame.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > innerHeight) return;
        const progress = Math.max(-1, Math.min(1, (innerHeight / 2 - rect.top - rect.height / 2) / innerHeight));
        frame.style.setProperty("--image-shift", `${progress * 55}px`);
      };
      const scroll = () => { if (!raf) raf = requestAnimationFrame(update); };
      window.addEventListener("scroll", scroll, { passive: true });
      window.addEventListener("resize", scroll);
      update();
      disposeMotion = () => {
        observer.disconnect(); cancelAnimationFrame(raf);
        window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll);
        delete root.dataset.motion; frame?.style.removeProperty("--image-shift");
        sections.forEach(section => section.classList.remove("reveal", "is-in"));
      };
    };
    setup(); preference.addEventListener("change", setup);
    return () => { disposeMotion(); preference.removeEventListener("change", setup); };
  }, []);
  return null;
}
