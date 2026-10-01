"use client";

/* ════════════════════════════════════════════════════════════════════
   The register: one dog, opening into five.

   A small, sleek band on the night ground. The ground is quietly alive —
   faint points of light drift and settle, the same record-light motif the
   hero and the map use (most sky, a couple of flame for attention). It
   rests on a single real dog; as it scrolls into view the one opens into a
   row of five real public profiles, each a resident's photograph with its
   StrayPaw ID beneath. Minimal words above, so the section stays short.

   Under reduced motion the five are shown already open and the lights hold
   still.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { sized } from "@/lib/photo/src";
import { cleanPlace } from "@/lib/utils";
import type { AnimalRegister as Data, RegisterFocus } from "@/lib/landing/story";

const fmt = (n: number) => n.toLocaleString("en-IN");
const placeOf = (c: RegisterFocus) => [cleanPlace(c.zone), c.city].filter(Boolean).join(" · ") || "On the record";

/* Deterministic so server and client render the same field (no hydration
   mismatch). x/y in %, size in px, duration/delay in s, flame marks the few
   attention-coloured lights. */
const SPARKS: { x: number; y: number; s: number; d: number; dl: number; flame?: boolean }[] = [
  { x: 6, y: 22, s: 3, d: 11, dl: 0 }, { x: 15, y: 68, s: 2, d: 14, dl: 2 },
  { x: 24, y: 38, s: 4, d: 9, dl: 1, flame: true }, { x: 33, y: 80, s: 2, d: 13, dl: 4 },
  { x: 41, y: 16, s: 3, d: 12, dl: 3 }, { x: 52, y: 72, s: 2, d: 15, dl: 1 },
  { x: 60, y: 30, s: 3, d: 10, dl: 5 }, { x: 68, y: 84, s: 2, d: 12, dl: 2 },
  { x: 77, y: 40, s: 4, d: 9, dl: 0, flame: true }, { x: 85, y: 70, s: 2, d: 14, dl: 3 },
  { x: 92, y: 26, s: 3, d: 11, dl: 1 }, { x: 48, y: 48, s: 2, d: 16, dl: 6 },
  { x: 11, y: 46, s: 2, d: 13, dl: 5 }, { x: 72, y: 60, s: 3, d: 12, dl: 4 },
  { x: 30, y: 58, s: 2, d: 15, dl: 2 }, { x: 88, y: 50, s: 2, d: 10, dl: 6 },
];

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
