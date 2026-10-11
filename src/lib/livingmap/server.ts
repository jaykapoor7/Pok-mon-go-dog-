/* Server reads for the Living Map. Each is complete for its city (no
 * row caps on totals), cached, and reads the public views only. */

import { unstable_cache } from "next/cache";
import { cellToLatLng, gridDisk } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { animalTitle, describeAnimal } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import { canonicalCity, cityVariants, getPublicSpatialCities } from "@/lib/spatial/server";
import { monthIndex, type NationalCity, type AreaAnimal, type AreaCase, type EvidenceKind, type MapArea, type MapCell, type MapCity, type MonthRow } from "./types";

/** The atlas's evidence kinds (kept in step with AtlasRegister.cityEvidence). */
export function evidenceKind(city: string, cells: number): EvidenceKind {
  if (city === "Jamshedpur") return "clinical";
  if (city === "Ranchi") return "campaign";
  if (city === "Coimbatore" || city === "Lucknow") return "rescue";
  if (city === "Hyderabad" || city === "Delhi") return "photo";
  return cells <= 1 ? "register" : "register";
}

async function readCity(city: string): Promise<MapCity | null> {
  const supa = getSupabase();
  const name = canonicalCity(city);
  if (!supa || !name) return null;
  const cities = cityVariants(name);
  const { data: cellData, error } = await supa.rpc("public_map_cells", { p_cities: cities });
  if (error) throw error;
  const ll = (h: string): [number, number] => { const [lat, lng] = cellToLatLng(h); return [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]; };
  const cells = ((cellData ?? []) as Omit<MapCell, "c">[]).map((c) => ({ ...c, c: ll(c.h3), first_action_median: c.first_action_median === null ? null : Number(c.first_action_median) }));
  if (!cells.length) return null;
  const index = new Map(cells.map((c, i) => [c.h3, i]));
  /* Months: the API returns at most 1,000 rows a call, so page until done. */
  const months: MonthRow[] = [];
  for (let from = 0; from < 60_000; from += 1000) {
    const { data, error: mErr } = await supa.rpc("public_map_months", { p_cities: cities }).range(from, from + 999);
    if (mErr) throw mErr;
    for (const r of (data ?? []) as { h3: string; m: string; opened: number; closed: number; care: number; ster: number; vacc: number; other_care: number }[]) {
      const ci = index.get(r.h3);
      if (ci === undefined) continue;
      months.push([ci, monthIndex(r.m), r.opened, r.closed, r.care, r.ster, r.vacc, r.other_care]);
    }
    if (!data || data.length < 1000) break;
  }
  /* The edge of reporting: areas bordering the record that hold none of it. */
  const have = new Set(cells.map((c) => c.h3));
  const edge = new Set<string>();
  if (cells.length > 1) for (const c of cells) for (const n of gridDisk(c.h3, 1)) if (!have.has(n)) edge.add(n);
  return { city: name, kind: evidenceKind(name, cells.length), built: new Date().toISOString(), cells, months, edge: [...edge].map(ll) };
}

const cachedCity = unstable_cache(readCity, ["livingmap-city-v2"], { revalidate: 600 });
export const getMapCity = (city: string) => cachedCity(canonicalCity(city));

async function readArea(city: string, h3: string): Promise<MapArea | null> {
  const supa = getSupabase();
  const name = canonicalCity(city);
  if (!supa || !name || !/^[0-9a-f]{15}$/i.test(h3)) return null;
  const cities = cityVariants(name);
  const [animalRes, caseRes, orgRes] = await Promise.all([
    supa.from("public_spatial_animals")
      .select("id,name,straypaw_id,zone,cover_photo,photo_sensitive,status,needs_help,sterilisation_status,vaccination_status,last_seen,first_seen,source,ngo_id,sex,size", { count: "exact" })
      .eq("h3_r8", h3).in("city", cities)
      .order("needs_help", { ascending: false }).order("cover_photo", { ascending: true, nullsFirst: false }).order("last_seen", { ascending: false, nullsFirst: false })
      .limit(60),
    supa.from("public_case_facts")
      .select("dog_id,ngo_id,condition_class,status_class,occurred_at,resolved_at,resolved_at_source,first_action_days,intake_channel,followups_done,followups_missed,followups_upcoming", { count: "exact" })
      .eq("h3_r8", h3).in("city", cities).order("occurred_at", { ascending: false }).limit(40),
    supa.from("public_contributor_organisations").select("id,name"),
  ]);
  if (animalRes.error) throw animalRes.error;
  if (caseRes.error) throw caseRes.error;
  const orgName = new Map(((orgRes.data ?? []) as { id: string; name: string }[]).map((o) => [o.id, o.name]));
  type ARow = { id: string; name: string | null; straypaw_id: string | null; zone: string | null; cover_photo: string | null; photo_sensitive: boolean | null; status: string | null; needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null; last_seen: string | null; first_seen: string | null; source: string | null; ngo_id: string | null; sex: string | null; size: string | null };
  const animals: AreaAnimal[] = ((animalRes.data ?? []) as ARow[]).map((a) => ({
    id: a.id, title: animalTitle(a), describe: describeAnimal(a), zone: a.zone,
    photo: a.cover_photo, sensitive: isSensitivePhoto(a) || a.status === "injured",
    status: a.status, needs_help: !!a.needs_help, ster: a.sterilisation_status, vacc: a.vaccination_status,
    last_seen: a.last_seen, first_seen: a.first_seen, source: a.source, org: a.ngo_id ? orgName.get(a.ngo_id) ?? null : null,
  }));
  const titles = new Map(animals.map((a) => [a.id, a.title]));
  type CRow = { dog_id: string | null; ngo_id: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; resolved_at: string | null; resolved_at_source: string | null; first_action_days: number | null; intake_channel: string | null; followups_done: number | null; followups_missed: number | null; followups_upcoming: number | null };
  const cases: AreaCase[] = ((caseRes.data ?? []) as CRow[]).map((c) => ({
    condition: c.condition_class, status: c.status_class, occurred: c.occurred_at,
    resolved: c.resolved_at && c.resolved_at_source !== "assumed" ? c.resolved_at : null,
    first_action_days: c.first_action_days, intake: c.intake_channel, org: c.ngo_id ? orgName.get(c.ngo_id) ?? null : null,
    animal: c.dog_id ? titles.get(c.dog_id) ?? null : null,
    fu_done: c.followups_done ?? 0, fu_missed: c.followups_missed ?? 0, fu_upcoming: c.followups_upcoming ?? 0,
  }));
  return { h3, city: name, animals, animalTotal: animalRes.count ?? animals.length, cases, caseTotal: caseRes.count ?? cases.length };
}

const cachedArea = unstable_cache(readArea, ["livingmap-area-v1"], { revalidate: 300 });
export const getMapArea = (city: string, h3: string) => cachedArea(canonicalCity(city), h3.toLowerCase());

export type FoundAnimal = { id: string; title: string; city: string | null; zone: string | null; h3: string | null };

/** Find animals by StrayPaw tag ("PK0UBR", "SP-D-PK0UBR") or given name. */
export async function findAnimals(query: string): Promise<FoundAnimal[]> {
  const supa = getSupabase();
  const q = query.trim().replace(/[%,()*]/g, "").slice(0, 40);
  if (!supa || q.length < 3) return [];
  const { data, error } = await supa.from("public_spatial_animals")
    .select("id,name,straypaw_id,city,zone,h3_r8")
    .or(`straypaw_id.ilike.%${q}%,name.ilike.%${q}%`)
    .not("h3_r8", "is", null).limit(8);
  if (error) throw error;
  return ((data ?? []) as { id: string; name: string | null; straypaw_id: string | null; city: string | null; zone: string | null; h3_r8: string | null }[])
    .map((a) => ({ id: a.id, title: animalTitle(a), city: a.city ? canonicalCity(a.city) : null, zone: a.zone, h3: a.h3_r8 }));
}

async function readCities(): Promise<NationalCity[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const [{ data, error }, index] = await Promise.all([supa.rpc("public_map_cities"), getPublicSpatialCities(200)]);
  if (error) throw error;
  const place = new Map(index.map((c) => [c.city, c]));
  const by = new Map<string, NationalCity>();
  type Row = { city: string; animals: number; needs_help: number; ster_yes: number; ster_no: number; ster_unknown: number; vacc_yes: number; cases: number; open_cases: number; open_30: number; care: number; treatments: number; areas: number; last_activity: string | null };
  for (const r of (data ?? []) as Row[]) {
    const name = canonicalCity(r.city);
    if (!name) continue;
    const at = place.get(name);
    const c = by.get(name) ?? { city: name, state: at?.state ?? null, lng: at?.lng, lat: at?.lat, animals: 0, cells: 0, needs_help: 0, sterilised: 0, ster_no: 0, ster_unknown: 0, vaccinated: 0, cases: 0, open_cases: 0, open_30: 0, care: 0, treatments: 0, last_activity: null };
    c.animals += r.animals; c.cells += r.areas; c.needs_help += r.needs_help; c.sterilised += r.ster_yes; c.ster_no += r.ster_no; c.ster_unknown += r.ster_unknown;
    c.vaccinated += r.vacc_yes; c.cases += r.cases; c.open_cases += r.open_cases; c.open_30 += r.open_30; c.care += r.care; c.treatments += r.treatments;
    if (r.last_activity && (!c.last_activity || r.last_activity > c.last_activity)) c.last_activity = r.last_activity;
    by.set(name, c);
  }
  return [...by.values()].sort((a, b) => b.animals - a.animals);
}
const cachedCities = unstable_cache(readCities, ["livingmap-cities-v1"], { revalidate: 600 });
export const getMapCities = () => cachedCities();
