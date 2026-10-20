import { notFound } from "next/navigation";
import Link from "next/link";
import fieldPartners from "@/data/field-partners.json";
import { Organisation } from "@/sp/community/more/Organisation";
import { getPublicOrgActivity, getPublicOrgAnimals, getPublicOrgBySlug, getPublicOrgH3Cells, getPublicOrgImpact, getPublicOrgMedianFirstActionDays, getPublicOrgProgrammes } from "@/lib/org-public";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug).catch(() => null) ?? fieldPartners.organisations.find(o => o.slug === slug);
  return org ? { title: `${org.name}, StrayPaw`, description: org.mission ?? `${org.name} on StrayPaw.` } : { title: "Organisation not found, StrayPaw" };
}
export default async function OrganisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug).catch(() => null);
  if (!org) {
    // Only already-published directory information survives a record-service outage.
    // No verification status, activity, programme counts or private fields are inferred.
    const published = fieldPartners.organisations.find(o => o.slug === slug);
    if (!published) notFound();
    return <article className="mo og"><header className="mo-head og-head">
      <Link className="link small" href="/community/organisations">← Organisations</Link>
      <p className="k">{[published.city,published.state].filter(Boolean).join(", ")} · NGO field partner</p>
      <h1 className="display">{published.name}</h1>
      {published.mission&&<p className="lede">{published.mission}</p>}
      {published.website&&<a className="btn is-s" href={published.website} target="_blank" rel="noreferrer">Organisation website ↗</a>}
      <p className="small">Directory details · 20 October 2026</p>
    </header><div className="og-body"><section className="og-col"><h2 className="h3">Public record</h2><p className="body">Public activity and animal records are temporarily unavailable.</p><Link className="link" href="/community/organisations">Browse the organisation directory</Link></section></div></article>;
  }
  const [impact, cells, activity, animals, programmes, median] = await Promise.all([
    getPublicOrgImpact(org.id).catch(() => null), getPublicOrgH3Cells(org.id).catch(() => []), getPublicOrgActivity(org.id, 10).catch(() => []),
    getPublicOrgAnimals(org.id, 12).catch(() => []), getPublicOrgProgrammes(slug, 8).catch(() => []), getPublicOrgMedianFirstActionDays(org.id).catch(() => null),
  ]);
  return <Organisation org={org} impact={impact} cells={cells} activity={activity} animals={animals} programmes={programmes} median={median} />;
}
