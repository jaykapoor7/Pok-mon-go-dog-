"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { FieldMapPreview } from "./FieldMapPreview";
import { cityForPoints } from "@/lib/geo/cities";
import { densestCell, located } from "@/lib/geo/cluster";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   Where they actually are.

   Two attempts stood here before. First a second wall of photographs
   behind a sticky scroll, which was the hero's idea again. Then a pair
   of national rabies figures, which was true and sourced and read like a
   footnote: a landing page is not where somebody wants a statistic
   explained to them.

   Both had the same fault. The hero's subject is the animals, and
   neither of those changed the subject. This does: the subject here is
   place. One map, most of the width, with the real records on it, and
   every pin opens that animal's own page. The hero says who is on the
   record. This says where, and lets you go and look.

   The map is the heaviest thing on the page, so it is not mounted until
   it is nearly in view. Until then the block holds its own height, so
   nothing below it moves when the map arrives.

   This section used to carry a second job at the bottom: a miniature of
   the organisation console with three live counts in it. That has moved
   out to ConsoleShowcase and been rewritten, because a section should
   make one argument and this one's argument is place.
   ════════════════════════════════════════════════════════════════════ */

export function WhereTheyAre({ dogs }: { dogs: Dog[] }) {
  const frame = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    /* No IntersectionObserver is not a reason to show an empty box. */
    if (typeof IntersectionObserver === "undefined") {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const there = located(dogs);

  /* Framed on the busiest cell rather than on everything: see lib/geo/cluster. */
  const focus = densestCell(there);

  /* A zone is a neighbourhood, so printing one over a map framed on a whole
     city made the landing map claim to be a street. The city comes from the
     coordinates instead. */
  const place = cityForPoints(focus);

  return (
    <section className="wt" aria-labelledby="wt-title">
      <div className="wt-inner">
        <header className="wt-head">
          <span className="field-eyebrow">Where they actually are</span>
          <h2 id="wt-title">
            Every record is a street<br />
            <em>somebody walks down.</em>
          </h2>
          <p>
            Not an estimate that flattens a city into one number. A pin on
            the road where somebody stopped, took a photograph and said
            where they were standing. Open one and you get the animal:
            where she stays, when she was last seen, what has been done for
            her — and the part nobody has got to yet.
          </p>
        </header>

        <div className="wt-map" ref={frame}>
          {live && focus.length > 0 ? (
            <FieldMapPreview dogs={focus} place={place ?? undefined} />
          ) : (
            /* Holds the height so the page does not jump, and says what
               is coming rather than sitting blank. */
            <div className="wt-map-wait" aria-hidden>
              <span>Loading the map</span>
            </div>
          )}
        </div>

        <div className="wt-foot">
          <p className="wt-hint">Tap any animal to open its record.</p>
          <Link href="/map" className="wt-link">
            Open the full map <ArrowUpRight size={15} />
          </Link>
        </div>

      </div>
    </section>
  );
}
