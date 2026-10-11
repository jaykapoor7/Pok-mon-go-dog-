import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { LivingMap } from "@/components/livingmap/LivingMap";

export const metadata = {
  title: "Living map, StrayPaw",
  description: "India's community-animal record on one map: where animals are recorded, where they need attention, where care has happened, who keeps the record, and where the record is missing.",
};

/* The Living Map: complete per-area aggregates for one city at a time,
 * never anything finer than an H3 area. */
export default function MapPage() {
  return (
    <AppShell flush>
      <div className="lm-host">
        <Suspense fallback={null}>
          <LivingMap />
        </Suspense>
      </div>
    </AppShell>
  );
}
