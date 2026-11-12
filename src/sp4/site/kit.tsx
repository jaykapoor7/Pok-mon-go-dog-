import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Plus } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BackLink } from "@/components/app/BackLink";
import { Grain } from "@/sp4/site/Grain";
import { Rise } from "@/sp4/site/Rise";
import { Live } from "@/sp4/site/Live";
import "@/sp4/sp4.css";

/* StrayPaw 4 page kit: the pieces every public page is built from.

   One kit for the whole public site (owner decision, 11 Nov 2026: the
   earlier site and its page kit are the blueprint). The quieter pages that
   used to have kits of their own (policies, explainers, company and
   audience pages) are built from the same pieces: PageHead (with the Back
   control where a page is pushed into), DocPage and Prose for documents,
   Block for a heading beside its text, Steps, Rows and NextLinks. */

export function S4Page({ children, close, className = "", announce }: { children: ReactNode; close?: ReactNode | false; className?: string; announce?: ReactNode }) {
  return (
    <div className={`s4 s4-page ${className}`}>
      {/* News always goes here, above the navigation: one item at a time, never inside a section. */}
      {announce && <div className="s4-announce">{announce}</div>}
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

/** The opening of an inner page. `back` adds the Back control for pages a
    visitor is pushed into from elsewhere (policies, explainers, forms); it
    goes back through history and falls through to the homepage. */
export function PageHead({ eyebrow, title, lede, actions, back = false, children }: { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; actions?: ReactNode; back?: boolean; children?: ReactNode }) {
  return (
    <header className={`s4-wrap s4-head${back ? " has-back" : ""}`}>
      {back && <BackLink fallback="/" />}
      {eyebrow && <span className="s4-eyebrow" style={{ marginBottom: -4 }}>{eyebrow}</span>}
      <h1 className="s4-h1" style={{ maxWidth: 900 }}>{title}</h1>
      {lede && <p className="s4-lede">{lede}</p>}
      {actions && <div className="s4-actions">{actions}</div>}
      {children}
    </header>
  );
}

export function SecHead({ id, eyebrow, title, lede, link }: { id?: string; eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; link?: { href: string; label: string } }) {
  return (
    <Rise className="s4-sechead">
      <div>
        {eyebrow && <span className="s4-eyebrow">{eyebrow}</span>}
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

export function Faq({ items, title = "Frequently asked questions", aside }: { items: [string, ReactNode][]; title?: ReactNode; aside?: ReactNode }) {
  return (
    <section className="s4-sec" aria-labelledby="faq-title">
      <div className="s4-wrap s4-faq">
        <div className="s4-faq-side">
          <h2 id="faq-title" className="s4-h2">{title}</h2>
          <p className="s4-body" style={{ marginTop: 20, fontSize: 17 }}>Something else? <Link className="s4-blue" href="/contact">Ask us</Link></p>
          {aside}
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

/* ── quieter inner pages: documents, company and audience pages, explainers ── */

/** One reading column of running text: paragraphs, h2/h3, lists, links. */
export function Prose({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`s4-wrap s4-doc ${className}`.trim()}><div className="s4-prose">{children}</div></section>;
}

/** A document (policies, terms, status): Back, the head, one reading column, no closing call to action. */
export function DocPage({ eyebrow = "StrayPaw policy", title, updated, children }: { eyebrow?: ReactNode; title: ReactNode; updated?: string; children: ReactNode }) {
  return (
    <S4Page close={false} className="s4-docpage">
      <PageHead back eyebrow={eyebrow} title={title}>{updated && <p className="s4-meta">Last updated {updated}</p>}</PageHead>
      <Prose>{children}</Prose>
    </S4Page>
  );
}

/** The closing invitation of the company and audience pages. */
export function CloseInvite() {
  return <Close a="Better care starts with better information." b={null} sub={null} primary={{ href: "/app?choose=1", label: "Open App" }} secondary={{ href: "/partner-apply", label: "Work with us" }} />;
}

/** A heading beside its text, for company and audience pages. */
export function Block({ title, id, children }: { title: ReactNode; id?: string; children: ReactNode }) {
  return (
    <section className="s4-wrap" id={id} style={id ? { scrollMarginTop: 88 } : undefined}>
      <div className="s4-block">
        <h2>{title}</h2>
        <div className="s4-prose">{children}</div>
      </div>
    </section>
  );
}

/** A section under a two-tone heading; `dark` sets it on the night band. */
export function Band({ title, lede, dark = false, children }: { title?: ReactNode; lede?: ReactNode; dark?: boolean; children: ReactNode }) {
  return (
    <section className={dark ? "s4-dark s4-section" : "s4-sec s4-section"}>
      <div className="s4-wrap">
        {title && <SecHead title={title} lede={lede} />}
        {children}
      </div>
    </section>
  );
}

/** Numbered steps in a row (styles in home4.css, which pages using them import). `plain` drops the numbers. */
export function Steps({ items, plain = false }: { items: { t: ReactNode; d: ReactNode }[]; plain?: boolean }) {
  return <ol className={`s4-steps${plain ? " is-plain" : ""}`}>{items.map((s, i) => <li key={i}><b>{s.t}</b><p>{s.d}</p></li>)}</ol>;
}

/** A list of rows: a name and its tag on the left, what it means and a way in on the right. */
export function Rows({ items }: { items: { t: ReactNode; tag?: ReactNode; d: ReactNode; link?: { href: string; label: string } }[] }) {
  return (
    <ul className="s4-rows">
      {items.map((r, i) => (
        <li key={i}>
          <div><h3>{r.t}</h3>{r.tag && <span className="s4-tag">{r.tag}</span>}</div>
          <div>
            <p>{r.d}</p>
            {r.link && <Link href={r.link.href} className="s4-link is-sm">{r.link.label} <ArrowRight size={14} aria-hidden /></Link>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Where to go next: a row of linked cards that ends an explainer. */
export function NextLinks({ items }: { items: { label: string; href: string; note: ReactNode }[] }) {
  return (
    <section className="s4-sec is-last">
      <div className="s4-wrap s4-next">
        {items.map((n) => (
          <Link key={n.href} href={n.href}><b>{n.label}</b><span>{n.note}</span><ArrowUpRight size={18} aria-hidden /></Link>
        ))}
      </div>
    </section>
  );
}

/** A drawing on the night panel: the explainers' diagrams are drawn for a dark ground. */
export function Figure({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Grain dark className={`s4-fig ${className}`.trim()}>{children}</Grain>;
}

/** The one honest label on every illustrative product screen. */
export function DemoNote({ children = "Product demo · illustrative records" }: { children?: ReactNode }) {
  return <span className="s4-demo-note"><span aria-hidden style={{ width: 6, height: 6, borderRadius: 9, background: "var(--s4-amber)" }} />{children}</span>;
}
