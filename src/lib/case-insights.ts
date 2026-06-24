// ─────────────────────────────────────────────────────────────
// Pure, rule-based insights over a list of cases. Shared by the NGO command
// dashboard (Phase 2), the alert strip (Phase 3) and reporting (Phase 4).
// No I/O — deterministic functions over Case[].
// ─────────────────────────────────────────────────────────────

import { isOverdue, OVERDUE_DAYS, type Case, type CaseResolution } from "./types";

export const isOpen = (c: Case) =>
  c.status !== "resolved" && c.status !== "closed";

const ageDays = (iso: string) => (Date.now() - +new Date(iso)) / 86_400_000;

// ── Phase 2: "what needs attention today" queues ─────────────
export interface CaseQueues {
  unassigned: Case[];
  overdue: Case[];
  critical: Case[];
  recent: Case[];
}

export function caseQueues(cases: Case[]): CaseQueues {
  const open = cases.filter(isOpen);
  return {
    unassigned: open
      .filter((c) => !c.assignee_id)
      .sort((a, b) => severityRank(b) - severityRank(a)),
    overdue: cases
      .filter(isOverdue)
      .sort((a, b) => +new Date(a.last_activity_at) - +new Date(b.last_activity_at)),
    critical: open
      .filter((c) => c.severity === "critical" || c.severity === "high")
      .sort((a, b) => severityRank(b) - severityRank(a)),
    recent: [...cases]
      .sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at))
      .slice(0, 8),
  };
}

function severityRank(c: Case) {
  return { low: 0, normal: 1, high: 2, critical: 3 }[c.severity];
}

// ── Phase 2: workload per volunteer ──────────────────────────
export interface Workload {
  name: string;
  active: number;
  inProgress: number;
  resolved30d: number;
}

export function workload(cases: Case[]): Workload[] {
  const map = new Map<string, Workload>();
  for (const c of cases) {
    if (!c.assignee_name) continue;
    const w =
      map.get(c.assignee_name) ??
      { name: c.assignee_name, active: 0, inProgress: 0, resolved30d: 0 };
    if (isOpen(c)) w.active += 1;
    if (c.status === "in_progress") w.inProgress += 1;
    if (
      (c.status === "resolved" || c.status === "closed") &&
      ageDays(c.updated_at) <= 30
    )
      w.resolved30d += 1;
    map.set(c.assignee_name, w);
  }
  return Array.from(map.values()).sort((a, b) => b.active - a.active);
}

// ── Phase 3: rule-based alerts ───────────────────────────────
export interface CaseAlert {
  id: string;
  title: string;
  detail: string;
  tone: "critical" | "warning";
  count: number;
}

export function caseAlerts(cases: Case[]): CaseAlert[] {
  const open = cases.filter(isOpen);
  const alerts: CaseAlert[] = [];

  const urgent = open.filter(
    (c) => (c.severity === "critical" || c.severity === "high") && !c.assignee_id
  );
  if (urgent.length)
    alerts.push({
      id: "urgent",
      title: `${urgent.length} urgent case${urgent.length > 1 ? "s" : ""} unassigned`,
      detail: "High-severity cases with no owner — assign now.",
      tone: "critical",
      count: urgent.length,
    });

  const overdue = cases.filter(isOverdue);
  if (overdue.length)
    alerts.push({
      id: "overdue",
      title: `${overdue.length} overdue case${overdue.length > 1 ? "s" : ""}`,
      detail: `No update in ${OVERDUE_DAYS}+ days.`,
      tone: "warning",
      count: overdue.length,
    });

  // Cluster warning: 3+ open cases in the same area.
  const byZone = new Map<string, number>();
  for (const c of open) if (c.zone) byZone.set(c.zone, (byZone.get(c.zone) ?? 0) + 1);
  const cluster = [...byZone.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])[0];
  if (cluster)
    alerts.push({
      id: "cluster",
      title: `Cluster in ${cluster[0]}`,
      detail: `${cluster[1]} open cases in one area — consider a focused drive.`,
      tone: "warning",
      count: cluster[1],
    });

  // Escalation: sterilisation cases open longer than 14 days.
  const escal = open.filter(
    (c) => c.category === "sterilisation" && ageDays(c.created_at) > 14
  );
  if (escal.length)
    alerts.push({
      id: "escalation",
      title: `${escal.length} sterilisation case${escal.length > 1 ? "s" : ""} pending 14+ days`,
      detail: "Long-pending — escalate scheduling.",
      tone: "warning",
      count: escal.length,
    });

  return alerts;
}

// ── Phase 4: reporting summary ───────────────────────────────
export interface CaseSummary {
  created: number;
  active: number;
  resolved: number;
  closed: number;
  unassigned: number;
  resolutions: Record<CaseResolution, number>;
  byCategory: { category: string; count: number }[];
}

export function caseSummary(cases: Case[]): CaseSummary {
  const resolutions: Record<CaseResolution, number> = {
    sterilized: 0,
    rescued: 0,
    treated: 0,
  };
  const cat = new Map<string, number>();
  let active = 0,
    resolved = 0,
    closed = 0,
    unassigned = 0;

  for (const c of cases) {
    if (isOpen(c)) active += 1;
    if (c.status === "resolved") resolved += 1;
    if (c.status === "closed") closed += 1;
    if (isOpen(c) && !c.assignee_id) unassigned += 1;
    if (c.resolution) resolutions[c.resolution] += 1;
    cat.set(c.category, (cat.get(c.category) ?? 0) + 1);
  }

  return {
    created: cases.length,
    active,
    resolved,
    closed,
    unassigned,
    resolutions,
    byCategory: [...cat.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
  };
}
