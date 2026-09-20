import { AppShell } from "@/components/app/AppShell";
import { CommunityHome } from "@/components/app/CommunityHome";
import { getAllDogs, getRecentSightings } from "@/lib/data";
import { getPublishedCaseStories } from "@/lib/community-case-stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your neighbourhood, StrayPaw" };

export default async function ConsoleHome() {
  const [sightings, dogs, stories] = await Promise.all([
    getRecentSightings(100),
    getAllDogs(),
    getPublishedCaseStories(),
  ]);
  return <AppShell>
    <CommunityHome dogs={dogs} sightings={sightings} stories={stories} />
  </AppShell>;
}
