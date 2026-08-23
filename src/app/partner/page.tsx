import { getCases } from "@/lib/cases";
import { PartnerOverview } from "@/components/partner/PartnerOverview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview, StrayPaw Partner" };

export default async function PartnerOverviewPage() {
  const cases = await getCases();
  return <PartnerOverview cases={cases} />;
}
