"use client";

import { ShieldCheck, AlertTriangle } from "lucide-react";
import {
  coverage,
  colonyCoverage,
  HERD_THRESHOLD,
} from "@/lib/dashboard-metrics";
import type { Dog } from "@/lib/types";

/**
 * Coverage as the hero metric, framed against the WHO ~70% rabies
 * herd-immunity threshold. Each colony's sterilisation coverage is shown with
 * the 70% line marked and below-threshold gaps called out.
 */
export function CoverageHero({ dogs }: { dogs: Dog[] }) {
  const c = coverage(dogs);
  const colonies = colonyCoverage(dogs);
  const above = colonies.filter((x) => x.aboveThreshold).length;
  const below = colonies.filter((x) => !x.aboveThreshold);

  if (dogs.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-bark-400">
        No coverage data yet. Coverage appears as dogs are tracked and treated.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* hero numbers */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3">
          <HeroStat
            label="Sterilisation coverage"
            value={`${c.sterilisedPct}%`}
            threshold
            ok={c.sterilisedPct >= HERD_THRESHOLD}
          />
          <HeroStat
            label="Vaccination coverage"
            value={`${c.vaccinatedPct}%`}
            threshold
            ok={c.vaccinatedPct >= HERD_THRESHOLD}
          />
          <HeroStat
            label="Colonies above 70%"
            value={`${above}/${colonies.length}`}
          />
        </div>
        <div className="border-t border-black/[0.06] bg-paw-50 px-5 py-3 text-sm dark:border-white/10 dark:bg-bark-800">
          {below.length === 0 ? (
            <span className="flex items-center gap-2 font-medium text-status-sterilised">
              <ShieldCheck className="h-4 w-4" /> Every colony is at or above the
              70% herd-immunity threshold.
            </span>
          ) : (
            <span className="flex items-start gap-2 text-bark-700 dark:text-bark-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-injured" />
              <span>
                {below.length}{" "}
                {below.length === 1 ? "colony is" : "colonies are"} below the 70%
                threshold —{" "}
                <span className="font-semibold">
                  {below
                    .slice(0, 3)
                    .map((b) => `${b.colony}: ${b.sterilisedPct}%`)
                    .join(", ")}
                </span>
                {below.length > 3 ? "…" : ""}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* per-colony coverage bars with the 70% line */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display font-bold tracking-tight">
            Coverage by colony
          </h3>
          <span className="text-xs text-bark-400">{colonies.length} colonies</span>
        </div>
        <div className="space-y-3">
          {colonies.map((z) => (
            <div key={z.colony}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-bark-700 dark:text-bark-200">
                  {z.colony}
                  {z.city ? (
                    <span className="text-bark-400"> · {z.city}</span>
                  ) : null}
                </span>
                <span
                  className={
                    z.aboveThreshold
                      ? "font-semibold text-status-sterilised"
                      : "font-semibold text-status-injured"
                  }
                >
                  {z.sterilisedPct}% sterilised
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-bark-100 dark:bg-bark-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${z.sterilisedPct}%`,
                    backgroundColor: z.aboveThreshold ? "#3E8473" : "#C0492E",
                  }}
                />
                {/* 70% herd-immunity line */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-bark-900/50 dark:bg-white/50"
                  style={{ left: `${HERD_THRESHOLD}%` }}
                  title="70% herd-immunity threshold"
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-bark-400">
          Vertical line marks the WHO ~70% herd-immunity threshold for effective
          Animal Birth Control.
        </p>
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  threshold,
  ok,
}: {
  label: string;
  value: string;
  threshold?: boolean;
  ok?: boolean;
}) {
  return (
    <div className="border-black/[0.06] p-5 [&:not(:last-child)]:border-r dark:border-white/10">
      <p className="font-display text-3xl font-extrabold tracking-tightest">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-bark-500">{label}</p>
      {threshold && (
        <p
          className={`mt-1 text-[11px] font-semibold ${
            ok ? "text-status-sterilised" : "text-status-injured"
          }`}
        >
          {ok ? "≥ 70% threshold" : "below 70%"}
        </p>
      )}
    </div>
  );
}
