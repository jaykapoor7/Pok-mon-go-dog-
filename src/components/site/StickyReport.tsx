"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════
   The sticky report bar, on phones.

   The hero's "Report a sighting" is above the fold, but the landing page
   is about five screens tall on a phone, and the whole argument it makes
   is "you can add the animal you walk past". Somebody convinced by the
   console section is four screens away from the only control that acts
   on that. This follows them down.

   IT APPEARS AFTER THE HERO'S OWN BUTTON HAS GONE, not on load. Two
   controls saying the same thing on one screen is one of them wasted,
   and a bar that is present from the first frame covers content before
   the reader has any reason to want it.

   It also hides itself on the last section, which is a full-width
   "Report a sighting" call of its own: arriving at the destination and
   finding the signpost still stuck to your screen is worse than having
   no signpost.

   Phones only. On a desktop the header's own action is always visible,
   so this would be a third copy of the same link.
   ════════════════════════════════════════════════════════════════════ */

export function StickyReport() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* The two elements this bar defers to. Read once; both are in the
       page's own markup, so neither moves after hydration. */
    const heroCta = document.querySelector(".product-hero-actions");
    const closing = document.querySelector(".product-closing");
    if (!heroCta) return;

    let heroVisible = true;
    let closingVisible = false;
    const sync = () => setShow(!heroVisible && !closingVisible);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === heroCta) heroVisible = e.isIntersecting;
          if (e.target === closing) closingVisible = e.isIntersecting;
        }
        sync();
      },
      { threshold: 0 }
    );
    io.observe(heroCta);
    if (closing) io.observe(closing);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`sticky-report${show ? " is-in" : ""}`} aria-hidden={!show}>
      <Link href="/report" tabIndex={show ? 0 : -1}>
        Report a sighting <ArrowUpRight size={17} />
      </Link>
    </div>
  );
}
