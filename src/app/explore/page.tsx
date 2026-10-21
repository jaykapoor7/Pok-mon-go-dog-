import { Suspense } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { FieldMap } from "@/sp/map/FieldMap";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";
import "@/components/site/site.css";
import "@/components/production/production.css";
export const revalidate = 300;
export const metadata = { title: "Explore the Living Atlas, StrayPaw", description: "Explore real animal records across India, from cities to recorded areas and individual histories." };
export default async function ExplorePage() {
 const [cities, unplaced] = await Promise.all([getMapCities().catch(() => []), getUnplaced().catch(() => [])]);
 return <div className="atlas-page"><SiteHeader /><main aria-label="Living Atlas"><Suspense fallback={<p role="status">Opening the map…</p>}><FieldMap initialCities={cities} initialUnplaced={unplaced} /></Suspense></main></div>;
}
