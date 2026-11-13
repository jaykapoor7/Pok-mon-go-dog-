import { Organisations } from "@/sp/community/more/Organisations";
import { getPartnerDirectory } from "@/lib/partners";
import { getPublicOrgDirectoryImpacts } from "@/lib/org-public";

export const revalidate = 300;
export const metadata = { title: "Organisations, StrayPaw", description: "The organisations whose street-animal work is on StrayPaw, and what each one's public record holds." };
export default async function OrganisationsPage() {
  const [orgs, impacts] = await Promise.all([getPartnerDirectory().catch(() => []), getPublicOrgDirectoryImpacts().catch(() => null)]);
  return <Organisations orgs={orgs} impacts={impacts} />;
}
