import { CareInbox } from "@/components/partner/CareInbox";
import { IncomingClient } from "@/components/partner/IncomingClient";
import { ConsolePage } from "@/components/partner/ConsolePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Care Inbox, StrayPaw" };

export default function PartnerInboxPage() {
  return (
    <ConsolePage
      kicker="CareOS · Care Inbox"
      title="Waiting for a decision"
      lede="Everything that has come in and not yet been owned: messages from residents and reports sent through StrayPaw. Own it, open a case, or attach it to an animal you already know."
    >
      <CareInbox>
        <IncomingClient />
      </CareInbox>
    </ConsolePage>
  );
}
