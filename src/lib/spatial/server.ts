/* Bounded public spatial reads.
 *
 * The old `SpatialDataset` assembled every public animal, case and care row
 * in a request. Public routes now consume compact city/cell rollups and,
 * only at close zoom, a fixed maximum of animals inside an explicit bbox.
 * Rollups are built by the controlled queue worker, never by a visitor.
 */

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { assemble, type AnimalRow, type CaseRow, type CareRow, type SightRow } from "./build";
import type { SpatialDataset } from "./types";

export type SpatialCity = {
  city: string; state: string | null; animals: number; cases: number;
  open_cases: number; cells: number; latest_seen: string | null;
};
export type SpatialCell = {
  city: string; state: string | null; zone: string | null; h3_r8: string;
  animals: number; needs_help: number; sterilised: number; vaccinated: number;
  open_cases: number; cases: number; care_events: number; latest_seen: string | null;
};

const MAX_CITIES = 200;
const MAX_CELLS = 4_000;
const MAX_ANIMALS = 500;
/* Rich map modes still need the compact SpatialDataset shape, but never the
 * platform register. These are hard payload limits for one selected city. */
const DATASET_LIMITS = { animals: 1_200, cases: 1_500, care: 1_800, sightings: 1_800 } as const;
const cleanCity = (city: string | null | undefined) => city?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "";
/* Imports arrive with administrative aliases. A map must not make a tiny
 * "New Delhi" island beside Delhi, or split Hyderabad from Secunderabad. */
const CITY_ALIAS: Record<string, string> = { "New Delhi": "Delhi", Secunderabad: "Hyderabad" };
const canonicalCity = (city: string | null | undefined) => CITY_ALIAS[cleanCity(city)] ?? cleanCity(city);
const cityVariants = (city: string) => [...new Set([city, ...Object.keys(CITY_ALIAS).filter((alias) => CITY_ALIAS[alias] === city)])];

/* PostgREST rejects a giant UUID `in` URL before the query reaches Postgres.
 * Split only the relation lookup, then enforce the same aggregate cap after
 * merging: bounded rows, bounded request URLs. */
async function rowsForAnimals(supa: any, table: string, select: string, ids: string[], order: string, limit: number) {
  const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => ids.slice(index * 100, index * 100 + 100));
  if (!chunks.length) return { data: [] as any[], error: null as any };
  const perChunk = Math.max(1, Math.ceil(limit / chunks.length));
  const results = await Promise.all(chunks.map((chunk) => supa.from(table).select(select).in("dog_id", chunk).order(order, { ascending: false }).limit(perChunk)));
  const error = results.find((result: any) => result.error)?.error ?? null;
  const data = results.flatMap((result: any) => result.data ?? []).sort((a: any, b: any) => String(b[order] ?? "").localeCompare(String(a[order] ?? ""))).slice(0, limit);
  return { data, error };
}

export async function getPublicSpatialCities(limit = 80): Promise<SpatialCity[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("list_public_spatial_cities", { p_limit: Math.max(1, Math.min(limit, MAX_CITIES)) });
  if (error) throw error;
  const grouped = new Map<string, SpatialCity>();
  for (const row of (data ?? []) as SpatialCity[]) {
    const city = canonicalCity(row.city);
    const prior = grouped.get(city);
    if (!prior) { grouped.set(city, { ...row, city }); continue; }
    prior.animals += row.animals; prior.cases += row.cases; prior.open_cases += row.open_cases; prior.cells += row.cells;
    if ((row.latest_seen ?? "") > (prior.latest_seen ?? "")) prior.latest_seen = row.latest_seen;
  }
  return [...grouped.values()].sort((a, b) => b.animals - a.animals).slice(0, Math.max(1, Math.min(limit, MAX_CITIES)));
}

export async function getPublicSpatialCityCells(city: string, limit = MAX_CELLS): Promise<SpatialCell[]> {
  const safeCity = cleanCity(city);
  if (!safeCity) return [];
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("spatial_city_cells")
    .select("city,state,zone,h3_r8,animals,needs_help,sterilised,vaccinated,open_cases,cases,care_events,latest_seen")
    .eq("city", safeCity).order("animals", { ascending: false }).limit(Math.max(1, Math.min(limit, MAX_CELLS)));
  if (error) throw error;
  return (data ?? []) as SpatialCell[];
}

export async function getPublicSpatialCellCounts(cells: string[]): Promise<SpatialCell[]> {
  const keys = [...new Set(cells)].filter((cell) => /^[0-9a-f]{15}$/i.test(cell)).slice(0, 80);
  if (!keys.length) return [];
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("spatial_city_cells")
    .select("city,state,zone,h3_r8,animals,needs_help,sterilised,vaccinated,open_cases,cases,care_events,latest_seen")
    .in("h3_r8", keys).limit(keys.length);
  if (error) throw error;
  return (data ?? []) as SpatialCell[];
}

export type SpatialAnimal = {
  id: string; h3_r8: string | null; lat: number | null; lng: number | null;
  city: string | null; zone: string | null; cover_photo: string | null;
  status: string | null; needs_help: boolean | null; sterilisation_status: string | null;
  vaccination_status: string | null; last_seen: string | null;
};

export async function getPublicSpatialViewportAnimals(input: { city: string; west: number; south: number; east: number; north: number; limit?: number }) {
  const city = cleanCity(input.city);
  const { west, south, east, north } = input;
  if (!city || ![west, south, east, north].every(Number.isFinite) || west >= east || south >= north || east - west > 3 || north - south > 3) return [] as SpatialAnimal[];
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("public_spatial_animals")
    .select("id,h3_r8,lat,lng,city,zone,cover_photo,status,needs_help,sterilisation_status,vaccination_status,last_seen")
    .eq("city", city).gte("lng", west).lte("lng", east).gte("lat", south).lte("lat", north)
    .order("needs_help", { ascending: false }).order("last_seen", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit ?? MAX_ANIMALS, MAX_ANIMALS)));
  if (error) throw error;
  return (data ?? []) as SpatialAnimal[];
}

export const SPATIAL_LIMITS = { cities: MAX_CITIES, cells: MAX_CELLS, animals: MAX_ANIMALS } as const;

async function readPublicCityDataset(city: string): Promise<SpatialDataset | null> {
  const safeCity = canonicalCity(city);
  const supa = getSupabase();
  if (!supa || !safeCity) return null;
  const { data: animalData, error: animalError } = await supa.from("public_spatial_animals")
    .select("id,h3_r8,lat,lng,city,state,zone,location_precision,source,status,needs_help,sterilisation_status,vaccination_status,ear_notch,cover_photo,first_seen,last_seen,sightings_count,ngo_id")
    .in("city", cityVariants(safeCity)).order("last_seen", { ascending: false }).limit(DATASET_LIMITS.animals);
  if (animalError) throw animalError;
  const animals = ((animalData ?? []) as AnimalRow[]).map((animal) => ({ ...animal, city: safeCity }));
  if (!animals.length) return null;
  const ids = animals.map((animal) => animal.id);
  const [caseResult, careResult, sightingResult] = await Promise.all([
    supa.from("public_case_facts").select("id,dog_id,ngo_id,h3_r8,city,zone,occurred_at,condition_class,status_class,closure_reason,intake_channel,severity,first_action_days,resolved_at,resolved_at_source,source,followups_done,followups_missed,followups_upcoming,reviewed_at")
      .in("city", cityVariants(safeCity)).order("occurred_at", { ascending: false }).limit(DATASET_LIMITS.cases),
    rowsForAnimals(supa, "public_care_facts", "dog_id,kind,event_date,h3_r8", ids, "event_date", DATASET_LIMITS.care),
    rowsForAnimals(supa, "public_sighting_facts", "dog_id,created_at,h3_r8,lat,lng,sterilisation_status,vaccination_status,has_photo", ids, "created_at", DATASET_LIMITS.sightings),
  ]);
  if (caseResult.error || careResult.error || sightingResult.error) throw caseResult.error ?? careResult.error ?? sightingResult.error;
  const cases = ((caseResult.data ?? []) as CaseRow[]).map((item) => ({ ...item, city: safeCity }));
  return assemble({ animals, cases, care: (careResult.data ?? []) as CareRow[], sightings: (sightingResult.data ?? []) as SightRow[], orgs: [] }, "public");
}

/* The rich map is read by several entry points at once (map, insights and
 * story links). Cache the already-bounded city assembly so a cold client
 * never starts a fan-out of relation queries and lands on a transient 503. */
const getCachedPublicSpatialCityDataset = unstable_cache(
  async (city: string) => readPublicCityDataset(city),
  ["public-spatial-city-dataset-v3"],
  { revalidate: 300 },
);

export async function getPublicSpatialCityDataset(city: string) {
  return getCachedPublicSpatialCityDataset(cleanCity(city));
}

function memberClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || !accessToken) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}

export async function getOrgSpatialCities(accessToken: string) {
  const supa = memberClient(accessToken);
  if (!supa) return [] as SpatialCity[];
  const { data, error } = await supa.rpc("list_org_spatial_cities", { p_limit: 100 });
  if (error) throw error;
  return (data ?? []) as SpatialCity[];
}

export async function getOrgSpatialCityCells(accessToken: string, city: string) {
  const supa = memberClient(accessToken);
  const safeCity = cleanCity(city);
  if (!supa || !safeCity) return [] as SpatialCell[];
  const { data, error } = await supa.rpc("list_org_spatial_cells", { p_city: safeCity, p_limit: MAX_CELLS });
  if (error) throw error;
  return (data ?? []) as SpatialCell[];
}

export async function getOrgSpatialViewportAnimals(accessToken: string, input: { city: string; west: number; south: number; east: number; north: number }) {
  const supa = memberClient(accessToken);
  const city = cleanCity(input.city);
  if (!supa || !city || input.west >= input.east || input.south >= input.north || input.east - input.west > 3 || input.north - input.south > 3) return [] as SpatialAnimal[];
  const { data, error } = await supa.from("dogs")
    .select("id,h3_r8,lat,lng,city,zone,cover_photo,status,needs_help,sterilisation_status,vaccination_status,last_seen")
    .eq("city", city).gte("lng", input.west).lte("lng", input.east).gte("lat", input.south).lte("lat", input.north)
    .order("needs_help", { ascending: false }).order("last_seen", { ascending: false }).limit(MAX_ANIMALS);
  if (error) throw error;
  return (data ?? []) as SpatialAnimal[];
}

/** Same analytical shape as the public map, strictly bounded to one of the
 * signed-in organisation's cities. RLS still decides which rows exist. */
export async function getOrgSpatialCityDataset(accessToken: string, city: string): Promise<SpatialDataset | null> {
  const supa = memberClient(accessToken);
  const safeCity = cleanCity(city);
  if (!supa || !safeCity) return null;
  const { data: animalData, error: animalError } = await supa.from("dogs")
    .select("id,h3_r8,lat,lng,city,state,zone,location_precision,provenance,status,needs_help,sterilisation_status,vaccination_status,ear_notch,cover_photo,first_seen,last_seen,sightings_count,ngo_id")
    .eq("city", safeCity).order("last_seen", { ascending: false }).limit(DATASET_LIMITS.animals);
  if (animalError) throw animalError;
  const animals = ((animalData ?? []) as Array<AnimalRow & { provenance?: string | null }>).map((animal) => ({ ...animal, source: animal.provenance === "community_report" ? "resident" : "field" }));
  if (!animals.length) return null;
  const ids = animals.map((animal) => animal.id);
  const [caseResult, careResult] = await Promise.all([
    supa.from("org_case_facts").select("id,dog_id,ngo_id,h3_r8,city,zone,occurred_at,condition_class,status_class,closure_reason,intake_channel,severity,first_action_at,resolved_at,resolved_at_source,provenance,followups_done,followups_missed,followups_upcoming,reviewed_at")
      .eq("city", safeCity).order("occurred_at", { ascending: false }).limit(DATASET_LIMITS.cases),
    rowsForAnimals(supa, "medical_events", "dog_id,kind,event_date", ids, "event_date", DATASET_LIMITS.care),
  ]);
  if (caseResult.error || careResult.error) throw caseResult.error ?? careResult.error;
  const cases = ((caseResult.data ?? []) as Array<CaseRow & { first_action_at?: string | null; provenance?: string | null }>).map((item) => ({
    ...item,
    source: item.provenance === "imported_historical_record" ? "field" : "resident",
    first_action_days: item.first_action_at && item.occurred_at ? Math.max(0, Math.round((Date.parse(item.first_action_at) - Date.parse(item.occurred_at.slice(0, 10))) / 86_400_000)) : null,
  }));
  const care = ((careResult.data ?? []) as Array<CareRow & { dog_id: string }>).map((item) => ({ ...item, h3_r8: null }));
  return assemble({ animals, cases, care, sightings: [] as SightRow[], orgs: [] }, "org");
}
