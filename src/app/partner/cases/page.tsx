import Link from "next/link";
import { Plus } from "lucide-react";
import { getCases } from "@/lib/cases";
import { CasesTable } from "@/components/cases/CasesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cases, StrayPaw Partner" };

export default async function PartnerCasesPage() {
  const cases = await getCases();
  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Cases</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Operational episodes, claim, work, resolve.</p>
        </div>
        <Link href="/cases/new" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
          <Plus className="h-4 w-4" /> New case
        </Link>
      </header>
      <CasesTable cases={cases} hrefBase="/partner/cases" />
    </div>
  );
}
