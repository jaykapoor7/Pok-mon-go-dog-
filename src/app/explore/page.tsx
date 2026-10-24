import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FieldMap } from "@/sp/map/FieldMap";
import { MapSkeleton } from "@/sp/map/MapSkeleton";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";
import "@/components/site/site.css";
import "@/components/production/production.css";
export const revalidate = 300;
export const metadata = { title: "Explore the Living Atlas, StrayPaw", description: "Explore real animal records across India, from cities to recorded areas and individual histories." };
export default async function ExplorePage() {
 const [cities, unplaced] = await Promise.all([
   getMapCities().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
   getUnplaced().then((data) => ({ ok: true as const, data })).catch(() => ({ ok: false as const, data: [] })),
 ]);
 const serverFailed = !cities.ok || !unplaced.ok;
 return <div className="atlas-page"><SiteHeader /><main aria-label="Living Atlas"><Suspense fallback={<MapSkeleton label="Opening the Living Atlas…" />}>
   <FieldMap initialCities={cities.data} initialUnplaced={unplaced.data} initialServerFailed={serverFailed} />
 </Suspense></main></div>;
}
