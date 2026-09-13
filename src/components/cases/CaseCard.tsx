import Link from "next/link";
import { MapPin, Clock, Ambulance, Scissors, LifeBuoy, Syringe, ClipboardList } from "lucide-react";
import { type Case } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import {
  CaseStatusBadge,
  SeverityBadge,
  OwnershipBadge,
  OverdueBadge,
  VerifiedBadge,
} from "./CaseBadges";

/* A drawn icon rather than an emoji. Each one names the thing the case is
   about, which is what an icon is for; an emoji at this size renders in
   whichever cartoon set the reader's device ships and reads as a consumer
   app rather than a case file. */
const CASE_ICON = {
  injury: Ambulance,
  sterilisation: Scissors,
  rescue: LifeBuoy,
  vaccination: Syringe,
  other: ClipboardList,
} as const;

export function CaseCard({ c }: { c: Case }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="card card-interactive block p-4 hover:border-black/10 dark:hover:border-white/10"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-bark-900/[0.05] text-bark-500 dark:bg-white/[0.06]">
          {(() => {
            const Icon = CASE_ICON[c.category as keyof typeof CASE_ICON] ?? ClipboardList;
            return <Icon size={17} aria-hidden />;
          })()}
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
            <VerifiedBadge c={c} />
            <OwnershipBadge name={c.assignee_name} />
            <SeverityBadge severity={c.severity} />
            <OverdueBadge c={c} />
          </div>
        </div>
      </div>
    </Link>
  );
}
