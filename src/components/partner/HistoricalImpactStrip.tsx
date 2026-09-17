"use client";

import { useEffect, useState } from "react";
import { getPartnerImpact, type PartnerImpact } from "@/lib/partner-impact";
import { useAuth } from "@/components/auth/AuthProvider";

const empty: PartnerImpact = { animals: 0, cases: 0, resolvedCases: 0, followups: 0, careEvents: 0, vaccinations: 0, sterilisations: 0, treatments: 0, programmes: 0 };

export function HistoricalImpactStrip() {
  const { user, ready } = useAuth();
  const [impact, setImpact] = useState<PartnerImpact | null>(null);
  useEffect(() => {
    if (!ready || !user) { setImpact(null); return; }
    let active = true;
    getPartnerImpact().then((value) => { if (active) setImpact(value); }).catch(() => { if (active) setImpact(empty); });
    return () => { active = false; };
  }, [ready, user?.id]);
  if (!user) return null;
  const metrics = [
    ["Animals on record", impact?.animals],
    ["Cases", impact?.cases],
    ["Resolved / closed", impact?.resolvedCases],
    ["Care events", impact?.careEvents],
    ["Vaccinations / ARV", impact?.vaccinations],
    ["Sterilisations", impact?.sterilisations],
    ["Treatments", impact?.treatments],
    ["Follow-ups", impact?.followups],
    ["Programmes", impact?.programmes],
  ] as const;
  return <section className="mb-8 border-y border-black/[0.08] py-5 dark:border-white/[0.1]" aria-label="Organisation record totals">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paw-600">Organisation record</span><h2 className="mt-1 text-lg font-semibold tracking-tight text-bark-900 dark:text-bark-50">The work already on file</h2></div><p className="max-w-xl text-xs leading-relaxed text-bark-500">Native totals across imported history and ongoing StrayPaw work. Historical records keep their original dates.</p></div>
    <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:grid-cols-9">{metrics.map(([label, value]) => <div key={label} className="border-l border-black/[0.08] pl-3 first:border-l-0 first:pl-0 dark:border-white/[0.1]"><b className="block text-2xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">{impact ? Number(value ?? 0).toLocaleString() : "—"}</b><span className="mt-1 block text-[11px] leading-tight text-bark-500">{label}</span></div>)}</div>
  </section>;
}
