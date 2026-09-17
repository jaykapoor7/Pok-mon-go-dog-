import { getSupabase } from "./supabase";

export type PartnerImpact = { animals: number; cases: number; resolvedCases: number; followups: number; careEvents: number; vaccinations: number; sterilisations: number; treatments: number; programmes: number };

async function countRows(table: string, apply?: (query: any) => any) {
  const supa = getSupabase();
  if (!supa) return 0;
  let query: any = supa.from(table).select("id", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  return error ? 0 : Number(count ?? 0);
}

/** Authenticated/RLS-scoped totals across imported history + live work. */
export async function getPartnerImpact(): Promise<PartnerImpact> {
  const [animals, cases, resolvedCases, explicitFollowups, embeddedFollowups, careEvents, vaccinations, sterilisations, treatments, programmes] = await Promise.all([
    countRows("dogs"),
    countRows("cases"),
    countRows("cases", (q) => q.in("status", ["resolved", "closed"])),
    countRows("animal_followups"),
    countRows("animal_timeline_events", (q) => q.like("event_type", "import:followup:%")),
    countRows("medical_events"),
    countRows("medical_events", (q) => q.eq("kind", "vaccination")),
    countRows("medical_events", (q) => q.eq("kind", "sterilisation")),
    countRows("medical_events", (q) => q.in("kind", ["treatment", "chemotherapy", "surgery", "wound_care", "diagnostic", "rehabilitation", "checkup"])),
    countRows("campaigns"),
  ]);
  return { animals, cases, resolvedCases, followups: explicitFollowups + embeddedFollowups, careEvents, vaccinations, sterilisations, treatments, programmes };
}
