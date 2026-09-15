import { AppShell } from "@/components/app/AppShell";
import { CommunityHome } from "@/components/app/CommunityHome";
import { getAllDogs, getRecentSightings } from "@/lib/data";
import { getPublicProgrammes } from "@/lib/public-programmes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your neighbourhood, StrayPaw" };

export default async function ConsoleHome() {
  const [sightings, dogs, programmes] = await Promise.all([getRecentSightings(100), getAllDogs(), getPublicProgrammes()]);
  return <AppShell>
    <CommunityHome dogs={dogs} sightings={sightings} programmes={programmes} />
  </AppShell>;
}
