/* The former landing story assembled the complete public spatial register.
 * Keep this compatibility export while the visual shell uses its bounded
 * cards; there is intentionally no fallback that materialises the register. */

import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export type LandingStory = null;

export async function getLandingStory(): Promise<LandingStory> {
  return null;
}

export type RegisterFocus = {
  id: string; name: string | null; straypaw_id: string | null; cover_photo: string; zone: string | null; city: string | null;
  first_seen: string | null; last_seen: string | null; sightings: number; sterilisation: string | null; vaccination: string | null; org: string | null;
  requests: { condition: string | null; at: string; closed: boolean }[]; care: { kind: string; at: string }[];
};
export type AnimalRegister = { total: number; cards: RegisterFocus[] };

/* Landing cards are a fixed, curated sample plus an exact count. Their
 * related case/care reads are bounded to those card ids, never a register. */
export const getAnimalRegister = unstable_cache(async (): Promise<AnimalRegister> => {
  const supa = getSupabase();
  if (!supa) return { total: 0, cards: [] };
  const [{ count }, { data, error }] = await Promise.all([
    supa.from("public_spatial_animals").select("id", { count: "exact", head: true }),
    supa.from("public_spatial_animals").select("id,name,straypaw_id,cover_photo,zone,city,first_seen,last_seen,sightings_count,sterilisation_status,vaccination_status,status,needs_help,ngo_id")
      .eq("source", "resident").not("cover_photo", "is", null).neq("cover_photo", "").order("last_seen", { ascending: false }).limit(80),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Array<any>;
  const picks = rows.filter((row) => row.cover_photo?.trim() && !row.needs_help && row.status !== "injured").slice(0, 8);
  const ids = picks.map((row) => row.id);
  const [{ data: cases }, { data: care }] = ids.length ? await Promise.all([
    supa.from("public_case_facts").select("dog_id,condition_class,status_class,occurred_at").in("dog_id", ids).order("occurred_at", { ascending: false }).limit(160),
    supa.from("public_care_facts").select("dog_id,kind,event_date").in("dog_id", ids).order("event_date", { ascending: false }).limit(240),
  ]) : [{ data: [] }, { data: [] }];
  const byCase = new Map<string, RegisterFocus["requests"]>();
  for (const item of (cases ?? []) as any[]) (byCase.get(item.dog_id) ?? byCase.set(item.dog_id, []).get(item.dog_id)!).push({ condition: item.condition_class, at: item.occurred_at, closed: item.status_class === "closed" });
  const byCare = new Map<string, RegisterFocus["care"]>();
  for (const item of (care ?? []) as any[]) (byCare.get(item.dog_id) ?? byCare.set(item.dog_id, []).get(item.dog_id)!).push({ kind: item.kind, at: item.event_date });
  return { total: count ?? 0, cards: picks.map((row) => ({
    id: row.id, name: row.name, straypaw_id: row.straypaw_id, cover_photo: row.cover_photo, zone: row.zone, city: row.city,
    first_seen: row.first_seen, last_seen: row.last_seen, sightings: row.sightings_count ?? 0,
    sterilisation: row.sterilisation_status, vaccination: row.vaccination_status, org: null,
    requests: byCase.get(row.id) ?? [], care: byCare.get(row.id) ?? [],
  })) };
}, ["landing-animal-register-v6"], { revalidate: 300 });
