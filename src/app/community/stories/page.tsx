import { Stories } from "@/sp/community/more/Stories";
import { countPublicCaseStories, getPublishedCaseStoriesPage } from "@/lib/community-case-stories";
import { getMapCities } from "@/lib/livingmap/server";

export const revalidate = 120;
export const metadata = { title: "Stories, StrayPaw", description: "Street animals whose requests for help are on the public record, from the day someone asked to where the record stops." };

type StoriesPage = Awaited<ReturnType<typeof getPublishedCaseStoriesPage>>;
/* The last page that loaded, per filter, kept in this server's memory: a slow
   first read (a cold start right after a release) retries once quietly, and if
   it still fails the reader sees the last good page instead of an error. */
const lastGood = new Map<string, StoriesPage>();
async function readStories(q: Parameters<typeof getPublishedCaseStoriesPage>[0]): Promise<StoriesPage> {
  const key = JSON.stringify(q);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const page = await getPublishedCaseStoriesPage(q);
      if (page.error) throw new Error(page.error);
      if (lastGood.size > 50) lastGood.clear();
      lastGood.set(key, page);
      return page;
    } catch (e) {
      if (attempt === 0) { await new Promise((r) => setTimeout(r, 400)); continue; }
      const kept = lastGood.get(key);
      return kept ?? { rows: [], care: [], next: null, error: (e as Error).message };
    }
  }
  return { rows: [], care: [], next: null, error: "not read" };
}

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ city?: string; before?: string; id?: string }> }) {
  const q = await searchParams;
  const city = q.city?.trim() || null;
  const before = q.before && q.id ? { occurredAt: q.before, id: q.id } : null;
  const [page, total, cities] = await Promise.all([
    readStories({ limit: 12, before, city }),
    countPublicCaseStories(city).catch(() => null),
    getMapCities().catch(() => []),
  ]);
  const next = page.next ? `/community/stories?${new URLSearchParams({ ...(city ? { city } : {}), before: page.next.occurredAt, id: page.next.id })}` : null;
  return <Stories rows={page.rows} care={page.care} total={total} cities={cities.filter((c) => c.cases > 0).map((c) => c.city).slice(0, 12)} city={city} next={next} error={page.error ?? null} />;
}
