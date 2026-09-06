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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Inbox } from "lucide-react";

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

      {rows.length === 0 ? (
        /* An empty table used to be the words "No cases match." centred in a
           tall grey box, which tells you nothing about why. This says which
           of the two situations you are in and offers the way out of each. */
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="font-display text-lg">
            {cases.length === 0 ? "No cases yet" : "Nothing matches that"}
          </p>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {cases.length === 0
              ? "A case is opened when an animal needs a decision or a dispatch. Claim one from the map, or start one here."
              : `${cases.length} ${cases.length === 1 ? "case is" : "cases are"} loaded, but none match this filter and search.`}
          </p>
          {cases.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setFilter("all"); setQ(""); }}
            >
              Clear filter and search
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {/* A real table on a real screen. The hand-built version was a
              div grid with a row of spans pretending to be a header: no
              column association for a screen reader, and nothing a browser
              could treat as tabular. Below md it falls back to the stacked
              rows, because five columns do not belong on a phone. */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[68px]"><span className="sr-only">Photo</span></TableHead>
                <TableHead>Report</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[104px]">Urgency</TableHead>
                <TableHead className="w-[124px]">Status</TableHead>
                <TableHead>Assigned to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const st = statusBadge(c);
                const pr = priority(c);
                return (
                  <TableRow key={c.id} className="group cursor-pointer">
                    <TableCell className="py-2.5">
                      <Link href={`${hrefBase}/${c.id}`} className="block size-11 overflow-hidden rounded-md bg-muted" tabIndex={-1} aria-hidden>
                        <DogPhoto src={c.photos?.[0] ?? ""} alt="" seed={c.id} className="h-full w-full" />
                      </Link>
                    </TableCell>
                    <TableCell className="relative max-w-0 py-2.5">
                      {/* The whole row is the target; the link sits on the
                          title so the accessible name is the case, not a
                          bare photograph. */}
                      <Link href={`${hrefBase}/${c.id}`} className="block outline-none after:absolute after:inset-0 group-focus-within:underline">
                        <span className="block truncate font-medium leading-tight">
                          {speciesLabel(c.species)} · <span className="capitalize text-muted-foreground">{c.category}</span>
                        </span>
                        <span className="block truncate text-[12.5px] text-muted-foreground">{c.title}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-0 truncate text-[13px] text-muted-foreground">{c.zone || "—"}</TableCell>
                    <TableCell className={cn("text-[11.5px] font-bold tracking-wide", pr.cls)}>{pr.label}</TableCell>
                    <TableCell><Badge className={cn("px-2 py-0.5 text-[11.5px]", st.cls)}>{st.label}</Badge></TableCell>
                    <TableCell className={cn("max-w-0 truncate text-[13px]", c.assignee_name ? "" : "text-muted-foreground")}>
                      {c.assignee_name ?? "Unassigned"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Phone: one stacked row per case. */}
          <ul className="md:hidden">
            {rows.map((c) => {
              const st = statusBadge(c);
              const pr = priority(c);
              return (
                <li key={c.id} className="border-b last:border-0">
                  <Link href={`${hrefBase}/${c.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                    <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                      <DogPhoto src={c.photos?.[0] ?? ""} alt="" seed={c.id} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium leading-tight">
                        {speciesLabel(c.species)} · <span className="capitalize text-muted-foreground">{c.category}</span>
                      </p>
                      <p className="truncate text-[12px] text-muted-foreground">{c.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={cn("text-[11px] font-bold", pr.cls)}>{pr.label}</span>
                        <Badge className={cn("px-2 py-0.5 text-[11px]", st.cls)}>{st.label}</Badge>
                        {c.zone && <span className="truncate text-[11.5px] text-muted-foreground">{c.zone}</span>}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-3 text-right text-[12px] tabular-nums text-bark-400">{rows.length} {rows.length === 1 ? "case" : "cases"}</p>
    </div>
  );
}
