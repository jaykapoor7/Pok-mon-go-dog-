import { getSupabase } from "@/lib/supabase";

export type PublicProgramme = {
  id: string;
  name: string;
  kind: string;
  starts_on: string | null;
  ends_on: string | null;
  zone: string | null;
  public_summary: string | null;
  ngo_name: string;
  ngo_slug: string | null;
  city: string | null;
  state: string | null;
  animals_recorded: number;
  sterilised_recorded: number;
  vaccinated_recorded: number;
};

export type PublicProgrammeCategory = "vaccination" | "sterilisation" | "treatment" | "study" | "other";

export function programmeCategory(programme: PublicProgramme): PublicProgrammeCategory {
  const text = `${programme.kind} ${programme.name} ${programme.public_summary ?? ""}`.toLowerCase();
  if (/vaccin|rabies|\barv\b/.test(text)) return "vaccination";
  if (/sterili|\babc\b|spay|neuter/.test(text)) return "sterilisation";
  if (/survey|census|study|education|awareness|questionnaire/.test(text)) return "study";
  if (/rescue|treatment|\btvt\b|care|medical/.test(text)) return "treatment";
  return "other";
}

export function programmePrimaryTotal(programme: PublicProgramme) {
  const category = programmeCategory(programme);
  if (category === "vaccination") return programme.vaccinated_recorded || programme.animals_recorded;
  if (category === "sterilisation") return programme.sterilised_recorded || programme.animals_recorded;
  return programme.animals_recorded;
}

/** Historical register summaries can contain a verified resolved/closed count
 * even when animal-profile status was never rewritten. Keep that figure
 * separate from the programme's row count rather than guessing from dogs. */
export function programmeCompletedTotal(programme: PublicProgramme) {
  const summary = programme.public_summary ?? "";
  const match = summary.match(/([\d,]+)\s+(?:carry|have)\s+(?:a\s+)?closed or resolved outcome/i);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

export async function getPublicProgrammes(limit = 100): Promise<PublicProgramme[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("public_programme_cards")
    .select("*")
    .order("ends_on", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map((row: any) => ({
    ...row,
    animals_recorded: Number(row.animals_recorded ?? 0),
    sterilised_recorded: Number(row.sterilised_recorded ?? 0),
    vaccinated_recorded: Number(row.vaccinated_recorded ?? 0),
  }));
}

export async function getPublicProgramme(id: string): Promise<PublicProgramme | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("public_programme_cards").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return {
    ...(data as any),
    animals_recorded: Number((data as any).animals_recorded ?? 0),
    sterilised_recorded: Number((data as any).sterilised_recorded ?? 0),
    vaccinated_recorded: Number((data as any).vaccinated_recorded ?? 0),
  };
}
