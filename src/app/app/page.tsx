import { AppShell } from "@/components/app/AppShell";
import { CommunityHome } from "@/components/app/CommunityHome";
import { getAllDogs, getRecentSightings } from "@/lib/data";
import { getPublicProgrammes } from "@/lib/public-programmes";
import { ORGS } from "@/lib/platform/orgs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your neighbourhood, StrayPaw" };

export default async function ConsoleHome() {
  const [sightings, dogs, programmes] = await Promise.all([
    getRecentSightings(100),
    getAllDogs(),
    getPublicProgrammes(100),
  ]);
  return <AppShell>
    <CommunityHome dogs={dogs} sightings={sightings} programmes={programmes} organisationCount={ORGS.length} />
  </AppShell>;
}
