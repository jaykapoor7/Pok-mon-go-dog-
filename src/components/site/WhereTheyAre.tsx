"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { FieldMapPreview } from "./FieldMapPreview";
import { cityForPoints } from "@/lib/geo/cities";
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
  unchecked,
  orgs,
}: {
  dogs: Dog[];
  total: number;
  /** Animals nobody has checked for sterilisation. A real count. */
  unchecked: number;
  orgs: number;
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

  /* Framed on the densest cluster rather than on everything.
     A box around every located animal spans most of India, and at that
     zoom the photographs the map draws for each one are specks: it stops
     being an introduction to the product and becomes a dot map. Picking
     the busiest half-degree cell gives a city with records packed into
     it, which is what this looks like when it is working. Computed from
     the data, so it follows the records instead of naming a city. */
  const cluster = (() => {
    if (located.length === 0) return [];
    const cells = new Map<string, Dog[]>();
    for (const d of located) {
      const key = `${Math.round(d.lat * 2)}/${Math.round(d.lng * 2)}`;
      const bucket = cells.get(key);
      if (bucket) bucket.push(d);
      else cells.set(key, [d]);
    }
    let best: Dog[] = [];
    for (const bucket of cells.values()) if (bucket.length > best.length) best = bucket;
    /* One or two animals in a cell is not a city; show everything then. */
    return best.length >= 3 ? best : located;
  })();

  const focus = cluster.length ? cluster : located;
  /* A zone is a neighbourhood, so printing one over a map framed on a
     whole city made the landing map claim to be a street. The city comes
     from the coordinates instead, against a fixed table of real city
     centres, and stays unnamed when nothing is close enough. */
  const place = cityForPoints(focus);

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

        {/* The other half of the product. The map is what a neighbour
            sees; this is what the organisation working the same street
            sees. Every figure is counted from the same records the map is
            drawing, so it is the real dashboard summary rather than a
            picture of one. */}
        <div className="wt-dash">
          <div className="wt-dash-head">
            <span className="field-eyebrow">And for the team working it</span>
            <h3>The same records, as a worklist.</h3>
            <p>
              An organisation sees its streets as a queue rather than a
              gallery: what is on the record, what nobody has checked, and who
              else is working nearby.
            </p>
            <Link href="/for-ngos" className="wt-link">
              See the workspace <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="wt-panel">
            <div className="wt-panel-bar">
              <span className="wt-dot" aria-hidden />
              <b>Animals to check</b>
              <span className="wt-panel-live">
                {unchecked.toLocaleString("en-IN")} waiting
              </span>
            </div>
            {/* A queue, which is what a dashboard is. The three-figure row
                that stood here read "85 on record / 85 never checked / 40
                organisations": the same number twice, and a third with
                nothing to do with either. */}
            <ul className="wt-panel-rows">
              {dogs.slice(0, 5).map((d) => {
                const never =
                  !d.sterilisation_status || d.sterilisation_status === "unknown";
                return (
                  <li key={d.id}>
                    <span className="wt-row-name">
                      {d.name?.trim() || `Dog near ${d.zone || "you"}`}
                    </span>
                    <span className={`wt-row-tag${never ? " q" : ""}`}>
                      {never ? "Never checked" : "Sterilised"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="wt-panel-foot">
              <span>{total.toLocaleString("en-IN")} on the record</span>
              <span>{orgs} organisations can pick these up</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
