import { PartnerRecordExplorer } from "@/components/partner/PartnerRecordExplorer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Records, StrayPaw Partner" };

export default function PartnerRecordsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return <Records searchParams={searchParams} />;
}

async function Records({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const params = await searchParams;
  return <main className="min-h-screen bg-[#f4f1e9] text-[#0b1e3d]"><div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-7 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-[#0b1e3d]/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#2457ce]">Organisation record</p><h1 className="mt-2 text-[clamp(2.3rem,5vw,4rem)] font-semibold leading-[.95] tracking-[-.055em]">The working register.</h1><p className="mt-3 max-w-2xl text-sm leading-6 opacity-55">Rescue, care, follow-up and outcome stay in one searchable record. Open a row to work on the animal or case behind it.</p></div>
    </header>
    <PartnerRecordExplorer initialFilter={params.view || "all"} />
  </div></main>;
}