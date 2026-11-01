import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import { Live } from "@/sp4/site/Live";
import "@/sp4/sp4.css";

/* StrayPaw 4 page kit: the pieces every public page is built from. */

export function S4Page({ children, close }: { children: ReactNode; close?: ReactNode | false }) {
  return (
    <div className="s4 s4-page">
      <SiteHeader />
      <main id="main">
        {children}
        {close !== false && (close ?? <Close />)}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Two-tone heading: the first line in ink, the second in grey (or blue). */
export function TwoTone({ a, b, blue = false }: { a: ReactNode; b?: ReactNode; blue?: boolean }) {
  return <span className={`s4-tt${blue ? " is-blue" : ""}`}><span>{a}</span>{b && <>{" "}<span>{b}</span></>}</span>;
}

export function PageHead({ eyebrow, title, lede, actions, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="s4-wrap s4-head">
      {eyebrow && <span className="s4-eyebrow" style={{ marginBottom: -4 }}>{eyebrow}</span>}
      <h1 className="s4-h1" style={{ maxWidth: 900 }}>{title}</h1>
      {lede && <p className="s4-lede">{lede}</p>}
      {actions && <div className="s4-actions">{actions}</div>}
      {children}
    </header>
  );
}

export function SecHead({ id, title, lede, link }: { id?: string; title: ReactNode; lede?: ReactNode; link?: { href: string; label: string } }) {
  return (
    <Rise className="s4-sechead">
      <div>
        <h2 id={id} className="s4-h2">{title}</h2>
        {lede && <p className="s4-lede">{lede}</p>}
      </div>
      {link && <Link href={link.href} className="s4-link is-ink">{link.label} <ArrowRight size={18} aria-hidden /></Link>}
    </Rise>
  );
}

export type TileSpec = { icon: ReactNode; title: string; body: ReactNode; tag?: ReactNode };
export function Tiles({ items }: { items: TileSpec[] }) {
  return (
    <div className="s4-tiles">
      {items.map((t, i) => (
        <Rise key={t.title} className="s4-tile" delay={(i % 3) * 60}>
          <span className="s4-tile-ico" aria-hidden>{t.icon}</span>
          <h3>{t.title}</h3>
          <p>{t.body}</p>
          {t.tag}
        </Rise>
      ))}
    </div>
  );
}

export type CardSpec = { title: string; body: ReactNode; ui: ReactNode; v?: number };
export function Cards({ items, cols = 3, idp }: { items: CardSpec[]; cols?: 2 | 3; idp: string }) {
  return (
    <div className={`s4-cards is-${cols}`}>
      {items.map((c, i) => (
        <Rise key={c.title} className="s4-card" delay={(i % cols) * 70}>
          <Grain v={c.v ?? i} id={`${idp}-${i}`}><Live>{c.ui}</Live></Grain>
          <h3>{c.title}</h3>
          <p>{c.body}</p>
        </Rise>
      ))}
    </div>
  );
}

export function Faq({ items, title = "Frequently asked questions" }: { items: [string, ReactNode][]; title?: ReactNode }) {
  return (
    <section className="s4-sec" aria-labelledby="faq-title">
      <div className="s4-wrap s4-faq">
        <div>
          <h2 id="faq-title" className="s4-h2">{title}</h2>
          <p className="s4-body" style={{ marginTop: 20, fontSize: 17 }}>Something else? <Link className="s4-blue" href="/contact">Ask us</Link></p>
        </div>
        <div>{items.map(([q, a]) => <details key={q}><summary>{q}<Plus size={22} aria-hidden /></summary><p>{a}</p></details>)}</div>
      </div>
    </section>
  );
}

export function Close({ a = "Put Kaju to work", b = "on your programme.", sub = "Bring last month's register. We'll show you what Kaju does with it.", primary = { href: "/demo", label: "Book a demo" }, secondary = { href: "/platform", label: "Explore the platform" } }: { a?: ReactNode; b?: ReactNode; sub?: ReactNode; primary?: { href: string; label: string }; secondary?: { href: string; label: string } | null }) {
  return (
    <section className="s4-wrap s4-close" aria-labelledby="close-title">
      <Rise style={{ display: "grid", gap: 20, justifyItems: "center" }}>
        <h2 id="close-title" className="s4-h2">{a}{b && <>{" "}{b}</>}</h2>
        {sub && <p className="s4-lede" style={{ textAlign: "center" }}>{sub}</p>}
      </Rise>
      <div className="s4-actions" style={{ justifyContent: "center" }}>
        <Link href={primary.href} className="s4-btn is-primary">{primary.label}</Link>
        {secondary && <Link href={secondary.href} className="s4-btn is-line">{secondary.label}</Link>}
      </div>
    </section>
  );
}

/** The one honest label on every illustrative product screen. */
export function DemoNote({ children = "Product demo · illustrative records" }: { children?: ReactNode }) {
  return <span className="s4-demo-note"><span aria-hidden style={{ width: 6, height: 6, borderRadius: 9, background: "var(--s4-amber)" }} />{children}</span>;
}
