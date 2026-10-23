"use client";

import { useEffect, useState } from "react";
import { useCount } from "./useCount";

/* The live count under the headline: every animal on the record, the dogs
   with recorded care (sterilised, vaccinated or treated) and the cities they
   are in, tallied up from zero when the page opens. Under reduced motion it
   simply shows the figures. A figure that could not be read is left out. */

const fmt = (n: number) => n.toLocaleString("en-IN");

export function HeroTally({ animals, treated, cities }: { animals: number; treated: number | null; cities: number }) {
  const [run, setRun] = useState(false);
  useEffect(() => { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setRun(true); }, []);
  const a = useCount(animals, run, 1800);
  const c = useCount(treated ?? 0, run, 1800);
  const k = useCount(cities, run, 1200);
  return (
    <dl className="ld-hero-tally" aria-label={`${fmt(animals)} animal records, ${treated !== null ? `${fmt(treated)} dogs treated, ` : ""}${cities} cities`}>
      <div><dt>Animals</dt><dd style={{ minWidth: `${fmt(animals).length * 0.6}em` }}>{fmt(a)}</dd></div>
      {treated !== null && <div><dt>Dogs treated</dt><dd style={{ minWidth: `${fmt(treated).length * 0.6}em` }}>{fmt(c)}</dd></div>}
      <div><dt>Cities</dt><dd style={{ minWidth: `${fmt(cities).length * 0.6}em` }}>{fmt(k)}</dd></div>
    </dl>
  );
}
