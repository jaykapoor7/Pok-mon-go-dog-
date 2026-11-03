import "server-only";

/* Public, read-only reads for Research, with the anonymous key (RLS applies).
   A failed read is reported as unavailable, never as zero. */
const base = () => { const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(); return url && key ? { url, key } : null; };

async function rest<T>(path: string): Promise<T | null> {
  const b = base();
  if (!b) return null;
  try {
    const r = await fetch(`${b.url}/rest/v1/${path}`, { headers: { apikey: b.key, Authorization: `Bearer ${b.key}` }, next: { revalidate: 3600 } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

export type ArchiveCard = { id: string; starts_on: string | null; ends_on: string | null; animals_recorded: number | null; public_summary: string | null };
export const archiveCards = (ids: string[]) => rest<ArchiveCard[]>(`public_programme_cards?select=id,starts_on,ends_on,animals_recorded,public_summary&id=in.(${ids.map(encodeURIComponent).join(",")})`);

export const SURVEY_COLUMNS = ["survey_id", "organisation", "city", "state", "survey", "method", "area", "starts_on", "ends_on", "animals", "sterilised", "not_sterilised", "sterilisation_unknown", "vaccinated", "not_vaccinated", "vaccination_unknown", "sterilised_pct_of_checked", "vaccinated_pct_of_checked", "observations", "collectors", "published_at"] as const;
export const publishedSurveyRows = () => rest<Record<string, unknown>[]>(`published_surveys?select=${SURVEY_COLUMNS.join(",")}&order=published_at.desc&limit=5000`);
