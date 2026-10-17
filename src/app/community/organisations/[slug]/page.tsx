import { notFound } from "next/navigation";
import { Organisation } from "@/sp/community/more/Organisation";
import { getPublicOrgActivity, getPublicOrgAnimals, getPublicOrgBySlug, getPublicOrgH3Cells, getPublicOrgImpact, getPublicOrgMedianFirstActionDays, getPublicOrgProgrammes } from "@/lib/org-public";

export const revalidate = 300;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const org = await getPublicOrgBySlug((await params).slug).catch(() => null);
  return org ? { title: `${org.name}, StrayPaw`, description: org.mission ?? `${org.name} on StrayPaw.` } : { title: "Organisation not found, StrayPaw" };
}
export default async function OrganisationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getPublicOrgBySlug(slug).catch(() => null);
  if (!org) notFound();
  const [impact, cells, activity, animals, programmes, median] = await Promise.all([
    getPublicOrgImpact(org.id).catch(() => null), getPublicOrgH3Cells(org.id).catch(() => []), getPublicOrgActivity(org.id, 10).catch(() => []),
    getPublicOrgAnimals(org.id, 12).catch(() => []), getPublicOrgProgrammes(slug, 8).catch(() => []), getPublicOrgMedianFirstActionDays(org.id).catch(() => null),
  ]);
  return <Organisation org={org} impact={impact} cells={cells} activity={activity} animals={animals} programmes={programmes} median={median} />;
}
