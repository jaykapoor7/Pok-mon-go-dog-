import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { getCityStats, getRecentSightings, getShowcaseDogs } from "@/lib/data";
import { RecentSightings } from "@/components/app/RecentSightings";
import { FieldMapPreview } from "@/components/site/FieldMapPreview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your neighbourhood, StrayPaw" };

export default async function ConsoleHome() {
  const [stats, sightings, dogs] = await Promise.all([getCityStats(), getRecentSightings(6), getShowcaseDogs(60)]);
  return <AppShell>
    <div className="community-home">
      <header className="product-page-heading">
        <div><span className="product-kicker">Community</span><h1>Your neighbourhood,<br/>in view.</h1><p>A shared record for the animals around us.</p></div>
        <Link className="product-primary" href="/report"><Plus size={18}/> Report a sighting</Link>
      </header>
      <section className="community-counts" aria-label="Public animal records">
        <div><b>{stats.dogsSpotted.toLocaleString("en-IN")}</b><span>Animals recorded</span></div>
        <Link href="/map"><b>{stats.needsHelp.toLocaleString("en-IN")}</b><span>Marked as needing help</span></Link>
        <div><b>{stats.dogsSterilised.toLocaleString("en-IN")}</b><span>Sterilisation records</span></div>
      </section>
      <div className="community-workspace">
        <section className="community-map"><div className="product-section-heading"><div><h2>Start with the map</h2><p>Explore recorded animals and their care history.</p></div><Link href="/map">Full map <ArrowUpRight size={16}/></Link></div><FieldMapPreview dogs={dogs}/></section>
        <section className="community-recent"><div className="product-section-heading"><div><h2>Recently seen</h2><p>Latest public sightings.</p></div><Link href="/feed">View all <ArrowUpRight size={16}/></Link></div><RecentSightings sightings={sightings}/></section>
      </div>
    </div>
  </AppShell>;
}
