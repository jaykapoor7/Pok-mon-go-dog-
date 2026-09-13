import { DrivesClient } from "@/components/partner/DrivesClient";
import { ConsolePage } from "@/components/partner/ConsolePage";
import { FieldTabs } from "@/components/partner/FieldTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Drives, StrayPaw Partner" };

export default function PartnerDrivesPage() {
  return (
    <ConsolePage
      kicker="Field work / programme"
      title="Drives"
      lede="A census, a sterilisation round, a rabies drive. Each one carries its own coverage figure, counted over the animals in it rather than the observations, so two sightings of one dog on one day stay one sterilisation."
      tabs={<FieldTabs />}
    >
      <DrivesClient />
    </ConsolePage>
  );
}
