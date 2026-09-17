import { AppShell } from "@/components/app/AppShell";
import { CommunityRecordTabs } from "@/components/app/CommunityRecordTabs";
import { CommunityCaseRows } from "@/components/app/CommunityCaseRows";
import { getPublicCaseStories } from "@/lib/community-case-stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Completed cases, StrayPaw" };

export default async function OutcomesPage() {
  const rows = await getPublicCaseStories();
  const completed = rows.filter((row) => ["resolved", "closed"].includes(String(row.status).toLowerCase()));
  return <AppShell><main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <CommunityRecordTabs />
    <header className="mb-6"><span className="product-kicker">Community records</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">Completed cases</h1><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Resolved and closed field cases. Open any animal to see the full chronology, care history, outcome and source record behind the case.</p></header>
    <CommunityCaseRows rows={completed} empty="No completed case stories are currently published." />
  </main></AppShell>;
}
