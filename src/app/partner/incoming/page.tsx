import { IncomingClient } from "@/components/partner/IncomingClient";
import { ConsolePage } from "@/components/partner/ConsolePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incoming, StrayPaw Partner" };

export default function PartnerIncomingPage() {
  return (
    <ConsolePage
      kicker="Field work · incoming"
      title="Reports waiting for a response"
      lede="A resident's report starts here. See care signals first, decide what your team can own, then file the report into the field work that follows."
    >
      <IncomingClient />
    </ConsolePage>
  );
}
