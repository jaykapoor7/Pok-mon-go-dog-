import { Stories } from "@/sp/community/more/Stories";
import { countPublicCaseStories, getPublishedCaseStoriesPage } from "@/lib/community-case-stories";
import { getMapCities } from "@/lib/livingmap/server";

export const revalidate = 120;
export const metadata = { title: "Stories, StrayPaw", description: "Street animals whose requests for help are on the public record, from the day someone asked to where the record stops." };

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ city?: string; before?: string; id?: string }> }) {
  const q = await searchParams;
  const city = q.city?.trim() || null;
  const before = q.before && q.id ? { occurredAt: q.before, id: q.id } : null;
  const [page, total, cities] = await Promise.all([
    getPublishedCaseStoriesPage({ limit: 24, before, city }).catch((e: Error) => ({ rows: [], care: [], next: null, error: e.message })),
    countPublicCaseStories(city).catch(() => null),
    getMapCities().catch(() => []),
  ]);
  const next = page.next ? `/community/stories?${new URLSearchParams({ ...(city ? { city } : {}), before: page.next.occurredAt, id: page.next.id })}` : null;
  return <Stories rows={page.rows} care={page.care} total={total} cities={cities.filter((c) => c.cases > 0).map((c) => c.city).slice(0, 12)} city={city} next={next} error={page.error ?? null} />;
}
