import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { SpatialMap } from "@/components/spatial/SpatialMap";

export const metadata = {
  title: "Map, StrayPaw",
  description: "The register on one map: where animals are recorded, how well each place is mapped, and where sterilisation, vaccination and open work are recorded or unknown.",
};

/* The original map controls and views run on one bounded city dataset at a
 * time. It never asks the browser to materialise the platform register. */
export default function MapPage() {
  return (
    <AppShell flush>
      <div className="sm-host">
        <Suspense fallback={null}>
          <SpatialMap />
        </Suspense>
      </div>
    </AppShell>
  );
}
