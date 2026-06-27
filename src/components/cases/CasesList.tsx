"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { isOverdue, type Case } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { CaseCard } from "./CaseCard";
import { cn } from "@/lib/utils";

type Tab = "all" | "unassigned" | "mine" | "critical" | "overdue";

export function CasesList({ cases }: { cases: Case[] }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const open = (c: Case) => c.status !== "resolved" && c.status !== "closed";

  const counts = useMemo(
    () => ({
      all: cases.length,
      unassigned: cases.filter((c) => open(c) && !c.assignee_id).length,
      mine: user ? cases.filter((c) => c.assignee_id === user.id && open(c)).length : 0,
      critical: cases.filter((c) => open(c) && (c.severity === "critical" || c.severity === "high")).length,
      overdue: cases.filter(isOverdue).length,
    }),
    [cases, user]
  );

  const filtered = useMemo(() => {
    switch (tab) {
      case "unassigned":
        return cases.filter((c) => open(c) && !c.assignee_id);
      case "mine":
        return user ? cases.filter((c) => c.assignee_id === user.id) : [];
      case "critical":
        return cases.filter((c) => open(c) && (c.severity === "critical" || c.severity === "high"));
      case "overdue":
        return cases.filter(isOverdue);
      default:
        return cases;
    }
  }, [cases, tab, user]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unassigned", label: "Unassigned" },
    { key: "mine", label: "Mine" },
    { key: "critical", label: "Critical" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "chip shrink-0 px-3.5 py-2 transition-colors",
              tab === t.key
                ? "bg-paw-500 text-white shadow-warm"
                : "bg-bark-900/[0.05] text-bark-600 hover:bg-bark-900/[0.08] dark:bg-white/[0.06] dark:text-bark-300"
            )}
          >
            {t.label}
            <span className="opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-7 w-7" />}
          title="No cases in this view"
          description="Cases you open or get assigned will show up here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
