"use client";

/* ════════════════════════════════════════════════════════════════════
   The register, as a living wall of real dogs.

   A compact band on the night ground, quietly alive with drifting record-
   lights (the map's own motif: mostly sky, a couple flame). Across it, three
   rows of real resident photographs slide in an endless loop — adjacent rows
   drift opposite ways — each a public profile with its StrayPaw ID and place.
   The dogs are the asset and the whole point.

   Each row duplicates its cards so the loop is seamless; the wall pauses on
   hover or focus. Under reduced motion the rows hold still as a scrollable
   strip, so every profile stays reachable.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "On the record";

const SPARKS: { x: number; y: number; s: number; d: number; dl: number; flame?: boolean }[] = [
  { x: 5, y: 20, s: 3, d: 11, dl: 0 }, { x: 14, y: 72, s: 2, d: 14, dl: 2 },
  { x: 23, y: 40, s: 4, d: 9, dl: 1, flame: true }, { x: 34, y: 82, s: 2, d: 13, dl: 4 },
  { x: 42, y: 14, s: 3, d: 12, dl: 3 }, { x: 53, y: 76, s: 2, d: 15, dl: 1 },
  { x: 61, y: 28, s: 3, d: 10, dl: 5 }, { x: 69, y: 86, s: 2, d: 12, dl: 2 },
  { x: 78, y: 42, s: 4, d: 9, dl: 0, flame: true }, { x: 86, y: 72, s: 2, d: 14, dl: 3 },
  { x: 93, y: 24, s: 3, d: 11, dl: 1 }, { x: 48, y: 50, s: 2, d: 16, dl: 6 },
  { x: 10, y: 48, s: 2, d: 13, dl: 5 }, { x: 73, y: 60, s: 3, d: 12, dl: 4 },
];

function Card({ c }: { c: RegisterFocus }) {
  return (
    <Link href={`/dog/${c.id}`} className="rx-card" aria-label={`${c.straypaw_id ?? "A dog"} near ${placeOf(c)}`}>
      <div className="rx-shot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sized(c.cover_photo, 420)} alt={`A dog near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`} loading="lazy" />
        <span className="rx-id sys-mono">{c.straypaw_id}</span>
      </div>
      <p className="rx-place">{placeOf(c)}</p>
    </Link>
  );
}

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
  /* Three rows; split so adjacent rows don't begin on the same dog. With few
     cards it falls back to one or two rows. */
  const per = Math.ceil(cards.length / 3);
  const rows = [cards.slice(0, per), cards.slice(per, per * 2), cards.slice(per * 2)].filter((r) => r.length >= 2);

  return (
    <section className={`rx ${calm ? "is-calm" : ""}`} aria-labelledby="rx-title">
      <div className="rx-field" aria-hidden>
        {SPARKS.map((p, i) => (
          <span key={i} className={`rx-spark${p.flame ? " is-flame" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, ["--t" as string]: `${p.d}s`, ["--dl" as string]: `${p.dl}s` }} />
        ))}
      </div>

      <div className="rx-words">
        <p className="rx-kicker sys-mono">The register</p>
        <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> dogs. <em>One profile each.</em> <Link href="/map" className="rx-cta">Live map <ArrowUpRight size={14} aria-hidden /></Link></h2>
      </div>

      <div className="rx-wall" role="list" aria-label={`A sample of the ${fmt(total)} dogs on the register`}>
        {rows.map((r, i) => <Row key={i} cards={r} dir={i % 2 === 0 ? "l" : "r"} />)}
        <span className="rx-edge is-left" aria-hidden />
        <span className="rx-edge is-right" aria-hidden />
      </div>
    </section>
  );
}
