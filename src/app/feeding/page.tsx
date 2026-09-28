import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { getFeedingZones } from "@/lib/feeding-zones";
import { FeedingZoneCard } from "@/components/feeding/FeedingZoneCard";

export const metadata = {
  title: "Feeding zones, StrayPaw",
  description:
    "Community feeding spots for street dogs, see who's covering each one and sign up to feed.",
};

export const dynamic = "force-dynamic";

export default async function FeedingZonesPage() {
  const zones = await getFeedingZones();

  return (
    <main className="feed-index">
      <header className="feed-index-head">
        <div className="feed-index-copy">
          <p className="feed-kicker">The community route book</p>
          <h1>Feeding spots, <em>kept in view.</em></h1>
          <p>Find a regular spot, see when it was last fed, and help keep its route covered.</p>
        </div>
        <Link href="/feeding/new" className="sys-btn is-flame"><Plus size={16} /> Add a feeding spot</Link>
      </header>

      <section className="feed-index-list" aria-labelledby="feed-index-list-title">
        <div className="feed-index-list-head"><h2 id="feed-index-list-title">On the public record</h2><span>{zones.length} {zones.length === 1 ? "spot" : "spots"} shown</span></div>
        {zones.length === 0 ? (
          <div className="feed-index-empty">
            <span>01 / Make a place visible</span>
            <h3>No feeding spots are recorded yet.</h3>
            <p>Add a place the community already feeds. Its page can show who is covering it and when someone last checked in.</p>
            <Link href="/feeding/new">Add the first spot <ArrowUpRight size={16} /></Link>
          </div>
        ) : <div className="feed-index-grid">{zones.map((z, index) => <FeedingZoneCard key={z.id} zone={z} index={index} />)}</div>}
      </section>
    </main>
  );
}
