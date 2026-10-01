import { getSupabase } from "./supabase";
import type { Survey, SurveyArea, SurveyResponse } from "./types";

export const PROJECT_MARKER = "STRAYPAW_PROJECT_FIELDS:";
export const isProjectSurvey = (survey: Pick<Survey, "description">) => (survey.description ?? "").includes(PROJECT_MARKER);

function mapSurvey(r: any): Survey {
  return {
    id: r.id,
    ngo_id: r.ngo_id ?? null,
    title: r.title,
    species: r.species ?? "dog",
    description: r.description ?? null,
    status: r.status ?? "active",
    created_by_id: r.created_by_id ?? null,
    created_at: r.created_at,
  };
}

async function paged(load: (from: number, to: number) => any, max = 25000) {
  const rows: any[] = [];
  for (let from = 0; from < max; from += 500) {
    const to = Math.min(from + 499, max - 1);
    const { data, error } = await load(from, to);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows;
}

export async function getSurveys(): Promise<Survey[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("surveys").select("id,ngo_id,title,species,description,status,created_by_id,created_at").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map(mapSurvey);
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.from("surveys").select("id,ngo_id,title,species,description,status,created_by_id,created_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapSurvey(data) : null;
}

/** Areas of a survey, each with derived response + animal counts. */
export async function getSurveyAreas(surveyId: string): Promise<SurveyArea[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("survey_area_counts", { p_survey_id: surveyId });
  if (error) throw error;
  return (data ?? []) as SurveyArea[];
}

/**
 * Load large field projects safely instead of inheriting Supabase's 1,000-row
 * response ceiling. max is a caller-controlled safety bound, not a page size.
 */
export async function getSurveyResponses(surveyId: string, max = 25000): Promise<SurveyResponse[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const rows = await paged(
    (from, to) => supa
      .from("survey_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: false })
      .range(from, to),
    max,
  );
  return rows.map((r: any) => ({
    id: r.id,
    survey_id: r.survey_id,
    area_id: r.area_id ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    photo_url: r.photo_url ?? null,
    species: r.species ?? null,
    count: r.count ?? 1,
    attributes: r.attributes ?? {},
    notes: r.notes ?? null,
    created_at: r.created_at,
  }));
}

export async function getSurveyTotals(id: string): Promise<{ areas: number; responses: number; animals: number; covered: number }> {
 const supa = getSupabase();
 if (!supa) throw new Error("The record service is unavailable.");
 const { data,error } = await supa.rpc("survey_totals", { p_survey_id: id });
 if (error) throw error;
 return data;
}
