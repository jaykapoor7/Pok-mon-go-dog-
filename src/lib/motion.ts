/* ════════════════════════════════════════════════════════════════════
   StrayPaw motion: the JavaScript half of the tokens in tokens.css.

   One idea governs every moving thing on the site: a record being
   written. Ink settles rather than bounces; a line is drawn in the order
   it happened; a number arrives at its value and stays there long enough
   to read. Nothing moves to be noticed — movement only ever says "this
   changed", "this came from there" or "this happened before that".

   The vocabulary (durations, curves, stagger) was chosen from the
   awesome-ai-motion catalogue (gongnyang, MIT) — count-up, stagger,
   line-draw, bar-grow, fly-to, map-event-accumulation and
   active-indicator-glide — and tuned to StrayPaw's quieter register. See
   docs/MOTION.md for which techniques were taken and which were refused.
   ════════════════════════════════════════════════════════════════════ */

/** Durations in milliseconds. Mirrors --sp-fast / --sp-base / --sp-slow / --sp-scene. */
export const DUR = {
  touch: 160,   // a control under the finger
  base: 280,    // interface state changes
  enter: 500,   // something entering the page
  scene: 850,   // a section arriving
  count: 1100,  // a figure counting to its value
  draw: 1200,   // a line being drawn
} as const;

/** Gap between siblings in a staggered entrance. The whole run is capped by STAGGER_CAP. */
export const STAGGER = 45;
export const STAGGER_CAP = 600;

/* The curves, as functions of t ∈ [0, 1]. Each matches a cubic-bezier in
   tokens.css closely enough that a CSS and a JS animation side by side
   cannot be told apart. */

/** --sp-ease: arriving, settling (≈ cubic-bezier(.23,1,.32,1), an ease-out-quint). */
export const settle = (t: number) => 1 - Math.pow(1 - t, 5);
/** Counting and growing: a gentler ease-out (power2.out in the catalogue). */
export const decel = (t: number) => 1 - (1 - t) * (1 - t);
/** Camera travel and anything that leaves as well as arrives (power1.inOut → a cubic). */
export const travel = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Lines drawn in time order: constant speed, because time is. */
export const linear = (t: number) => t;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Drive a value from 0 to 1 over `ms`, eased. Returns a cancel function.
 * Under reduced motion the final frame is delivered at once: the state is
 * never withheld, only the travel.
 */
export function tween(ms: number, onFrame: (p: number) => void, ease: (t: number) => number = settle, delay = 0): () => void {
  if (prefersReducedMotion() || ms <= 0) { onFrame(1); return () => {}; }
  let raf = 0;
  let start = -1;
  const step = (now: number) => {
    if (start < 0) start = now + delay;
    const t = Math.min(1, Math.max(0, (now - start) / ms));
    onFrame(ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

/**
 * Camera travel time for a map move. A short hop should not take as long
 * as crossing the subcontinent; the catalogue's fly-to range is 1.2–2.6s,
 * trimmed here because people are waiting on the result, not watching it.
 */
export function cameraDuration(fromZoom: number, toZoom: number, distanceKm = 0): number {
  if (prefersReducedMotion()) return 0;
  const dz = Math.abs(toZoom - fromZoom);
  return Math.round(Math.min(1900, Math.max(700, 650 + dz * 140 + Math.min(distanceKm, 2000) * 0.2)));
}
