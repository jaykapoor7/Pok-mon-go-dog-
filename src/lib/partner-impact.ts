import { getSupabase } from "./supabase";

export type PartnerImpact = {
  animals: number;
  cases: number;
  resolvedCases: number;
  followups: number;
  careEvents: number;
  vaccinations: number;
  sterilisations: number;
  treatments: number;
  programmes: number;
};

async function count(table: string, apply?: (query: any) => any) {
  const supa = getSupabase();
  if (!supa) return 0;
  let query: any = supa.from(table).select("id", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count: total, error } = await query;
  return error ? 0 : Number(total ?? 0);
}

/**
 * Authenticated/RLS-scoped operational totals for the signed-in NGO.
 * These deliberately count the native tables populated by imports as well as
 * live work, so a historical register does not disappear behind "0" tiles.
 */
export async function getPartnerImpact(): Promise<PartnerImpact> {
  const [animals, cases, resolvedCases, followups, careEvents, vaccinations, sterilisations, treatments, programmes] = await Promise.all([
    count("dogs"),
    count("cases"),
    count("cases", (q) => q.in("status", ["resolved", "closed"])),
    count("animal_followups"),
    count("medical_events"),
    count("medical_events", (q) => q.eq("kind", "vaccination")),
    count("medical_events", (q) => q.eq("kind", "sterilisation")),
    count("medical_events", (q) => q.in("kind", ["treatment", "chemotherapy", "surgery", "wound_care", "diagnostic", "rehabilitation", "checkup"])),
    count("campaigns"),
  ]);
  return { animals, cases, resolvedCases, followups, careEvents, vaccinations, sterilisations, treatments, programmes };
}
