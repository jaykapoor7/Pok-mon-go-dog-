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
    <p className="ld-hero-tally" aria-label={`${fmt(animals)} animals tracked, ${fmt(cases)} cases, ${cities} cities`}>
      <i aria-hidden />
      <span aria-hidden><b>{fmt(a)}</b> animals tracked</span>
      <span aria-hidden>·</span>
      <span aria-hidden><b>{fmt(c)}</b> cases</span>
      <span aria-hidden>·</span>
      <span aria-hidden><b>{fmt(k)}</b> cities</span>
    </p>
  );
}
