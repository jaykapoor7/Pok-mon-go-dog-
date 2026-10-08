import { AppShell } from "@/components/app/AppShell";
import { PlaceBrief } from "@/components/insights/PlaceBrief";
import { Suspense } from "react";
import { SpatialMap } from "@/components/spatial/SpatialMap";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Insights, StrayPaw",
  description:
    "A brief on one place: what needs attention now, how fast field teams get there, what happens to a request, what people call about, when it is busiest, and how much sterilisation and vaccination is recorded.",
};

/* Insights retains the intended place brief, backed by one bounded city
   dataset rather than a platform-wide analytical bootstrap. */
export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  if ((await searchParams).view !== "brief") return <AppShell flush><div className="sm-host"><Suspense fallback={null}><SpatialMap /></Suspense></div></AppShell>;
  return (
    <AppShell>
      <PlaceBrief scope="public" />
    </AppShell>
  );
}
