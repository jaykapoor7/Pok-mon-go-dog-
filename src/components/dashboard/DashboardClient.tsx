"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, HeartPulse, ShieldCheck, Timer, ListChecks, BarChart3, HandHelping, HeartHandshake, ArrowRight, Building2 } from "lucide-react";
import { OrgManager } from "@/components/dashboard/OrgManager";
import { OverviewPanel } from "@/components/dashboard/OverviewPanel";
import { CommandCenter } from "@/components/cases/CommandCenter";
import { CaseReporting } from "@/components/cases/CaseReporting";
import { HelpQueue } from "@/components/dashboard/HelpQueue";
import { CasePipeline } from "@/components/dashboard/CasePipeline";
import { CoverageHero } from "@/components/dashboard/CoverageHero";
import { Resolutions } from "@/components/dashboard/Resolutions";
import { FunderReport } from "@/components/dashboard/FunderReport";
import { ExportCsvButton } from "@/components/dashboard/ExportCsvButton";
import {
  coverage,
  medianResponseDays,
} from "@/lib/dashboard-metrics";
import { cn, formatNumber } from "@/lib/utils";
import type { Case, Dog, NGO, Sighting } from "@/lib/types";

type Tab = "overview" | "impact" | "org";
type HelperCounts = { volunteers: number; ngos: number };

export function DashboardClient({
  dogs,
  cases,
  ngos,
  sightings,
  helperCounts,
}: {
  dogs: Dog[];
  cases: Case[];
  ngos: NGO[];
  sightings: Sighting[];
  helperCounts: HelperCounts;
}) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="mx-auto max-w-5xl overflow-x-clip px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-4 border-b border-black/[0.08] pb-4 dark:border-white/[0.1]">
        <h1 className="text-xl font-semibold tracking-tight text-bark-900 dark:text-bark-50">Workspace</h1>
        <p className="mt-0.5 text-[13px] text-bark-500">What needs your attention across your organization.</p>
      </header>

      {/* Understated segmented nav (operational, not marketing). */}
      <div className="no-scrollbar -mx-1 mb-6 flex gap-1 overflow-x-auto px-1">
        <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<ListChecks className="h-4 w-4" />}>
          Overview
        </TabButton>
        <TabButton active={tab === "impact"} onClick={() => setTab("impact")} icon={<BarChart3 className="h-4 w-4" />}>
          Impact
        </TabButton>
        <TabButton active={tab === "org"} onClick={() => setTab("org")} icon={<Building2 className="h-4 w-4" />}>
          Organization
        </TabButton>
      </div>

      {tab === "overview" ? (
        <OverviewPanel cases={cases} dogs={dogs} sightings={sightings} />
      ) : tab === "impact" ? (
        <Impact dogs={dogs} cases={cases} ngos={ngos} helperCounts={helperCounts} />
      ) : (
        <OrgManager />
      )}
    </div>
  );
}

// ── Operate ───────────────────────────────────────────────────
function Operate({ dogs, cases }: { dogs: Dog[]; cases: Case[] }) {
  const needHelp = dogs.filter((d) => d.needs_help).sort(
    (a, b) => +new Date(b.last_seen) - +new Date(a.last_seen)
  );
  return (
    <div className="space-y-8">
      <CommandCenter cases={cases} />

      {/* Dogs flagged as needing help, most urgent, so shown before the case
          pipeline. 'Open case' turns one into a tracked case in the pipeline. */}
      <section>
        <HelpQueue dogs={needHelp} />
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl font-bold tracking-tightest sm:text-2xl">
          Case pipeline
        </h2>
        <p className="mb-3 text-sm text-bark-500">
          Reported → assigned → in treatment → resolved, with owners. Open a case
          from a dog above to add it here.
        </p>
        <CasePipeline cases={cases} />
      </section>
    </div>
  );
}

// ── Impact ────────────────────────────────────────────────────
function Impact({
  dogs,
  cases,
  ngos,
  helperCounts,
}: {
  dogs: Dog[];
  cases: Case[];
  ngos: NGO[];
  helperCounts: HelperCounts;
}) {
  // Only StrayPaw-verified outcomes count as resolved in impact figures.
  const resolved = cases.filter(
    (c) => (c.status === "resolved" || c.status === "closed") && c.proof_verified
  );

  // 7-day trend on resolutions.
  const now = Date.now();
  const last7 = resolved.filter((c) => +new Date(c.resolved_at ?? c.last_activity_at) >= now - 7 * 86_400_000).length;
  const prev7 = resolved.filter((c) => {
    const t = +new Date(c.resolved_at ?? c.last_activity_at);
    return t >= now - 14 * 86_400_000 && t < now - 7 * 86_400_000;
  }).length;
  const delta = last7 - prev7;

  return (
    <div className="space-y-8">
      {/* Coverage hero (P3 + colonies P6) */}
      <section>
        <h2 className="mb-1 font-display text-xl font-bold tracking-tightest sm:text-2xl">
          Coverage &amp; herd immunity
        </h2>
        <p className="mb-3 text-sm text-bark-500">
          Sterilisation &amp; vaccination against the WHO 70% threshold, by colony.
        </p>
        <CoverageHero dogs={dogs} />
      </section>

      {/* Trend + exports row */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-bark-500">Resolved last 7 days</p>
          <p className="font-display text-3xl font-extrabold">{last7}</p>
          <p className={cn("text-xs font-semibold", delta >= 0 ? "text-status-sterilised" : "text-status-injured")}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} vs prior week
          </p>
        </div>
        <div className="card flex flex-col justify-center gap-2 p-5 sm:col-span-2">
          <p className="text-xs text-bark-500">Share your impact</p>
          <div className="flex flex-wrap items-center gap-2">
            <FunderReport dogs={dogs} cases={cases} />
            <ExportCsvButton />
          </div>
          <p className="text-[11px] text-bark-400">
            PDF is the co-branded funder one-pager. CSV is the raw case data for analysts.
          </p>
        </div>
      </section>

      {/* Existing reporting (created/active/resolved/closed + by-category) */}
      <CaseReporting cases={cases} />

      {/* Before/after proof (P4) */}
      <section>
        <h2 className="mb-3 font-display text-xl font-bold tracking-tightest sm:text-2xl">
          Outcomes, before &amp; after
        </h2>
        <Resolutions cases={cases} />
      </section>

      {/* Partners + volunteers */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-display font-bold">Partner NGOs</h3>
          {ngos.length === 0 ? (
            <p className="text-sm text-bark-400">No partner NGOs yet.</p>
          ) : (
            <ul className="space-y-2">
              {ngos.map((n) => (
                <li key={n.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-bark-700 dark:text-bark-200">
                    {n.name}
                    {n.verified && <span className="ml-1 text-status-sterilised">✓</span>}
                    <span className="ml-1 text-xs text-bark-400">· {n.area}</span>
                  </span>
                  <span className="text-xs text-bark-400">{formatNumber(n.dogs_helped)} helped</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Real "Can you help?" sign-ups (contacts live in the moderation panel,
            so we only show counts here, no PII on the public dashboard). */}
        <div className="card flex flex-col p-5">
          <h3 className="mb-3 font-display font-bold">Help-form sign-ups</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded bg-paw-50 p-4 dark:bg-bark-800">
              <span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-paw-100 text-paw-600 dark:bg-bark-700">
                <HandHelping className="h-4 w-4" />
              </span>
              <p className="font-display text-2xl font-extrabold leading-none">
                {formatNumber(helperCounts.volunteers)}
              </p>
              <p className="mt-0.5 text-xs text-bark-500">volunteers</p>
            </div>
            <div className="rounded bg-paw-50 p-4 dark:bg-bark-800">
              <span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-paw-100 text-paw-600 dark:bg-bark-700">
                <HeartHandshake className="h-4 w-4" />
              </span>
              <p className="font-display text-2xl font-extrabold leading-none">
                {formatNumber(helperCounts.ngos)}
              </p>
              <p className="mt-0.5 text-xs text-bark-500">NGOs registered</p>
            </div>
          </div>
          <Link
            href="/moderate"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-paw-600 hover:underline"
          >
            View &amp; contact them in moderation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function Strip({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {icon}
      <span className="font-display text-lg font-extrabold leading-none">{value}</span>
      <span className="text-xs text-white/80">{label}</span>
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
        active ? "bg-paw-500 text-white shadow-warm" : "text-bark-600 dark:text-bark-300"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
