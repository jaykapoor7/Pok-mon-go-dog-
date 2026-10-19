import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { sxSerif } from "@/components/shell/fonts";
import { getNationalCells } from "@/lib/livingmap/server";
import { VectorIndia } from "@/components/home3/Hero";
import type { Cell } from "@/components/bindu/mapkit";
import "@/components/site/site.css";
import "./co3.css";

/* ════════════════════════════════════════════════════════════════════
   The company pages' shell: Product, For Organisations, Our Story and
   Contact. The homepage's language at reading pace: a night band with
   India's recorded areas as its ground, then cream editorial sections,
   one closing invitation, and the shared footer.
   ════════════════════════════════════════════════════════════════════ */

export async function CoShell({ kicker, title, lede, actions, children, close = true }: {
  kicker: string; title: ReactNode; lede?: ReactNode; actions?: ReactNode; children: ReactNode; close?: boolean;
}) {
  const national = await getNationalCells().catch(() => null);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  return (
    <div className={`sp co3 ${sxSerif.variable}`}>
      <SiteHeader tone="night" />
      <main>
        <section className="co3-hero">
          <VectorIndia cells={cells} className="co3-hero-vi" />
          <div className="co3-hero-in">
            <p className="co3-k">{kicker}</p>
            <h1>{title}</h1>
            {lede && <p className="co3-lede">{lede}</p>}
            {actions && <div className="co3-acts">{actions}</div>}
          </div>
        </section>
        {children}
        {close && (
          <section className="co3-close">
            <h2>Better care starts with <em>better information.</em></h2>
            <div className="co3-acts">
              <Link href="/app?choose=1" className="co3-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/partner-apply" className="co3-btn is-line">Partner With Us</Link>
              <Link href="/contact" className="co3-btn is-line">Contact Us</Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter className="co3-foot" />
    </div>
  );
}

/* A section of a company page: a numbered heading on the left, its body on the right. */
export function CoSec({ n, title, children, id, tone = "shell" }: { n?: string; title: ReactNode; children: ReactNode; id?: string; tone?: "shell" | "paper" }) {
  return (
    <section className={`co3-sec is-${tone}`} id={id}>
      <header>{n && <span>{n}</span>}<h2>{title}</h2></header>
      <div className="co3-body">{children}</div>
    </section>
  );
}
