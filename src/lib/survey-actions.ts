"use client";

import { getSupabase } from "./supabase";

export async function createSurvey(title: string, species: string, description?: string): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-survey";
  const { data, error } = await supa.rpc("create_survey", {
    p_title: title,
    p_species: species,
    p_description: description || null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function addSurveyArea(
  surveyId: string,
  name: string,
  code?: string,
  target?: number | null
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("add_survey_area", {
    p_survey_id: surveyId,
    p_name: name,
    p_code: code || null,
    p_target: target ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export interface SurveyResponseInput {
  surveyId: string;
  areaId?: string | null;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
  species?: string | null;
  count?: number;
  attributes?: Record<string, unknown>;
  notes?: string | null;
}

export async function submitSurveyResponse(input: SurveyResponseInput): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-response";
  const { data, error } = await supa.rpc("submit_survey_response", {
    p_survey_id: input.surveyId,
    p_area_id: input.areaId ?? null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_species: input.species ?? null,
    p_count: input.count ?? 1,
    p_attributes: input.attributes ?? {},
    p_notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}
