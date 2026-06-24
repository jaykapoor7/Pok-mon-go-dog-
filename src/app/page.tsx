import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";
import { DEMO_MODE } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw Delhi — the street dog map",
  description:
    "A live, community-powered map of Delhi's street dogs. Browse sightings, then report your own.",
};

// Map-first: the home screen IS the interactive map. Demo dogs are merged
// client-side in MapView so they can be toggled on/off live.
export default async function HomePage() {
  const realDogs = await getAllDogs();
  return <MapView dogs={realDogs} demoDefault={DEMO_MODE} />;
}
