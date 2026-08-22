import { OrgManager } from "@/components/dashboard/OrgManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — StrayPaw Partner" };

export default function PartnerSettingsPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Organization</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">Your public profile, verification and campaigns.</p>
      </header>
      <OrgManager />
    </div>
  );
}
