"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Map as MapIcon } from "lucide-react";
import { SectionLabel } from "@/components/platform/viz";
import { SourceBadge, ConfidenceBar } from "@/components/platform/DataBadge";
import { METRICS, STATES } from "@/lib/platform/geography";
import { pointsForMetric, stateValue, coverageOf, nationalRollup } from "@/lib/platform/datasets";
import { DATASET_BY_METRIC } from "@/lib/platform/datasets";
import { cn } from "@/lib/utils";

export function ExploreClient() {
  const [metric, setMetric] = useState("abc_coverage");
  const def = METRICS.find((m) => m.id === metric)!;
  const dataset = DATASET_BY_METRIC.get(metric);
  const pts = pointsForMetric(metric);
  const peak = Math.max(1, ...pts.map((p) => p.value));
  const cov = coverageOf(metric);
  const roll = nationalRollup(metric);

  const rows = useMemo(() => {
    return STATES.map((s) => ({ state: s, dp: stateValue(metric, s.code) }))
      .sort((a, b) => (b.dp?.value ?? -1) - (a.dp?.value ?? -1));
  }, [metric]);

  const fmt = (v: number) => (def.unit === "%" ? `${v}%` : new Intl.NumberFormat("en-IN").format(v));

  return (
    <div>
      <header className="max-w-3xl">
        <SectionLabel>Explore</SectionLabel>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">The data, by place.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
          Choose a layer and read it across India. Where a state has no data, that gap is shown, not hidden. Deeper resolution (district, city, ward) appears as datasets become available.
        </p>
      </header>

      {/* Layer selector */}
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {METRICS.filter((m) => m.id !== "community_reports").map((m) => (
          <button key={m.id} onClick={() => setMetric(m.id)} className={cn("shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors", metric === m.id ? "border-bark-900 bg-bark-900 text-white dark:border-white dark:bg-white dark:text-bark-900" : "border-black/[0.1] text-bark-600 hover:border-bark-300 dark:border-white/[0.14] dark:text-bark-300")}>
            {m.short}
          </button>
        ))}
        <Link href="/map" className="shrink-0 rounded-full border border-black/[0.1] px-3.5 py-2 text-[13px] font-medium text-paw-600 hover:border-paw-300 dark:border-white/[0.14] dark:text-paw-300">
          <MapIcon className="mr-1 inline h-3.5 w-3.5" /> Community reports (live map)
        </Link>
      </div>

      {/* Metric header */}
      <div className="mt-5 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.1]">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-bold tracking-tight">{def.label}</h2>
          <p className="mt-1 text-sm text-bark-600 dark:text-bark-300">{def.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-bark-400">
            {dataset && <SourceBadge type={dataset.sourceType} sample={dataset.sample} />}
            <span>· {dataset?.source}</span>
            <span>· {dataset?.year}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-5 text-right sm:min-w-[240px]">
          <div><div className="font-display text-xl font-bold tabular-nums">{cov.withData}<span className="text-bark-300">/{cov.total}</span></div><div className="text-[11px] text-bark-400">states</div></div>
          {def.unit === "%" ? (
            <div><div className="font-display text-xl font-bold tabular-nums">{roll.mean.toFixed(0)}%</div><div className="text-[11px] text-bark-400">average</div></div>
          ) : (
            <div><div className="font-display text-xl font-bold tabular-nums">{new Intl.NumberFormat("en-IN", { notation: "compact" }).format(roll.sum)}</div><div className="text-[11px] text-bark-400">total</div></div>
          )}
          <div><div className="font-display text-xl font-bold tabular-nums text-status-injured">{cov.total - cov.withData}</div><div className="text-[11px] text-bark-400">no data</div></div>
        </div>
      </div>

      {/* Region rows */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.1]">
        {rows.map(({ state, dp }, i) => (
          <div key={state.code} className={cn("flex items-center gap-4 px-5 py-3", i > 0 && "border-t border-black/[0.06] dark:border-white/[0.06]", !dp && "opacity-55")}>
            <span className="w-40 shrink-0 truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{state.name}</span>
            <div className="hidden h-2 flex-1 rounded-full bg-bark-100 dark:bg-bark-800 sm:block">
              {dp && <div className="h-full rounded-full bg-paw-500" style={{ width: `${(dp.value / peak) * 100}%` }} />}
            </div>
            <span className="w-24 shrink-0 text-right text-[14px] font-semibold tabular-nums">
              {dp ? fmt(dp.value) : <span className="text-[12px] font-normal text-bark-400">No data</span>}
            </span>
            <span className="hidden w-10 shrink-0 justify-end sm:flex">{dp && <ConfidenceBar level={dp.confidence} />}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12px] text-bark-400">
        Values shown are sample data with realistic structure. Confidence bars indicate how much to trust each figure. Real datasets normalise into this same view.
      </p>

      <Link href="/insights" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300">
        What does this tell us? See Insights <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
