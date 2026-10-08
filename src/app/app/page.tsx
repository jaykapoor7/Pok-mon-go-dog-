import { AppShell } from "@/components/app/AppShell";
import { CommunityDash } from "@/components/dash/CommunityDash";
import { getPublicSpatialCities } from "@/lib/spatial/server";
import { getPublicCaseStoriesPage } from "@/lib/community-case-stories";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nearby, StrayPaw" };

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

const noStories = { rows: [], next: null, error: "Recent stories could not be loaded." };

/** Keep the community route responsive when a city-scoped public read stalls.
 * The underlying read still warms the short cache when it completes; this only
 * chooses the page's existing honest empty/error state over a stalled render. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Story read timed out.")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

export default async function ConsoleHome({ searchParams }: { searchParams: Promise<{ city?: string; view?: string }> }) {
  const [cities, params] = await Promise.all([getPublicSpatialCities(80).catch(() => []), searchParams]);
  const requested = params.city === "New Delhi" ? "Delhi" : params.city === "Secunderabad" ? "Hyderabad" : params.city;
  const city = cities.find(c => c.city === requested)?.city ?? [...cities].filter(c => c.cells > 1).sort((a,b) => (b.latest_seen ?? "").localeCompare(a.latest_seen ?? "") || b.animals-a.animals)[0]?.city ?? cities[0]?.city ?? null;
  const storyPage = await within(readStories(city), 4_000).catch(() => noStories);
  return (
    <AppShell>
      <CommunityDash
        stories={storyPage.rows}
        availableCities={cities.map((item) => ({ city: item.city, state: item.state }))}
        defaultCity={city}
      />
    </AppShell>
  );
}
