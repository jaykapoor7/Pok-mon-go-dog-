import { Suspense } from "react";
import { PublicMapPreview } from "@/components/marketing/PublicMapPreview";
import { getMapCities, getUnplaced } from "@/lib/livingmap/server";
import "./preview.css";

export const revalidate = 300;
export const metadata = { title: "Living Map · public preview", robots: { index: false, follow: false } };

export default async function MapPreviewPage() {
  const [cities, unplaced] = await Promise.all([getMapCities().catch(() => []), getUnplaced().catch(() => [])]);
  return <main className="public-map-document"><Suspense fallback={<p>Loading the public map…</p>}><PublicMapPreview cities={cities} unplaced={unplaced} /></Suspense><noscript><a href="/explore" target="_top">Open the full map</a>. JavaScript is needed for interactive exploration.</noscript></main>;
}
