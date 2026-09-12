"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { FieldMapPreview } from "./FieldMapPreview";
import { cityForPoints } from "@/lib/geo/cities";
import { densestCell, located } from "@/lib/geo/cluster";
import { markerMetaFor } from "@/lib/marker-state";
import { dogLabel } from "@/lib/utils";
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

  const there = located(dogs);

  /* Framed on the busiest cell rather than on everything: see lib/geo/cluster. */
  const focus = densestCell(there);

  /* A zone is a neighbourhood, so printing one over a map framed on a whole
     city made the landing map claim to be a street. The city comes from the
     coordinates instead. */
  const place = cityForPoints(focus);

  /* What an organisation would actually be looking at: animals flagged as
     needing help first, then the ones nobody has checked. Real records in
     both cases, and the list simply runs short when the register is. */
  const attention = [
    ...dogs.filter((d) => d.needs_help),
    ...dogs.filter(
      (d) => !d.needs_help && (!d.sterilisation_status || d.sterilisation_status === "unknown")
    ),
  ].slice(0, 4);

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
            <h3>The same records, as a console.</h3>
            <p>
              An organisation opens the animals on its streets as work: what
              is on the register, what nobody has checked, and which animals
              are waiting on a decision today.
            </p>
            <Link href="/for-ngos" className="wt-link">
              See the workspace <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* A small, faithful copy of the organisation console: the same
              labels, the same case rows, the same chrome. Two attempts stood
              here before and both invented an interface — a row of three
              figures that printed one number twice, then a queue called
              "animals to check" that exists nowhere in the product.

              Every figure below is counted from the records this page has
              already loaded. */}
          <div className="wt-panel" role="img" aria-label="The StrayPaw organisation console">
            <div className="wt-panel-bar">
              <span className="wt-dot" aria-hidden />
              <b>StrayPaw · Organisation console</b>
              <span className="wt-panel-live">{place ?? "India"}</span>
            </div>

            <div className="wt-panel-stats">
              <div>
                <span>On the register</span>
                <b>{total.toLocaleString("en-IN")}</b>
                <small>animals with a record</small>
              </div>
              <div>
                <span>Never checked</span>
                <b className="q">{unchecked.toLocaleString("en-IN")}</b>
                <small>no sterilisation status</small>
              </div>
              <div>
                <span>Organisations</span>
                <b>{orgs}</b>
                <small>can claim this work</small>
              </div>
            </div>

            <div className="wt-panel-list">
              <div className="wt-panel-listhead">
                <b>Needs attention</b>
                <span>{attention.length ? `${attention.length} shown` : "nothing open"}</span>
              </div>
              <ul>
                {attention.map((d) => (
                  <li key={d.id}>
                    <i style={{ background: markerMetaFor(d).color }} aria-hidden />
                    <span className="wt-row-name">{dogLabel(d)}</span>
                    <span className="wt-row-zone">{d.zone || "Location on record"}</span>
                    <span className={`wt-row-tag${d.needs_help ? " urgent" : " q"}`}>
                      {d.needs_help ? "Needs help" : "Never checked"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
