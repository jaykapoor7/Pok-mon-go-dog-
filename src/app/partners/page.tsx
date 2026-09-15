import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getOperationalPartners } from "@/lib/partners";
import "@/components/site/site.css";
import "@/components/site/field-site.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operational partners, StrayPaw", description: "The field organisations building a shared evidence record with StrayPaw." };

export default async function PartnersPage() {
  const partners = await getOperationalPartners();
  return <div className="sp field-site product-site partners-page"><SiteHeader /><main>
    <section className="partners-hero"><p className="field-eyebrow">Field work, visible with permission</p><h1>Built with the teams<br /><em>doing the work.</em></h1><p>StrayPaw does not replace an NGO&apos;s field knowledge. It turns the work they choose to document into an animal record, operating history and evidence trail they control.</p><Link href="/partner-apply" className="field-button">Become a partner <ArrowUpRight size={18} /></Link></section>
    <section className="partners-directory" aria-labelledby="partner-directory"><div className="partners-directory-head"><span className="field-eyebrow">Operational network</span><h2 id="partner-directory">Partner directory</h2><p>These are organisations actively working with StrayPaw. A directory listing is different from an operational partnership.</p></div><div className="partners-directory-grid">{partners.map((partner) => <article id={partner.slug} key={partner.id} className="partner-directory-card"><div className="partner-directory-mark">{partner.logoUrl ? <img src={partner.logoUrl} alt="" /> : partner.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div><div><span className="partner-status"><ShieldCheck size={14} /> Operational partner</span><h2>{partner.name}</h2><p className="partner-place"><MapPin size={14} /> {[partner.city, partner.state].filter(Boolean).join(", ")}</p>{partner.mission && <p className="partner-mission">{partner.mission}</p>}<div className="partner-areas">{partner.areas.map((area) => <span key={area}>{area}</span>)}</div></div></article>)}</div></section>
    <section className="partners-cta"><div><span className="field-eyebrow">For animal-welfare teams</span><h2>Bring the spreadsheet.<br />Keep the ownership.</h2></div><Link href="/partner-apply" className="field-button">Talk to StrayPaw <ArrowUpRight size={18} /></Link></section>
  </main></div>;
}
