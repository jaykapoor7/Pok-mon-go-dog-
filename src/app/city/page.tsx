import { Suspense } from "react";
import { FieldMap } from "@/sp/map/FieldMap";
import { MapSkeleton } from "@/sp/map/MapSkeleton";
import { CITY_LAYERS } from "@/sp/atlas/lenses";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";

export const metadata = {
  title: "City evidence map, StrayPaw",
  description: "Municipal evidence layers for street-animal programmes: ABC, ARV, requests and follow-ups by area, with method, source, precision and gaps shown before any figure.",
};
export const revalidate = 300;

/* Municipality · Map: the geographic command view (decisions 023, 034). */
export default async function CityMapPage() {
  const [cities, unplaced] = await Promise.all([
    getMapCities().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
    getUnplaced().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
  ]);
  const serverFailed = !cities.ok || !unplaced.ok;
  return <Suspense fallback={<MapSkeleton label="Reading city evidence…" />}>
    <FieldMap variant="city" lenses={CITY_LAYERS} defaultLens="abc" initialCities={cities.data} initialUnplaced={unplaced.data} initialServerFailed={serverFailed} />
  </Suspense>;
}
