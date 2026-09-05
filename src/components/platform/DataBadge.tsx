import { SOURCE_META, type SourceType } from "@/lib/platform/types";

/** Small provenance chip: source type (+ optional sample flag). Used anywhere a
 *  number appears so reported data, estimates and derived analysis stay distinct. */
export function SourceBadge({ type, sample, className = "" }: { type: SourceType; sample?: boolean; className?: string }) {
  const m = SOURCE_META[type];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white/70 px-2 py-0.5 text-[11.5px] font-medium text-bark-600 dark:border-white/10 dark:bg-bark-900/60 dark:text-bark-300 ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: m.dot }} />
      {m.label}
      {sample && <span className="text-bark-400">· sample</span>}
    </span>
  );
}

export function ConfidenceBar({ level }: { level?: "high" | "medium" | "low" }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
  if (!n) return null;
  return (
    <span className="inline-flex items-center gap-0.5" title={`${level} confidence`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2.5 w-1 rounded-full ${i < n ? "bg-paw-500" : "bg-bark-200 dark:bg-bark-700"}`} />
      ))}
    </span>
  );
}
