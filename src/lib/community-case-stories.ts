import { getSupabase, getSupabaseAdmin } from "./supabase";
import { unstable_cache } from "next/cache";

export type PublicCaseStory = {
  id: string;
  dog_id: string;
  ngo_id: string | null;
  ngo_name: string | null;
  category: string;
  status: string;
  title: string;
  zone: string | null;
  occurred_at: string;
  resolved_at: string | null;
  outcome: string | null;
  animal_name: string | null;
  animal_code: string | null;
  species: string | null;
  cover_photo: string | null;
  city?: string | null;
  source_discharge_at: string | null;
};

export type PublicTimelineEvent = {
  id: string;
  dog_id: string | null;
  ngo_id: string | null;
  ngo_name: string | null;
  title: string;
  occurred_at: string;
  zone?: string | null;
};

export type PublicCaseStoryPage = { rows: PublicCaseStory[]; next: { occurredAt: string; id: string } | null; error?: string | null };
/* The published page also carries the care timeline it already read to decide
 * which stories qualify, so the page component never fetches it a second time. */
export type PublishedCaseStoryPage = PublicCaseStoryPage & { care: PublicTimelineEvent[] };

export async function getPublicCaseStoriesPage(input: { limit?: number; before?: { occurredAt: string; id: string } | null; city?: string | null } = {}): Promise<PublicCaseStoryPage> {
  const supa = getSupabase();
  if (!supa) return { rows: [], next: null, error: "The public record store is unavailable." };
  const limit = Math.max(1, Math.min(100, input.limit ?? 48));
  let query = supa.from("public_case_stories")
    .select("id,dog_id,ngo_id,ngo_name,category,status,title,zone,occurred_at,resolved_at,outcome,animal_name,animal_code,species,cover_photo,city")
    .order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
  /* Scope by city BEFORE paginating, so a page is one city's stories and the
     count that accompanies it is that city's, never a merge of every city. */
  const city = input.city?.trim();
  if (city) query = city === "Delhi" ? query.in("city", ["Delhi", "New Delhi"]) : city === "Hyderabad" ? query.in("city", ["Hyderabad", "Secunderabad"]) : query.ilike("city", city);
  if (input.before) query = query.or(`occurred_at.lt.${input.before.occurredAt},and(occurred_at.eq.${input.before.occurredAt},id.lt.${input.before.id})`);
  const { data, error } = await query;
  if (error) return { rows: [], next: null, error: error.message || "The public record could not be read." };
  const all = (data ?? []) as PublicCaseStory[];
  const rows = all.slice(0, limit);
  const tail = all.length > limit ? rows[rows.length - 1] : null;
  return { rows, next: tail ? { occurredAt: tail.occurred_at, id: tail.id } : null, error: null };
}

/** Care is read only for the current story page. A public story must never
 * cause the global timeline to be scanned just to establish its care. */
export async function getPublicCareForDogs(dogIds: string[]): Promise<PublicTimelineEvent[]> {
  const ids = [...new Set(dogIds.filter(Boolean))].slice(0, 100);
  const supa = getSupabase();
  if (!ids.length) return [];
  if (!supa) throw new Error("Care records are temporarily unavailable.");
  /* Stories only need the current page's care. Query the small care fact
   * projection directly instead of the platform-wide public_field_activity
   * union, which became a hotspot after the imports. */
  const { data, error } = await supa
    .from("public_care_facts")
    .select("id,dog_id,kind,event_date")
    .in("dog_id", ids)
    .order("event_date", { ascending: false })
    .limit(800);
  if (error) throw new Error("Care records could not be loaded.");
  return (data ?? []).filter((row: any) => row.event_date).map((row: any) => ({
    id: `medical:${row.id}`,
    dog_id: row.dog_id ?? null,
    ngo_id: null,
    ngo_name: null,
    title: row.kind ?? "care",
    occurred_at: row.event_date,
    zone: null,
  }));
}

/**
 * Most public stories are completed outcome records: linked animal, issue,
 * outcome, date and care. Kind Hour is intentionally different. Its supplied
 * rescue ledger is a historical encounter register, and production keeps its
 * unresolved identities as provisional animal records. Those records belong
 * in Stories too, but must never be made to look "completed" just to satisfy
 * the normal story filter.
 *
 * The presentation layer labels Kind Hour rows as historical and only renders
 * care/discharge/outcome facts that are actually on the source record.
 */
async function readPublishedCaseStoriesPage(input: { limit?: number; before?: { occurredAt: string; id: string } | null; city?: string | null } = {}): Promise<PublishedCaseStoryPage> {
  const page = await getPublicCaseStoriesPage(input);
  if (page.error) throw new Error(page.error);
  const cases = await enrichHistoricalCases(page.rows);
  const care = await getPublicCareForDogs(cases.map((story) => story.dog_id));
  return { next: page.next, error: page.error ?? null, care, rows: cases.filter((story) => {
    /* Show the whole rescue record for the scope — ongoing and completed —
       not only cases with a recorded ending. The presentation still adds an
       outcome or discharge only where the source records one (build()), so an
       ongoing case reads as ongoing with no invented ending. A real identity
       (animal + a titled, dated encounter) is all that is required. */
    return Boolean(story.dog_id && story.title?.trim() && story.occurred_at);
  }) };
}
export const getPublishedCaseStoriesPage = unstable_cache(readPublishedCaseStoriesPage, ["published-story-page-v3"], { revalidate: 120 });

/** Authoritative count of distinct animals with a public story, optionally for
 * one city. Never derive the headline count from a page's length. */
async function readPublicCaseStoryCount(city?: string | null): Promise<number | null> {
  const supa = getSupabase();
  /* This is a headline enhancement, not a reason to fail an entire public
     route. `unstable_cache` revalidates independently after it has served a
     page; allowing a bounded Supabase abort to reject here turns a harmless
     refresh into a Vercel runtime error on whichever page happened to read
     it. Keep the verified count when the read succeeds and explicitly omit
     the figure when it does not — never substitute an invented zero. */
  if (!supa) return null;
  try {
    const { data, error } = await supa.rpc("count_public_case_stories", { p_city: city?.trim() || null });
    if (error) return null;
    const count = Number(data);
    return Number.isFinite(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}
export const countPublicCaseStories = unstable_cache(readPublicCaseStoryCount, ["public-story-count-v3"], { revalidate: 300 });

async function enrichHistoricalCases(rows: PublicCaseStory[]): Promise<PublicCaseStory[]> {
  const kindHour = rows.filter((row) => row.ngo_name === "The Kind Hour Foundation");
  if (!kindHour.length) return rows;
  const admin = getSupabaseAdmin();
  if (!admin) return rows;
  const dischargeByCase = new Map<string, string>();
  for (let from = 0; from < kindHour.length; from += 100) {
    const ids = kindHour.slice(from, from + 100).map((row) => row.id);
    const { data } = await admin.from("import_rows").select("imported_case_id,normalized").in("imported_case_id", ids);
    for (const row of data ?? []) {
      const release = row.normalized?.release_date;
      if (row.imported_case_id && typeof release === "string" && Number.isFinite(Date.parse(release))) dischargeByCase.set(row.imported_case_id, release);
    }
  }
  return rows.map((row) => ({ ...row, source_discharge_at: dischargeByCase.get(row.id) ?? null }));
}
