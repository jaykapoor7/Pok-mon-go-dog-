"use client";

import { DogPhoto } from "@/components/ui/DogPhoto";
import { ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Case } from "@/lib/types";

/** Before/after proof on resolved cases — the funder-facing outcome evidence. */
export function Resolutions({ cases }: { cases: Case[] }) {
  const resolved = cases
    .filter((c) => (c.status === "resolved" || c.status === "closed") && c.before_url && c.after_url)
    .sort((a, b) => +new Date(b.resolved_at ?? b.last_activity_at) - +new Date(a.resolved_at ?? a.last_activity_at));

  if (resolved.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-bark-400">
        No resolved cases with before/after proof yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {resolved.slice(0, 6).map((c) => (
        <div key={c.id} className="card overflow-hidden">
          <div className="grid grid-cols-2">
            <Figure label="Before" src={c.before_url!} seed={`${c.id}-b`} />
            <Figure label="After" src={c.after_url!} seed={`${c.id}-a`} />
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold">{c.title}</p>
            {c.outcome_note && (
              <p className="mt-0.5 text-xs text-bark-500">{c.outcome_note}</p>
            )}
            <p className="mt-1 text-[11px] text-bark-400">
              Resolved {formatDate(c.resolved_at ?? c.last_activity_at)}
              {c.assignee_name ? ` · ${c.assignee_name}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Figure({ label, src, seed }: { label: string; src: string; seed: string }) {
  return (
    <div className="relative">
      <DogPhoto src={src} alt={label} seed={seed} className="aspect-square w-full" />
      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        {label}
      </span>
      {label === "Before" && (
        <span className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white p-1 shadow sm:block">
          <ArrowRight className="h-3 w-3 text-paw-600" />
        </span>
      )}
    </div>
  );
}
