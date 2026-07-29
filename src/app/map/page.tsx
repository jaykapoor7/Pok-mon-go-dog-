import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";
import { getFeedingZones } from "@/lib/feeding-zones";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Map — StrayPaw",
  description: "The immersive, full-screen map of India's street dogs.",
};

// The immersive full-screen map.
export default async function MapPage() {
  const [dogs, feedingZones] = await Promise.all([getAllDogs(), getFeedingZones()]);
  return <MapView dogs={dogs} feedingZones={feedingZones} />;
}
