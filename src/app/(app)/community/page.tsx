import { Suspense } from "react";
import { FieldMap } from "@/sp/map/FieldMap";
import { MapSkeleton } from "@/sp/map/MapSkeleton";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";

export const metadata = {
  title: "Map, StrayPaw",
  description: "The Map of India's street animals: where animals are recorded, where they need help, open requests and recorded sterilisation, at the precision each record supports.",
};
export const revalidate = 300;

/* Community · Map. The national reading is rendered into the page from the
   database's snapshot, so India draws without waiting on a request. If the
   snapshot read fails on the server, the client is told so it can surface a
   real error ("the index could not be read") rather than a false "no records". */
export default async function CommunityMapPage() {
  const [cities, unplaced] = await Promise.all([
    getMapCities().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
    getUnplaced().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
  ]);
  const serverFailed = !cities.ok || !unplaced.ok;
  return <Suspense fallback={<MapSkeleton label="Reading the national record" />}>
    <FieldMap initialCities={cities.data} initialUnplaced={unplaced.data} initialServerFailed={serverFailed} />
  </Suspense>;
}
