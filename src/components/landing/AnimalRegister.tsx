"use client";

/* ════════════════════════════════════════════════════════════════════
   The register: real animals, developed from one card into many.

   Every animal reported gets a StrayPaw ID and a card that keeps its
   story. This section is that idea made legible: a hero card — one real
   animal, a resident's photograph, its ID on the tab, where it lives, when
   it was seen — and beneath it the rest of the register in tidy centred
   lines, each a real public record with its own ID.

   As the section comes into view the hero settles first and the lines
   develop after it, so it reads from one to many. One source of truth: the
   total is the hero's own count, and nothing is invented. Before the
   script runs, and under reduced motion, the whole sheet is simply shown.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso: string | null, year = true) => { if (!iso) return null; const d = new Date(iso); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}`; };
const fmt = (n: number) => n.toLocaleString("en-IN");
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "Place not recorded";

function Tile({ c, i, hero }: { c: RegisterFocus; i: number; hero: boolean }) {
  const seen = day(c.last_seen, false);
  const note = c.requests.length
    ? plural(c.requests.length, "request")
    : c.care.length
      ? plural(c.care.length, "care note")
      : plural(c.sightings, "sighting");
  return (
    <Link href={`/dog/${c.id}`} className={`rx-tile${hero ? " is-hero" : ""}`} style={{ ["--i" as string]: i }}>
      <span className="rx-tab sys-mono">{c.straypaw_id}</span>
      <div className="rx-shot">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sized(c.cover_photo, hero ? 900 : 560)} alt={`${c.name?.trim() || "A dog"} near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`} loading={i < 3 ? "eager" : "lazy"} />
        <span className="rx-open" aria-hidden>Open the record <ArrowUpRight size={14} /></span>
      </div>
      <div className="rx-cap">
        <p className="rx-place">{placeOf(c)}</p>
        <p className="rx-meta sys-mono">{[seen && `seen ${seen}`, note].filter(Boolean).join(" · ")}</p>
      </div>
    </Link>
  );
}

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const sec = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const cards = data.cards.slice(0, 8);
  const count = cards.length;

  useEffect(() => {
    const node = sec.current;
    if (!node) return;
    /* Reduced motion keeps the sheet static — no hidden pre-reveal state. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setReady(true); // arm the pre-reveal state only once JS can animate it back
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      node.classList.add("is-in");
      io.disconnect();
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  if (!count || total <= 0) return null;
  const rest = cards.slice(1);

  return (
    <section ref={sec} className={`rx ${ready ? "is-ready" : ""}`} aria-labelledby="rx-title">
      <div className="rx-stage">
        <header className="rx-words">
          <p className="rx-kicker sys-mono">The register</p>
          <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> animals. <em>One card each.</em></h2>
          <p className="rx-lede">Every animal reported gets a StrayPaw ID and a card that keeps its story — where it lives, every sighting, every request for help, every treatment.</p>
        </header>

        <div className="rx-grid">
          <Tile c={cards[0]} i={0} hero />
          {rest.length > 0 && (
            <div className="rx-rest">
              {rest.map((c, i) => <Tile key={c.id} c={c} i={i + 1} hero={false} />)}
            </div>
          )}
        </div>

        <p className="rx-foot">
          Every one of the <span className="sys-mono">{fmt(total)}</span> has a card like these.
          <Link href="/map">Open the live map <ArrowUpRight size={15} aria-hidden /></Link>
        </p>
      </div>
    </section>
  );
}
