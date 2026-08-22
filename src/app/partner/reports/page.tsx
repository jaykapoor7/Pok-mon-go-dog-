import { getCases } from "@/lib/cases";
import { speciesLabel } from "@/lib/types";
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

  const bySpecies = new Map<string, number>();
  for (const c of cases) bySpecies.set(c.species ?? "dog", (bySpecies.get(c.species ?? "dog") ?? 0) + 1);

  const resolutionRate = cases.length ? Math.round((resolved.length / cases.length) * 100) : 0;

  // New cases per week, last 8 weeks.
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - i * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const count = cases.filter((c) => { const t = +new Date(c.created_at); return t > start && t <= end; }).length;
    return count;
  }).reverse();
  const weekMax = Math.max(1, ...weeks);

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
        <Metric label="Resolution rate" value={`${resolutionRate}%`} />
        <Metric label="Treated" value={byResolution.treated} />
      </div>

      {/* New cases · last 8 weeks */}
      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-bark-400">New cases · last 8 weeks</h2>
        <div className="flex items-end gap-1.5 rounded-lg border border-black/[0.08] p-4 dark:border-white/[0.1]" style={{ height: 120 }}>
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-sm bg-paw-500" style={{ height: `${Math.round((w / weekMax) * 78)}px`, minHeight: w > 0 ? 3 : 0 }} title={`${w} cases`} />
              <span className="text-[10px] tabular-nums text-bark-400">{w}</span>
            </div>
          ))}
        </div>
      </section>

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

      {bySpecies.size > 1 && (
        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">Cases by species</h2>
          <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {[...bySpecies.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => (
              <li key={s} className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5 last:border-0 dark:border-white/[0.06]">
                <span className="text-[14px] text-bark-700 dark:text-bark-200">{speciesLabel(s)}</span>
                <span className="text-[14px] font-medium tabular-nums text-bark-900 dark:text-bark-50">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-[12px] text-bark-400">
        Deeper reporting — vaccination/deworming/sterilisation totals, cases by location, survey/census results and fundraising impact — builds on this foundation.
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white px-4 py-3.5 dark:bg-transparent">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50">{value}</div>
      <div className="mt-0.5 text-[12px] text-bark-500">{label}</div>
    </div>
  );
}
