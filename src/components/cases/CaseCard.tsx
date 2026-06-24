import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import {
  CASE_CATEGORY_META,
  type Case,
} from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import {
  CaseStatusBadge,
  SeverityBadge,
  OwnershipBadge,
  OverdueBadge,
} from "./CaseBadges";

export function CaseCard({ c }: { c: Case }) {
  const cat = CASE_CATEGORY_META[c.category];
  return (
    <Link
      href={`/cases/${c.id}`}
      className="card block p-4 transition-colors hover:border-black/10 dark:hover:border-white/10"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bark-900/[0.05] text-base dark:bg-white/[0.06]">
          {cat.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold tracking-tight">{c.title}</h3>
            <CaseStatusBadge status={c.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-bark-500">
            {c.zone && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {c.zone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {timeAgo(c.last_activity_at)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <OwnershipBadge name={c.assignee_name} />
            <SeverityBadge severity={c.severity} />
            <OverdueBadge c={c} />
          </div>
        </div>
      </div>
    </Link>
  );
}
