import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Map — StrayPaw",
  description: "The immersive, full-screen map of India's street dogs.",
};

// The immersive full-screen map. Demo dogs are merged client-side in MapView.
export default async function MapPage() {
  const realDogs = await getAllDogs();
  return <MapView dogs={realDogs} />;
}
