import Link from "next/link";
import { Plus } from "lucide-react";
import { getCases } from "@/lib/cases";
import { CasesTable } from "@/components/cases/CasesTable";
import { PartnerGate } from "@/components/partner/PartnerGate";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cases, StrayPaw" };

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <PartnerGate title="Cases">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-24 sm:px-6">
        <header className="mb-5 flex items-center justify-between gap-4 border-b border-black/[0.08] pb-4 dark:border-white/[0.1]">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Cases</h1>
            <p className="mt-0.5 text-[13px] text-bark-500">Claim, work and resolve field cases.</p>
          </div>
          <Link
            href="/cases/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-paw-600"
          >
            <Plus className="h-4 w-4" /> New case
          </Link>
        </header>

        <CasesTable cases={cases} />
      </div>
    </PartnerGate>
  );
}
