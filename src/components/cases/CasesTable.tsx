"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Circle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isOverdue, speciesLabel, type Case, type CaseStatus } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Filter = "all" | "open" | "unassigned" | "mine" | "urgent" | "overdue";

const open = (c: Case) => c.status !== "resolved" && c.status !== "closed";

// Semantic status → a single muted dot colour. Sparse, not a rainbow.
function statusTone(c: Case): { dot: string; label: string } {
  if (isOverdue(c)) return { dot: "text-status-injured", label: "Overdue" };
  if (open(c) && (c.severity === "critical" || c.severity === "high"))
    return { dot: "text-status-injured", label: "Urgent" };
  const map: Record<CaseStatus, { dot: string; label: string }> = {
    unverified: { dot: "text-bark-300", label: "New" },
    assigned: { dot: "text-status-hungry", label: "Assigned" },
    in_progress: { dot: "text-paw-500", label: "In progress" },
    resolved: { dot: "text-status-vaccinated", label: "Resolved" },
    closed: { dot: "text-bark-300", label: "Closed" },
  };
  return map[c.status];
}

export function CasesTable({ cases, hrefBase = "/cases" }: { cases: Case[]; hrefBase?: string }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");

  const counts = useMemo(
    () => ({
      all: cases.length,
      open: cases.filter(open).length,
      unassigned: cases.filter((c) => open(c) && !c.assignee_id).length,
      mine: user ? cases.filter((c) => c.assignee_id === user.id && open(c)).length : 0,
      urgent: cases.filter((c) => open(c) && (c.severity === "critical" || c.severity === "high")).length,
      overdue: cases.filter(isOverdue).length,
    }),
    [cases, user]
  );

  const rows = useMemo(() => {
    let list = cases;
    switch (filter) {
      case "open": list = cases.filter(open); break;
      case "unassigned": list = cases.filter((c) => open(c) && !c.assignee_id); break;
      case "mine": list = user ? cases.filter((c) => c.assignee_id === user.id) : []; break;
      case "urgent": list = cases.filter((c) => open(c) && (c.severity === "critical" || c.severity === "high")); break;
      case "overdue": list = cases.filter(isOverdue); break;
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          (c.zone ?? "").toLowerCase().includes(term) ||
          (c.assignee_name ?? "").toLowerCase().includes(term)
      );
    }
    return [...list].sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at));
  }, [cases, filter, q, user]);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "open", label: "Open", count: counts.open },
    { key: "unassigned", label: "Unassigned", count: counts.unassigned },
    { key: "mine", label: "Mine", count: counts.mine },
    { key: "urgent", label: "Urgent", count: counts.urgent },
    { key: "overdue", label: "Overdue", count: counts.overdue },
    { key: "all", label: "All", count: counts.all },
  ];

  return (
    <div>
      {/* toolbar */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                filter === f.key
                  ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900"
                  : "text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", filter === f.key ? "opacity-70" : "text-bark-400")}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cases…"
            className="w-full rounded-md border border-black/[0.09] bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-bark-400 focus:border-paw-400 dark:border-white/[0.12]"
          />
        </div>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
        {/* header (desktop) */}
        <div className="hidden grid-cols-[1fr_120px_140px_110px] items-center gap-4 border-b border-black/[0.08] bg-bark-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400 dark:border-white/[0.1] dark:bg-white/[0.02] sm:grid">
          <span>Case</span>
          <span>Severity</span>
          <span>Assignee</span>
          <span className="text-right">Updated</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-bark-400">No cases match.</div>
        ) : (
          <ul>
            {rows.map((c) => {
              const tone = statusTone(c);
              return (
                <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link
                    href={`${hrefBase}/${c.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[1fr_120px_140px_110px] sm:gap-4"
                  >
                    {/* case */}
                    <div className="flex min-w-0 items-start gap-2.5">
                      <Circle className={cn("mt-1 h-2.5 w-2.5 shrink-0 fill-current", tone.dot)} strokeWidth={0} />
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium leading-tight text-bark-900 dark:text-bark-50">
                          {c.title}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-bark-400">
                          {speciesLabel(c.species)}
                          {c.zone ? ` · ${c.zone}` : ""}
                          <span className="sm:hidden"> · {tone.label}</span>
                        </p>
                      </div>
                    </div>

                    {/* severity (desktop) */}
                    <div className="hidden sm:block">
                      <SeverityText severity={c.severity} />
                    </div>

                    {/* assignee (desktop) */}
                    <div className="hidden min-w-0 sm:block">
                      <span className={cn("truncate text-[13px]", c.assignee_name ? "text-bark-600 dark:text-bark-300" : "text-bark-400")}>
                        {c.assignee_name ?? "Unassigned"}
                      </span>
                    </div>

                    {/* updated */}
                    <div className="shrink-0 text-right text-[12px] tabular-nums text-bark-400">
                      {timeAgo(c.last_activity_at)}
                      {c.follow_up_at && (
                        <span className="block text-[11px] text-status-hungry">follow-up</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-right text-[12px] tabular-nums text-bark-400">
        {rows.length} {rows.length === 1 ? "case" : "cases"}
      </p>
    </div>
  );
}

function SeverityText({ severity }: { severity: Case["severity"] }) {
  const tone =
    severity === "critical"
      ? "text-status-injured"
      : severity === "high"
      ? "text-status-hungry"
      : "text-bark-500";
  return <span className={cn("text-[13px] capitalize", tone)}>{severity}</span>;
}
