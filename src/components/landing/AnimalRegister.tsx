"use client";

/* ════════════════════════════════════════════════════════════════════
   The register, as a living wall of real dogs.

   Every animal reported gets a StrayPaw ID and a card that keeps its
   story. This section shows that asset: real resident photographs drifting
   past in two slow rows, each a real public profile with its ID and place.
   It is compact and sleek — the dogs are the point, not the chrome.

   The marquee duplicates its cards once so the loop is seamless; it pauses
   on hover and is fully keyboard-reachable. Under reduced motion, and on a
   phone, it becomes a plain horizontal scroll strip with no auto-motion.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "On the record";

function Card({ c }: { c: RegisterFocus }) {
  return (
    <Link href={`/dog/${c.id}`} className="rx-card" tabIndex={0}>
      <div className="rx-shot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sized(c.cover_photo, 480)} alt={`A dog near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`} loading="lazy" />
        <span className="rx-id sys-mono">{c.straypaw_id}</span>
      </div>
      <p className="rx-place">{placeOf(c)}</p>
    </Link>
  );
}

/* One row of cards, duplicated so the translate loop never shows a seam. */
function Row({ cards, dir }: { cards: RegisterFocus[]; dir: "l" | "r" }) {
  if (!cards.length) return null;
  return (
    <div className={`rx-row is-${dir}`}>
      <div className="rx-track" style={{ ["--n" as string]: cards.length }}>
        {[...cards, ...cards].map((c, i) => <Card key={`${c.id}-${i}`} c={c} />)}
      </div>
    </div>
  );
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(m.matches);
    sync(); m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, []);

  const cards = data.cards;
  if (!cards.length || total <= 0) return null;
  /* Two rows that drift in opposite directions. Split so neither row repeats
     the same dog beside its twin. */
  const mid = Math.ceil(cards.length / 2);
  const top = cards.slice(0, mid);
  const bottom = cards.slice(mid).length >= 3 ? cards.slice(mid) : cards;

  return (
    <section className={`rx ${calm ? "is-calm" : ""}`} aria-labelledby="rx-title">
      <div className="rx-words">
        <p className="rx-kicker sys-mono">The register</p>
        <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> dogs. <em>One profile each.</em></h2>
        <p className="rx-lede">Every dog reported gets a StrayPaw ID and a profile that keeps its story — where it lives, every sighting, every request for help, every treatment. These are real ones, photographed by residents.</p>
        <Link href="/map" className="rx-cta">Open the live map <ArrowUpRight size={15} aria-hidden /></Link>
      </div>

      <div className="rx-wall" role="list" aria-label={`A sample of the ${fmt(total)} dogs on the register`}>
        <Row cards={top} dir="l" />
        <Row cards={bottom} dir="r" />
        <span className="rx-edge is-left" aria-hidden />
        <span className="rx-edge is-right" aria-hidden />
      </div>
    </section>
  );
}
