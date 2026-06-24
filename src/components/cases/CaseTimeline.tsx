import {
  FilePlus2,
  UserCheck,
  ArrowRightLeft,
  MessageSquare,
  RotateCcw,
  Users,
} from "lucide-react";
import { CASE_STATUS_META, type CaseUpdate, type CaseUpdateType } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const ICONS: Record<CaseUpdateType, typeof FilePlus2> = {
  created: FilePlus2,
  claimed: UserCheck,
  assigned: Users,
  status_changed: ArrowRightLeft,
  note: MessageSquare,
  reopened: RotateCcw,
};

function describe(u: CaseUpdate): string {
  switch (u.type) {
    case "created":
      return "opened the case";
    case "claimed":
      return "claimed the case";
    case "assigned":
      return u.note ?? "reassigned the case";
    case "reopened":
      return "reopened the case";
    case "status_changed":
      return `moved ${u.from_status ? CASE_STATUS_META[u.from_status].label : "?"} → ${
        u.to_status ? CASE_STATUS_META[u.to_status].label : "?"
      }`;
    case "note":
      return "added a note";
  }
}

export function CaseTimeline({ updates }: { updates: CaseUpdate[] }) {
  if (updates.length === 0) {
    return <p className="text-sm text-bark-400">No activity yet.</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-black/10 pl-5 dark:border-white/10">
      {updates.map((u) => {
        const Icon = ICONS[u.type];
        return (
          <li key={u.id} className="relative">
            <span className="absolute -left-[27px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-black/10 dark:bg-bark-900 dark:ring-white/10">
              <Icon className="h-3 w-3 text-bark-500" />
            </span>
            <p className="text-sm">
              <span className="font-semibold">{u.actor_name ?? "Someone"}</span>{" "}
              <span className="text-bark-600 dark:text-bark-300">{describe(u)}</span>
            </p>
            {u.type === "note" && u.note && (
              <p className="mt-0.5 rounded-xl bg-bark-900/[0.04] px-3 py-2 text-sm text-bark-700 dark:bg-white/[0.05] dark:text-bark-200">
                {u.note}
              </p>
            )}
            {u.type !== "note" && u.note && u.type !== "created" && u.type !== "claimed" && (
              <p className="mt-0.5 text-xs text-bark-500">{u.note}</p>
            )}
            <p className="mt-0.5 text-xs text-bark-400">{timeAgo(u.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
