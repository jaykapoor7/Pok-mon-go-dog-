import { OrgManager } from "@/components/dashboard/OrgManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings, StrayPaw Partner" };

export default function PartnerSettingsPage() {
  return (
    <div className="org-settings-page">
      <header className="org-settings-page__header">
        <div>
          <p className="org-settings-page__eyebrow">Partner workspace</p>
          <h1>Organisation settings</h1>
          <p>Your public profile, verification details and active campaigns.</p>
        </div>
        <p className="org-settings-page__hint">Changes appear on your public organisation page.</p>
      </header>
      <OrgManager />
    </div>
  );
}
