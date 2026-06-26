import { MapView } from "@/components/map/MapView";
import { getAllDogs } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — the street dog map",
  description:
    "A live, community-powered map of India's street dogs. Browse sightings, then report your own.",
};

// Map-first: the home screen IS the interactive map. Demo dogs are merged
// client-side in MapView (via DemoModeProvider) so they toggle on/off live.
export default async function HomePage() {
  const realDogs = await getAllDogs();
  return <MapView dogs={realDogs} />;
}
