"use client";

import { useMemo, useState } from "react";
import { Users, HeartPulse, ShieldCheck, Timer, ListChecks, BarChart3 } from "lucide-react";
import { useDemoMode } from "@/components/demo/DemoModeProvider";
import {
  demoDogs,
  demoCases,
  demoNGOs,
  demoFeedSightings,
} from "@/lib/demo-sightings";
import { CommandCenter } from "@/components/cases/CommandCenter";
import { CaseReporting } from "@/components/cases/CaseReporting";
import { HelpQueue } from "@/components/dashboard/HelpQueue";
import { CasePipeline } from "@/components/dashboard/CasePipeline";
import { CoverageHero } from "@/components/dashboard/CoverageHero";
import { Resolutions } from "@/components/dashboard/Resolutions";
import { FunderReport } from "@/components/dashboard/FunderReport";
import {
  coverage,
  medianResponseDays,
  topContributors,
} from "@/lib/dashboard-metrics";
import { cn, formatNumber, timeAgo } from "@/lib/utils";
import type { Case, Dog, NGO, Sighting } from "@/lib/types";

type Tab = "operate" | "impact";

export function DashboardClient({
  dogs: realDogs,
  cases: realCases,
  ngos: realNGOs,
  sightings: realSightings,
}: {
  dogs: Dog[];
  cases: Case[];
  ngos: NGO[];
  sightings: Sighting[];
}) {
  const { demoOn } = useDemoMode();
  const [tab, setTab] = useState<Tab>("operate");

  // Same seed that drives the map — overlaid only when Demo mode is on.
  const dogs = useMemo(() => (demoOn ? [...realDogs, ...demoDogs] : realDogs), [demoOn, realDogs]);
  const cases = useMemo(() => (demoOn ? [...realCases, ...demoCases] : realCases), [demoOn, realCases]);
  const ngos = useMemo(() => (demoOn ? [...realNGOs, ...demoNGOs] : realNGOs), [demoOn, realNGOs]);
  const sightings = useMemo(
    () => (demoOn ? [...realSightings, ...demoFeedSightings] : realSightings),
    [demoOn, realSightings]
  );

  const cov = coverage(dogs);
  const median = medianResponseDays(cases);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-4">
        <p className="text-sm font-semibold text-paw-600">Partners</p>
        <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
          NGO command center
        </h1>
      </header>

      {/* Health summary strip — the at-a-glance public-health line. */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-paw-500 px-5 py-3.5 text-white shadow-warm">
        <Strip icon={<Users className="h-4 w-4" />} value={formatNumber(cov.tracked)} label="tracked" />
        <Strip icon={<HeartPulse className="h-4 w-4" />} value={formatNumber(cov.needsHelp)} label="need help" />
        <Strip icon={<ShieldCheck className="h-4 w-4" />} value={`${cov.sterilisedPct}%`} label="sterilised" />
        <Strip icon={<ShieldCheck className="h-4 w-4" />} value={`${cov.vaccinatedPct}%`} label="vaccinated" />
        <Strip icon={<Timer className="h-4 w-4" />} value={median != null ? `${median}d` : "—"} label="median response" />
      </div>

      {/* Operate / Impact toggle (internal to Partners, not a nav item). */}
      <div className="mb-6 inline-flex rounded-full bg-bark-100 p-1 dark:bg-bark-800">
        <TabButton active={tab === "operate"} onClick={() => setTab("operate")} icon={<ListChecks className="h-4 w-4" />}>
          Operate
        </TabButton>
        <TabButton active={tab === "impact"} onClick={() => setTab("impact")} icon={<BarChart3 className="h-4 w-4" />}>
          Impact
        </TabButton>
      </div>

      {tab === "operate" ? (
        <Operate dogs={dogs} cases={cases} />
      ) : (
        <Impact dogs={dogs} cases={cases} ngos={ngos} sightings={sightings} />
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

      <section>
        <h2 className="mb-1 font-display text-xl font-bold tracking-tightest sm:text-2xl">
          Case pipeline
        </h2>
        <p className="mb-3 text-sm text-bark-500">
          Reported → assigned → in treatment → resolved, with owners.
        </p>
        <CasePipeline cases={cases} />
      </section>

      <section>
        <HelpQueue dogs={needHelp} />
      </section>
    </div>
  );
}

// ── Impact ────────────────────────────────────────────────────
function Impact({
  dogs,
  cases,
  ngos,
  sightings,
}: {
  dogs: Dog[];
  cases: Case[];
  ngos: NGO[];
  sightings: Sighting[];
}) {
  const contributors = topContributors(sightings);
  const resolved = cases.filter((c) => c.status === "resolved" || c.status === "closed");

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
            <a href="/api/cases/export" download className="btn-ghost px-4 py-2.5 text-sm">
              Export CSV
            </a>
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
          Outcomes — before &amp; after
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

        <div className="card p-5">
          <h3 className="mb-3 font-display font-bold">Volunteer activity</h3>
          {contributors.length === 0 ? (
            <p className="text-sm text-bark-400">No contributors yet.</p>
          ) : (
            <ul className="space-y-3">
              {contributors.map((u) => (
                <li key={u.name} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-200 text-xs font-bold text-paw-700">
                    {u.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="text-xs text-bark-400">
                      {u.count} {u.count === 1 ? "sighting" : "sightings"}
                    </p>
                  </div>
                  <span className="text-xs text-bark-400">{timeAgo(u.last)}</span>
                </li>
              ))}
            </ul>
          )}
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
