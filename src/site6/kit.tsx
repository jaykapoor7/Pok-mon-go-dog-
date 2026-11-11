import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { DEMO_SITE } from "@/lib/demo-site";
import { SiteMotion } from "./Motion";
import { CloseThread, SideThread } from "./Thread";
import "./site6.css";

/* The pieces every StrayPaw 6 page is built from. */
export const PRIMARY = DEMO_SITE ? { href: "/try?go=1", label: "Start the live demo" } : { href: "/demo", label: "Book a demo" };

export function Page6({ children, close = true }: { children: ReactNode; close?: boolean | { title: string; body: string } }) {
  const c = typeof close === "object" ? close : { title: "Start with one programme and a few areas.", body: "We set it up with you: partners, areas, roles and the modules you need. Your existing registers come with you." };
  return (
    <div className="s6">
      <SiteMotion />
      <SiteHeader />
      <main id="main">
        {children}
        {close ? (
          <section className="s6-sec is-tight" aria-label="Get started"><div className="s6-wrap"><div className="s6-close" data-reveal>
            <CloseThread />
            <h2 className="s6-h2">{c.title}</h2><p className="s6-lede" style={{ color: "#b9c4d8" }}>{c.body}</p>
            <div className="s6-hero-cta" style={{ justifyContent: "flex-start" }}><Link href={PRIMARY.href} className="s6-btn is-primary">{PRIMARY.label}<ArrowRight size={16} className="go" aria-hidden /></Link><Link href="/pricing" className="s6-btn is-line">See pricing</Link></div>
          </div></div></section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

export function Hero6({ kicker, title, grey, lede, actions, children }: { kicker: string; title: string; grey?: string; lede: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <section className="s6-phero">
      <div className="s6-wrap">
        {children ? null : <SideThread />}
        <div className="s6-phero-copy">
          <span className="s6-kicker">{kicker}</span>
          <h1 className="s6-display" style={{ fontSize: "clamp(38px, 5.2vw, 64px)" }}>{title}{grey ? <> <span className="s6-grey">{grey}</span></> : null}</h1>
          <p className="s6-lede">{lede}</p>
          <div className="s6-hero-cta" style={{ justifyContent: "flex-start" }}>{actions ?? <><Link href={PRIMARY.href} className="s6-btn is-primary">{PRIMARY.label}<ArrowRight size={16} className="go" aria-hidden /></Link></>}</div>
        </div>
        {children}
      </div>
    </section>
  );
}

/** One capability: what it is, three facts, and a small product illustration. */
export function Split6({ id, kicker, title, body, points, visual, flip, link, status }: { id?: string; kicker: string; title: string; body: string; points: string[]; visual: ReactNode; flip?: boolean; link?: { href: string; label: string }; status?: ReactNode }) {
  return (
    <section className="s6-sec is-tight" id={id} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className={`s6-wrap s6-feature${flip ? " is-flip" : ""}`}>
        <div data-reveal>
          <span className="s6-kicker">{kicker}</span>
          <h2 className="s6-h2" id={id ? `${id}-h` : undefined} style={{ fontSize: "clamp(28px, 3vw, 38px)", margin: "14px 0" }}>{title}</h2>
          <p className="s6-lede" style={{ fontSize: 17 }}>{body}</p>
          <ul className="s6-points">{points.map((p) => <li key={p}><Check size={16} aria-hidden /><span>{p}</span></li>)}</ul>
          {status ? <p style={{ marginTop: 14 }}>{status}</p> : null}
          {link ? <Link href={link.href} className="s6-textlink" style={{ marginTop: 16 }}>{link.label}<ArrowRight size={15} aria-hidden /></Link> : null}
        </div>
        <div data-reveal style={{ ["--d" as string]: "90ms" }}>{visual}</div>
      </div>
    </section>
  );
}

type Row = { tone?: "flame" | "amber" | "green"; title: string; note?: string; chip?: string; chipTone?: string };
/** A small product window: a titled list of rows. Always labelled illustrative. */
export function Win6({ title, sub, rows, foot = "Illustrative records", children }: { title: string; sub?: string; rows?: Row[]; foot?: string; children?: ReactNode }) {
  return (
    <div className="s6-today" role="img" aria-label={`Illustration: ${title}`}>
      <div className="s6-today-h"><b>{title}</b>{sub ? <span>· {sub}</span> : null}</div>
      {rows?.map((r) => <div className="s6-today-row" key={r.title}><i data-tone={r.tone} aria-hidden /><div><b>{r.title}</b>{r.note ? <small>{r.note}</small> : null}</div>{r.chip ? <span className="s6-chip" data-tone={r.chipTone}>{r.chip}</span> : <span />}</div>)}
      {children}
      <div className="s6-today-foot">{foot}</div>
    </div>
  );
}
