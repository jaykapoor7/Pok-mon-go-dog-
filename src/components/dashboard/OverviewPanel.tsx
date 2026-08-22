"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Circle, CalendarClock, Activity } from "lucide-react";
import { isOverdue, speciesLabel, type Case, type Dog, type Sighting } from "@/lib/types";
import { timeAgo, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const isOpen = (c: Case) => c.status !== "resolved" && c.status !== "closed";

export function OverviewPanel({
  cases,
  dogs,
  sightings,
}: {
  cases: Case[];
  dogs: Dog[];
  sightings: Sighting[];
}) {
  const m = useMemo(() => {
    const open = cases.filter(isOpen);
    const now = Date.now();
    const soon = now + 3 * 86_400_000;
    const followDue = open.filter((c) => c.follow_up_at && +new Date(c.follow_up_at) <= soon);
    const resolved30 = cases.filter(
      (c) => c.status === "resolved" && c.resolved_at && +new Date(c.resolved_at) > now - 30 * 86_400_000
    );
    return {
      open: open.length,
      urgent: open.filter((c) => c.severity === "critical" || c.severity === "high").length,
      followDue: followDue.length,
      resolved30: resolved30.length,
      unassigned: open.filter((c) => !c.assignee_id).length,
    };
  }, [cases]);

  const attention = useMemo(() => {
    const rank = (c: Case) =>
      (isOverdue(c) ? 0 : 100) +
      (c.severity === "critical" ? 0 : c.severity === "high" ? 1 : 5) +
      (c.assignee_id ? 2 : 0);
    return cases.filter(isOpen).sort((a, b) => rank(a) - rank(b)).slice(0, 6);
  }, [cases]);

  const followUps = useMemo(
    () =>
      cases
        .filter((c) => isOpen(c) && c.follow_up_at)
        .sort((a, b) => +new Date(a.follow_up_at!) - +new Date(b.follow_up_at!))
        .slice(0, 5),
    [cases]
  );

  const activity = useMemo(() => sightings.slice(0, 6), [sightings]);

  return (
    <div className="space-y-8">
      {/* compact metric row — one bordered strip, not eight cards */}
      <div className="grid grid-cols-2 divide-x divide-y divide-black/[0.07] overflow-hidden rounded-lg border border-black/[0.08] sm:grid-cols-4 sm:divide-y-0 dark:divide-white/[0.08] dark:border-white/[0.1]">
        <Metric label="Open cases" value={m.open} />
        <Metric label="Urgent" value={m.urgent} tone={m.urgent ? "text-status-injured" : undefined} />
        <Metric label="Follow-ups due" value={m.followDue} tone={m.followDue ? "text-status-hungry" : undefined} />
        <Metric label="Resolved · 30d" value={m.resolved30} tone={m.resolved30 ? "text-status-vaccinated" : undefined} />
      </div>

      {/* Needs attention */}
      <Section title="Needs attention" href="/cases" cta="All cases">
        {attention.length === 0 ? (
          <Empty>Nothing urgent. Nice.</Empty>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {attention.map((c) => (
              <CaseRow key={c.id} c={c} />
            ))}
          </ul>
        )}
      </Section>

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <Section title="Follow-ups">
          <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
            {followUps.map((c) => {
              const overdue = +new Date(c.follow_up_at!) < Date.now();
              return (
                <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                  <Link href={`/cases/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                    <CalendarClock className={cn("h-4 w-4 shrink-0", overdue ? "text-status-injured" : "text-status-hungry")} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-bark-800 dark:text-bark-100">{c.title}</span>
                    <span className={cn("shrink-0 text-[12px] tabular-nums", overdue ? "text-status-injured" : "text-bark-400")}>
                      {formatDate(c.follow_up_at!)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Recent activity */}
      <Section title="Recent activity" href="/feed" cta="Feed">
        {activity.length === 0 ? (
          <Empty>No recent reports.</Empty>
        ) : (
          <ul className="space-y-0">
            {activity.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-black/[0.05] py-2.5 last:border-0 dark:border-white/[0.06]">
                <Activity className="h-3.5 w-3.5 shrink-0 text-bark-300" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-bark-600 dark:text-bark-300">
                  New report{s.zone ? ` · ${s.zone}` : ""}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-bark-400">{timeAgo(s.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bg-white px-4 py-3.5 dark:bg-transparent">
      <div className={cn("text-2xl font-semibold tabular-nums tracking-tight text-bark-900 dark:text-bark-50", tone)}>
        {value}
      </div>
      <div className="mt-0.5 text-[12px] text-bark-500">{label}</div>
    </div>
  );
}

function CaseRow({ c }: { c: Case }) {
  const tone = isOverdue(c)
    ? "text-status-injured"
    : c.severity === "critical" || c.severity === "high"
    ? "text-status-hungry"
    : "text-bark-300";
  return (
    <li className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
      <Link href={`/cases/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
        <Circle className={cn("h-2.5 w-2.5 shrink-0 fill-current", tone)} strokeWidth={0} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
          <p className="truncate text-[12px] text-bark-400">
            {speciesLabel(c.species)}{c.zone ? ` · ${c.zone}` : ""} · {c.assignee_name ?? "Unassigned"}
          </p>
        </div>
        <span className="shrink-0 text-[12px] tabular-nums text-bark-400">{timeAgo(c.last_activity_at)}</span>
      </Link>
    </li>
  );
}

function Section({ title, href, cta, children }: { title: string; href?: string; cta?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-bark-400">{title}</h2>
        {href && cta && (
          <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-medium text-paw-600 hover:underline">
            {cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-black/[0.1] py-8 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">{children}</p>;
}
