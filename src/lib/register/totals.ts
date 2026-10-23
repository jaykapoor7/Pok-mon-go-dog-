import { unstable_cache } from "next/cache";
import { getPublicSpatialCities, type SpatialCity } from "@/lib/spatial/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/** The public headline is a count of animal records, not imports, visible
 * viewport dots, or care events. Public summaries share this one rollup. */
export type RegisterTotals = { animals: number; cases: number; cities: number };

export function registerTotalsFromCities(cities: Pick<SpatialCity, "animals" | "cases">[]): RegisterTotals {
  return {
    animals: cities.reduce((n, city) => n + Number(city.animals || 0), 0),
    cases: cities.reduce((n, city) => n + Number(city.cases || 0), 0),
    cities: cities.filter((city) => Number(city.animals || 0) > 0).length,
  };
}

export const getRegisterTotals = unstable_cache(async (): Promise<RegisterTotals> => {
  const cities = await getPublicSpatialCities(200);
  return registerTotalsFromCities(cities);
}, ["public-register-totals-v2"], { revalidate: 120 });

/** Dogs treated: every animal with recorded care. Sterilised or vaccinated
 * on its record, or with any dated care event (treatment, surgery, wound
 * care…). One animal counts once however much care it had. Read with the
 * service role because care events are not public rows; only the count
 * leaves the server. */
export async function countDogsTreated(): Promise<number | null> {
  const supa = getSupabaseAdmin();
  if (!supa) return null;
  const { count, error } = await supa.from("dogs").select("id", { count: "exact", head: true })
    .or("sterilisation_status.eq.sterilised,vaccination_status.eq.vaccinated");
  if (error || count === null) return null;
  /* Animals whose care is only in dated events: a bounded, paged read of
     their ids, counted once each. */
  const others = new Set<string>();
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error: e } = await supa.from("medical_events").select("dog_id, dogs!inner(id)")
      .neq("dogs.sterilisation_status", "sterilised").neq("dogs.vaccination_status", "vaccinated")
      .not("dog_id", "is", null).order("id").range(from, from + 999);
    if (e) return null;
    for (const r of (data ?? []) as { dog_id: string }[]) others.add(r.dog_id);
    if (!data || data.length < 1000) break;
  }
  return count + others.size;
}

export const getDogsTreated = unstable_cache(countDogsTreated, ["public-dogs-treated-v1"], { revalidate: 3600 });
