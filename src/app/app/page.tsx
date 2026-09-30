import { AppShell } from "@/components/app/AppShell";
import { CommunityPatch } from "@/components/app/CommunityPatch";
import { getPublicSpatialCities } from "@/lib/spatial/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* The original community home, now backed by one bounded city dataset at a
   time. The lightweight city index lets someone switch place without ever
   materialising the platform register. */
export default async function ConsoleHome() {
  const cities = await getPublicSpatialCities(80).catch(() => []);
  return (
    <AppShell>
      <CommunityPatch
        stories={[]}
        availableCities={cities.map((item) => ({ city: item.city, state: item.state }))}
      />
    </AppShell>
  );
}
