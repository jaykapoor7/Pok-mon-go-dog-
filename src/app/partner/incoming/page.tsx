import { IncomingClient } from "@/components/partner/IncomingClient";
import { ConsolePage } from "@/components/partner/ConsolePage";
import { FieldTabs } from "@/components/partner/FieldTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incoming, StrayPaw Partner" };

export default function PartnerIncomingPage() {
  return (
    <ConsolePage
      kicker="Field work / queue"
      title="Incoming"
      lede="Nothing counts towards your programme until you file it. What your volunteers send in waits here for you to say which drive it belongs to; community sightings wait to be claimed."
      tabs={<FieldTabs />}
    >
      <IncomingClient />
    </ConsolePage>
  );
}
