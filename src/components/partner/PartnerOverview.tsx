"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import { MapCanvas } from "@/components/map/MapCanvas";
import { TasksSection } from "@/components/partner/TasksSection";
import { isOverdue, speciesLabel, type Case, type CaseStatus, type Dog, type NGO } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const STATUS_LABEL: Record<CaseStatus, string> = {
  unverified: "New", assigned: "Assigned", in_progress: "In progress", resolved: "Resolved", closed: "Closed",
};
function statusCls(s: CaseStatus) {
  return s === "resolved" ? "bg-status-vaccinated/15 text-status-vaccinated"
    : s === "in_progress" ? "bg-paw-500/15 text-paw-700 dark:text-paw-300"
    : s === "assigned" ? "bg-status-hungry/15 text-status-hungry"
    : "bg-bark-100 text-bark-600 dark:bg-bark-800 dark:text-bark-300";
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function PartnerOverview({ cases }: { cases: Case[] }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<NGO | null>(null);
  useEffect(() => { getMyOrg().then(setOrg).catch(() => {}); }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const location = org ? [org.city, org.state].filter(Boolean).join(", ") || org.area : "";

  const m = useMemo(() => {
    const now = Date.now();
    const open = cases.filter(isOpen);
    return {
      active: open.length,
      urgent: open.filter((c) => c.severity === "critical" || c.severity === "high" || isOverdue(c)).length,
      resolvedWeek: cases.filter((c) => c.status === "resolved" && c.resolved_at && +new Date(c.resolved_at) > now - 7 * 86_400_000).length,
    };
  }, [cases]);

  const activity = useMemo(() => [...cases].sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)).slice(0, 6), [cases]);

  const markers: Dog[] = useMemo(() => cases.filter((c) => c.lat != null && c.lng != null).slice(0, 400).map((c) => ({
    id: c.id, name: c.title, zone: c.zone ?? "", lat: c.lat as number, lng: c.lng as number,
    status: isOverdue(c) || c.severity === "critical" || c.severity === "high" ? "injured" : c.status === "resolved" ? "sterilised" : "seen",
    cover_photo: c.photos?.[0] ?? "", photos: [], size: "medium", color: "", is_friendly: true,
    needs_help: isOverdue(c) || c.severity === "critical" || c.severity === "high", sterilised: c.status === "resolved",
    vaccinated: false, trust_score: 50, sightings_count: 1, feed_count: 0, first_seen: c.created_at, last_seen: c.last_activity_at, last_fed_at: null, community_notes: [],
  })), [cases]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-0.5 text-[14px] text-bark-500">{org?.name ?? "Partner workspace"}{location ? ` · ${location}` : ""}</p>
      </header>

      {/* metric cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MetricCard value={m.active} label="Active cases" />
        <MetricCard value={m.urgent} label="Urgent cases" tone={m.urgent ? "text-status-injured" : undefined} />
        <MetricCard value={m.resolvedWeek} label="Resolved this week" tone={m.resolvedWeek ? "text-status-vaccinated" : undefined} />
      </div>

      <TasksSection compact />

      {/* case activity */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Case activity</h2>
          <Link href="/partner/cases" className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">All cases <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        {activity.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No cases yet.</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {activity.map((c) => (
              <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                <Link href={`/partner/cases/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", isOverdue(c) ? "bg-status-injured" : c.status === "resolved" ? "bg-status-vaccinated" : c.status === "in_progress" ? "bg-paw-500" : "bg-bark-300")} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-bark-900 dark:text-bark-50">
                    {speciesLabel(c.species)} · <span className="capitalize text-bark-500">{c.category}</span>
                  </span>
                  <span className="hidden shrink-0 truncate text-[13px] text-bark-400 sm:block">{c.zone || "—"}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", statusCls(c.status))}>{STATUS_LABEL[c.status]}</span>
                  <span className="hidden shrink-0 text-[12px] tabular-nums text-bark-400 sm:block">{timeAgo(c.last_activity_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* live map */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">Live map</h2>
          <Link href="/partner/map" className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">Open workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="h-80 overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          <MapCanvas dogs={markers} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-black/[0.08] bg-white px-4 py-4 dark:border-white/[0.1] dark:bg-bark-900">
      <div className={cn("text-2xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50 sm:text-3xl", tone)}>{value}</div>
      <div className="mt-1 text-[12px] text-bark-500 sm:text-[13px]">{label}</div>
    </div>
  );
}
