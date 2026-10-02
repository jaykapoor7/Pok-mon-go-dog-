import { AppShell } from "@/components/app/AppShell";
import { PartnerGate } from "@/components/partner/PartnerGate";
import { DemoBanner } from "@/components/partner/DemoBanner";
import { PartnerTabs } from "@/components/partner/PartnerTabs";
import { OrgPlace } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// The field workspace lives inside the same console as the community surface, // one product, one shell. The gate still limits these records to verified
// organisation members; only the chrome is shared.
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PartnerGate title="Your organisation">
        <OrgPlace>
          <div className="mx-auto w-full max-w-[1240px]">
            <DemoBanner />
            {/* One tab bar for the whole console, rendered from one list.
                Every page under /partner belongs to a group; pages that are
                destinations in their own right (the dashboard, the map)
                belong to none and get nothing. */}
            <PartnerTabs />
            {children}
          </div>
        </OrgPlace>
      </PartnerGate>
    </AppShell>
  );
}
