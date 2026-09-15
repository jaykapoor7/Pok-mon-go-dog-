import Link from "next/link";
import { ArrowUpRight, Building2 } from "lucide-react";
import type { Partner } from "@/lib/partners";

export function PartnerBar({ partners }: { partners: Partner[] }) {
  if (!partners.length) return null;
  return <section className="partner-bar" aria-label="Operational partners">
    <span className="partner-bar-label"><Building2 size={14} /> Working with field teams</span>
    <div className="partner-bar-list">{partners.slice(0, 4).map((partner) => <Link key={partner.id} href={`/partners#${partner.slug}`}>{partner.name}<small>{[partner.city, partner.state].filter(Boolean).join(", ")}</small></Link>)}</div>
    <Link href="/partners" className="partner-bar-link">Partners <ArrowUpRight size={14} /></Link>
  </section>;
}
