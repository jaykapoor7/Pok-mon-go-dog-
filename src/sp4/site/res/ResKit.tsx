/* Shared parts of the Resources pages: a navy hero with drawn tiles, drawn
   post covers, post cards and the closing demo band. */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { KajuFace } from "@/kaju/Kaju";
import { dateLabel, type Cover, type Post } from "./content";

export function ResHero({ title, lede, children, art = true }: { title: ReactNode; lede: ReactNode; children?: ReactNode; art?: boolean }) {
  return (
    <section className="r7-hero">
      <div className="r7-hero-copy">
        <h1>{title}</h1>
        <p>{lede}</p>
        {children}
      </div>
      {art && (
        <div className="r7-hero-art" aria-hidden>
          <span className="r7-tile is-big"><i /><i /><i /><b>Ward 14 · October</b></span>
          <span className="r7-tile is-mid"><svg viewBox="0 0 100 60"><path d="M0 50 L15 40 L30 44 L45 28 L60 32 L75 18 L100 10" /></svg></span>
          <span className="r7-tile is-kaju"><KajuFace size={58} /></span>
        </div>
      )}
    </section>
  );
}

/** A drawn cover, different for each kind of post. */
export function CoverArt({ c }: { c: Cover }) {
  const kind = /guide/i.test(c.label) ? "guide" : /case/i.test(c.label) ? "case" : /research/i.test(c.label) ? "research" : /news/i.test(c.label) ? "news" : "event";
  return (
    <span className={`r7-cover is-${c.tone} is-${kind}`} aria-hidden>
      {kind === "guide" && <span className="r7-art-list">{["Photo of the animal", "Place inside the ward", "Date after recovery", "Vet's authorisation"].map((x, i) => <i key={x} className={i < 3 ? "is-ok" : ""}><b />{x}</i>)}</span>}
      {kind === "case" && <span className="r7-art-cards"><i><b>Before</b>3 registers</i><i><b>After</b>1 record</i></span>}
      {kind === "research" && <span className="r7-art-bars">{[38, 52, 46, 68, 61, 84].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</span>}
      {(kind === "news" || kind === "event") && <span className="r7-cover-k"><KajuFace size={64} /></span>}
      <span className="r7-cover-t"><small>{c.label}</small>{c.word && <b>{c.word}</b>}</span>
    </span>
  );
}

export function PostCard({ p }: { p: Post }) {
  return (
    <article className="r7-card">
      <Link href={`/blog/${p.slug}`}>
        <CoverArt c={p.cover} />
        <p className="r7-meta">{p.kind} · {dateLabel(p.date)}</p>
        <h3>{p.title}</h3>
      </Link>
    </article>
  );
}

export function DemoBand({ title = "Get a live demo on your own programme.", sub = "Bring last month's register. We'll show you what Kaju checks, prepares and reports." }: { title?: string; sub?: string }) {
  return (
    <section className="r7-band">
      <div className="s4-wrap r7-band-in">
        <div><h2>{title}</h2><p>{sub}</p></div>
        <div className="r7-band-act"><Link href="/demo" className="r7-btn is-blue">Book a demo <ArrowRight size={16} aria-hidden /></Link><Link href="/platform" className="r7-btn is-line">Explore the platform</Link></div>
      </div>
    </section>
  );
}
