import { AppShell } from "@/components/app/AppShell";
import { CommunityPatch } from "@/components/app/CommunityPatch";
import { getPublicSpatialCities } from "@/lib/spatial/server";
import { getPublicCaseStoriesPage } from "@/lib/community-case-stories";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* The original community home, now backed by one bounded city dataset at a
   time. The lightweight city index lets someone switch place without ever
   materialising the platform register. The recent published-stories pool is a
   bounded read; CommunityPatch narrows it to the chosen patch, so switching
   city re-scopes "finished near you" without a wider read. */
export default async function ConsoleHome() {
  const [cities, storyPage] = await Promise.all([
    getPublicSpatialCities(80).catch(() => []),
    getPublicCaseStoriesPage({ limit: 60 }).catch(() => ({ rows: [], next: null, error: null })),
  ]);
  return (
    <AppShell>
      <CommunityPatch
        stories={storyPage.rows}
        availableCities={cities.map((item) => ({ city: item.city, state: item.state }))}
      />
    </AppShell>
  );
}
