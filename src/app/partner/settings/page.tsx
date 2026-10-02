import { OrgManager } from "@/components/dashboard/OrgManager";
import { DeskHeader } from "@/components/app/DeskHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings, StrayPaw Partner" };

export default function PartnerSettingsPage() {
  return (
    <div className="org-settings-page">
      <DeskHeader
        kicker="Organisation · settings"
        title="Organisation settings"
        lede="Your public profile, verification details and active campaigns. Changes appear on your public organisation page."
      />
      <OrgManager />
    </div>
  );
}
