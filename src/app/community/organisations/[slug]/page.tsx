import { notFound } from "next/navigation";
import fieldPartners from "@/data/field-partners.json";
import { Body, Empty, Head, LinkBtn, PubPage } from "@/sp4/pub/kit";
import { Organisation } from "@/sp4/pub/community/Organisation";
import { getPublicOrgActivity, getPublicOrgAnimals, getPublicOrgBySlug, getPublicOrgH3Cells, getPublicOrgImpact, getPublicOrgMedianFirstActionDays, getPublicOrgProgrammes } from "@/lib/org-public";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug).catch(() => null) ?? fieldPartners.organisations.find((o) => o.slug === slug);
  return org ? { title: `${org.name}, StrayPaw`, description: org.mission ?? `${org.name} on StrayPaw.` } : { title: "Organisation not found, StrayPaw" };
}

export default async function OrganisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug).catch(() => null);
  if (!org) {
    /* Only already-published directory information survives a record-service outage.
       No verification status, activity, programme counts or private fields are inferred. */
    const published = fieldPartners.organisations.find((o) => o.slug === slug);
    if (!published) notFound();
    return (
      <PubPage>
        <Head back="/community/organisations" title={published.name}
          eyebrow={<>{[published.city, published.state].filter(Boolean).join(", ")} · NGO field partner</>}
          sum={published.mission ?? undefined}
          actions={published.website ? <LinkBtn href={published.website} external>Organisation website<span className="pb-sr"> (opens in a new tab)</span></LinkBtn> : undefined} />
        <Body>
          <p className="pb-fine">Directory details · 20 October 2026</p>
          <Empty alert title="Public record not read" action={<LinkBtn href="/community/organisations">Browse the organisation directory</LinkBtn>}>Public activity and animal records are temporarily unavailable. That is not the same as there being none.</Empty>
        </Body>
      </PubPage>
    );
  }
  const [impact, cells, activity, animals, programmes, median] = await Promise.all([
    getPublicOrgImpact(org.id).catch(() => null), getPublicOrgH3Cells(org.id).catch(() => []), getPublicOrgActivity(org.id, 10).catch(() => []),
    getPublicOrgAnimals(org.id, 12).catch(() => []), getPublicOrgProgrammes(slug, 8).catch(() => []), getPublicOrgMedianFirstActionDays(org.id).catch(() => null),
  ]);
  return <PubPage><Organisation org={org} impact={impact} cells={cells} activity={activity} animals={animals} programmes={programmes} median={median} /></PubPage>;
}
