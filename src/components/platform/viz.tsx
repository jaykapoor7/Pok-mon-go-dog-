import { METRIC_BY_ID } from "@/lib/platform/geography";
import type { DataPoint } from "@/lib/platform/types";

export function nf(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-paw-600 dark:text-paw-300">{children}</p>;
}

/** A big editorial figure with a caption. */
export function Figure({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone?: string }) {
  return (
    <div>
      <div className={`font-display text-3xl tracking-tight tabular-nums sm:text-4xl ${tone ?? "text-bark-900 dark:text-white"}`}>{value}</div>
      <div className="mt-1 text-[13px] font-medium text-bark-700 dark:text-bark-200">{label}</div>
      {sub && <div className="mt-0.5 text-[12px] text-bark-400">{sub}</div>}
    </div>
  );
}

/** Horizontal ranked bars for a metric across regions. */
export function RankedBars({ points, dir = "desc", max = 8, unit }: { points: DataPoint[]; dir?: "asc" | "desc"; max?: number; unit?: string }) {
  const sorted = [...points].sort((a, b) => (dir === "desc" ? b.value - a.value : a.value - b.value)).slice(0, max);
  const peak = Math.max(1, ...points.map((p) => p.value));
  const u = unit ?? (points[0] ? METRIC_BY_ID.get(points[0].metric)?.unit : "");
  return (
    <div className="space-y-2.5">
      {sorted.map((p) => (
        <div key={p.geo.code}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="text-bark-700 dark:text-bark-200">{p.geo.name}</span>
            <span className="font-medium tabular-nums text-bark-900 dark:text-white">{u === "%" ? `${p.value}%` : nf(p.value)}{u && u !== "%" ? ` ${u}` : ""}</span>
          </div>
          <div className="h-2 rounded-full bg-bark-100 dark:bg-bark-800">
            <div className="h-full rounded-full bg-paw-500" style={{ width: `${(p.value / peak) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Coverage meter: how many regions have data for a metric. */
export function CoverageMeter({ withData, total, label }: { withData: number; total: number; label: string }) {
  const pct = Math.round((withData / total) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-bark-600 dark:text-bark-300">{label}</span>
        <span className="text-[13px] font-semibold tabular-nums">{withData}/{total} <span className="font-normal text-bark-400">states</span></span>
      </div>
      <div className="mt-1.5 flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-2 flex-1 rounded-[1px] ${i < withData ? "bg-paw-500" : "bg-bark-200 dark:bg-bark-700"}`} />
        ))}
      </div>
      <p className="mt-1 text-[11.5px] text-bark-400">{100 - pct}% of states have no data for this metric.</p>
    </div>
  );
}
