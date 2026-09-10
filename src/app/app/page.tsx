import { AppShell } from "@/components/app/AppShell";
import { CommunityHome } from "@/components/app/CommunityHome";
import { getAllDogs, getRecentSightings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your neighbourhood, StrayPaw" };

export default async function ConsoleHome() {
  const [sightings, dogs] = await Promise.all([getRecentSightings(100), getAllDogs()]);
  return <AppShell>
    <CommunityHome dogs={dogs} sightings={sightings} />
  </AppShell>;
}
