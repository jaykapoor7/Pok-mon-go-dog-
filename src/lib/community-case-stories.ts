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
  const kindHour = rows.filter((row) => row.ngo_name === "The Kind Hour Foundation");
  if (!kindHour.length) return rows;

  const admin = getSupabaseAdmin();
  if (!admin) return rows;
  const dischargeByCase = new Map<string, string>();
  for (let from = 0; from < kindHour.length; from += 100) {
    const ids = kindHour.slice(from, from + 100).map((row) => row.id);
    const { data } = await admin
      .from("import_rows")
      .select("imported_case_id,normalized")
      .in("imported_case_id", ids);
    for (const row of data ?? []) {
      const release = row.normalized?.release_date;
      if (row.imported_case_id && typeof release === "string" && Number.isFinite(Date.parse(release))) {
        dischargeByCase.set(row.imported_case_id, release);
      }
    }
  }
  return rows.map((row) => ({
    ...row,
    source_discharge_at: dischargeByCase.get(row.id) ?? null,
  }));
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
export async function getPublishedCaseStories(): Promise<PublicCaseStory[]> {
  const [cases, care] = await Promise.all([getPublicCaseStories(), getPublicCareTimeline()]);
  const animalsWithCare = new Set(care.map((event) => event.dog_id).filter((id): id is string => Boolean(id)));
  return cases.filter((story) => {
    const hasIdentity = Boolean(story.dog_id && story.title?.trim() && story.occurred_at);
    if (!hasIdentity) return false;

    if (story.ngo_name === "The Kind Hour Foundation") return true;

    return Boolean(
      story.outcome?.trim() &&
      isClosedStatus(story.status) &&
      animalsWithCare.has(story.dog_id),
    );
  });
}
