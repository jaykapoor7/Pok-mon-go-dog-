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

export function CoverArt({ c }: { c: Cover }) {
  return (
    <span className={`r7-cover is-${c.tone}`} aria-hidden>
      <span className="r7-cover-k"><KajuFace size={64} /></span>
      <span className="r7-cover-t"><small>{c.label}</small><b>{c.word}</b></span>
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
