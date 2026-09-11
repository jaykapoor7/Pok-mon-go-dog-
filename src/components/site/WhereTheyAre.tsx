"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { FieldMapPreview } from "./FieldMapPreview";
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
   ════════════════════════════════════════════════════════════════════ */

export function WhereTheyAre({
  dogs,
  total,
  orgs,
  states,
}: {
  dogs: Dog[];
  total: number;
  orgs: number;
  states: number;
}) {
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

  const located = dogs.filter(
    (d) => Number.isFinite(d.lat) && Number.isFinite(d.lng)
  );

  return (
    <section className="wt" aria-labelledby="wt-title">
      <div className="wt-inner">
        <header className="wt-head">
          <span className="field-eyebrow">Where they actually are</span>
          <h2 id="wt-title">
            Every record sits on a street<br />
            <em>somebody walks down.</em>
          </h2>
          <p>
            Not a national estimate. A pin on the road where somebody stopped,
            took a photograph and said where it was. Open any one of them and
            you get that animal: its place, when it was last seen, what has been
            done for it and what has not.
          </p>
        </header>

        <div className="wt-map" ref={frame}>
          {live && located.length > 0 ? (
            <FieldMapPreview dogs={located} chrome={false} />
          ) : (
            /* Holds the height so the page does not jump, and says what
               is coming rather than sitting blank. */
            <div className="wt-map-wait" aria-hidden>
              <span>Loading the map</span>
            </div>
          )}
        </div>

        <div className="wt-foot">
          <dl className="wt-facts">
            <div>
              <dt>On the record</dt>
              <dd>{total.toLocaleString("en-IN")} animals</dd>
            </div>
            <div>
              <dt>Organisations listed</dt>
              <dd>{orgs} verified</dd>
            </div>
            <div>
              <dt>States covered</dt>
              <dd>{states} of 28</dd>
            </div>
          </dl>
          <Link href="/map" className="wt-link">
            Open the full map <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
