"use client";

/* ════════════════════════════════════════════════════════════════════
   Continuity, shown: a painted dog becomes a real animal becomes a
   record. For each animal on the public register, a dog from a real
   historical painting (open-licensed, credited, never a likeness) is wiped away by a brushstroke to
   reveal the real photograph, and the photograph hands over to the
   animal's StrayPaw identity with the history the record holds. One
   animal at a time, on its own clock while in view; the dots choose.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { dogArtFor, creditLine } from "@/lib/art/sources";

export type Life = { id: string; tag: string; city: string | null; zone: string | null; photo: string; first: string | null; last: string | null; sightings: number; events: { at: string; what: string }[] };

const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Not recorded");

export function Lifeline({ lives }: { lives: Life[] }) {
  /* one counter: three beats per animal (painting, photograph, record) */
  const [k, setK] = useState(0);
  const [still, setStill] = useState(false);
  const len = Math.max(1, lives.length), n = Math.floor(k / 3) % len, stage = still ? 2 : k % 3;
  const root = useRef<HTMLDivElement>(null);

  /* the clock: painting, photograph, record; then the next animal */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    let visible = false, t: number | undefined;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && t === undefined) tick(); }, { threshold: 0.4 });
    const tick = () => {
      t = window.setTimeout(() => {
        if (!visible) { t = undefined; return; }
        setK((v) => v + 1);
        tick();
      }, 1900);
    };
    if (root.current) io.observe(root.current);
    return () => { io.disconnect(); if (t) window.clearTimeout(t); };
  }, []);

  const a = lives[n]; if (!a) return null;
  const art = dogArtFor(a.id);
  return (
    <div className={`ll is-s${stage}`} ref={root}>
      <div className="ll-art">
        <figure className="ll-paint" style={{ background: art.ground }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art.src} alt="" style={art.flip ? { transform: "scaleX(-1)" } : undefined} />
          <figcaption>A painting, not a likeness · {creditLine(art.work)}</figcaption>
        </figure>
        <figure className="ll-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={a.id} src={a.photo} alt={`${a.tag}, as photographed`} loading="lazy" referrerPolicy="no-referrer" />
          <figcaption>The real animal · {a.city ?? "India"}</figcaption>
        </figure>
        <article className="ll-rec" aria-live="polite">
          <header><code>{a.tag}</code><span>{a.zone && a.city && a.zone.includes(a.city) ? a.zone : [a.zone, a.city].filter(Boolean).join(", ")}</span></header>
          <dl>
            <div><dt>First seen</dt><dd>{when(a.first)}</dd></div>
            <div><dt>Last seen</dt><dd>{when(a.last)}</dd></div>
            <div><dt>Sightings</dt><dd>{a.sightings}</dd></div>
          </dl>
          <ol>{a.events.slice(0, 3).map((e, i) => <li key={i}><time>{when(e.at)}</time>{e.what}</li>)}{!a.events.length && <li><time>Now</time>On the public record</li>}</ol>
          <Link href={`/animal/${a.id}`}>Open this record <ArrowUpRight size={14} aria-hidden /></Link>
        </article>
      </div>
      <div className="ll-steps" role="tablist" aria-label="Animals on the record">
        {lives.map((x, i) => <button key={x.id} type="button" role="tab" aria-selected={i === n} aria-label={x.tag} className={i === n ? "is-on" : ""} onClick={() => setK(i * 3)} />)}
      </div>
    </div>
  );
}
