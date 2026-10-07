import { unstable_cache } from "next/cache";
import { getPublicSpatialCities, type SpatialCity } from "@/lib/spatial/server";

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
