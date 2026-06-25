import {
  Dog as DogIcon,
  HeartPulse,
  Syringe,
  Scissors,
  Users,
  Flame,
} from "lucide-react";
import { HelpQueue } from "@/components/dashboard/HelpQueue";
import { CommandCenter } from "@/components/cases/CommandCenter";
import { CaseReporting } from "@/components/cases/CaseReporting";
import {
  getDashboardMetrics,
  getDogsNeedingHelp,
  getZoneCoverage,
  getNGOs,
  getRecentSightings,
} from "@/lib/data";
import { getCases } from "@/lib/cases";
import { formatNumber, timeAgo } from "@/lib/utils";
import type { Sighting } from "@/lib/types";

/** Build a contributor leaderboard from real sighting reporters. */
function topContributors(sightings: Sighting[]) {
  const map = new Map<string, { name: string; count: number; last: string }>();
  for (const s of sightings) {
    const name = s.user_name || "Someone in Delhi";
    const e = map.get(name) ?? { name, count: 0, last: s.created_at };
    e.count += 1;
    if (+new Date(s.created_at) > +new Date(e.last)) e.last = s.created_at;
    map.set(name, e);
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export const metadata = {
  title: "NGO Dashboard — StrayPaw Delhi",
  description:
    "Impact dashboard for NGOs: help queue, sterilisation & vaccination tracking, volunteer activity and an underserved-area heatmap.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [m, needHelp, zones, ngos, recentSightings, cases] = await Promise.all([
    getDashboardMetrics(),
    getDogsNeedingHelp(),
    getZoneCoverage(),
    getNGOs(),
    getRecentSightings(80),
    getCases(),
  ]);
  const contributors = topContributors(recentSightings);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-24 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-semibold text-paw-600">NGO Dashboard</p>
        <h1 className="font-display text-2xl font-bold tracking-tightest sm:text-3xl">
          Operations
        </h1>
        <p className="text-sm text-bark-500">
          What needs attention, who owns it, and your impact — in one place.
        </p>
      </header>

      {/* Phase 2–4: operational command center + reporting */}
      <CommandCenter cases={cases} />
      <CaseReporting cases={cases} />

      {/* ── Map-side impact (existing) ── */}
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold tracking-tightest sm:text-2xl">
          Map impact
        </h2>
        <p className="text-sm text-bark-500">
          Community tracking across Delhi.
        </p>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          icon={<DogIcon className="h-5 w-5" />}
          value={formatNumber(m.totalTracked)}
          label="Dogs tracked"
          tone="paw"
        />
        <Metric
          icon={<HeartPulse className="h-5 w-5" />}
          value={formatNumber(m.needsHelp)}
          label="Need help now"
          tone="injured"
        />
        <Metric
          icon={<Scissors className="h-5 w-5" />}
          value={`${m.sterilisedPct}%`}
          label="Sterilised"
          tone="sterilised"
        />
        <Metric
          icon={<Syringe className="h-5 w-5" />}
          value={`${m.vaccinatedPct}%`}
          label="Vaccinated"
          tone="vaccinated"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* left: help queue */}
        <div className="lg:col-span-2">
          <HelpQueue dogs={needHelp} />

          {/* progress */}
          <div className="card mt-6 p-5">
            <h3 className="mb-4 font-display font-bold">
              Sterilisation &amp; vaccination drive
            </h3>
            <Progress
              label="Sterilisation coverage"
              pct={m.sterilisedPct}
              color="#3E8473"
            />
            <Progress
              label="Vaccination coverage"
              pct={m.vaccinatedPct}
              color="#4E8A5F"
            />
            <p className="mt-3 text-xs text-bark-400">
              {m.feedEventsThisMonth} feeding events logged · {m.activeVolunteers}{" "}
              active volunteers this month
            </p>
          </div>
        </div>

        {/* right: heatmap + activity */}
        <div className="space-y-6">
          {/* underserved heatmap */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-status-injured" />
              <h3 className="font-display font-bold">Underserved areas</h3>
            </div>
            <div className="space-y-2">
              {zones.slice(0, 8).map((z) => (
                <div key={z.zone} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-xs font-medium text-bark-600">
                    {z.zone}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bark-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(z.underserved * 100)}%`,
                        background: `linear-gradient(90deg, #D9A441, #C0492E)`,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[10px] text-bark-400">
                    {Math.round(z.underserved * 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* volunteers */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-paw-500" />
              <h3 className="font-display font-bold">Volunteer activity</h3>
            </div>
            {contributors.length === 0 ? (
              <p className="text-sm text-bark-400">
                No contributors yet — share the app to get the first sightings in.
              </p>
            ) : (
              <ul className="space-y-3">
                {contributors.map((u) => (
                  <li key={u.name} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paw-200 text-xs font-bold text-paw-700">
                      {u.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
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

          {/* partner NGOs */}
          <div className="card p-5">
            <h3 className="mb-3 font-display font-bold">Partner NGOs</h3>
            {ngos.length === 0 && (
              <p className="text-sm text-bark-400">No partner NGOs added yet.</p>
            )}
            <ul className="space-y-2">
              {ngos.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-bark-700">
                    {n.name}
                    {n.verified && (
                      <span className="ml-1 text-status-vaccinated">✓</span>
                    )}
                  </span>
                  <span className="text-xs text-bark-400">
                    {formatNumber(n.dogs_helped)} helped
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONES: Record<string, string> = {
  paw: "bg-paw-100 text-paw-600",
  injured: "bg-status-injured/15 text-status-injured",
  sterilised: "bg-status-sterilised/15 text-status-sterilised",
  vaccinated: "bg-status-vaccinated/15 text-status-vaccinated",
};

function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="card p-4">
      <span
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${TONES[tone]}`}
      >
        {icon}
      </span>
      <p className="font-display text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-bark-500">{label}</p>
    </div>
  );
}

function Progress({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-bark-600">{label}</span>
        <span className="font-bold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bark-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
