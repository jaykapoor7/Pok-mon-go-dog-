import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { MunicipalPilot } from "@/components/marketing/MunicipalPilot";
import { sxSerif } from "@/components/shell/fonts";
import { WORK_IMAGES, creditLine } from "@/lib/art/sources";
import "@/components/site/site.css";
import "@/components/world/home.css";
import "@/components/marketing/precision.css";
import "@/components/marketing/folio.css";
import "@/components/marketing/depth.css";
import "./municipal.css";

export const metadata = { title: "Paid municipal pilots · StrayPaw", description: "Paid pilots for verified animal records, sterilisation and vaccination reporting, and a funded NGO field network." };

export default function MunicipalitiesPage() {
  return <div className={`sp sw precision folio municipal ${sxSerif.variable}`}><SiteHeader /><main>
    <section className="mp-hero" aria-labelledby="municipal-title"><div><p className="pr-place">Municipalities · paid pilots</p><h1 id="municipal-title">Digital infrastructure. A city that can act on it.</h1><p className="mp-lede">Paid pilots for verified animal records, sterilisation and vaccination reporting, and a funded field network.</p><Link className="sw-btn is-flame" href="/contact?subject=Paid%20municipal%20pilot">Discuss a paid pilot <ArrowUpRight size={17} aria-hidden /></Link></div><figure>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={WORK_IMAGES.kalamkariPalace.src} width={WORK_IMAGES.kalamkariPalace.w} height={WORK_IMAGES.kalamkariPalace.h} alt="Detail of a hand-painted Indian palace textile." /><figcaption><Link href="/art-credits">{creditLine("kalamkariPalace")}</Link></figcaption></figure></section>
    <section className="mp-model" aria-labelledby="pilot-title"><header><h2 id="pilot-title">One ecosystem. Funded fieldwork.</h2><p>The municipality pays. NGOs deliver fieldwork. StrayPaw connects funding, review and the record.</p></header><MunicipalPilot /></section>
    <section className="mp-buy" aria-labelledby="city-buys"><div><h2 id="city-buys">A record the city can use.</h2><dl><div><dt>Animal records</dt><dd>Identity, history, evidence and review status.</dd></div><div><dt>Programme reporting</dt><dd>Sterilisation and vaccination records, by area.</dd></div><div><dt>Field coordination</dt><dd>Teams, submissions and the next review.</dd></div></dl><Link href="/explore" className="sw-btn is-paper">Explore the current Living Map <ArrowUpRight size={17} aria-hidden /></Link></div><div className="mp-quote"><p>Pilot pricing</p><h3>Software + an agreed field budget.</h3><p>Scope the area, duration, evidence criteria and disbursement arrangements together.</p><Link href="/contact?subject=Paid%20municipal%20pilot" className="sw-btn is-flame">Scope a paid pilot <ArrowUpRight size={17} aria-hidden /></Link><Link href="/product#whatsapp-pricing">WhatsApp integration pricing</Link></div></section>
  </main><SiteFooter /></div>;
}
