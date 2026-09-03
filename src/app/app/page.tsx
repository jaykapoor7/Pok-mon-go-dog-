import Link from "next/link";
import { ArrowUpRight, ChevronRight, Radio, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { DELHI_ABC_COVERAGE, DELHI_POPULATION, num } from "@/lib/platform/network";
import { getCityStats, getRecentSightings } from "@/lib/data";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Console, StrayPaw" };

export default async function ConsoleHome() {
  // Live counts from the database. Pre-launch these are genuinely zero, and
  // the page says so rather than showing invented activity.
  const [stats, sightings] = await Promise.all([
    getCityStats(),
    getRecentSightings(6),
  ]);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const hasActivity = sightings.length > 0;

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">{today} / Delhi NCR</span>
          <h1>
            Good morning, <em>neighbour.</em>
          </h1>
        </div>
        <Link href="/report" className="spa-cta">
          + Report an animal
        </Link>
      </div>

      {/* Live network counts. Zero is a real number and is shown as one. */}
      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>Animals on the map</span>
          <b>{num(stats.dogsSpotted)}</b>
          <small>reported by this community</small>
        </div>
        <div className="spa-kpi">
          <span>Needing help</span>
          <b>{num(stats.needsHelp)}</b>
          <small>flagged and unresolved</small>
        </div>
        <div className="spa-kpi">
          <span>Sterilised</span>
          <b>{num(stats.dogsSterilised)}</b>
          <small>recorded on a profile</small>
        </div>
      </div>

      <div className="spa-grid">
        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>Recent activity</b>
            <Link href="/feed">
              Open feed <ChevronRight size={12} />
            </Link>
          </div>

          {hasActivity ? (
            sightings.map((s) => (
              <div className="spa-row" key={s.id}>
                <Link href={`/dog/${s.dog_id}`}>
                  {s.notes?.trim() || "Sighting reported"}
                </Link>
                <b>{timeAgo(s.created_at)}</b>
              </div>
            ))
          ) : (
            <div className="panel-empty">
              <Radio size={26} strokeWidth={1.25} />
              <p>
                <b>Nothing reported yet.</b> The first sighting on this map will
                show up here.
              </p>
              <Link href="/report" className="tlink">
                Report an animal <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>

        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>The wider picture</b>
          </div>
          <div className="spa-mini">
            <ShieldCheck size={20} />
            <h4>
              {Math.round(DELHI_ABC_COVERAGE.value * 100)}% of Delhi is
              sterilised
            </h4>
            <p>
              Across roughly {num(DELHI_POPULATION.value)} community dogs. The{" "}
              {DELHI_ABC_COVERAGE.year} survey established the city total — but
              not which neighbourhoods carry the shortfall.
            </p>
            <Link href="/gaps">
              See what is unknown <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      <div className="spa-strip">
        <div>
          <span className="spa-mono">Living map / Delhi NCR</span>
          <h4>Signals, studies, needs and outcomes in one place.</h4>
        </div>
        <div />
        <Link href="/map">
          Open map <ArrowUpRight size={14} />
        </Link>
      </div>
    </AppShell>
  );
}
