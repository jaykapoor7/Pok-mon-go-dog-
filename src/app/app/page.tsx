import { AppShell } from "@/components/app/AppShell";
import { CommunityPatch } from "@/components/app/CommunityPatch";
import { getPublicSpatialCities } from "@/lib/spatial/server";
import { getPublicCaseStoriesPage } from "@/lib/community-case-stories";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your patch, StrayPaw" };

/* The original community home, now backed by one bounded city dataset at a
   time. The lightweight city index lets someone switch place without ever
   materialising the platform register. The recent published-stories pool is a
   bounded read; CommunityPatch narrows it to the chosen patch, so switching
   city re-scopes "finished near you" without a wider read. */
const readStories = unstable_cache(async (city: string | null) => {
  const page = await getPublicCaseStoriesPage({ limit: 60, city });
  if (page.error) throw new Error(page.error);
  return page;
}, ["community-city-stories-v1"], { revalidate: 120 });

export default async function ConsoleHome({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const [cities, params] = await Promise.all([getPublicSpatialCities(80).catch(() => []), searchParams]);
  const requested = params.city === "New Delhi" ? "Delhi" : params.city === "Secunderabad" ? "Hyderabad" : params.city;
  const city = cities.find(c => c.city === requested)?.city ?? [...cities].filter(c => c.cells > 1).sort((a,b) => (b.latest_seen ?? "").localeCompare(a.latest_seen ?? "") || b.animals-a.animals)[0]?.city ?? cities[0]?.city ?? null;
  const storyPage = await readStories(city).catch(() => ({ rows: [], next: null, error: "Recent stories could not be loaded." }));
  return (
    <AppShell>
      <CommunityPatch
        stories={storyPage.rows}
        storyError={Boolean(storyPage.error)}
        availableCities={cities.map((item) => ({ city: item.city, state: item.state }))}
      />
    </AppShell>
  );
}
