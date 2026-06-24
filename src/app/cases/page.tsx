import Link from "next/link";
import { Plus } from "lucide-react";
import { getCases } from "@/lib/cases";
import { CasesList } from "@/components/cases/CasesList";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cases — StrayPaw Delhi" };

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
            Cases
          </h1>
          <p className="text-sm text-bark-500">
            Operational records — claim, work, resolve.
          </p>
        </div>
        <Link href="/cases/new" className="btn-primary px-4 py-2.5 text-sm">
          <Plus className="h-4 w-4" /> New
        </Link>
      </header>

      <CasesList cases={cases} />
    </div>
  );
}
