"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, HeartHandshake, Loader2 } from "lucide-react";
import { getMyOrgCampaigns } from "@/lib/actions";
import { formatINR } from "@/lib/fundraisers";
import type { Fundraiser } from "@/lib/types";
import { cn } from "@/lib/utils";

// Need → Campaign. Common DDS needs prefill a new campaign's title.
const NEEDS = [
  "Emergency treatment",
  "Rescue operation",
  "Veterinary medicines",
  "Mobile veterinary ambulance",
  "Vaccination drive",
  "Rehabilitation",
];

export function PartnerFundraising() {
  const [campaigns, setCampaigns] = useState<Fundraiser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMyOrgCampaigns().then(setCampaigns).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Fundraising</h1>
          <p className="mt-0.5 text-[13px] text-bark-500">Turn real needs into campaigns. StrayPaw links out — it never holds the money.</p>
        </div>
        <Link href="/fundraisers/new" className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-paw-500 px-3 py-2 text-[13px] font-semibold text-white hover:bg-paw-600">
          <Plus className="h-4 w-4" /> New campaign
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">Start from a need</h2>
        <div className="flex flex-wrap gap-2">
          {NEEDS.map((n) => (
            <Link key={n} href={`/fundraisers/new?title=${encodeURIComponent(n)}`} className="rounded-md border border-black/[0.1] px-3 py-1.5 text-[13px] font-medium text-bark-600 hover:border-paw-400 hover:text-paw-700 dark:border-white/[0.12] dark:text-bark-300">
              {n}
            </Link>
          ))}
        </div>
      </section>

      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-bark-400">Your campaigns</h2>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-paw-500" /></div>
      ) : campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-black/[0.1] py-12 text-center text-[14px] text-bark-400 dark:border-white/[0.12]">No campaigns yet.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-black/[0.08] dark:border-white/[0.1]">
          {campaigns.map((c) => {
            const pct = c.goal_amount && c.raised_reported ? Math.min(100, Math.round((c.raised_reported / c.goal_amount) * 100)) : null;
            return (
              <li key={c.id} className="border-b border-black/[0.06] last:border-0 dark:border-white/[0.06]">
                <Link href={`/fundraisers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                  <HeartHandshake className="h-4 w-4 shrink-0 text-bark-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-bark-900 dark:text-bark-50">{c.title}</p>
                    <p className="truncate text-[12px] text-bark-400 capitalize">{c.status}{c.goal_amount ? ` · goal ${formatINR(c.goal_amount)}` : ""}</p>
                  </div>
                  {pct != null && <span className={cn("shrink-0 text-[12px] font-medium tabular-nums text-bark-500")}>{pct}%</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
