import { FollowupsClient } from "@/components/partner/FollowupsClient";
import { ConsolePage } from "@/components/partner/ConsolePage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Follow-ups, StrayPaw" };

export default function PartnerFollowupsPage() {
  return (
    <ConsolePage
      kicker="CareOS · Follow-ups"
      title="Rechecks that keep care going"
      lede="Every recheck your team has scheduled, overdue first. Mark one done or move it in a tap; the case and the animal's history update with it."
    >
      <FollowupsClient />
    </ConsolePage>
  );
}
