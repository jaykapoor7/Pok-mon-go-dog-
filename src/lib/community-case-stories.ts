import { getSupabase, getSupabaseAdmin } from "./supabase";
import { isClosedStatus } from "./rescue-taxonomy";

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

export async function getPublicCaseStoriesPage(input: { limit?: number; before?: { occurredAt: string; id: string } | null } = {}): Promise<PublicCaseStoryPage> {
  const supa = getSupabase();
  if (!supa) return { rows: [], next: null, error: "The public record store is unavailable." };
  const limit = Math.max(1, Math.min(100, input.limit ?? 48));
  let query = supa.from("public_case_stories")
    .select("id,dog_id,ngo_id,ngo_name,category,status,title,zone,occurred_at,resolved_at,outcome,animal_name,animal_code,species,cover_photo")
    .order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);
  if (input.before) query = query.or(`occurred_at.lt.${input.before.occurredAt},and(occurred_at.eq.${input.before.occurredAt},id.lt.${input.before.id})`);
  const { data, error } = await query;
  if (error) return { rows: [], next: null, error: error.message || "The public record could not be read." };
  const all = (data ?? []) as PublicCaseStory[];
  const rows = all.slice(0, limit);
  const tail = all.length > limit ? rows[rows.length - 1] : null;
  return { rows, next: tail ? { occurredAt: tail.occurred_at, id: tail.id } : null, error: null };
}

export async function getPublicCaseStories(limit = 120): Promise<PublicCaseStory[]> {
  const page = await getPublicCaseStoriesPage({ limit: Math.min(100, limit) });
  return enrichHistoricalCases(page.rows);
}

function mapTimelineRow(row: any): PublicTimelineEvent {
  return {
    id: row.id,
    dog_id: row.dog_id ?? null,
    ngo_id: row.ngo_id ?? null,
    ngo_name: row.ngo_name ?? null,
    title: row.title ?? "Field activity",
    occurred_at: row.occurred_at,
    zone: row.zone ?? null,
  };
}

/** Generic public activity feed. The limit is intentional for timeline pages. */
export async function getPublicTimeline(limit = 500): Promise<PublicTimelineEvent[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("public_field_activity")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map(mapTimelineRow);
}

/**
 * Complete public care ledger. Filtering in the database, then paging, avoids
 * silently losing older medical events once case volume grows.
 */
export async function getPublicCareTimeline(limit = 500): Promise<PublicTimelineEvent[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("public_field_activity")
    .select("id,dog_id,ngo_id,ngo_name,title,occurred_at,zone")
    .like("id", "medical:%")
    .order("occurred_at", { ascending: false })
    .limit(Math.min(800, Math.max(1, limit)));
  if (error) return [];
  return (data ?? []).map(mapTimelineRow);
}

/** Care is read only for the current story page. A public story must never
 * cause the global timeline to be scanned just to establish its care. */
export async function getPublicCareForDogs(dogIds: string[]): Promise<PublicTimelineEvent[]> {
  const ids = [...new Set(dogIds.filter(Boolean))].slice(0, 100);
  const supa = getSupabase();
  if (!supa || !ids.length) return [];
  /* Stories only need the current page's care. Query the small care fact
   * projection directly instead of the platform-wide public_field_activity
   * union, which became a hotspot after the imports. */
  const { data, error } = await supa
    .from("public_care_facts")
    .select("id,dog_id,kind,event_date")
    .in("dog_id", ids)
    .order("event_date", { ascending: false })
    .limit(800);
  if (error) return [];
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
export async function getPublishedCaseStoriesPage(input: { limit?: number; before?: { occurredAt: string; id: string } | null } = {}): Promise<PublishedCaseStoryPage> {
  const page = await getPublicCaseStoriesPage(input);
  const cases = await enrichHistoricalCases(page.rows);
  const care = await getPublicCareForDogs(cases.map((story) => story.dog_id));
  const animalsWithCare = new Set(care.map((event) => event.dog_id).filter((id): id is string => Boolean(id)));
  return { next: page.next, error: page.error ?? null, care, rows: cases.filter((story) => {
    const hasIdentity = Boolean(story.dog_id && story.title?.trim() && story.occurred_at);
    if (!hasIdentity) return false;

    if (story.ngo_name === "The Kind Hour Foundation") return true;

    return Boolean(
      story.outcome?.trim() &&
      isClosedStatus(story.status) &&
      animalsWithCare.has(story.dog_id),
    );
  }) };
}

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

export async function getPublishedCaseStories(limit = 48): Promise<PublicCaseStory[]> {
  const page = await getPublishedCaseStoriesPage({ limit: Math.min(100, limit) });
  return page.rows;
}
