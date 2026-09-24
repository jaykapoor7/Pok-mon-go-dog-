import { Suspense } from "react";
import { AppShell } from "@/components/app/AppShell";
import { SpatialMap } from "@/components/spatial/SpatialMap";

export const metadata = {
  title: "Map, StrayPaw",
  description:
    "The register on one map: where animals are recorded, how densely, how well each place is mapped, where sterilisation and vaccination are recorded or unknown, and where work is open.",
};

/* The public map. The data arrives from /api/spatial (one cached dataset of
   cells and counts), not as every animal row: see lib/spatial. */
export default function MapPage() {
  return (
    <AppShell flush>
      <div className="sm-host">
        <Suspense fallback={null}>
          <SpatialMap scope="public" />
        </Suspense>
      </div>
    </AppShell>
  );
}
