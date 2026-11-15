import { PubPage } from "@/sp4/pub/kit";
import { Feeding } from "@/sp4/pub/community/Feeding";
import { toPublic } from "@/sp4/pub/community/spots";
import { getFeedingZones } from "@/lib/feeding-zones";

export const revalidate = 120;
export const metadata = { title: "Feeding spots, StrayPaw", description: "Where street animals are fed regularly, shown by area, so feeders can share the days." };

export default async function FeedingPage() {
  const zones = await getFeedingZones().catch(() => []);
  return <PubPage><Feeding spots={zones.map(toPublic)} /></PubPage>;
}
