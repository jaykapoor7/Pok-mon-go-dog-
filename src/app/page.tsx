import { TodayClient } from "@/components/today/TodayClient";
import { getAllDogs, getAllSightings } from "@/lib/data";
import { getNewsTeaser } from "@/lib/news";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "StrayPaw — Today",
  description:
    "Dogs near you who need help, this week's top guardians, and live community activity for India's street dogs.",
};

// Home is now a "Today" mission dashboard; the immersive map lives at /map.
export default async function HomePage() {
  const [dogs, sightings, news] = await Promise.all([
    getAllDogs(),
    getAllSightings(60),
    getNewsTeaser(3),
  ]);
  return <TodayClient dogs={dogs} sightings={sightings} news={news} />;
}
