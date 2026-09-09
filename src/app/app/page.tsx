import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CircleDot,
  Crosshair,
  Heart,
  Map,
  Navigation,
  PawPrint,
  Radio,
  ScanSearch,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getCityStats, getRecentSightings } from "@/lib/data";
import { RecentSightings } from "@/components/app/RecentSightings";

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
    label: "Map",
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

  return (
    <AppShell>
      <div className="spa-atlas">
        <section className="spa-atlas-hero">
          {/* An original field-observation image gives the console an entry
              point rooted in the street, not another abstract dashboard. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/field-observation-atlas.png" alt="A street dog observed from above at a city intersection" />
          <div className="spa-atlas-wash" />
          <div className="spa-atlas-grid" aria-hidden="true" />
          <div className="spa-atlas-copy">
            <span className="spa-mono spa-atlas-kicker"><i /> Live record system</span>
            <h1>Make the city<br /><em>remember.</em></h1>
            <p>One photo and a location turns a passing encounter into a record people can act on.</p>
            <div className="spa-atlas-actions">
              <Link href="/report" className="spa-atlas-primary"><Radio size={16} /> Report an animal <ArrowUpRight size={15} /></Link>
              <Link href="/map" className="spa-atlas-link"><Crosshair size={15} /> Explore the map</Link>
            </div>
          </div>
          <div className="spa-atlas-signal">
            <span className="spa-mono"><CircleDot size={12} /> Network pulse</span>
            <b>{stats.needsHelp > 0 ? `${stats.needsHelp} need attention` : "All clear right now"}</b>
            <p>{stats.needsHelp > 0 ? "Open the map to see the reports that need a response." : "No unresolved public alerts in the record."}</p>
          </div>
          <div className="spa-atlas-coordinates spa-mono">INDIA / OBSERVATION ATLAS / 2026</div>
        </section>

        {/* The figures are deliberately small and factual: a field worker
            needs orientation, not a row of congratulatory vanity metrics. */}
        <section className="spa-atlas-ledger" aria-label="Network record">
          <div className="spa-atlas-ledger-head">
            <span className="spa-mono">The record, so far</span>
            <span>Updated when the community adds to it.</span>
          </div>
          <div className="spa-atlas-stats">
            <div><PawPrint size={17} /><b>{stats.dogsSpotted}</b><span>animals on the map</span></div>
            <div className={stats.needsHelp ? "attention" : ""}><Navigation size={17} /><b>{stats.needsHelp}</b><span>awaiting help</span></div>
            <div><CircleDot size={17} /><b>{stats.dogsSterilised}</b><span>sterilisation records</span></div>
          </div>
        </section>

        <div className="spa-atlas-layout">
          <section className="spa-atlas-panel spa-atlas-recent">
            <div className="spa-atlas-panel-head">
              <div><span className="spa-mono">Just observed</span><h2>Recent sightings</h2></div>
              <Link href="/feed">View the field log <ArrowUpRight size={13} /></Link>
            </div>
            <RecentSightings sightings={sightings} />
          </section>

          <aside className="spa-atlas-side">
            <section className="spa-atlas-panel spa-atlas-start">
              <span className="spa-mono">Choose a path</span>
              <h2>Start where you are.</h2>
              <div className="spa-atlas-routes">
                <Link href="/report"><Radio size={17} /><span><b>I saw an animal</b><small>Capture a sighting in a minute.</small></span><ArrowDownRight size={16} /></Link>
                <Link href="/partner"><Building2 size={17} /><span><b>I run field work</b><small>Open your organisation workspace.</small></span><ArrowDownRight size={16} /></Link>
                <Link href="/what-would-it-take"><ScanSearch size={17} /><span><b>I need to understand a place</b><small>See its evidence, gaps and costs.</small></span><ArrowDownRight size={16} /></Link>
              </div>
            </section>

            <section className="spa-atlas-panel spa-atlas-directory">
              <div className="spa-atlas-panel-head"><div><span className="spa-mono">More ways in</span><h2>Tools and evidence</h2></div></div>
              <div className="spa-atlas-tools">
                {QUICK_LINKS.map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}><Icon size={15} /><span><b>{label}</b><small>{sub}</small></span><ArrowUpRight size={12} /></Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
