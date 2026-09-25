"use client";

import { useEffect, useState } from "react";
import { useCount } from "./useCount";

/* The live count under the headline: every animal on the record, the cases
   opened for them and the cities they are in, tallied up from zero when the
   page opens. Under reduced motion it simply shows the figures. */

const fmt = (n: number) => n.toLocaleString("en-IN");

export function HeroTally({ animals, cases, cities }: { animals: number; cases: number; cities: number }) {
  const [run, setRun] = useState(false);
  useEffect(() => { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRun(true); }, []);
  const a = useCount(animals, run, 1800);
  const c = useCount(cases, run, 1800);
  const k = useCount(cities, run, 1200);
  return (
    <dl className="ld-hero-tally" aria-label={`${fmt(animals)} animals tracked, ${fmt(cases)} cases, ${cities} cities`}>
      <div><dt>Animals tracked</dt><dd style={{ minWidth: `${fmt(animals).length * 0.6}em` }}>{fmt(a)}</dd></div>
      <div><dt>Cases</dt><dd style={{ minWidth: `${fmt(cases).length * 0.6}em` }}>{fmt(c)}</dd></div>
      <div><dt>Cities</dt><dd style={{ minWidth: `${fmt(cities).length * 0.6}em` }}>{fmt(k)}</dd></div>
    </dl>
  );
}
