import Link from "next/link";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Reveal } from "@/components/site/Reveal";
import "@/components/site/site.css";
import "./marketing.css";
import { BackLink } from "@/components/app/BackLink";

/* ════════════════════════════════════════════════════════════════════
   Shared scaffold for the explainer pages behind the header nav.

   Every page is: a full-bleed dark hero, alternating dense sections, and
   a next-step footer. Sections carry their own ground colour so the page
   never falls back to an empty white band.

   MOTION IS SPENT IN ONE PLACE. Every element here used to arrive on
   scroll: each band's kicker, each band's headline, each numbered step,
   each card in the footer. On /for-ngos that was twenty-one separate
   entrances in one page, which is the "everything fades up as you
   scroll" pattern that makes a page read as assembled from a template —
   and it means nothing is emphasised, because emphasis is a contrast and
   there was nothing to contrast against.

   The hero keeps its stagger: it is one composed moment, it plays on
   load rather than on scroll, and it is the page introducing itself.
   Everything below it is simply there when the reader arrives, which is
   also what a reader skimming quickly, a screenshot, and a link preview
   all get.
   ════════════════════════════════════════════════════════════════════ */

export function MarketingPage({
  kicker,
  title,
  accent,
  lede,
  figure,
  children,
  next,
}: {
  kicker?: string;
  title: string;
  /** The second line, set in the accent colour. */
  accent: string;
  lede: string;
  figure?: ReactNode;
  children: ReactNode;
  next: { label: string; href: string; note: string }[];
}) {
  return (
    <div className="sp mk">
      <SiteHeader />
      {/* Six explainer pages sit behind this. The header has the site
          nav, but nobody arriving from a product link knows that is
          the way out, and nothing on the page said "back". */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-24 sm:px-8">
        <BackLink fallback="/" />
      </div>
      <main>
        <section className="mk-hero">
          <div className="mk-hero-copy">
            <Reveal>
              {kicker && <div className="sp-kicker light">{kicker}</div>}
            </Reveal>
            <Reveal delay={60}>
              <h1 className="sp-display mk-h1">
                {title}
                <br />
                <span>{accent}</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mk-lede">{lede}</p>
            </Reveal>
          </div>
          {figure && (
            <Reveal delay={160}>
              <div className="mk-hero-fig">{figure}</div>
            </Reveal>
          )}
        </section>

        {children}

        <section className="mk-next">
          <div className="mk-next-grid">
            {next.map((n) => (
              <Link key={n.href} href={n.href} className="mk-next-card">
                <b>{n.label}</b>
                <span>{n.note}</span>
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </section>

        <SiteFooter />
      </main>
    </div>
  );
}

/** A full-bleed band. `tone` sets its ground so no section renders bare. */
export function Band({
  tone = "paper",
  kicker,
  title,
  accent,
  children,
}: {
  tone?: "paper" | "ink" | "bone";
  kicker?: string;
  title?: string;
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section className={`mk-band mk-${tone}`}>
      {kicker && (
        <div className={`sp-kicker ${tone === "ink" ? "light" : ""}`}>{kicker}</div>
      )}
      {title && (
        <h2 className="sp-display mk-h2">
          {title}
          {accent && (
            <>
              {" "}
              <span>{accent}</span>
            </>
          )}
        </h2>
      )}
      {children}
    </section>
  );
}

/** Numbered explanatory steps. */
export function Steps({
  items,
}: {
  items: { n: string; title: string; body: string }[];
}) {
  return (
    <div className="mk-steps">
      {items.map((s) => (
        <div key={s.n} className="mk-step">
          <span className="sp-mono mk-step-n">{s.n}</span>
          <b>{s.title}</b>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}

/** A sourced figure. Every number on these pages carries its provenance. */
export function Stat({
  value,
  label,
  source,
}: {
  value: string;
  label: string;
  source: string;
}) {
  return (
    <div className="mk-stat">
      <b>{value}</b>
      <span>{label}</span>
      <small>{source}</small>
    </div>
  );
}
