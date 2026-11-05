"use client";

/* The second line of the hero: the programmes Kaju runs, one at a time.
   Each phrase melts into the next: the old words blur and thin out while
   the new ones condense from the blur, and an alpha threshold turns the
   overlap into liquid shapes for the moment of the switch only, so the
   text is crisp at rest. Decorative: the h1 carries a stable sentence for
   screen readers. Reduced motion shows the first phrase, still. */

import { useEffect, useRef, useState } from "react";

export const HERO_PHRASES = [
  "animal welfare programmes",
  "ABC sterilisation programmes",
  "rabies vaccination drives",
  "street-animal rescue",
  "municipal ABC claims",
];

const HOLD = 3000;
const MORPH = 1100;

export function HeroRotator() {
  const [i, setI] = useState(0);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = 0, raf = 0, timer = 0, alive = true;
    const set = (el: HTMLSpanElement | null, f: number) => {
      if (!el) return;
      // f: 1 = fully shown, 0 = gone. Blur grows sharply as f falls.
      const blur = f >= 1 ? 0 : Math.min(10 / Math.max(f, 0.001) - 10, 40);
      el.style.filter = blur ? `blur(${blur.toFixed(2)}px)` : "";
      el.style.opacity = `${Math.pow(Math.max(f, 0), 0.4)}`;
    };
    const morph = () => {
      if (!alive) return;
      if (document.hidden) { timer = window.setTimeout(morph, HOLD); return; }
      const from = n, to = (n + 1) % HERO_PHRASES.length;
      if (a.current) a.current.textContent = HERO_PHRASES[from];
      if (b.current) b.current.textContent = HERO_PHRASES[to];
      box.current?.classList.add("is-morph");
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / MORPH);
        set(a.current, 1 - t); set(b.current, t);
        if (t < 1) { raf = requestAnimationFrame(step); return; }
        n = to; setI(to);
        box.current?.classList.remove("is-morph");
        if (a.current) a.current.textContent = HERO_PHRASES[to];
        set(a.current, 1); set(b.current, 0);
        timer = window.setTimeout(morph, HOLD);
      };
      raf = requestAnimationFrame(step);
    };
    set(b.current, 0);
    timer = window.setTimeout(morph, HOLD + 600);
    return () => { alive = false; cancelAnimationFrame(raf); window.clearTimeout(timer); };
  }, []);

  return (
    <span ref={box} className="s6-rot" aria-hidden data-i={i}>
      <svg className="s6-rot-defs" width="0" height="0" aria-hidden focusable="false">
        <filter id="s6-rot-goo"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140" /></filter>
      </svg>
      <span ref={a} className="s6-rot-line">{HERO_PHRASES[0]}</span>
      <span ref={b} className="s6-rot-line is-next" />
    </span>
  );
}
