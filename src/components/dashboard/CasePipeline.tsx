"use client";

import Link from "next/link";
import { CASE_SEVERITY_META, type Case, type CaseStatus } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

// Pipeline stages mapped from the case status model.
const STAGES: { key: string; label: string; statuses: CaseStatus[] }[] = [
  { key: "reported", label: "Reported", statuses: ["unverified"] },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "treatment", label: "In treatment", statuses: ["in_progress"] },
  { key: "resolved", label: "Resolved", statuses: ["resolved", "closed"] },
];

/**
 * Read-only case pipeline (reported → assigned → in-treatment → resolved) with
 * named owners. Assigning from here is a planned follow-up; this surfaces the
 * flow and ownership today.
 */
export function CasePipeline({ cases }: { cases: Case[] }) {
  if (cases.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-bark-400">
        No cases in the pipeline yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {STAGES.map((stage) => {
        const items = cases.filter((c) => stage.statuses.includes(c.status));
        return (
          <div key={stage.key} className="rounded-2xl bg-bark-50 p-3 dark:bg-bark-800/60">
            <div className="mb-2 flex items-center justify-between px-1">
              <h4 className="text-sm font-bold">{stage.label}</h4>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-bark-500 dark:bg-bark-900">
                {items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="block rounded-xl bg-white p-2.5 shadow-sm transition-transform hover:-translate-y-0.5 dark:bg-bark-900"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: CASE_SEVERITY_META[c.severity].color }}
                    />
                    <p className="truncate text-xs font-semibold">{c.title}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-bark-400">
                    <span className="truncate">
                      {c.assignee_name ?? "Unassigned"}
                    </span>
                    <span>{timeAgo(c.last_activity_at)}</span>
                  </div>
                </Link>
              ))}
              {items.length > 8 && (
                <p className="px-1 text-[11px] text-bark-400">
                  +{items.length - 8} more
                </p>
              )}
              {items.length === 0 && (
                <p className="px-1 py-2 text-[11px] text-bark-300">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
