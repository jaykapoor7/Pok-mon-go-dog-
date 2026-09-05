"use client";

import { getSupabase } from "./supabase";

/* The published dataset.

   Read-only and public. Nothing here identifies a person: no reporter
   names, no exact coordinates, no contact details. What it carries is what
   makes a figure checkable, which is the area, the method, the dates, the
   counts, and how many observations and people it rests on. */

export type PublishedSurvey = {
  survey_id: string;
  organisation: string;
  city: string | null;
  state: string | null;
  survey: string;
  method: string;
  area: string;
  starts_on: string | null;
  ends_on: string | null;
  animals: number;
  sterilised: number;
  not_sterilised: number;
  sterilisation_unknown: number;
  vaccinated: number;
  not_vaccinated: number;
  vaccination_unknown: number;
  sterilised_pct_of_checked: number | null;
  vaccinated_pct_of_checked: number | null;
  observations: number;
  collectors: number;
  published_at: string;
};

export type PublishedTotals = {
  surveys: number;
  organisations: number;
  areas: number;
  states: number;
  animals: number;
  sterilised: number;
  not_sterilised: number;
  sterilisation_unknown: number;
  vaccinated: number;
  not_vaccinated: number;
  vaccination_unknown: number;
  observations: number;
  collectors: number;
  first_survey: string | null;
  last_survey: string | null;
  sterilised_pct_of_checked: number | null;
  vaccinated_pct_of_checked: number | null;
};

export async function publishedSurveys(): Promise<PublishedSurvey[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("published_surveys")
    .select("*")
    .order("starts_on", { ascending: false, nullsFirst: false })
    .limit(1000);
  if (error || !Array.isArray(data)) return [];
  return data as PublishedSurvey[];
}

export async function publishedTotals(): Promise<PublishedTotals | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.rpc("published_totals");
  if (error || !data) return null;
  return data as PublishedTotals;
}

/** One row per survey, in the order the table shows them. */
export function surveysToCsv(rows: PublishedSurvey[]): string {
  const cols: (keyof PublishedSurvey)[] = [
    "organisation", "state", "city", "area", "survey", "method",
    "starts_on", "ends_on", "animals",
    "sterilised", "not_sterilised", "sterilisation_unknown",
    "sterilised_pct_of_checked",
    "vaccinated", "not_vaccinated", "vaccination_unknown",
    "vaccinated_pct_of_checked",
    "observations", "collectors",
  ];
  const esc = (v: unknown) => {
    const t = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}
