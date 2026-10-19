"use client";

/* ════════════════════════════════════════════════════════════════════
   Continuity, shown: a painted dog becomes a real animal becomes a
   record. For each animal on the public register, the painter's dog
   (not a likeness, and labelled so) is wiped away by a brushstroke to
   reveal the real photograph, and the photograph hands over to the
   animal's StrayPaw identity with the history the record holds. One
   animal at a time, on its own clock while in view; the dots choose.
   ════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import * as Art from "@/components/world/art";

export type Life = { id: string; tag: string; city: string | null; zone: string | null; photo: string; first: string | null; last: string | null; sightings: number; events: { at: string; what: string }[] };

const when = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "Not recorded");

export function Lifeline({ lives }: { lives: Life[] }) {
  /* one counter: three beats per animal (painting, photograph, record) */
  const [k, setK] = useState(0);
  const [still, setStill] = useState(false);
  const len = Math.max(1, lives.length), n = Math.floor(k / 3) % len, stage = still ? 2 : k % 3;
  const root = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null);

  /* the painting for this animal: a dog in the Gond hand, its coat chosen by the animal's id */
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = w * dpr; c.height = h * dpr; const x = c.getContext("2d")!; x.scale(dpr, dpr);
    const seed = lives[n] ? [...lives[n].id].reduce((a, ch) => a + ch.charCodeAt(0), 0) : 1;
    Art.paper(x, w, h, seed); Art.wash(x, w / 2, h / 2, w * 0.55, Art.C.marigoldPale, 0.9);
    x.save(); x.translate(w / 2, h * 0.32); Art.sun(x, w * 0.06, seed); x.restore();
    Art.ground(x, 0, w, h * 0.78, h * 0.22);
    const s = Math.min(w / 70, h / 60);
    x.save(); x.translate(w / 2 - 31 * s, h * 0.78 - 38 * s); x.scale(s, s); Art.dogTail(x, "sit", 0.4); Art.dogBody(x, "sit", Art.COATS[seed % Art.COATS.length], seed); x.restore();
    Art.border(x, 3, 3, w - 6, h - 6, 12);
  }, [n, lives]);

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
  return (
    <div className={`ll is-s${stage}`} ref={root}>
      <div className="ll-art">
        <figure className="ll-paint"><canvas ref={cv} aria-hidden /><figcaption>A painting, not a likeness</figcaption></figure>
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
