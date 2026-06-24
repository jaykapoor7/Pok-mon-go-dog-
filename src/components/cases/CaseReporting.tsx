import { CASE_CATEGORY_META, type Case, type CaseResolution } from "@/lib/types";
import { caseSummary } from "@/lib/case-insights";
import { formatNumber } from "@/lib/utils";
import { ExportButtons } from "./ExportButtons";

const RES_LABEL: Record<CaseResolution, string> = {
  sterilized: "Sterilized",
  rescued: "Rescued",
  treated: "Treated",
};

export function CaseReporting({ cases }: { cases: Case[] }) {
  const s = caseSummary(cases);
  const resolvedTotal = s.resolutions.sterilized + s.resolutions.rescued + s.resolutions.treated;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tightest sm:text-2xl">
            Impact &amp; reporting
          </h2>
          <p className="text-sm text-bark-500">For donors, CSR and reviews.</p>
        </div>
        <ExportButtons />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat value={formatNumber(s.created)} label="Cases created" />
        <Stat value={formatNumber(s.active)} label="Active" />
        <Stat value={formatNumber(s.resolved)} label="Resolved" />
        <Stat value={formatNumber(s.closed)} label="Closed" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-display font-bold tracking-tight">Resolutions</h3>
          {resolvedTotal === 0 ? (
            <p className="text-sm text-bark-400">No resolved cases yet.</p>
          ) : (
            <ul className="space-y-2">
              {(Object.keys(s.resolutions) as CaseResolution[]).map((k) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="text-bark-600 dark:text-bark-300">{RES_LABEL[k]}</span>
                  <span className="font-semibold">{s.resolutions[k]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-display font-bold tracking-tight">By category</h3>
          <ul className="space-y-2">
            {s.byCategory.map((c) => (
              <li key={c.category} className="flex items-center justify-between text-sm">
                <span className="text-bark-600 dark:text-bark-300">
                  {CASE_CATEGORY_META[c.category as keyof typeof CASE_CATEGORY_META]?.emoji}{" "}
                  {CASE_CATEGORY_META[c.category as keyof typeof CASE_CATEGORY_META]?.label ?? c.category}
                </span>
                <span className="font-semibold">{c.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-4">
      <p className="font-display text-2xl font-bold tracking-tightest">{value}</p>
      <p className="text-xs text-bark-500">{label}</p>
    </div>
  );
}
