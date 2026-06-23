import {
  Dog as DogIcon,
  HeartPulse,
  Syringe,
  Scissors,
  Users,
  Flame,
} from "lucide-react";
import { HelpQueue } from "@/components/dashboard/HelpQueue";
import {
  getDashboardMetrics,
  getDogsNeedingHelp,
  getZoneCoverage,
  getNGOs,
} from "@/lib/data";
import { DEMO_USERS } from "@/lib/demo-data";
import { formatNumber, timeAgo } from "@/lib/utils";

export const metadata = {
  title: "NGO Dashboard — StrayPaw Delhi",
  description:
    "Impact dashboard for NGOs: help queue, sterilisation & vaccination tracking, volunteer activity and an underserved-area heatmap.",
};

export default function DashboardPage() {
  const m = getDashboardMetrics();
  const needHelp = getDogsNeedingHelp();
  const zones = getZoneCoverage();
  const ngos = getNGOs();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-sm font-semibold text-paw-600">NGO Dashboard</p>
        <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
          Impact at a glance
        </h1>
        <p className="text-sm text-bark-500">
          Track care work across Delhi and act where it&apos;s needed most.
        </p>
      </header>

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
              color="#8b5cf6"
            />
            <Progress
              label="Vaccination coverage"
              pct={m.vaccinatedPct}
              color="#10b981"
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
                        background: `linear-gradient(90deg, #f59e0b, #ef4444)`,
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
            <ul className="space-y-3">
              {DEMO_USERS.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-9 w-9 rounded-full bg-paw-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{u.name}</p>
                    <p className="text-xs text-bark-400">
                      {u.sightings_count} sightings · trust {u.trust_level}
                    </p>
                  </div>
                  <span className="text-xs text-bark-400">
                    {timeAgo(u.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* partner NGOs */}
          <div className="card p-5">
            <h3 className="mb-3 font-display font-bold">Partner NGOs</h3>
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
