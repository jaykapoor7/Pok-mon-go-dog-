"use client";

/* ════════════════════════════════════════════════════════════════════
   A scroll scene: a tall section whose stage stays in view (sticky) while
   the page scrolls through it. It writes its progress, --p (0 → 1), on
   the stage, and can hand a step index to its children. The scroll is
   never captured: the reader scrolls at their own pace and can leave at
   any moment. Under reduced motion the section is one screen tall, --p
   sits at 1 and everything is shown.
   ════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

const StepCtx = createContext(0);
export const useSceneStep = () => useContext(StepCtx);

export function Scene({ screens = 2.5, steps = 0, className = "", id, label, children }: {
  screens?: number; steps?: number; className?: string; id?: string; label?: string; children: ReactNode;
}) {
  const el = useRef<HTMLElement>(null);
  const [step, setStep] = useState(steps ? steps - 1 : 0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const node = el.current; if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); node.style.setProperty("--p", "1"); return; }
    setStep(0);
    let raf = 0, last = -1;
    const tick = () => {
      raf = 0;
      const r = node.getBoundingClientRect(), span = Math.max(1, r.height - window.innerHeight);
      const p = Math.max(0, Math.min(1, -r.top / span));
      node.style.setProperty("--p", p.toFixed(4));
      if (steps) { const s = Math.min(steps - 1, Math.floor(p * steps * 0.999)); if (s !== last) { last = s; setStep(s); } }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [steps]);
  return (
    <section ref={el} id={id} aria-label={label} className={`sc ${className}${still ? " is-still" : ""}`} style={{ ["--screens" as string]: screens }}>
      <div className="sc-stage"><StepCtx.Provider value={step}>{children}</StepCtx.Provider></div>
    </section>
  );
}
