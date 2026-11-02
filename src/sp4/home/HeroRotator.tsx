"use client";

/* The second line of the hero: what Kaju does, one short phrase at a time.
   Each phrase flickers in letter by letter, holds, then lifts away while the
   next arrives, endlessly. Decorative: the h1 carries a stable sentence for
   screen readers. Reduced motion shows the first phrase, still. */

import { Fragment, useEffect, useState } from "react";

export const HERO_PHRASES = [
  "animal welfare programmes",
  "turning field notes into records",
  "chasing missing evidence",
  "lining up vet sign-offs",
  "catching dogs counted twice",
  "building the monthly report",
  "answering municipal reviewers",
];

const HOLD = 2600;

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
      <span key={`i${i}`} className="s6-rot-line is-in">
        {(() => { let k = 0; return HERO_PHRASES[i].split(" ").map((w, wi) => <Fragment key={wi}>{wi > 0 && " "}<span className="s6-rot-w">{Array.from(w).map((c) => <span key={k} style={{ ["--k" as string]: k++ }}>{c}</span>)}</span></Fragment>); })()}
      </span>
    </span>
  );
}
