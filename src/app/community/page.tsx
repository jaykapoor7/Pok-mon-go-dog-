import { Suspense } from "react";
import { Atlas } from "@/sp/atlas/Atlas";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";

export const metadata = {
  title: "Map, StrayPaw",
  description: "The Living Field Atlas of India's street animals: where animals are recorded, where they need help, open requests and recorded care, at the precision each record supports.",
};
export const revalidate = 300;

/* Community · Map. The national reading is rendered into the page from the
   database's snapshot, so India draws without waiting on a request. */
export default async function CommunityMapPage() {
  const [cities, unplaced] = await Promise.all([getMapCities().catch(() => []), getUnplaced().catch(() => [])]);
  return <Suspense fallback={null}><Atlas variant="community" initialCities={cities} initialUnplaced={unplaced} /></Suspense>;
}
