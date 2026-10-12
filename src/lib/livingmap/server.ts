/* Server reads for the Living Map. Each is complete for its city (no
 * row caps on totals), cached, and reads the public views only. */

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { cellToLatLng, gridDisk } from "h3-js";
import { getSupabase } from "@/lib/supabase";
import { animalTitle, describeAnimal } from "@/lib/animal-name";
import { isSensitivePhoto } from "@/lib/sensitive-photo";
import { canonicalCity, cityVariants, getPublicSpatialCities } from "@/lib/spatial/server";
import { placeName } from "./reading";
import { monthIndex, type NationalCity, type Unplaced, type AreaAnimal, type AreaCase, type EvidenceKind, type MapArea, type MapCell, type MapCity, type MonthRow } from "./types";

/** The atlas's evidence kinds (kept in step with AtlasRegister.cityEvidence). */
export function evidenceKind(city: string, cells: number): EvidenceKind {
  if (city === "Jamshedpur") return "clinical";
  if (city === "Ranchi") return "campaign";
  if (city === "Coimbatore" || city === "Lucknow") return "rescue";
  if (city === "Hyderabad" || city === "Delhi") return "photo";
  return cells <= 1 ? "register" : "register";
}

/* Snapshots: map_snapshots holds every city's (and the nation's) read,
   rebuilt every 15 minutes in the database (refresh_map_snapshots, pg_cron)
   from the same public functions. A read is one row; the live functions are
   the fallback when a snapshot is missing. */
async function snapshot<T>(key: string): Promise<{ payload: T; built: string } | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa.from("map_snapshots").select("payload,built_at").eq("key", key).maybeSingle();
  if (error || !data) return null;
  return { payload: data.payload as T, built: data.built_at as string };
}

type CellRow = Omit<MapCell, "c">;
type MonthRaw = { h3: string; m: string; opened: number; closed: number; care: number; ster: number; vacc: number; other_care: number };
type ConfRow = { h3: string; open_unconfirmed: number; open_30_unconfirmed: number; unassigned_native?: number };
type LiveRow = { h3: string; fu_missed_live: number };
function shapeCity(name: string, rows: CellRow[], monthRows: MonthRaw[], built: string, scope: "public" | "org" = "public", conf: ConfRow[] = [], live: LiveRow[] = []): MapCity | null {
  if (!rows.length) return null;
  const cf = new Map(conf.map((k) => [k.h3, k]));
  const lv = new Map(live.map((k) => [k.h3, k.fu_missed_live]));
  rows = rows.map((r) => {
    const k = cf.get(r.h3);
    /* Missed follow-ups are current work only on requests confirmed open; the rest are care history. */
    const out = { ...r, open_unconfirmed: k?.open_unconfirmed ?? 0, open_30_unconfirmed: k?.open_30_unconfirmed ?? 0, fu_missed_live: lv.get(r.h3) ?? 0 };
    /* On an organisation's map, only requests created in StrayPaw could carry an assignee. */
    if (scope === "org") out.unassigned = k?.unassigned_native ?? 0;
    return out;
  });
  const ll = (h: string): [number, number] => { const [lat, lng] = cellToLatLng(h); return [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]; };
  const cells = rows.map((c) => ({ ...c, c: ll(c.h3), first_action_median: c.first_action_median === null ? null : Number(c.first_action_median) }));
  const index = new Map(cells.map((c, i) => [c.h3, i]));
  const months: MonthRow[] = [];
  for (const r of monthRows) { const ci = index.get(r.h3); if (ci !== undefined) months.push([ci, monthIndex(r.m), r.opened, r.closed, r.care, r.ster, r.vacc, r.other_care]); }
  const have = new Set(cells.map((c) => c.h3)), edge = new Set<string>();
  if (cells.length > 1) for (const c of cells) for (const n of gridDisk(c.h3, 1)) if (!have.has(n)) edge.add(n);
  return { city: name, scope, kind: evidenceKind(name, cells.length), built, cells, months, edge: [...edge].map(ll) };
}

async function readCity(city: string): Promise<MapCity | null> {
  const snap = await snapshot<{ cells: CellRow[]; months: MonthRaw[]; confidence?: ConfRow[]; followups?: LiveRow[] }>(`city:${canonicalCity(city)}`);
  if (snap) {
    let live = snap.payload.followups;
    /* A snapshot built before follow-ups were split reads them live (one small query). */
    if (!live) { const { data } = (await getSupabase()?.rpc("public_map_followups_live", { p_cities: cityVariants(canonicalCity(city)) })) ?? { data: null }; live = (data ?? []) as LiveRow[]; }
    return shapeCity(canonicalCity(city), snap.payload.cells ?? [], snap.payload.months ?? [], snap.built, "public", snap.payload.confidence ?? [], live);
  }
  return readCityLive(city);
}

/* Pages through an RPC that can return more than the API's 1,000 rows. */
async function allRows<T>(call: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 60_000; from += 1000) {
    const { data, error } = await call(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

async function readCityLive(city: string): Promise<MapCity | null> {
  const supa = getSupabase();
  const name = canonicalCity(city);
  if (!supa || !name) return null;
  const cities = cityVariants(name);
  const [{ data, error }, months, conf] = await Promise.all([
    supa.rpc("public_map_cells_v2", { p_cities: cities }),
    allRows<MonthRaw>((f, t) => supa.rpc("public_map_months", { p_cities: cities }).range(f, t)),
    supa.rpc("public_map_case_confidence", { p_cities: cities }),
  ]);
  if (error) throw error;
  const live = await supa.rpc("public_map_followups_live", { p_cities: cities });
  return shapeCity(name, (data ?? []) as CellRow[], months, new Date().toISOString(), "public", (conf.data ?? []) as ConfRow[], (live.data ?? []) as LiveRow[]);
}

const cachedCity = unstable_cache(readCity, ["livingmap-city-v7"], { revalidate: 300 });
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
    last_seen: a.last_seen, first_seen: a.first_seen, source: a.source, org: a.ngo_id ? orgName.get(a.ngo_id) ?? null : null, size: a.size,
  }));
  await attachFacts(supa, animals, "public_case_facts", "public_care_facts");
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

const cachedArea = unstable_cache(readArea, ["livingmap-area-v2"], { revalidate: 300 });
export const getMapArea = (city: string, h3: string) => cachedArea(canonicalCity(city), h3.toLowerCase());

/** Each listed animal's own record of care: requests (and how many open), care events, sterilisation and the latest care.
 *  One bounded read per table for the ≤60 animals shown. */
async function attachFacts(supa: NonNullable<ReturnType<typeof getSupabase>>, animals: AreaAnimal[], caseTable: string, careTable: string) {
  const ids = animals.map((a) => a.id);
  if (!ids.length) return;
  const [cs, cr] = await Promise.all([
    supa.from(caseTable).select("dog_id,status_class").in("dog_id", ids).limit(2000),
    supa.from(careTable).select("dog_id,kind,event_date").in("dog_id", ids).limit(4000),
  ]);
  const f = new Map(ids.map((id) => [id, { cases: 0, open: 0, care: 0, ster: 0, lastCare: null as string | null }]));
  for (const c of (cs.data ?? []) as { dog_id: string; status_class: string | null }[]) { const x = f.get(c.dog_id); if (x) { x.cases++; if (c.status_class === "open" || c.status_class === "in_progress") x.open++; } }
  for (const c of (cr.data ?? []) as { dog_id: string; kind: string; event_date: string | null }[]) { const x = f.get(c.dog_id); if (x) { x.care++; if (c.kind === "sterilisation") x.ster++; if (c.event_date && (!x.lastCare || c.event_date > x.lastCare)) x.lastCare = c.event_date; } }
  for (const a of animals) a.facts = f.get(a.id);
}

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

export type FoundPlace = { city: string; name: string; animals: number };
/** Localities anywhere on the public record whose name matches: a resident can
 *  search their neighbourhood without knowing which city register holds it. */
export async function findPlaces(query: string): Promise<FoundPlace[]> {
  const supa = getSupabase();
  const q = query.trim().replace(/[%,()*]/g, "").slice(0, 40);
  if (!supa || q.length < 3) return [];
  const { data, error } = await supa.from("public_spatial_animals").select("city,zone").ilike("zone", `%${q}%`).not("h3_r8", "is", null).limit(1000);
  if (error) throw error;
  const by = new Map<string, FoundPlace>();
  for (const r of (data ?? []) as { city: string | null; zone: string | null }[]) {
    const name = placeName(r.zone), city = r.city ? canonicalCity(r.city) : null;
    if (!name || !city || !name.toLowerCase().includes(q.toLowerCase())) continue;
    const k = `${city}:${name}`, x = by.get(k) ?? { city, name, animals: 0 };
    x.animals += 1; by.set(k, x);
  }
  return [...by.values()].sort((a, b) => b.animals - a.animals).slice(0, 6);
}

async function readUnplaced(): Promise<Unplaced[]> {
  const snap = await snapshot<{ unplaced: Unplaced[] }>("cities");
  if (snap) return snap.payload.unplaced ?? [];
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("public_map_unplaced");
  if (error) throw error;
  return (data ?? []) as Unplaced[];
}
const cachedUnplaced = unstable_cache(readUnplaced, ["livingmap-unplaced-v3"], { revalidate: 300 });
export const getUnplaced = () => cachedUnplaced();

async function readCities(): Promise<NationalCity[]> {
  type SnapRow = { city: string; animals: number; needs_help: number; ster_yes: number; ster_no: number; ster_unknown: number; vacc_yes: number; cases: number; open_cases: number; open_30: number; status_unknown: number; care: number; treatments: number; areas: number; last_activity: string | null; lng?: number; lat?: number };
  const snap = await snapshot<{ cities: SnapRow[]; confidence?: { city: string; open_unconfirmed: number; open_30_unconfirmed: number }[] }>("cities");
  if (snap?.payload.cities?.length) {
    const by = new Map<string, NationalCity>();
    const conf = new Map<string, { u: number; u30: number }>();
    for (const k of snap.payload.confidence ?? []) { const n = canonicalCity(k.city); const x = conf.get(n) ?? { u: 0, u30: 0 }; x.u += k.open_unconfirmed; x.u30 += k.open_30_unconfirmed; conf.set(n, x); }
    for (const r of snap.payload.cities) {
      const name = canonicalCity(r.city);
      if (!name) continue;
      const c = by.get(name) ?? { city: name, state: null, lng: r.lng, lat: r.lat, animals: 0, cells: 0, needs_help: 0, sterilised: 0, ster_no: 0, ster_unknown: 0, vaccinated: 0, cases: 0, open_cases: 0, open_30: 0, status_unknown: 0, care: 0, treatments: 0, last_activity: null };
      if (name === r.city && typeof r.lng === "number") { c.lng = r.lng; c.lat = r.lat; }
      c.animals += r.animals; c.cells += r.areas; c.needs_help += r.needs_help; c.sterilised += r.ster_yes; c.ster_no += r.ster_no; c.ster_unknown += r.ster_unknown;
      c.vaccinated += r.vacc_yes; c.cases += r.cases; c.open_cases += r.open_cases; c.open_30 += r.open_30; c.status_unknown += r.status_unknown; c.care += r.care; c.treatments += r.treatments;
      if (r.last_activity && (!c.last_activity || r.last_activity > c.last_activity)) c.last_activity = r.last_activity;
      by.set(name, c);
    }
    for (const [n, c] of by) { const k = conf.get(n); c.open_unconfirmed = k?.u ?? 0; c.open_30_unconfirmed = k?.u30 ?? 0; }
    return [...by.values()].sort((a, b) => b.animals - a.animals);
  }
  return readCitiesLive();
}

async function readCitiesLive(): Promise<NationalCity[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const [{ data, error }, index] = await Promise.all([supa.rpc("public_map_cities_v2"), getPublicSpatialCities(200)]);
  if (error) throw error;
  const place = new Map(index.map((c) => [c.city, c]));
  const by = new Map<string, NationalCity>();
  type Row = { city: string; animals: number; needs_help: number; ster_yes: number; ster_no: number; ster_unknown: number; vacc_yes: number; cases: number; open_cases: number; open_30: number; status_unknown: number; care: number; treatments: number; areas: number; last_activity: string | null };
  for (const r of (data ?? []) as Row[]) {
    const name = canonicalCity(r.city);
    if (!name) continue;
    const at = place.get(name);
    const c = by.get(name) ?? { city: name, state: at?.state ?? null, lng: at?.lng, lat: at?.lat, animals: 0, cells: 0, needs_help: 0, sterilised: 0, ster_no: 0, ster_unknown: 0, vaccinated: 0, cases: 0, open_cases: 0, open_30: 0, status_unknown: 0, care: 0, treatments: 0, last_activity: null };
    c.animals += r.animals; c.cells += r.areas; c.needs_help += r.needs_help; c.sterilised += r.ster_yes; c.ster_no += r.ster_no; c.ster_unknown += r.ster_unknown;
    c.vaccinated += r.vacc_yes; c.cases += r.cases; c.open_cases += r.open_cases; c.open_30 += r.open_30; c.status_unknown += r.status_unknown; c.care += r.care; c.treatments += r.treatments;
    if (r.last_activity && (!c.last_activity || r.last_activity > c.last_activity)) c.last_activity = r.last_activity;
    by.set(name, c);
  }
  return [...by.values()].sort((a, b) => b.animals - a.animals);
}
const cachedCities = unstable_cache(readCities, ["livingmap-cities-v5"], { revalidate: 300 });
export const getMapCities = () => cachedCities();

/* ── The organisation's own map ─────────────────────────────────────
   Read with the member's token, so the database's own rules decide what
   is visible (org_map_* are filtered to my_ngo()). Never cached on the
   server or a CDN: these are an organisation's private records. */

function memberClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || !token) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
}


export async function getOrgMapCity(token: string, city: string): Promise<MapCity | null> {
  const supa = memberClient(token);
  const name = canonicalCity(city);
  if (!supa || !name) return null;
  const cities = cityVariants(name);
  const [{ data, error }, months, conf, live] = await Promise.all([
    supa.rpc("org_map_cells", { p_cities: cities }),
    allRows<MonthRaw>((f, t) => supa.rpc("org_map_months", { p_cities: cities }).range(f, t)),
    supa.rpc("org_map_case_confidence", { p_cities: cities }),
    supa.rpc("org_map_followups_live", { p_cities: cities }),
  ]);
  if (error) throw error;
  if (conf.error) throw conf.error;
  return shapeCity(name, (data ?? []) as CellRow[], months, new Date().toISOString(), "org", (conf.data ?? []) as ConfRow[], (live.data ?? []) as LiveRow[]);
}

export async function getOrgMapCities(token: string): Promise<{ cities: NationalCity[]; unplaced: Unplaced[] }> {
  const supa = memberClient(token);
  if (!supa) return { cities: [], unplaced: [] };
  const [{ data, error }, index, loose] = await Promise.all([
    supa.rpc("org_map_cities"),
    getPublicSpatialCities(200),
    supa.from("org_case_facts").select("zone,status_class,occurred_at").is("city", null).limit(500),
  ]);
  if (error) throw error;
  const place = new Map(index.map((c) => [c.city, c]));
  type Row = { city: string; animals: number; needs_help: number; ster_yes: number; ster_no: number; ster_unknown: number; vacc_yes: number; cases: number; open_cases: number; open_30: number; status_unknown: number; care: number; treatments: number; areas: number; last_activity: string | null; unassigned: number };
  const cities = ((data ?? []) as Row[]).map((r) => {
    const name = canonicalCity(r.city), at = place.get(name);
    return { city: name, state: at?.state ?? null, lng: at?.lng, lat: at?.lat, animals: r.animals, cells: r.areas, needs_help: r.needs_help, sterilised: r.ster_yes, ster_no: r.ster_no, ster_unknown: r.ster_unknown, vaccinated: r.vacc_yes, cases: r.cases, open_cases: r.open_cases, open_30: r.open_30, status_unknown: r.status_unknown, care: r.care, treatments: r.treatments, last_activity: r.last_activity, unassigned: r.unassigned } as NationalCity;
  }).sort((a, b) => b.animals - a.animals);
  const byZone = new Map<string, Unplaced>();
  for (const c of ((loose.data ?? []) as { zone: string | null; status_class: string | null; occurred_at: string | null }[])) {
    const z = c.zone?.trim() || "Place not recorded";
    const u = byZone.get(z) ?? { zone: z, district: null, open_cases: 0, cases: 0, latest: null };
    u.cases++; if (c.status_class === "open" || c.status_class === "in_progress") u.open_cases++;
    if (c.occurred_at && (!u.latest || c.occurred_at > u.latest)) u.latest = c.occurred_at;
    byZone.set(z, u);
  }
  /* Status confidence per city, from the same rule the city view uses. */
  await Promise.all(cities.map(async (c) => {
    const { data: k } = await supa.rpc("org_map_case_confidence", { p_cities: cityVariants(c.city) });
    const rows = (k ?? []) as ConfRow[];
    c.open_unconfirmed = rows.reduce((t, r) => t + r.open_unconfirmed, 0);
    c.open_30_unconfirmed = rows.reduce((t, r) => t + r.open_30_unconfirmed, 0);
    c.unassigned = rows.reduce((t, r) => t + (r.unassigned_native ?? 0), 0);
  }));
  return { cities, unplaced: [...byZone.values()].sort((a, b) => b.open_cases - a.open_cases) };
}

export async function getOrgMapArea(token: string, city: string, h3: string): Promise<MapArea | null> {
  const supa = memberClient(token);
  const name = canonicalCity(city);
  if (!supa || !name || !/^[0-9a-f]{15}$/i.test(h3)) return null;
  const { data: me } = await supa.rpc("my_ngo");
  if (!me) return null;
  const cities = cityVariants(name);
  const [animalRes, caseRes] = await Promise.all([
    supa.from("dogs")
      .select("id,name,straypaw_id,zone,cover_photo,photo_sensitive,status,needs_help,sterilisation_status,vaccination_status,last_seen,first_seen,provenance,sex,size", { count: "exact" })
      .eq("h3_r8", h3).eq("ngo_id", me).in("city", cities)
      .order("needs_help", { ascending: false }).order("last_seen", { ascending: false, nullsFirst: false }).limit(60),
    supa.from("org_case_facts")
      .select("id,case_code,dog_id,animal_name,condition_class,status_class,occurred_at,resolved_at,resolved_at_source,first_action_at,intake_channel,assignee_name,followups_done,followups_missed,followups_upcoming", { count: "exact" })
      .eq("h3_r8", h3).eq("ngo_id", me).order("status_class", { ascending: true }).order("occurred_at", { ascending: false }).limit(60),
  ]);
  if (animalRes.error) throw animalRes.error;
  if (caseRes.error) throw caseRes.error;
  type ARow = { id: string; name: string | null; straypaw_id: string | null; zone: string | null; cover_photo: string | null; photo_sensitive: boolean | null; status: string | null; needs_help: boolean | null; sterilisation_status: string | null; vaccination_status: string | null; last_seen: string | null; first_seen: string | null; provenance: string | null; sex: string | null; size: string | null };
  const animals = ((animalRes.data ?? []) as ARow[]).map((a) => ({
    id: a.id, title: animalTitle(a), describe: describeAnimal(a), zone: a.zone, photo: a.cover_photo, sensitive: isSensitivePhoto(a) || a.status === "injured",
    status: a.status, needs_help: !!a.needs_help, ster: a.sterilisation_status, vacc: a.vaccination_status, last_seen: a.last_seen, first_seen: a.first_seen,
    source: a.provenance === "community_report" ? "resident" : "field", org: null, size: a.size,
  }));
  await attachFacts(supa, animals, "org_case_facts", "medical_events");
  type CRow = { id: string; case_code: string | null; dog_id: string | null; animal_name: string | null; condition_class: string | null; status_class: string | null; occurred_at: string | null; resolved_at: string | null; resolved_at_source: string | null; first_action_at: string | null; intake_channel: string | null; assignee_name: string | null; followups_done: number | null; followups_missed: number | null; followups_upcoming: number | null };
  const open = (s: string | null) => s === "open" || s === "in_progress";
  const cases = ((caseRes.data ?? []) as CRow[]).sort((a, b) => Number(open(b.status_class)) - Number(open(a.status_class))).map((c) => ({
    id: c.id, code: c.case_code, assignee: c.assignee_name,
    condition: c.condition_class, status: c.status_class, occurred: c.occurred_at,
    resolved: c.resolved_at && c.resolved_at_source !== "assumed" ? c.resolved_at : null,
    first_action_days: c.first_action_at && c.occurred_at ? Math.max(0, Math.round((Date.parse(c.first_action_at) - Date.parse(c.occurred_at.slice(0, 10))) / 86_400_000)) : null,
    intake: c.intake_channel, org: null, animal: c.animal_name,
    fu_done: c.followups_done ?? 0, fu_missed: c.followups_missed ?? 0, fu_upcoming: c.followups_upcoming ?? 0,
  }));
  return { h3, city: name, animals, animalTotal: animalRes.count ?? animals.length, cases, caseTotal: caseRes.count ?? cases.length };
}
