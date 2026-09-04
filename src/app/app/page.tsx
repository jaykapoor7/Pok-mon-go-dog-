import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  Heart,
  Map,
  Radio,
  ScanSearch,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getCityStats, getRecentSightings } from "@/lib/data";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Console, StrayPaw" };

const QUICK_LINKS = [
  {
    href: "/report",
    icon: Radio,
    label: "Report an animal",
    sub: "Add a sighting or flag a need",
  },
  {
    href: "/map",
    icon: Map,
    label: "Living map",
    sub: "All sightings, studies, outcomes",
  },
  {
    href: "/orgs",
    icon: Building2,
    label: "Organisation directory",
    sub: "38+ NGOs across India",
  },
  {
    href: "/get-involved",
    icon: Heart,
    label: "Volunteer",
    sub: "Find the right route for you",
  },
  {
    href: "/gaps",
    icon: ScanSearch,
    label: "Data gaps",
    sub: "State-by-state coverage picture",
  },
  {
    href: "/what-would-it-take",
    icon: BookOpen,
    label: "Cost an intervention",
    sub: "Real unit costs, scoped estimates",
  },
];

export default async function ConsoleHome() {
  const [stats, sightings] = await Promise.all([
    getCityStats(),
    getRecentSightings(6),
  ]);

  const hasActivity = sightings.length > 0;

  return (
    <AppShell>
      <div className="spa-head">
        <div>
          <span className="spa-mono">StrayPaw console</span>
          <h1>
            The living <em>network.</em>
          </h1>
        </div>
        <Link href="/report" className="spa-cta">
          + Report an animal
        </Link>
      </div>

      <p className="spa-lede">
        A shared record layer for community reporters, field teams, and
        organisations. Every sighting, intervention, and outcome in one place —
        across India.
      </p>

      {/* Live counts — zero is real and shown as one. */}
      <div className="spa-kpis">
        <div className="spa-kpi">
          <span>Animals on the map</span>
          <b>{stats.dogsSpotted}</b>
          <small>reported by the community</small>
        </div>
        <div className="spa-kpi">
          <span>Needing help</span>
          <b>{stats.needsHelp}</b>
          <small>flagged and unresolved</small>
        </div>
        <div className="spa-kpi">
          <span>Sterilisation recorded</span>
          <b>{stats.dogsSterilised}</b>
          <small>on a profile in the system</small>
        </div>
      </div>

      <div className="spa-grid">
        {/* Recent activity panel */}
        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>Recent sightings</b>
            <Link href="/feed">
              See all <ArrowUpRight size={12} />
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
                <b>Nothing yet.</b> The first sighting on this network will
                appear here. Add one now.
              </p>
              <Link href="/report" className="tlink">
                Report an animal <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="spa-panel">
          <div className="spa-panel-head">
            <b>Quick access</b>
          </div>
          <div className="console-links">
            {QUICK_LINKS.map(({ href, icon: Icon, label, sub }) => (
              <Link key={href} href={href} className="console-link">
                <Icon size={16} strokeWidth={1.5} />
                <div>
                  <b>{label}</b>
                  <span>{sub}</span>
                </div>
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
