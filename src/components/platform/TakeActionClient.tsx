"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import { SectionLabel } from "@/components/platform/viz";
import { SourceBadge } from "@/components/platform/DataBadge";
import { STATES, METRIC_BY_ID } from "@/lib/platform/geography";
import { stateValue } from "@/lib/platform/datasets";
import { ACTIONS } from "@/lib/platform/actions";
import { orgsForState } from "@/lib/platform/orgs";

const KEY_METRICS = ["abc_coverage", "arv_coverage", "human_rabies_deaths"] as const;

export function TakeActionClient() {
  const [code, setCode] = useState("IN-MH");
  const state = STATES.find((s) => s.code === code)!;
  const orgs = orgsForState(code);

  const readings = KEY_METRICS.map((m) => ({ m, dp: stateValue(m, code) }));
  const gapMetrics = useMemo(() => {
    const g: string[] = [];
    const abc = stateValue("abc_coverage", code);
    const arv = stateValue("arv_coverage", code);
    if (!abc || abc.value < 40) g.push("abc_coverage");
    if (!arv || arv.value < 70) g.push("arv_coverage");
    if (!abc && !arv) g.push("community_reports");
    return g;
  }, [code]);

  // Prioritise: actions matching this state's gaps first, then the rest.
  const prioritised = useMemo(() => {
    const score = (a: (typeof ACTIONS)[number]) => (a.metric && gapMetrics.includes(a.metric) ? 0 : 1);
    return [...ACTIONS].sort((a, b) => score(a) - score(b));
  }, [gapMetrics]);

  return (
    <div>
      <header className="max-w-3xl">
        <SectionLabel>Take Action</SectionLabel>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Turn what the data shows into what you do.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-bark-600 dark:text-bark-300">
          Pick a place. We surface what the numbers say it needs, the evidence-based actions that respond, and the people already working there.
        </p>
      </header>

      {/* State picker + readings */}
      <div className="mt-6 rounded-2xl border border-black/[0.08] p-5 dark:border-white/[0.1]">
        <label className="flex items-center gap-2 text-[13px] font-medium text-bark-600 dark:text-bark-300">
          <MapPin className="h-4 w-4 text-paw-500" /> Area
          <select value={code} onChange={(e) => setCode(e.target.value)} className="ml-2 rounded-md border border-black/[0.12] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-paw-400 dark:border-white/[0.14]">
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {readings.map(({ m, dp }) => {
            const def = METRIC_BY_ID.get(m)!;
            return (
              <div key={m} className="rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                <div className="text-[12px] text-bark-500">{def.short}</div>
                <div className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {dp ? (def.unit === "%" ? `${dp.value}%` : new Intl.NumberFormat("en-IN").format(dp.value)) : <span className="text-[15px] font-medium text-status-injured">No data</span>}
                </div>
                {dp && <div className="mt-1.5"><SourceBadge type={dp.sourceType} sample={dp.sample} /></div>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-bark-400">{state.name}: {gapMetrics.length ? "gaps flagged below drive the recommended actions." : "coverage looks relatively strong here - help sustain it."}</p>
      </div>

      {/* Actions */}
      <h2 className="mt-8 font-display text-xl font-bold tracking-tight">Recommended actions</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {prioritised.map((a) => {
          const relevant = a.metric && gapMetrics.includes(a.metric);
          return (
            <div key={a.id} className={`rounded-2xl border p-5 ${relevant ? "border-paw-300 bg-paw-50 dark:border-paw-500/30 dark:bg-paw-900/15" : "border-black/[0.08] dark:border-white/[0.1]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-bark-400">{a.audience}</span>
                {relevant && <span className="rounded-full bg-paw-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Priority here</span>}
              </div>
              <h3 className="mt-2 font-display text-lg font-bold leading-snug tracking-tight">{a.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-bark-600 dark:text-bark-300">{a.rationale}</p>
              {a.href && a.cta && (
                <Link href={a.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:text-paw-700 dark:text-paw-300">{a.cta} <ArrowRight className="h-4 w-4" /></Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Who's working here */}
      <div className="mt-8 rounded-2xl border border-black/[0.08] p-6 dark:border-white/[0.1]">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Who&apos;s working in {state.name}?</h2>
            <p className="mt-1 text-sm text-bark-600 dark:text-bark-300">
              {orgs.length ? "Real, named organisations in StrayPaw's directory known to work here." : "No organisation in our directory is confirmed to work in this state yet - that's a gap you can help close."}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Link href="/orgs" className="btn-ghost px-5 py-3">All organisations</Link>
            <Link href="/report" className="btn-primary px-5 py-3">Report a sighting</Link>
          </div>
        </div>
        {orgs.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {orgs.map((o) => (
              <div key={o.id} className="rounded-xl border border-black/[0.06] p-4 dark:border-white/[0.08]">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-[15px] font-bold leading-snug tracking-tight">{o.name}</h3>
                  {o.url && <a href={o.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-bark-400 hover:text-paw-600"><ExternalLink className="h-4 w-4" /></a>}
                </div>
                <p className="mt-0.5 text-[12px] text-bark-500">{o.city}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-bark-600 dark:text-bark-300">{o.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {o.focus.map((f) => <span key={f} className="rounded-full bg-bark-100 px-2 py-0.5 text-[10px] text-bark-500 dark:bg-bark-800">{f}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
