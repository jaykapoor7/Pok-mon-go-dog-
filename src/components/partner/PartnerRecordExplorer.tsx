"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { getPartnerRecordRows, type PartnerRecordKind, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import { formatDate } from "@/lib/utils";

const FILTERS: Array<{ id: "all" | PartnerRecordKind | "vaccination" | "sterilisation" | "treatment"; label: string }> = [
  { id: "all", label: "All records" },
  { id: "rescue", label: "Rescues" },
  { id: "care", label: "All care" },
  { id: "vaccination", label: "Rabies / vaccination" },
  { id: "sterilisation", label: "ABC / sterilisation" },
  { id: "treatment", label: "Treatment" },
  { id: "follow_up", label: "Follow-ups" },
  { id: "outcome", label: "Outcomes" },
];

function matchesFilter(row: PartnerRecordRow, filter: string) {
  if (filter === "all") return true;
  if (["vaccination", "sterilisation", "treatment"].includes(filter)) {
    return row.kind === "care" && row.subtype.toLowerCase().includes(filter);
  }
  return row.kind === filter;
}

function destination(row: PartnerRecordRow) {
  if (row.caseId) return `/partner/cases/${row.caseId}`;
  if (row.animalId) return `/partner/animals/${row.animalId}`;
  return "/partner/records";
}

export function PartnerRecordExplorer({ initialFilter = "all" }: { initialFilter?: string }) {
  const [rows, setRows] = useState<PartnerRecordRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(initialFilter);

  useEffect(() => {
    getPartnerRecordRows().then(setRows).catch(() => setRows([]));
  }, []);

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!matchesFilter(row, filter)) return false;
      if (!q) return true;
      return [row.title, row.detail, row.locality, row.animalLabel, row.subtype, row.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [rows, filter, query]);

  return <section>
    <div className="flex flex-col gap-3 border-y border-black/[.08] py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[.1]">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filter === item.id ? "border-paw-500 bg-paw-50 text-paw-700" : "border-black/[.08] text-bark-600 hover:border-black/20 dark:border-white/[.1] dark:text-bark-300"}`}>{item.label}</button>)}
      </div>
      <label className="flex min-w-64 items-center gap-2 rounded-md border border-black/[.1] bg-white px-3 dark:border-white/[.1] dark:bg-bark-950">
        <Search size={15} className="text-bark-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search animal, locality, condition…" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
    </div>

    <div className="flex items-center justify-between py-4 text-xs text-bark-500">
      <span>{rows === null ? "Loading records…" : `${visible.length.toLocaleString()} matching records`}</span>
      {query && <button type="button" onClick={() => setQuery("")} className="font-semibold text-paw-600">Clear search</button>}
    </div>

    {rows !== null && visible.length === 0 ? <p className="border-t border-black/[.08] py-8 text-sm text-bark-500">No records match this view.</p> : <div className="border-t border-black/[.08] dark:border-white/[.1]">
      {visible.slice(0, 400).map((row) => <Link key={row.id} href={destination(row)} className="grid gap-2 border-b border-black/[.07] py-4 transition hover:bg-black/[.02] dark:border-white/[.08] dark:hover:bg-white/[.03] sm:grid-cols-[110px_150px_minmax(0,1fr)_160px_18px] sm:items-center">
        <time className="text-xs tabular-nums text-bark-400">{formatDate(row.date)}</time>
        <span className="text-xs font-semibold capitalize text-paw-700">{row.subtype.replace(/_/g, " ")}</span>
        <span className="min-w-0"><b className="block truncate text-sm text-bark-900 dark:text-bark-50">{row.animalLabel || row.title}</b><small className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-bark-500">{row.detail || row.title}</small></span>
        <span className="truncate text-xs text-bark-500">{row.locality || "Locality not recorded"}</span>
        <ArrowUpRight size={15} className="hidden text-paw-600 sm:block" />
      </Link>)}
      {visible.length > 400 && <p className="py-4 text-xs text-bark-500">Showing the first 400 matches. Narrow the search to find a specific record.</p>}
    </div>}
  </section>;
}
