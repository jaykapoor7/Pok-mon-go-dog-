"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, ClipboardList, PawPrint, HeartHandshake, ClipboardCheck, Activity } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getMyOrg } from "@/lib/actions";
import { MapCanvas } from "@/components/map/MapCanvas";
import { TasksSection } from "@/components/partner/TasksSection";
import { isOverdue, speciesLabel, type Case, type CaseStatus, type Dog, type NGO } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";
const isUrgent = (c: Case) => isOpen(c) && (c.severity === "critical" || c.severity === "high" || isOverdue(c));
const STATUS_LABEL: Record<CaseStatus, string> = { unverified: "New", assigned: "Assigned", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
const dotFor = (c: Case) => isOverdue(c) ? "bg-status-injured" : c.status === "resolved" ? "bg-status-vaccinated" : c.status === "in_progress" ? "bg-paw-500" : c.status === "assigned" ? "bg-status-hungry" : "bg-bark-300";

function greeting() { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; }

export function PartnerOverview({ cases }: { cases: Case[] }) {
  const { user } = useAuth();
  const [org, setOrg] = useState<NGO | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    getMyOrg().then(setOrg).catch(() => {});
    setDateLabel(new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  }, []);

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? null;
  const location = org ? [org.city, org.state].filter(Boolean).join(", ") || org.area : "";

  const m = useMemo(() => {
    const now = Date.now();
    const open = cases.filter(isOpen);
    const resolved = cases.filter((c) => c.status === "resolved");
    return {
      active: open.length,
      urgent: open.filter((c) => c.severity === "critical" || c.severity === "high" || isOverdue(c)).length,
      followDue: open.filter((c) => c.follow_up_at && +new Date(c.follow_up_at) <= now + 3 * 86_400_000).length,
      resolvedWeek: resolved.filter((c) => c.resolved_at && +new Date(c.resolved_at) > now - 7 * 86_400_000).length,
      rate: cases.length ? Math.round((resolved.length / cases.length) * 100) : 0,
    };
  }, [cases]);

  const attention = useMemo(() => cases.filter(isUrgent).sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)).slice(0, 3), [cases]);
  const activity = useMemo(() => [...cases].sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at)).slice(0, 5), [cases]);

  const weeks = useMemo(() => {
    const now = Date.now();
    return Array.from({ length: 12 }, (_, i) => {
      const end = now - i * 7 * 86_400_000, start = end - 7 * 86_400_000;
      return cases.filter((c) => { const t = +new Date(c.created_at); return t > start && t <= end; }).length;
    }).reverse();
  }, [cases]);
  const weekMax = Math.max(1, ...weeks);

  const markers: Dog[] = useMemo(() => cases.filter((c) => c.lat != null && c.lng != null).slice(0, 400).map((c) => ({
    id: c.id, name: c.title, zone: c.zone ?? "", lat: c.lat as number, lng: c.lng as number,
    status: isUrgent(c) ? "injured" : c.status === "resolved" ? "sterilised" : "seen", cover_photo: c.photos?.[0] ?? "", photos: [],
    size: "medium", color: "", is_friendly: true, needs_help: isUrgent(c), sterilised: c.status === "resolved", vaccinated: false,
    trust_score: 50, sightings_count: 1, feed_count: 0, first_seen: c.created_at, last_seen: c.last_activity_at, last_fed_at: null, community_notes: [],
  })), [cases]);

  return (
    <div>
      {/* Page title */}
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">{dateLabel || " "}</div>
          <h1 className="text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50 sm:text-3xl">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1.5 text-[14px] text-bark-500">{org?.name ?? "Partner workspace"}{location ? ` · ${location}` : ""} — here&apos;s what needs attention today.</p>
        </div>
        <Link href="/cases/new" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-paw-600"><Plus className="h-4 w-4" /> New case</Link>
      </div>

      {/* Stat dividers (not cards) */}
      <div className="grid grid-cols-2 gap-y-6 border-y border-black/[0.08] py-6 dark:border-white/[0.1] sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Active cases" value={m.active} detail="open right now" />
        <Stat label="Urgent cases" value={m.urgent} detail="need a decision" tone={m.urgent ? "text-status-injured" : undefined} />
        <Stat label="Follow-ups due" value={m.followDue} detail="next 3 days" tone={m.followDue ? "text-status-hungry" : undefined} />
        <Stat label="Resolved this week" value={m.resolvedWeek} detail="last 7 days" />
        <Stat label="Resolution rate" value={`${m.rate}%`} detail="all-time" tone="text-paw-600" />
      </div>

      {/* Operational focus + Response health */}
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.45fr_1fr]">
        <section>
          <SectionHead title="Operational focus" sub="Cases that need a decision or dispatch." href="/partner/cases" cta="View all cases" />
          {attention.length === 0 ? <Empty>Nothing urgent right now.</Empty> : (
            <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
              {attention.map((c) => <CaseRow key={c.id} c={c} />)}
            </div>
          )}
        </section>
        <section>
          <SectionHead title="Response health" sub="New cases logged over time." />
          <div className="rounded-lg border border-black/[0.08] p-5 dark:border-white/[0.1]">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">{cases.length}</div>
                <div className="mt-1 text-[13px] text-bark-500">Total cases logged</div>
              </div>
              <div className="text-right text-[13px] font-medium text-paw-600">{m.rate}%<div className="text-[11px] font-normal text-bark-400">resolved</div></div>
            </div>
            <div className="mt-6 flex h-24 items-end gap-1.5">
              {weeks.map((w, i) => <div key={i} className={cn("flex-1 rounded-t-sm", i >= 9 ? "bg-paw-500" : "bg-paw-500/25")} style={{ height: `${Math.max(3, (w / weekMax) * 100)}%` }} title={`${w}`} />)}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-bark-400"><span>12 wks ago</span><span>now</span></div>
          </div>
        </section>
      </div>

      {/* Tasks */}
      <section className="mt-10">
        <TasksSection compact />
      </section>

      {/* Recent reports */}
      <section className="mt-10">
        <SectionHead title="Recent reports" sub="The latest activity across your cases." href="/partner/cases" cta="Open case queue" />
        {activity.length === 0 ? <Empty>No cases yet.</Empty> : (
          <div className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {activity.map((c) => <CaseRow key={c.id} c={c} />)}
          </div>
        )}
      </section>

      {/* Live map */}
      <section className="mt-10">
        <SectionHead title="Live map" sub="Where the work is happening." href="/partner/map" cta="Open workspace" />
        <div className="h-80 overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          <MapCanvas dogs={markers} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, detail, tone }: { label: string; value: number | string; detail: string; tone?: string }) {
  return (
    <div className="border-l border-black/[0.08] pl-4 first:border-l-0 first:pl-0 dark:border-white/[0.1]">
      <div className="mb-2 text-[12px] text-bark-500">{label}</div>
      <div className={cn("text-3xl font-semibold tracking-tight text-bark-900 dark:text-bark-50", tone)}>{value}</div>
      <div className="mt-1 text-[12px] text-bark-400">{detail}</div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-2 rounded-md border border-black/[0.1] px-3 py-2 text-[13px] font-medium text-bark-700 transition-colors hover:border-paw-400 hover:text-paw-700 dark:border-white/[0.12] dark:text-bark-200">
      <Icon className="h-4 w-4 text-bark-400" /> {label}
    </Link>
  );
}

function SectionHead({ title, sub, href, cta }: { title: string; sub: string; href?: string; cta?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-bark-900 dark:text-bark-50">{title}</h2>
        <p className="mt-0.5 text-[13px] text-bark-500">{sub}</p>
      </div>
      {href && cta && <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">{cta} <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
    </div>
  );
}

function CaseRow({ c }: { c: Case }) {
  return (
    <Link href={`/partner/cases/${c.id}`} className="flex items-center gap-4 border-b border-black/[0.06] p-3.5 last:border-0 hover:bg-black/[0.02] dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-bark-100 dark:bg-bark-800">
        {c.photos?.[0] ? <img src={c.photos[0]} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-bark-300"><PawPrint className="h-5 w-5" /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{speciesLabel(c.species)} · <span className="capitalize text-bark-500">{c.category}</span></p>
        <p className="truncate text-[12px] text-bark-400">{c.zone || "—"} · {timeAgo(c.last_activity_at)}</p>
      </div>
      <span className="hidden shrink-0 items-center gap-1.5 text-[12px] text-bark-500 sm:inline-flex">
        <span className={cn("h-1.5 w-1.5 rounded-full", dotFor(c))} /> {STATUS_LABEL[c.status]}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-bark-300" />
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">{children}</p>;
}
