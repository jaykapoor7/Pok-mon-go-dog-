import { MapView } from "@/components/map/MapView";
import { AppShell } from "@/components/app/AppShell";
import { getAllDogs, getPublicFieldActivity } from "@/lib/data";
import { getFeedingZones } from "@/lib/feeding-zones";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Map, StrayPaw",
  description:
    "Signals, studies, needs and outcomes on one map. Zoom from a city to a cluster and see what is known, what is missing, and who can execute.",
};

export default async function MapPage() {
  const [dogs, feedingZones, fieldActivity] = await Promise.all([getAllDogs(), getFeedingZones(), getPublicFieldActivity()]);
  return (
    <AppShell flush>
      <MapView dogs={dogs} feedingZones={feedingZones} fieldActivity={fieldActivity} />
    </AppShell>
  );
}
