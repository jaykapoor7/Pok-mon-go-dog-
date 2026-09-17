import { AppShell } from "@/components/app/AppShell";
import { CommunityRecordTabs } from "@/components/app/CommunityRecordTabs";
import { CommunityCaseRows } from "@/components/app/CommunityCaseRows";
import { getPublicCaseStories } from "@/lib/community-case-stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rescues, StrayPaw" };

export default async function RescuesPage() {
  const rows = await getPublicCaseStories();
  const active = rows.filter((row) => !["resolved", "closed"].includes(String(row.status).toLowerCase()));
  return <AppShell><main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <CommunityRecordTabs />
    <header className="mb-6"><span className="product-kicker">Community records</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">Rescues in progress</h1><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Open rescue and care cases. Each row opens the animal’s full record so the case sits inside its complete story rather than as a disconnected ticket.</p></header>
    <CommunityCaseRows rows={active} empty="No open rescue cases are currently published." />
  </main></AppShell>;
}
