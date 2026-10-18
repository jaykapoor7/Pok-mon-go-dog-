"use client";

/* ════════════════════════════════════════════════════════════════════
   Act IV · one cloth, four ways in. Residents, rescue teams, cities and
   funders work on the same record; each panel is a strip of the same
   cloth in its own colour. Pointing at one (or tapping it on a phone)
   opens it; the others fold to their edges. Every figure and queue row
   here is read live from the record.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { FOLK_CUTOUTS, type CutoutKey } from "@/lib/art/sources";

export type Way = { key: string; who: string; title: string; body: string; href: string; cta: string; art: CutoutKey; show: ReactNode };

export function Patchwork({ ways }: { ways: Way[] }) {
  const [open, setOpen] = useState(1);
  return (
    <div className="kp" role="list">
      {ways.map((w, i) => {
        const on = open === i;
        return (
          <section key={w.key} role="listitem" className={`kp-strip is-${w.key}${on ? " is-open" : ""}`} onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(i); }}>
            <h3>
              <button type="button" aria-expanded={on} aria-controls={`kp-${w.key}`} onClick={() => setOpen(i)} onFocus={() => setOpen(i)}>
                <span className="kp-who">{w.who}</span><span className="kp-title">{w.title}</span>
              </button>
            </h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="kp-art" src={FOLK_CUTOUTS[w.art].src} alt="" loading="lazy" aria-hidden />
            <div id={`kp-${w.key}`} className="kp-body" hidden={!on}>
              <p>{w.body}</p>
              <div className="kp-show">{w.show}</div>
              <Link className="h-btn" href={w.href}>{w.cta} <ArrowUpRight size={15} aria-hidden /></Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}
