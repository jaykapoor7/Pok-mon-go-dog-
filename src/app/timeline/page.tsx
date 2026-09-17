import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { CommunityRecordTabs } from "@/components/app/CommunityRecordTabs";
import { getPublicTimeline } from "@/lib/community-case-stories";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Field timeline, StrayPaw" };

export default async function TimelinePage() {
  const rows = await getPublicTimeline(750);
  return <AppShell><main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
    <CommunityRecordTabs />
    <header className="mb-6"><span className="product-kicker">Community records</span><h1 className="mt-1 text-3xl font-semibold tracking-tight">Field timeline</h1><p className="mt-2 max-w-2xl text-sm leading-6 opacity-65">A chronological view of published rescue and care activity. Open an animal to follow the work as one continuous story instead of disconnected updates.</p></header>
    <div className="border-t border-black/[.09]">{rows.length?rows.map((row)=><div key={row.id} className="grid gap-2 border-b border-black/[.08] py-4 sm:grid-cols-[120px_160px_minmax(0,1fr)_18px] sm:items-center"><time className="text-xs tabular-nums opacity-55">{formatDate(row.occurred_at)}</time><span className="truncate text-xs font-semibold">{row.ngo_name||"Field record"}</span><span className="min-w-0"><b className="block text-sm">{row.title}</b>{row.zone&&<small className="mt-0.5 block text-xs opacity-60">{row.zone}</small>}</span>{row.dog_id?<Link href={`/dog/${row.dog_id}`} aria-label="Open animal record"><ArrowUpRight size={15}/></Link>:<span/>}</div>):<p className="py-8 text-sm opacity-60">No public field activity is available yet.</p>}</div>
  </main></AppShell>;
}
