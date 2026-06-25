import Link from "next/link";
import {
  AlertTriangle,
  Flame,
  UserPlus,
  Clock,
  Activity,
  ChevronRight,
} from "lucide-react";
import type { Case } from "@/lib/types";
import { caseQueues, workload, caseAlerts } from "@/lib/case-insights";
import { isOverdue } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { CaseStatusBadge, OwnershipBadge } from "./CaseBadges";

export function CommandCenter({ cases }: { cases: Case[] }) {
  const q = caseQueues(cases);
  const alerts = caseAlerts(cases);
  const team = workload(cases);

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold tracking-tightest sm:text-2xl">
          What needs attention today
        </h2>
        <p className="text-sm text-bark-500">
          Your operational command center.
        </p>
      </div>

      {/* Phase 3: alert strip */}
      {alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href="/cases"
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                a.tone === "critical"
                  ? "border-status-injured/20 bg-status-injured/[0.07] hover:bg-status-injured/10"
                  : "border-status-hungry/20 bg-status-hungry/[0.07] hover:bg-status-hungry/10"
              }`}
            >
              <span
                className={
                  a.tone === "critical" ? "text-status-injured" : "text-status-hungry"
                }
              >
                {a.tone === "critical" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Flame className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="truncate text-xs text-bark-500">{a.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-bark-400" />
            </Link>
          ))}
        </div>
      )}

      {/* Phase 2: queues */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Queue
          title="Unassigned"
          icon={<UserPlus className="h-4 w-4" />}
          tone="#4E7C8A"
          cases={q.unassigned}
        />
        <Queue
          title="Overdue"
          icon={<Clock className="h-4 w-4" />}
          tone="#C0492E"
          cases={q.overdue}
        />
        <Queue
          title="Critical"
          icon={<Flame className="h-4 w-4" />}
          tone="#C0492E"
          cases={q.critical}
        />
        <Queue
          title="Recently updated"
          icon={<Activity className="h-4 w-4" />}
          tone="#3E8473"
          cases={q.recent}
        />
      </div>

      {/* Phase 2: workload */}
      <div className="card mt-4 p-5">
        <h3 className="mb-3 font-display font-bold tracking-tight">
          Active workload
        </h3>
        {team.length === 0 ? (
          <p className="text-sm text-bark-400">No cases assigned yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {team.map((w) => (
              <li key={w.name} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bark-900/[0.05] text-xs font-bold dark:bg-white/[0.06]">
                  {w.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{w.name}</p>
                  <p className="text-xs text-bark-400">
                    {w.active} active · {w.resolved30d} resolved (30d)
                  </p>
                </div>
                <span className="chip bg-bark-900/[0.05] font-semibold text-bark-700 dark:bg-white/[0.06] dark:text-bark-200">
                  {w.active}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Queue({
  title,
  icon,
  tone,
  cases,
}: {
  title: string;
  icon: React.ReactNode;
  tone: string;
  cases: Case[];
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span style={{ color: tone }}>{icon}</span>
          {title}
        </span>
        <span
          className="chip font-bold text-white"
          style={{ backgroundColor: tone }}
        >
          {cases.length}
        </span>
      </div>
      {cases.length === 0 ? (
        <p className="py-3 text-center text-xs text-bark-400">All clear.</p>
      ) : (
        <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {cases.slice(0, 4).map((c) => (
            <li key={c.id}>
              <Link
                href={`/cases/${c.id}`}
                className="flex items-center gap-2 py-2.5 transition-opacity hover:opacity-70"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-bark-400">
                    {c.zone ?? "—"} · {timeAgo(c.last_activity_at)}
                    {isOverdue(c) && (
                      <span className="ml-1 font-semibold text-status-injured">overdue</span>
                    )}
                  </p>
                </div>
                {!c.assignee_id ? (
                  <OwnershipBadge name={null} />
                ) : (
                  <CaseStatusBadge status={c.status} />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {cases.length > 4 && (
        <Link
          href="/cases"
          className="mt-2 block text-center text-xs font-semibold text-paw-600 hover:underline"
        >
          View all {cases.length}
        </Link>
      )}
    </div>
  );
}
