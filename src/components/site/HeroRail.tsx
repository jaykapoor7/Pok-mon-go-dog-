"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { dogLabel } from "@/lib/utils";
import type { Dog } from "@/lib/types";

/* ════════════════════════════════════════════════════════════════════
   The record rail.

   The hero used to carry a static grid of eight more dogs beside Pinky,
   which turned it into a contact sheet: no single animal was the
   subject, and the tiles were whatever eight rows the query returned.

   A rail is the better shape for the same material, and not only because
   it moves. This product IS a register, and a register is something you
   page through — so a sequence of records you can push along says what
   the thing is in a way a fixed 4x2 block does not. Pinky stays the one
   subject above it; this is the rest of the register, offered rather
   than dumped.

   EVERY TILE IS A REAL RECORD, read from the database, and each one
   opens the animal's own page. Nothing here is decorative: a photograph,
   the name the reporter gave, and where it was. If the register is thin,
   the rail is short; if it is empty, there is no rail at all, because a
   carousel with two items and six gaps advertises how little there is.

   NO AUTO-ADVANCE. A rail that moves on its own takes the reader's
   place away and has to be fought; it is also the single most common
   way a landing page announces that it was assembled from a template.
   This one moves when somebody moves it.

   The scrolling itself is native — CSS scroll-snap, so a thumb swipes it
   with the platform's own physics and it works before any JavaScript
   runs. The arrows are an addition for pointers, which have no swipe,
   and they hide themselves at the ends rather than sitting there dead.
   ════════════════════════════════════════════════════════════════════ */

export function HeroRail({ dogs }: { dogs: Dog[] }) {
  const withPhoto = dogs.filter((d) => d.cover_photo && d.cover_photo.length > 0);
  const rail = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  /* One "page" is most of the visible width rather than a fixed pixel
     count, so the same control works at 320px and at 1600px. */
  const page = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.82, behavior: reduce ? "auto" : "smooth" });
  };

  /* Fewer than two records is not a rail. Rather than draw a lonely tile
     next to a row of empty space, this renders nothing and the hero is
     simply Pinky — which is the correct picture of a young register. */
  if (withPhoto.length < 2) return null;

  return (
    <section className="hrail" aria-labelledby="hrail-title">
      <header className="hrail-head">
        <h2 id="hrail-title">Also on the record</h2>
        <div className="hrail-controls">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Previous records"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="More records"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {/* A list, because that is what it is. Keyboard users tab straight
          through the links and the browser scrolls each into view on its
          own, so the arrows are genuinely supplementary. */}
      <ul className="hrail-track" ref={rail}>
        {withPhoto.map((dog) => (
          <li key={dog.id}>
            <Link href={`/dog/${dog.id}`}>
              <span className="hrail-shot">
                <Image
                  src={dog.cover_photo}
                  alt={`${dogLabel(dog)}, photographed on the street`}
                  width={320}
                  height={320}
                  sizes="(max-width: 700px) 45vw, 210px"
                />
              </span>
              <b>{dogLabel(dog)}</b>
              <span className="hrail-where">
                <MapPin size={12} aria-hidden />
                {dog.zone || dog.city || "On the record"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
