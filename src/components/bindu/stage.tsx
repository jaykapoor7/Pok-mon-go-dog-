"use client";

/* ════════════════════════════════════════════════════════════════════
   A stage: a tall section whose frame stays in view (sticky) while the
   page scrolls through it. Its progress (0 → 1) is written to the frame
   as --p for CSS, and kept in a ref for canvas and script choreography,
   so every timeline is a pure function of scroll and plays the same in
   both directions. A stage can also hand a step index to its children.

   The scroll is never captured: the reader moves at their own pace and
   can leave at any moment. Under reduced motion the stage unpins, sits
   at its `still` progress, and everything reads top to bottom.
   ════════════════════════════════════════════════════════════════════ */

import { createContext, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";

type Ctx = { p: MutableRefObject<number>; step: number; still: boolean; listen: (f: () => void) => () => void };
const StageCtx = createContext<Ctx>({ p: { current: 0 }, step: 0, still: false, listen: () => () => {} });
export const useStage = () => useContext(StageCtx);

export function Stage({ screens = 2, steps = 0, still: stillAt = 1, className = "", id, label, tone = "day", children }: {
  screens?: number; steps?: number; still?: number; className?: string; id?: string; label?: string; tone?: "day" | "night"; children: ReactNode;
}) {
  const el = useRef<HTMLElement>(null);
  const p = useRef(0);
  const subs = useRef(new Set<() => void>());
  const [step, setStep] = useState(steps ? steps - 1 : 0);
  const [still, setStill] = useState(false);
  const listen = useRef((f: () => void) => { subs.current.add(f); return () => { subs.current.delete(f); }; }).current;

  useEffect(() => {
    const node = el.current; if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true); p.current = stillAt; node.style.setProperty("--p", String(stillAt));
      if (steps) setStep(steps - 1);
      subs.current.forEach((f) => f());
      return;
    }
    setStep(0);
    let raf = 0, last = -1;
    const tick = () => {
      raf = 0;
      const r = node.getBoundingClientRect(), span = Math.max(1, r.height - window.innerHeight);
      const v = Math.round(Math.max(0, Math.min(1, -r.top / span)) * 1000) / 1000;
      if (v !== p.current) { p.current = v; node.style.setProperty("--p", v.toFixed(3)); subs.current.forEach((f) => f()); }
      if (steps) { const s = Math.min(steps - 1, Math.floor(v * steps * 0.9999)); if (s !== last) { last = s; setStep(s); } }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    p.current = -1; tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [steps, stillAt]);

  return (
    <section ref={el} id={id} aria-label={label} data-tone={tone} className={`bs ${className}${still ? " is-still" : ""}`} style={{ ["--screens" as string]: screens }}>
      <div className="bs-frame"><StageCtx.Provider value={{ p, step, still, listen }}>{children}</StageCtx.Provider></div>
    </section>
  );
}

/* Map a stage's progress onto a sub-range, clamped: span(p, 0.2, 0.5) is 0 before 0.2 and 1 after 0.5. */
export const span = (p: number, a: number, b: number) => Math.max(0, Math.min(1, (p - a) / (b - a)));
export const ease = {
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t: number) => 1 - Math.pow(1 - t, 3),
  in: (t: number) => t * t * t,
};
