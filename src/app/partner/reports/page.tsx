import { getCases } from "@/lib/cases";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports — StrayPaw Partner" };

export default async function PartnerReportsPage() {
  const cases = await getCases();
  const resolved = cases.filter((c) => c.status === "resolved");
  const byResolution = { treated: 0, sterilized: 0, rescued: 0 } as Record<string, number>;
  for (const c of resolved) if (c.resolution) byResolution[c.resolution] = (byResolution[c.resolution] ?? 0) + 1;

  const byCategory = new Map<string, number>();
  for (const c of cases) byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + 1);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Reports</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">The numbers you send to donors, funders and municipalities.</p>
        </div>
        <ExportCsvButton />
      </header>

      <div className="grid grid-cols-2 divide-x divide-y divide-black/[0.07] overflow-hidden rounded-lg border border-black/[0.08] sm:grid-cols-4 sm:divide-y-0 dark:divide-white/[0.08] dark:border-white/[0.1]">
        <Metric label="Total cases" value={cases.length} />
        <Metric label="Resolved" value={resolved.length} />
        <Metric label="Treated" value={byResolution.treated} />
        <Metric label="Rescued" value={byResolution.rescued} />
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">Cases by type</h2>
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {[...byCategory.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
            <li key={cat} className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5 last:border-0 dark:border-white/[0.06]">
              <span className="text-[14px] capitalize text-bark-700 dark:text-bark-200">{cat}</span>
              <span className="text-[14px] font-medium tabular-nums text-bark-900 dark:text-bark-50">{n}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-[12px] text-bark-400">
        Deeper reporting — vaccination/deworming/sterilisation totals, cases by location, survey/census results and fundraising impact — builds on this foundation.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white px-4 py-3.5 dark:bg-transparent">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50">{value}</div>
      <div className="mt-0.5 text-[12px] text-bark-500">{label}</div>
    </div>
  );
}
