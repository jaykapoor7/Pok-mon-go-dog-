import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { BoundedSpatialMap } from "@/components/spatial/BoundedSpatialMap";

export const metadata = {
  title: "Map, StrayPaw",
  description:
    "The register on one map: where animals are recorded, how densely, how well each place is mapped, where sterilisation and vaccination are recorded or unknown, and where work is open.",
};

/* The public map reads city/cell aggregates first. Close-zoom animal points
   are separately bounded to the visible viewport. */
export default function MapPage() {
  return (
    <AppShell flush>
      <div className="sm-host">
        <Suspense fallback={null}>
          <BoundedSpatialMap />
        </Suspense>
      </div>
    </AppShell>
  );
}
