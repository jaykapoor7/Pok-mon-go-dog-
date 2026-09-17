import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, MapPin } from "lucide-react";
import type { PublicProgramme } from "@/lib/public-programmes";

const KIND: Record<string, { eyebrow: string; noun: string }> = {
  sterilisation: { eyebrow: "ABC / sterilisation", noun: "validated records" },
  vaccination: { eyebrow: "Rabies / vaccination", noun: "animals vaccinated" },
  treatment: { eyebrow: "Treatment programme", noun: "treatment records" },
  census: { eyebrow: "Survey / census", noun: "field records" },
  other: { eyebrow: "Rescue programme", noun: "cases documented" },
};

export function PublicProgrammes({ programmes }: { programmes: PublicProgramme[] }) {
  if (!programmes.length) return null;
  return <section className="community-programmes" aria-labelledby="community-programmes-title">
    <div className="community-programmes-heading"><div><span className="product-kicker">NGO work on the record</span><h2 id="community-programmes-title">Rescues, drives and care, not hidden in spreadsheets.</h2><p>Historical and ongoing work shared by partner organisations, with the original programme context preserved.</p></div><Link href="/partners">Meet the partners <ArrowUpRight size={15} /></Link></div>
    <div className="community-programme-grid">{programmes.map((programme) => {
      const meta = KIND[programme.kind] ?? KIND.other;
      const total = programme.kind === "sterilisation" ? programme.sterilised_recorded : programme.kind === "vaccination" ? programme.vaccinated_recorded : programme.animals_recorded;
      return <article key={programme.id}>
        <div className="community-programme-top"><span><CalendarCheck2 size={15} /> {meta.eyebrow}</span><Link href={programme.ngo_slug ? `/org/${programme.ngo_slug}` : "/partners"}>{programme.ngo_name}</Link></div>
        <h3>{programme.name}</h3>
        <p className="community-programme-place"><MapPin size={14} /> {[programme.zone, programme.city, programme.state].filter(Boolean).join(", ")}</p>
        {programme.public_summary && <p className="community-programme-summary">{programme.public_summary}</p>}
        <dl><div><dt>{meta.noun}</dt><dd>{total.toLocaleString()}</dd></div></dl>
      </article>;
    })}</div>
  </section>;
}
