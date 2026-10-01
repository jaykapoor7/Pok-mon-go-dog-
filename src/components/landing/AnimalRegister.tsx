"use client";

/* ════════════════════════════════════════════════════════════════════
   The register: one dog, opening into five.

   A small, sleek section on the night ground. It rests on a single real
   dog; as it scrolls into view the one opens into a row of five real
   public profiles, each a resident's photograph with its StrayPaw ID
   beneath. The dogs are the asset and the whole point.

   Under reduced motion the five are simply shown, already open.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "On the record";

export function AnimalRegister({ data, total }: { data: Data; total: number }) {
  const sec = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [calm, setCalm] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setCalm(true); setOpen(true); return; }
    const node = sec.current;
    if (!node) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOpen(true); io.disconnect(); } }, { threshold: 0.4, rootMargin: "0px 0px -10% 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const cards = data.cards.slice(0, 5);
  if (!cards.length || total <= 0) return null;
  const center = Math.floor(cards.length / 2);

  return (
    <section ref={sec} className={`rx ${open ? "is-open" : ""} ${calm ? "is-calm" : ""}`} aria-labelledby="rx-title">
      <div className="rx-words">
        <p className="rx-kicker sys-mono">The register</p>
        <h2 id="rx-title"><span className="rx-n">{fmt(total)}</span> dogs. <em>One profile each.</em></h2>
        <p className="rx-lede">Every dog reported gets a StrayPaw ID and a profile that keeps its story — where it lives, every sighting, every request for help, every treatment. Real ones, photographed by residents.</p>
        <Link href="/map" className="rx-cta">Open the live map <ArrowUpRight size={15} aria-hidden /></Link>
      </div>

      <ol className="rx-row" role="list" aria-label={`Five of the ${fmt(total)} dogs on the register`}>
        {cards.map((c, i) => (
          <li key={c.id} className="rx-cell" style={{ ["--d" as string]: i - center, ["--ad" as string]: Math.abs(i - center) }} {...(i === center ? { "data-center": "" } : {})}>
            <Link href={`/dog/${c.id}`} className="rx-card" aria-label={`${c.straypaw_id ?? "A dog"} near ${placeOf(c)}`}>
              <div className="rx-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sized(c.cover_photo, 480)} alt={`A dog near ${cleanPlace(c.zone) || c.city || "the reported spot"}, photographed by a resident`} loading="lazy" />
              </div>
            </Link>
            <p className="rx-id sys-mono">{c.straypaw_id}</p>
            <p className="rx-place">{placeOf(c)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
