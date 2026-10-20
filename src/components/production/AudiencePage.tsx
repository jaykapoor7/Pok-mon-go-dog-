import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { sxSerif } from "@/components/shell/fonts";
import { Band } from "@/components/world/Band";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "./production.css";
export function AudiencePage({ audience, title, intro, cta, href, seed=1, children }: {audience:string;title:string;intro:string;cta:string;href:string;seed?:number;children:ReactNode}) {
 return <div className={`sp sw production audience-page ${sxSerif.variable}`}><SiteHeader/><main><header className="audience-hero"><div><p className="audience-label">{audience}</p><h1>{title}</h1><p>{intro}</p><Link className="sw-btn is-flame" href={href}>{cta}</Link></div><Band seed={seed} className="audience-art"/></header>{children}</main><SiteFooter/></div>;
}
export function AudienceSection({title,children,id}:{title:string;children:ReactNode;id?:string}) {return <section className="audience-section" id={id}><h2>{title}</h2><div>{children}</div></section>;}
