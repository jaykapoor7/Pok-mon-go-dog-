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
  source_rows_count: number;
  traceable_animals_recorded: number;
  animals_recorded: number;
  sterilised_recorded: number;
  vaccinated_recorded: number;
};

export type PublicProgrammeCategory = "vaccination" | "sterilisation" | "treatment" | "study" | "other";

export function programmeCategory(programme: PublicProgramme): PublicProgrammeCategory {
  /* The programme's own kind is authoritative. "Jamshedpur ABC and anti-rabies programme" is a
     sterilisation programme; matching "rabies" in its name had filed it under vaccination. */
  const kind = (programme.kind ?? "").toLowerCase();
  if (kind === "vaccination" || kind === "sterilisation" || kind === "treatment") return kind;
  if (kind === "census" || kind === "study" || kind === "survey") return "study";
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

/** What the primary total counts. A vaccination or sterilisation programme with no
 *  vaccination or sterilisation figure of its own shows its animal count, and says
 *  "animals", never "vaccinated" for a number that is only how many are on the record. */
export function programmePrimaryUnit(programme: PublicProgramme): string {
  const category = programmeCategory(programme);
  if (category === "vaccination") return programme.vaccinated_recorded ? "vaccinated" : "animals on record";
  if (category === "sterilisation") return programme.sterilised_recorded ? "sterilised" : "animals on record";
  return category === "study" ? "observed" : "records";
}

export function programmeCompletedTotal(programme: PublicProgramme) {
  const summary = programme.public_summary ?? "";
  const match = summary.match(/([\d,]+)\s+(?:carry|have)\s+(?:a\s+)?closed or resolved outcome/i);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

function normalise(row:any):PublicProgramme {
  return {
    ...row,
    source_rows_count:Number(row.source_rows_count??0),
    traceable_animals_recorded:Number(row.traceable_animals_recorded??0),
    animals_recorded:Number(row.animals_recorded??0),
    sterilised_recorded:Number(row.sterilised_recorded??0),
    vaccinated_recorded:Number(row.vaccinated_recorded??0),
  };
}

/** Programme cards that summarise published research and public datasets,
 * not operational programme work on StrayPaw (record-level manifest:
 * docs/sp4/DATA-PROVENANCE.md). They stay readable by id, for citation, but
 * are not listed or counted as programmes. Reversible: remove an id here. */
export const RESEARCH_ARCHIVE_PROGRAMME_IDS = new Set([
  "abbd502c-ef23-4248-8e90-2b0cb8927b52", // HSI Jamshedpur CNVR clinical records, 2013–2016
  "4fdb16ca-de99-473c-a480-6f300f0e687a", // Mission Rabies Ranchi public dataset, 2014–2015
  "f2a9fb35-01f9-4ab9-8a40-149747afbd48", // IISER Kolkata free-ranging dog studies
]);
export const isResearchArchiveProgramme = (id: string | null | undefined) => !!id && RESEARCH_ARCHIVE_PROGRAMME_IDS.has(id);

export async function getPublicProgrammes(limit = 100): Promise<PublicProgramme[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("public_programme_cards").select("*").order("ends_on", { ascending: false, nullsFirst: false }).limit(limit + RESEARCH_ARCHIVE_PROGRAMME_IDS.size);
  return (data ?? []).filter((r: { id: string }) => !isResearchArchiveProgramme(r.id)).slice(0, limit).map(normalise);
}

export async function getPublicProgramme(id: string): Promise<PublicProgramme | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("public_programme_cards").select("*").eq("id", id).maybeSingle();
  return data ? normalise(data) : null;
}
