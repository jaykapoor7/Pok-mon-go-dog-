import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CommunityRecordTabs } from "@/components/app/CommunityRecordTabs";
import { getPublicTimeline } from "@/lib/community-case-stories";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Care records, StrayPaw" };

export default async function CarePage() {
  const all = await getPublicTimeline(1200);
  const rows = all.filter((row) => row.id.startsWith("medical:"));

  return <AppShell><main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <CommunityRecordTabs />
    <header className="mb-6">
      <span className="product-kicker">Community records</span>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Care delivered</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">Published treatment, medical, ABC / sterilisation and rabies / vaccination activity. Each record opens the animal behind the work so care is shown as part of one continuous history.</p>
    </header>
    <div className="border-t border-black/[.09]">
      {rows.length ? rows.map((row) => <div key={row.id} className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[120px_160px_minmax(0,1fr)_18px] sm:items-center">
        <time className="text-xs tabular-nums opacity-55">{formatDate(row.occurred_at)}</time>
        <span className="truncate text-xs font-semibold">{row.ngo_name || "Care record"}</span>
        <span className="min-w-0"><b className="block text-sm">{row.title}</b>{row.zone && <small className="mt-0.5 block text-xs opacity-60">{row.zone}</small>}</span>
        {row.dog_id ? <Link href={`/dog/${row.dog_id}`} aria-label="Open animal record"><ArrowUpRight size={15}/></Link> : <span/>}
      </div>) : <p className="py-8 text-sm opacity-60">No public care records are available yet.</p>}
    </div>
  </main></AppShell>;
}
