import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Report, type Headline } from "@/components/insights/Report";
import { getPublicDataset } from "@/lib/spatial/server";
import { casesIn } from "@/lib/spatial/measures";
import { fates } from "@/lib/spatial/report";
import { firstDay, monthLabel, monthOfDay } from "@/lib/spatial/engine";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Insights, StrayPaw",
  description:
    "The register, explained: what happens to requests for help, when they come in, how fast work starts, where it concentrates, how much sterilisation and vaccination is recorded, and what nobody has written down yet. Beside it, what India publishes.",
};

/* The public report. The first paint carries the headline for the default
   place (the busiest city, all time), computed here from the cached
   dataset; the chapters are drawn in the browser from the same dataset
   the map uses, so a place chosen on one opens on the other. */
export default async function InsightsPage() {
  const ds = await getPublicDataset(null).catch(() => null);
  let initial: Headline | null = null;
  if (ds && ds.cities.length) {
    const cells = new Set(ds.cells.map((_, i) => i).filter((i) => ds.cellCity[i] === 0));
    const idx = casesIn(ds, { cells, from: 0, to: ds.today });
    const by = fates(ds, idx);
    initial = {
      requests: idx.length,
      closedPct: idx.length ? Math.round((by.closed / idx.length) * 100) : 0,
      noAction: by.no_action + by.not_attended,
      open: by.open + by.in_progress,
      place: ds.cities[0].name,
      since: `${monthLabel(monthOfDay(firstDay(ds)))} – ${monthLabel(monthOfDay(ds.today))}`,
    };
  }
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Report scope="public" initial={initial} />
      </Suspense>
    </AppShell>
  );
}
