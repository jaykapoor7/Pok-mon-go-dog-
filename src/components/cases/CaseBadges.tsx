import { User, AlertTriangle, Clock } from "lucide-react";
import {
  CASE_STATUS_META,
  CASE_SEVERITY_META,
  isOverdue,
  type Case,
  type CaseStatus,
  type CaseSeverity,
} from "@/lib/types";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const m = CASE_STATUS_META[status];
  return (
    <span
      className="chip font-semibold text-white"
      style={{ backgroundColor: m.color }}
    >
      {m.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: CaseSeverity }) {
  const m = CASE_SEVERITY_META[severity];
  if (severity === "low" || severity === "normal") return null;
  return (
    <span
      className="chip font-semibold"
      style={{ backgroundColor: `${m.color}1a`, color: m.color }}
    >
      <AlertTriangle className="h-3 w-3" />
      {m.label}
    </span>
  );
}

export function OwnershipBadge({ name }: { name: string | null }) {
  if (!name) {
    return (
      <span className="chip bg-amber-500/15 font-semibold text-amber-600 dark:text-amber-400">
        <User className="h-3 w-3" /> Unassigned
      </span>
    );
  }
  return (
    <span className="chip bg-bark-900/[0.05] font-semibold text-bark-700 dark:bg-white/[0.06] dark:text-bark-200">
      <User className="h-3 w-3" /> {name}
    </span>
  );
}

export function OverdueBadge({ c }: { c: Case }) {
  if (!isOverdue(c)) return null;
  return (
    <span className="chip bg-status-injured/15 font-semibold text-status-injured">
      <Clock className="h-3 w-3" /> Overdue
    </span>
  );
}
