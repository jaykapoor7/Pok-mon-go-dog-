import { FollowupsClient } from "@/components/partner/FollowupsClient";
import { ConsolePage } from "@/components/partner/ConsolePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Follow-ups, StrayPaw" };

export default function PartnerFollowupsPage() {
  return (
    <ConsolePage
      kicker="CareOS · Follow-ups"
      title="Rechecks that keep care going"
      lede="Current rechecks your team scheduled on a case come first. Historical import dates stay separate for source review and cannot be completed by mistake."
    >
      <FollowupsClient />
    </ConsolePage>
  );
}
