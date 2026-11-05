"use client";

/* The second line of the hero: the programmes Kaju runs, one at a time.
   Each phrase rises in, holds, then lifts away as the next arrives.
   Decorative: the h1 carries a stable sentence for screen readers.
   Reduced motion shows the first phrase, still. */

import { useEffect, useState } from "react";

export const HERO_PHRASES = [
  "animal welfare programmes",
  "ABC sterilisation programmes",
  "rabies vaccination drives",
  "street-animal rescue",
  "municipal ABC claims",
];

const HOLD = 3200;

export function HeroRotator() {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: number;
    const tick = () => {
      if (document.hidden) { t = window.setTimeout(tick, HOLD); return; }
      setI((n) => { setPrev(n); return (n + 1) % HERO_PHRASES.length; });
      t = window.setTimeout(tick, HOLD + 400);
    };
    t = window.setTimeout(tick, HOLD + 600);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <span className="s6-rot" aria-hidden>
      {prev !== null && <span key={`o${prev}-${i}`} className="s6-rot-line is-out">{HERO_PHRASES[prev]}</span>}
      <span key={`i${i}`} className="s6-rot-line is-in">{HERO_PHRASES[i]}</span>
    </span>
  );
}
