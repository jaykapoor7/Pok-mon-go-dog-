"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Download } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DogPhoto } from "@/components/ui/DogPhoto";
import { isOverdue, speciesLabel, type Case, type CaseStatus } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { getPartnerCases } from "@/lib/cases";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

/* A case's status reads as a Badge. The tint still comes from the status
   palette the rest of the app uses, so a resolved case is the same green
   here as on a dog's record; Badge supplies the shape, the border and the
   type treatment that were being re-specified by hand at each call site. */
function statusBadge(c: Case): { label: string; cls: string } {
  const s = c.status;
  const cls =
    s === "resolved" ? "border-transparent bg-status-vaccinated/15 text-status-vaccinated"
    : s === "in_progress" ? "border-transparent bg-paw-500/15 text-paw-700 dark:text-paw-300"
    : s === "assigned" ? "border-transparent bg-status-hungry/15 text-status-hungry"
    : s === "closed" ? "border-transparent bg-muted text-muted-foreground"
    : "border-transparent bg-muted text-foreground/70";
  return { label: STATUS_LABEL[s], cls };
}

function priority(c: Case): { label: string; cls: string } {
  if (isOverdue(c)) return { label: "OVERDUE", cls: "text-status-injured" };
  if (c.severity === "critical") return { label: "URGENT", cls: "text-status-injured" };
  if (c.severity === "high") return { label: "HIGH", cls: "text-status-hungry" };
  if (c.severity === "low") return { label: "LOW", cls: "text-bark-400" };
  return { label: "NORMAL", cls: "text-bark-400" };
}

export function CasesTable({ cases: initialCases, hrefBase = "/cases" }: { cases: Case[]; hrefBase?: string }) {
  // Both cases surfaces are partner-gated; re-fetch scoped to the signed-in org
  // (own cases + unclaimed pool) so each NGO sees only their own data.
  const [cases, setCases] = useState<Case[]>(initialCases);
  useEffect(() => {
    getPartnerCases().then((c) => { if (c.length) setCases(c); }).catch(() => {});
  }, []);
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
        {/* These five are one choice, not five independent toggles, which is
            what Tabs models. It also brings the arrow-key roving focus the
            hand-rolled button row never had. */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="no-scrollbar h-auto max-w-full justify-start overflow-x-auto">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.key} value={f.key} className="gap-1.5">
                {f.label}
                <span className="tabular-nums opacity-60">{f.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cases…"
              aria-label="Search cases"
              className="pl-9"
            />
          </div>
          {rows.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Export cases as CSV"
                    onClick={() => downloadCsv("cases.csv", rows.map((c) => ({ title: c.title, species: speciesLabel(c.species), category: c.category, severity: c.severity, status: c.status, assignee: c.assignee_name ?? "", location: c.zone ?? "", follow_up: c.follow_up_at ?? "", last_activity: c.last_activity_at })))}
                  >
                    <Download />
                  </Button>
                </TooltipTrigger>
                {/* Was a title attribute, which never appears on touch and
                    waits a second on a pointer. */}
                <TooltipContent>Export {rows.length} {rows.length === 1 ? "case" : "cases"} as CSV</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="hidden grid-cols-[44px_1.5fr_1fr_90px_110px_1fr] items-center gap-4 border-b bg-muted/60 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          <span></span><span>Report</span><span>Location</span><span>Urgency</span><span>Status</span><span>Assigned to</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">No cases match.</div>
        ) : (
          <ul>
            {rows.map((c) => {
              const st = statusBadge(c);
              const pr = priority(c);
              return (
                <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`${hrefBase}/${c.id}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] md:grid-cols-[44px_1.5fr_1fr_90px_110px_1fr] md:gap-4">
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-bark-100 dark:bg-bark-800">
                      <DogPhoto src={c.photos?.[0] ?? ""} alt={c.title} seed={c.id} className="h-full w-full" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium leading-tight text-bark-900 dark:text-bark-50">
                        {speciesLabel(c.species)} · <span className="capitalize text-bark-500">{c.category}</span>
                      </p>
                      <p className="truncate text-[12px] text-bark-400">{c.title}</p>
                      <div className="mt-1 flex items-center gap-2 md:hidden">
                        <span className={cn("text-[11.5px] font-bold", pr.cls)}>{pr.label}</span>
                        <Badge className={cn("px-2 py-0.5 text-[11.5px]", st.cls)}>{st.label}</Badge>
                        {c.zone && <span className="truncate text-[11.5px] text-bark-400">{c.zone}</span>}
                      </div>
                    </div>
                    <span className="hidden truncate text-[13px] text-bark-500 md:block">{c.zone || "-"}</span>
                    <span className={cn("hidden text-[12px] font-bold md:block", pr.cls)}>{pr.label}</span>
                    <span className="hidden md:block"><Badge className={cn("px-2 py-0.5 text-[12px]", st.cls)}>{st.label}</Badge></span>
                    <span className={cn("hidden truncate text-[13px] md:block", c.assignee_name ? "text-bark-700 dark:text-bark-200" : "text-bark-400")}>{c.assignee_name ?? "Unassigned"}</span>
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
