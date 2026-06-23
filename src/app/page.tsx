import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw Delhi — the street dog map",
  description:
    "A live, community-powered map of Delhi's street dogs. Browse sightings, then report your own.",
};

// Map-first: the home screen IS the interactive map.
export default async function HomePage() {
  const dogs = await getAllDogs();
  return <MapView dogs={dogs} />;
}
