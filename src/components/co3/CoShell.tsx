import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { sxSerif } from "@/components/shell/fonts";
import { getNationalCells } from "@/lib/livingmap/server";
import { VectorIndia } from "@/components/world/VectorIndia";
import type { Cell } from "@/components/bindu/mapkit";
import "@/components/site/site.css";
import "./co3.css";
import "@/components/marketing/precision.css";

/* ════════════════════════════════════════════════════════════════════
   The one template for every page in the site nav and footer: Who It's
   For, Programmes, Our Story, Product, Solutions, Contact and the rest.
   It opens like the landing: the night ground, the header floating over
   it, one headline, and India drawn from StrayPaw's own recorded areas.
   Then cream sections, heading left and body right, one closing
   invitation, and the footer. Every page reads as the same company.
   ════════════════════════════════════════════════════════════════════ */

export async function CoShell({ kicker, title, lede, actions, children, close = true, closing = "Better care starts with better information.", className = "" }: {
  kicker: string; title: ReactNode; lede?: ReactNode; actions?: ReactNode; children: ReactNode; close?: boolean; seed?: number; closing?: string; className?: string;
}) {
  const national = await getNationalCells().catch(() => null);
  const cells: Cell[] = (national?.cells ?? []).map(([lng, lat, n]) => [lng, lat, n]);
  return (
    <div className={`sp co3 precision ${sxSerif.variable} ${className}`}>
      <SiteHeader overlay />
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
            <VectorIndia cells={cells} className="co3-close-vi" />
            <h2>{closing}</h2>
            <div className="co3-acts">
              <Link href="/app?choose=1" className="co3-btn is-flame">Open App <ArrowUpRight size={17} aria-hidden /></Link>
              <Link href="/partner-apply" className="co3-btn is-line">Work with us</Link>
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
