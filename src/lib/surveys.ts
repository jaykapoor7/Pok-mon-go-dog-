import { getSupabase } from "./supabase";
import type { Survey, SurveyArea, SurveyResponse } from "./types";

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

export async function getSurveys(): Promise<Survey[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("surveys").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapSurvey);
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("surveys").select("*").eq("id", id).maybeSingle();
  return data ? mapSurvey(data) : null;
}

/** Areas of a survey, each with derived response + animal counts. */
export async function getSurveyAreas(surveyId: string): Promise<SurveyArea[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const [{ data: areas }, { data: responses }] = await Promise.all([
    supa.from("survey_areas").select("*").eq("survey_id", surveyId).order("created_at"),
    supa.from("survey_responses").select("area_id, count").eq("survey_id", surveyId),
  ]);
  const byArea = new Map<string, { responses: number; animals: number }>();
  for (const r of responses ?? []) {
    if (!r.area_id) continue;
    const cur = byArea.get(r.area_id) ?? { responses: 0, animals: 0 };
    cur.responses += 1;
    cur.animals += r.count ?? 1;
    byArea.set(r.area_id, cur);
  }
  return (areas ?? []).map((a: any) => ({
    id: a.id,
    survey_id: a.survey_id,
    name: a.name,
    code: a.code ?? null,
    target_count: a.target_count ?? null,
    status: a.status ?? "pending",
    response_count: byArea.get(a.id)?.responses ?? 0,
    animal_count: byArea.get(a.id)?.animals ?? 0,
  }));
}

export async function getSurveyResponses(surveyId: string, limit = 500): Promise<SurveyResponse[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("survey_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: any) => ({
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
