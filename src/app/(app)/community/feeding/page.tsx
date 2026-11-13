import { Feeding } from "@/sp/community/more/Feeding";
import { toPublic } from "@/sp/community/more/spots";
import { getFeedingZones } from "@/lib/feeding-zones";

export const revalidate = 120;
export const metadata = { title: "Feeding spots, StrayPaw", description: "Where street animals are fed regularly, shown by area, so feeders can share the days." };

export default async function FeedingPage() {
  const zones = await getFeedingZones().catch(() => []);
  return <Feeding spots={zones.map(toPublic)} />;
}
