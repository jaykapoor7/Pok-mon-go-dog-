"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getPartnerOperationalAnalytics, type AnalyticsRow, type PartnerOperationalAnalytics } from "@/lib/partner-operational-analytics";

function InsightList({ title, subtitle, rows }: { title: string; subtitle: string; rows: AnalyticsRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return <section className="min-w-0 border-t border-black/[0.08] pt-4 dark:border-white/[0.1]">
    <div className="mb-3"><h3 className="text-sm font-semibold text-bark-900 dark:text-bark-50">{title}</h3><p className="mt-0.5 text-[11.5px] leading-relaxed text-bark-500">{subtitle}</p></div>
    {rows.length ? <div className="space-y-2.5">{rows.map((row) => <div key={row.label}>
      <div className="mb-1 flex items-center justify-between gap-3 text-[12px]"><span className="truncate text-bark-700 dark:text-bark-200">{row.label}</span><b className="tabular-nums text-bark-900 dark:text-bark-50">{row.count.toLocaleString()}</b></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/[0.08]"><div className="h-full rounded-full bg-paw-500" style={{ width: `${Math.max(3, (row.count / max) * 100)}%` }} /></div>
    </div>)}</div> : <p className="text-xs text-bark-400">No structured records yet.</p>}
  </section>;
}

export function OperationalInsights() {
  const { user, ready } = useAuth();
  const [data, setData] = useState<PartnerOperationalAnalytics | null>(null);
  useEffect(() => {
    if (!ready || !user) { setData(null); return; }
    let active = true;
    getPartnerOperationalAnalytics().then((value) => { if (active) setData(value); }).catch(() => { if (active) setData(null); });
    return () => { active = false; };
  }, [ready, user?.id]);
  if (!user) return null;

  return <section className="mx-auto mt-10 w-full" aria-label="Operational insights">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">Operational intelligence</span><h2 className="mt-1 text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">What the field record is telling you</h2></div>
      <p className="max-w-xl text-xs leading-relaxed text-bark-500">Derived from your organisation&apos;s native case, care and follow-up records. Historical imports keep their original dates, so trends reflect when the work happened.</p>
    </div>
    {!data ? <div className="h-24 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.04]" /> : <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      <InsightList title="Why animals needed help" subtitle="Standardised from condition and rescue descriptions." rows={data.conditions} />
      <InsightList title="Recorded outcomes" subtitle="Release, recovery, transfer, death, adoption and other explicit outcomes." rows={data.outcomes} />
      <InsightList title="Care delivered" subtitle="ARV/vaccination, ABC, treatment, TVT, surgery, diagnostics and wound care." rows={data.careKinds} />
      <InsightList title="Where work concentrates" subtitle="Top localities across the case register." rows={data.localities} />
      <InsightList title="Follow-up history" subtitle="Reviews and appointments recorded as first-class follow-up events." rows={data.followupStatuses} />
      <InsightList title="Work by year" subtitle="Historical workload from original source dates, not import dates." rows={data.years} />
    </div>}
  </section>;
}
