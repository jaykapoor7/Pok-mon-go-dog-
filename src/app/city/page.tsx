import { Suspense } from "react";
import { Atlas } from "@/sp/atlas/Atlas";
import { CITY_LAYERS } from "@/sp/atlas/lenses";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";

export const metadata = {
  title: "City evidence map, StrayPaw",
  description: "Municipal evidence layers for street-animal programmes: ABC, ARV, requests and follow-ups by area, with method, source, precision and gaps shown before any figure.",
};
export const revalidate = 300;

/* Municipality · Map: the geographic command view (decisions 023, 034). */
export default async function CityMapPage() {
  const [cities, unplaced] = await Promise.all([getMapCities().catch(() => []), getUnplaced().catch(() => [])]);
  return <Suspense fallback={null}><Atlas variant="city" lenses={CITY_LAYERS} more={["care", "help", "orgs", "treat"]} defaultLens="abc" initialCities={cities} initialUnplaced={unplaced} /></Suspense>;
}
