import { AppShell } from "@/components/app/AppShell";
import { BoundedSpatialMap } from "@/components/spatial/BoundedSpatialMap";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Insights, StrayPaw",
  description:
    "A brief on one place: what needs attention now, how fast field teams get there, what happens to a request, what people call about, when it is busiest, and how much sterilisation and vaccination is recorded.",
};

/* City-level insights use the same aggregate/viewport contract as the map;
   this route deliberately has no whole-register analytical bootstrap. */
export default function InsightsPage() {
  return (
    <AppShell>
      <main className="ib"><header className="ib-head"><div className="ib-head-words"><p className="ib-kicker sys-mono">Insights</p><h1>Evidence, city by city.</h1><p>Choose a city to inspect recorded animals, open cases, care and programme coverage. Map cells are aggregated; close zoom loads only the visible animals.</p></div></header><div className="sm-host is-fill"><BoundedSpatialMap /></div></main>
    </AppShell>
  );
}
