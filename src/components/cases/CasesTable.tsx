"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Download } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { isOverdue, speciesLabel, type Case, type CaseStatus } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type Filter = "all" | "urgent" | "assigned" | "in_progress" | "resolved";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const isUrgent = (c: Case) => isOpen(c) && (c.severity === "critical" || c.severity === "high" || isOverdue(c));

const STATUS_LABEL: Record<CaseStatus, string> = {
  unverified: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function statusBadge(c: Case): { label: string; cls: string } {
  const s = c.status;
  const cls =
    s === "resolved" ? "bg-status-vaccinated/15 text-status-vaccinated"
    : s === "in_progress" ? "bg-paw-500/15 text-paw-700 dark:text-paw-300"
    : s === "assigned" ? "bg-status-hungry/15 text-status-hungry"
    : s === "closed" ? "bg-bark-100 text-bark-500 dark:bg-bark-800"
    : "bg-bark-100 text-bark-600 dark:bg-bark-800 dark:text-bark-300";
  return { label: STATUS_LABEL[s], cls };
}

function priority(c: Case): { label: string; cls: string } {
  if (isOverdue(c)) return { label: "OVERDUE", cls: "text-status-injured" };
  if (c.severity === "critical") return { label: "URGENT", cls: "text-status-injured" };
  if (c.severity === "high") return { label: "HIGH", cls: "text-status-hungry" };
  if (c.severity === "low") return { label: "LOW", cls: "text-bark-400" };
  return { label: "NORMAL", cls: "text-bark-400" };
}

export function CasesTable({ cases, hrefBase = "/cases" }: { cases: Case[]; hrefBase?: string }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  // Seed the search from ?q (set by the top-bar search).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("q");
    if (p) setQ(p);
  }, []);

  const counts = useMemo(() => ({
    all: cases.length,
    urgent: cases.filter(isUrgent).length,
    assigned: cases.filter((c) => c.status === "assigned").length,
    in_progress: cases.filter((c) => c.status === "in_progress").length,
    resolved: cases.filter((c) => c.status === "resolved").length,
  }), [cases]);

  const rows = useMemo(() => {
    let list = cases;
    if (filter === "urgent") list = cases.filter(isUrgent);
    else if (filter === "assigned") list = cases.filter((c) => c.status === "assigned");
    else if (filter === "in_progress") list = cases.filter((c) => c.status === "in_progress");
    else if (filter === "resolved") list = cases.filter((c) => c.status === "resolved");
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((c) => c.title.toLowerCase().includes(term) || (c.zone ?? "").toLowerCase().includes(term) || (c.assignee_name ?? "").toLowerCase().includes(term));
    return [...list].sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at));
  }, [cases, filter, q]);

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "urgent", label: "Urgent", count: counts.urgent },
    { key: "assigned", label: "Assigned", count: counts.assigned },
    { key: "in_progress", label: "In progress", count: counts.in_progress },
    { key: "resolved", label: "Resolved", count: counts.resolved },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                filter === f.key ? "bg-bark-900 text-white dark:bg-white dark:text-bark-900" : "text-bark-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", filter === f.key ? "opacity-70" : "text-bark-400")}>{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cases…" className="w-full rounded-md border border-black/[0.09] bg-transparent py-2 pl-9 pr-3 text-sm outline-none placeholder:text-bark-400 focus:border-paw-400 dark:border-white/[0.12]" />
          </div>
          {rows.length > 0 && (
            <button onClick={() => downloadCsv("cases.csv", rows.map((c) => ({ title: c.title, species: speciesLabel(c.species), category: c.category, severity: c.severity, status: c.status, assignee: c.assignee_name ?? "", location: c.zone ?? "", follow_up: c.follow_up_at ?? "", last_activity: c.last_activity_at })))} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-black/[0.09] text-bark-500 hover:bg-black/[0.04] dark:border-white/[0.12]" title="Export CSV">
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
        <div className="hidden grid-cols-[44px_1fr_140px_100px_110px] items-center gap-4 border-b border-black/[0.08] bg-bark-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-bark-400 dark:border-white/[0.1] dark:bg-white/[0.02] sm:grid">
          <span></span><span>Animal</span><span>Location</span><span>Priority</span><span>Status</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-bark-400">No cases match.</div>
        ) : (
          <ul>
            {rows.map((c) => {
              const st = statusBadge(c);
              const pr = priority(c);
              return (
                <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`${hrefBase}/${c.id}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] sm:grid-cols-[44px_1fr_140px_100px_110px] sm:gap-4">
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-bark-100 dark:bg-bark-800">
                      <DogPhoto src={c.photos?.[0] ?? ""} alt={c.title} seed={c.id} className="h-full w-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium leading-tight text-bark-900 dark:text-bark-50">
                        {speciesLabel(c.species)} · <span className="capitalize text-bark-500">{c.category}</span>
                      </p>
                      <p className="truncate text-[12px] text-bark-400">{c.title}</p>
                      <div className="mt-1 flex items-center gap-2 sm:hidden">
                        <span className={cn("text-[11px] font-bold", pr.cls)}>{pr.label}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", st.cls)}>{st.label}</span>
                        {c.zone && <span className="truncate text-[11px] text-bark-400">{c.zone}</span>}
                      </div>
                    </div>
                    <span className="hidden truncate text-[13px] text-bark-500 sm:block">{c.zone || "—"}</span>
                    <span className={cn("hidden text-[12px] font-bold sm:block", pr.cls)}>{pr.label}</span>
                    <span className="hidden sm:block"><span className={cn("rounded-full px-2 py-0.5 text-[12px] font-semibold", st.cls)}>{st.label}</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-3 text-right text-[12px] tabular-nums text-bark-400">{rows.length} {rows.length === 1 ? "case" : "cases"}</p>
    </div>
  );
}
