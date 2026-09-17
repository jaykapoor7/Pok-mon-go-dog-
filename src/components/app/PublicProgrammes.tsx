import Link from "next/link";
import { ArrowUpRight, CalendarCheck2, MapPin } from "lucide-react";
import type { PublicProgramme } from "@/lib/public-programmes";

function metaFor(programme: PublicProgramme) {
  const text = `${programme.name} ${programme.public_summary ?? ""}`.toLowerCase();
  if (programme.kind === "sterilisation" || /\babc\b|sterili[sz]/.test(text)) return { eyebrow: "ABC / sterilisation", noun: "validated sterilisation records" };
  if (programme.kind === "vaccination" || /rabies|\barv\b|vaccin/.test(text)) return { eyebrow: "Rabies / vaccination", noun: "animals with vaccination records" };
  if (programme.kind === "treatment" || /tvt|chemo|treatment/.test(text)) return { eyebrow: /tvt|chemo/.test(text) ? "TVT / treatment" : "Treatment programme", noun: "treatment records" };
  if (programme.kind === "census" || /survey|census|study/.test(text)) return { eyebrow: "Survey / census", noun: "field records" };
  if (/education|awareness|school|student|kind index/.test(text)) return { eyebrow: "Education / awareness", noun: "programme records" };
  if (/rescue|case/.test(text)) return { eyebrow: "Rescue & care", noun: "cases documented" };
  return { eyebrow: "NGO programme", noun: "records documented" };
}

export function PublicProgrammes({ programmes }: { programmes: PublicProgramme[] }) {
  if (!programmes.length) return null;
  return <section className="community-programmes" aria-labelledby="community-programmes-title">
    <div className="community-programmes-heading"><div><span className="product-kicker">NGO work on the record</span><h2 id="community-programmes-title">Rescues, rabies work, ABC, treatment and field studies.</h2><p>Partner organisations can turn the work already sitting in registers and spreadsheets into public, privacy-safe evidence of what happened.</p></div><Link href="/partners">Meet the partners <ArrowUpRight size={15} /></Link></div>
    <div className="community-programme-grid">{programmes.map((programme) => {
      const meta = metaFor(programme);
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
