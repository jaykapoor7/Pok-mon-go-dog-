import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { OrgMark } from "@/components/orgs/OrgMark";
import { CampaignStrip, KIND_LABEL, KIND_UNIT } from "@/components/orgs/CampaignStrip";
import { PartnerFigures } from "@/components/orgs/PartnerFigures";
import { getPublicOrgBySlug } from "@/lib/org-public";
import { getPublicProgramme, getPublicProgrammes, programmeCategory, programmePrimaryTotal } from "@/lib/public-programmes";
import "@/components/orgs/partners.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicProgramme(id);
  return c ? { title: `${c.name}, ${c.ngo_name}, StrayPaw`, description: c.public_summary?.slice(0, 150) ?? `A campaign by ${c.ngo_name}.` } : { title: "Campaign not found, StrayPaw" };
}

/* ════════════════════════════════════════════════════════════════════
   One campaign. What it was and who ran it; the figure it is about,
   counted up, with the others beside it; its span on the time axis among
   the organisation's other campaigns; and what the organisation wrote
   about it. The figures are what the organisation's record holds.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const date = (iso: string | null) => { if (!iso) return null; const d = new Date(`${iso}T00:00:00Z`); return Number.isNaN(+d) ? null : `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicProgramme(id);
  if (!c) notFound();
  const [org, all] = await Promise.all([
    c.ngo_slug ? getPublicOrgBySlug(c.ngo_slug).catch(() => null) : null,
    getPublicProgrammes(250).catch(() => []),
  ]);
  const siblings = all.filter((x) => x.ngo_slug === c.ngo_slug);
  const cat = programmeCategory(c);
  const total = programmePrimaryTotal(c);
  const figures = [
    { value: total, label: `${KIND_UNIT[cat]}` },
    ...(c.animals_recorded && c.animals_recorded !== total ? [{ value: c.animals_recorded, label: "animals on record" }] : []),
    ...(c.sterilised_recorded && cat !== "sterilisation" ? [{ value: c.sterilised_recorded, label: "sterilised" }] : []),
    ...(c.vaccinated_recorded && cat !== "vaccination" ? [{ value: c.vaccinated_recorded, label: "vaccinated" }] : []),
  ].filter((f) => f.value > 0);
  const a = c.starts_on ? Date.parse(`${c.starts_on}T00:00:00Z`) : NaN, b = c.ends_on ? Date.parse(`${c.ends_on}T00:00:00Z`) : NaN;
  const days = !Number.isNaN(a) && !Number.isNaN(b) ? Math.max(1, Math.round((b - a) / DAY)) : null;
  const place = c.zone || c.city;

  return (
    <AppShell>
      <article className="op cp">
        <header className="cp-head">
          <p className={`op-kind sys-mono cp-kind is-${cat}`}><i aria-hidden /> {KIND_LABEL[cat]}</p>
          <h1>{c.name}</h1>
          <p className="cp-by">
            {c.ngo_slug
              ? <Link href={`/org/${c.ngo_slug}`}><OrgMark name={c.ngo_name} logoUrl={org?.logo_url} size={28} /> {c.ngo_name}</Link>
              : <span><OrgMark name={c.ngo_name} logoUrl={null} size={28} /> {c.ngo_name}</span>}
          </p>
          <dl className="cp-facts">
            {place && <div><dt>Where</dt><dd>{[place, c.state].filter(Boolean).join(", ")}</dd></div>}
            {(date(c.starts_on) || date(c.ends_on)) && <div><dt>When</dt><dd>{[date(c.starts_on), date(c.ends_on)].filter(Boolean).join(" – ")}</dd></div>}
            {days && <div><dt>How long</dt><dd>{days >= 60 ? `${Math.round(days / 30)} months` : `${days} days`}</dd></div>}
          </dl>
        </header>

        {figures.length > 0 && <section className="op-sec" aria-label="What its record holds"><PartnerFigures figures={figures} /></section>}

        {c.public_summary && (
          <section className="op-sec" aria-labelledby="cp-sum-h">
            <h2 id="cp-sum-h" className="op-h">From {c.ngo_name}</h2>
            <p className="op-about">{c.public_summary}</p>
          </section>
        )}

        <section className="op-sec" aria-labelledby="cp-time-h">
          <h2 id="cp-time-h" className="op-h">{siblings.length > 1 ? `Among ${c.ngo_name}'s campaigns` : "Its span"}</h2>
          <CampaignStrip campaigns={siblings.length ? siblings : [c]} showOrg={false} current={c.id} />
        </section>

        <p className="op-note">Figures are what {c.ngo_name}&apos;s record holds for this campaign, published by them; they are not claims about work StrayPaw did.</p>

        <p className="op-acts">
          {c.ngo_slug && <Link href={`/org/${c.ngo_slug}`} className="sys-btn">{c.ngo_name} <ArrowUpRight size={15} /></Link>}
          {c.city && <Link href={`/map?mode=animals&city=${encodeURIComponent(c.city)}`} className="pp-link">See {c.city} on the map <ArrowUpRight size={14} /></Link>}
        </p>
      </article>
    </AppShell>
  );
}
