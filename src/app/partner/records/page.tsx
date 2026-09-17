import { PartnerRecordExplorer } from "@/components/partner/PartnerRecordExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Records, StrayPaw Partner" };

export default function PartnerRecordsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <Records searchParams={searchParams} />;
}

async function Records({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-6 max-w-3xl">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">Organisation record</span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50 sm:text-3xl">Everything your team has recorded</h1>
      <p className="mt-2 text-sm leading-relaxed text-bark-500">Search rescues, treatment, rabies vaccination, ABC, reviews, follow-ups and outcomes in one ledger. Every row opens the case or animal behind it.</p>
    </header>
    <PartnerRecordExplorer initialFilter={params.view || "all"} />
  </main>;
}
