import { getSupabase } from "./supabase";

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

export async function getPublicCaseStories(): Promise<PublicCaseStory[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const rows: PublicCaseStory[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supa
      .from("public_case_stories")
      .select("*")
      .order("occurred_at", { ascending: false })
      .range(from, from + 499);
    if (error) return rows;
    rows.push(...((data ?? []) as PublicCaseStory[]));
    if (!data || data.length < 500) break;
  }
  return rows;
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
export async function getPublicCareTimeline(): Promise<PublicTimelineEvent[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const rows: PublicTimelineEvent[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supa
      .from("public_field_activity")
      .select("*")
      .like("id", "medical:%")
      .order("occurred_at", { ascending: false })
      .range(from, from + 499);
    if (error) return rows;
    rows.push(...(data ?? []).map(mapTimelineRow));
    if (!data || data.length < 500) break;
  }
  return rows;
}

/**
 * Public stories are outcome records, not a mirror of the entire case table.
 * A story needs a linked animal, an issue, an outcome, a date, and at least
 * one care event. Imported rows with partial or contradictory status data stay
 * in the operational register until the field record is complete.
 */
export async function getPublishedCaseStories(): Promise<PublicCaseStory[]> {
  const [cases, care] = await Promise.all([getPublicCaseStories(), getPublicCareTimeline()]);
  const animalsWithCare = new Set(care.map((event) => event.dog_id).filter((id): id is string => Boolean(id)));
  return cases.filter((story) =>
    Boolean(
      story.dog_id &&
      story.title?.trim() &&
      story.outcome?.trim() &&
      story.occurred_at &&
      animalsWithCare.has(story.dog_id),
    ),
  );
}
