import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { CoShell, CoSec } from "@/components/co3/CoShell";
import "@/components/world/home.css";
import "./production.css";

/* Who It's For pages, on the site's one page template (CoShell). */
export function AudiencePage({ audience, title, intro, cta, href, children }: { audience: string; title: string; intro: string; cta: string; href: string; seed?: number; children: ReactNode }) {
  return (
    <CoShell kicker={audience} title={title} lede={intro} className="audience-page"
      actions={<Link className="co3-btn is-flame" href={href}>{cta} <ArrowUpRight size={17} aria-hidden /></Link>}>
      {children}
    </CoShell>
  );
}
export function AudienceSection({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <CoSec title={title} id={id}>{children}</CoSec>;
}
