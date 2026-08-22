import { getCases } from "@/lib/cases";
import { PartnerMap } from "@/components/partner/PartnerMap";

export const dynamic = "force-dynamic";
export const metadata = { title: "Map — StrayPaw Partner" };

export default async function PartnerMapPage() {
  const cases = await getCases();
  return <PartnerMap cases={cases} />;
}
