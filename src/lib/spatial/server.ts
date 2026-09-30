/* Bounded public spatial reads.
 *
 * The old `SpatialDataset` assembled every public animal, case and care row
 * in a request. Public routes now consume compact city/cell rollups and,
 * only at close zoom, a fixed maximum of animals inside an explicit bbox.
 * Rollups are built by the controlled queue worker, never by a visitor.
 */

import { createClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

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
const cleanCity = (city: string | null | undefined) => city?.replace(/\s+/g, " ").trim().slice(0, 120) ?? "";

export async function getPublicSpatialCities(limit = 80): Promise<SpatialCity[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("list_public_spatial_cities", { p_limit: Math.max(1, Math.min(limit, MAX_CITIES)) });
  if (error) throw error;
  return (data ?? []) as SpatialCity[];
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
