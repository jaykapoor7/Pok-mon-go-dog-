import { ResourcesClient } from "@/components/partner/ResourcesClient";
import { DeskHeader } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Evidence files, StrayPaw Partner" };

export default function PartnerResourcesPage() {
  return (
    <div>
      <DeskHeader
        kicker="Records · evidence"
        title="Evidence files"
        lede="The original register pages, ledgers and message threads your records came from. Attach one to an animal and any transcribed entry can be checked against its page."
      />
      <ResourcesClient />
    </div>
  );
}
