import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { LivingMap } from "@/components/livingmap/LivingMap";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";

export const metadata = {
  title: "Living map, StrayPaw",
  description: "India's community-animal record on one map: where animals are recorded, where they need attention, where care has happened, who keeps the record, and where the record is missing.",
};

/* The Living Map: complete per-area aggregates for one city at a time,
 * never anything finer than an H3 area. */
/* The national reading is rendered into the page (from the database's
 * snapshot), so India draws without waiting on a request. */
export const revalidate = 300;

export default async function MapPage() {
  const [cities, unplaced] = await Promise.all([getMapCities().catch(() => []), getUnplaced().catch(() => [])]);
  return (
    <AppShell flush>
      <div className="lm-host">
        <Suspense fallback={null}>
          <LivingMap initialCities={cities} initialUnplaced={unplaced} />
        </Suspense>
      </div>
    </AppShell>
  );
}
