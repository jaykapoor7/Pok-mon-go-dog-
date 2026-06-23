import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";

export const metadata = {
  title: "Explore the map — StrayPaw Delhi",
  description: "A live, clustered map of street dogs spotted across Delhi.",
};

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const dogs = await getAllDogs();
  return <MapView dogs={dogs} />;
}
