import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Reveal } from "@/components/site/Reveal";
import "@/components/site/site.css";
import "./marketing.css";

/* ════════════════════════════════════════════════════════════════════
   Shared scaffold for the explainer pages behind the header nav.

   Every page is: a full-bleed dark hero, alternating dense sections, and
   a next-step footer. Sections carry their own ground colour so the page
   never falls back to an empty white band.
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
  kicker: string;
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
      <main>
        <section className="mk-hero">
          <div className="mk-hero-copy">
            <Reveal>
              <div className="sp-kicker light">{kicker}</div>
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
          <Reveal>
            <div className="sp-kicker light">WHERE TO GO NEXT</div>
          </Reveal>
          <div className="mk-next-grid">
            {next.map((n, i) => (
              <Reveal key={n.href} delay={i * 70}>
                <Link href={n.href} className="mk-next-card">
                  <b>{n.label}</b>
                  <span>{n.note}</span>
                  <ArrowUpRight size={14} />
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <footer className="sp-footer mk-foot">
          <div className="sp-footer-bottom sp-mono">
            <span>STRAYPAW © 2026</span>
            <span style={{ display: "flex", gap: 18 }}>
              <Link href="/about">ABOUT</Link>
              <Link href="/privacy">PRIVACY</Link>
              <Link href="/terms">TERMS</Link>
              <Link href="/contact">CONTACT</Link>
            </span>
            <span>BUILT IN INDIA / FOR EVERYWHERE</span>
          </div>
        </footer>
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
        <Reveal>
          <div className={`sp-kicker ${tone === "ink" ? "light" : ""}`}>{kicker}</div>
        </Reveal>
      )}
      {title && (
        <Reveal delay={60}>
          <h2 className="sp-display mk-h2">
            {title}
            {accent && (
              <>
                {" "}
                <span>{accent}</span>
              </>
            )}
          </h2>
        </Reveal>
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
      {items.map((s, i) => (
        <Reveal key={s.n} delay={i * 60}>
          <div className="mk-step">
            <span className="sp-mono mk-step-n">{s.n}</span>
            <b>{s.title}</b>
            <p>{s.body}</p>
          </div>
        </Reveal>
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
