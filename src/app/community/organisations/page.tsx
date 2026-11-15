import { PubPage } from "@/sp4/pub/kit";
import { Organisations } from "@/sp4/pub/community/Organisations";
import { getPartnerDirectory } from "@/lib/partners";
import { getPublicOrgDirectoryImpacts } from "@/lib/org-public";

export const revalidate = 300;
export const metadata = { title: "Organisations, StrayPaw", description: "The organisations whose street-animal work is on StrayPaw, and what each one's public record holds." };

export default async function OrganisationsPage() {
  const [orgs, impacts] = await Promise.all([getPartnerDirectory().catch(() => []), getPublicOrgDirectoryImpacts().catch(() => null)]);
  return <PubPage><Organisations orgs={orgs} impacts={impacts ? Object.fromEntries(impacts) : null} /></PubPage>;
}
