import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";
import { DEMO_MODE } from "@/lib/config";
import { demoDogs } from "@/lib/demo-sightings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw Delhi — the street dog map",
  description:
    "A live, community-powered map of Delhi's street dogs. Browse sightings, then report your own.",
};

// Map-first: the home screen IS the interactive map.
export default async function HomePage() {
  const realDogs = await getAllDogs();
  // Demo dogs are read-only and isolated; they only ride along on the map view.
  const dogs = DEMO_MODE ? [...realDogs, ...demoDogs] : realDogs;
  return <MapView dogs={dogs} demoMode={DEMO_MODE} />;
}
