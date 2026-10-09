import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { getOrgBySlug, mapOrg } from "@/lib/data";
import type { Dog, NGO } from "@/lib/types";

export type OrgImpact = {
  animalsRecorded: number;
  sterilised: number;
  vaccinated: number;
  caseRecords: number;
  activeCases: number;
  resolvedCases: number;
};

export type PublicOrgActivity = {
  id: string;
  animalId: string | null;
  kind: "case" | "care";
  occurredAt: string;
  area: string | null;
};

export type PublicOrgMapCell = {
  lat: number;
  lng: number;
  records: number;
};

export type PublicOrgH3Cell = {
  h3: string;
  records: number;
};

export type PublicProgramme = {
  id: string;
  name: string;
  kind: string;
  startsOn: string | null;
  endsOn: string | null;
  area: string | null;
  summary: string | null;
  animalsRecorded: number;
  sterilisedRecorded: number;
  vaccinatedRecorded: number;
};

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapPublicAnimal(row: any): Dog {
  return {
    id: row.id,
    name: row.name ?? null,
    zone: row.zone ?? "",
    city: null,
    lat: typeof row.lat === "number" ? row.lat : 0,
    lng: typeof row.lng === "number" ? row.lng : 0,
    status: row.status ?? "seen",
    cover_photo: row.cover_photo || row.external_image_url || "",
    photos: [row.cover_photo, row.external_image_url].filter((photo): photo is string => Boolean(photo)),
    size: row.size ?? "medium",
    color: row.color ?? "",
    is_friendly: Boolean(row.is_friendly),
    needs_help: Boolean(row.needs_help),
    sterilised: Boolean(row.sterilised),
    vaccinated: Boolean(row.vaccinated),
    sterilisation_status: row.sterilisation_status ?? (row.sterilised ? "sterilised" : "unknown"),
    vaccination_status: row.vaccination_status ?? (row.vaccinated ? "vaccinated" : "unknown"),
    ear_notch: row.ear_notch ?? null,
    trust_score: number(row.trust_score),
    sightings_count: number(row.sightings_count),
    feed_count: number(row.feed_count),
    first_seen: row.first_seen ?? row.created_at ?? "",
    last_seen: row.last_seen ?? row.created_at ?? "",
    last_fed_at: row.last_fed_at ?? null,
    community_notes: [],
    species: row.species ?? "dog",
    ngo_id: row.ngo_id ?? null,
    ngo_name: row.ngo_name ?? null,
    provenance: row.provenance ?? null,
    code: row.code ?? null,
    assignee_id: null,
    assignee_name: null,
    intake_notes: null,
    owner_name: null,
    owner_contact: null,
    photo_attribution: row.photo_attribution ?? null,
    photo_source_url: row.photo_source_url ?? null,
  };
}

/** One cached, public-only aggregate serves profiles, widgets and the directory.
 * A successful aggregate with no row means zero records; a failed read throws,
 * so callers can show unavailability without inventing a zero. */
export async function getPublicOrgImpact(ngoId: string): Promise<OrgImpact> {
  const impacts = await getPublicOrgDirectoryImpacts();
  return impacts.get(ngoId) ?? {
    animalsRecorded: 0,
    sterilised: 0,
    vaccinated: 0,
    caseRecords: 0,
    activeCases: 0,
    resolvedCases: 0,
  };
}

export async function getPublicOrgDirectoryImpacts(): Promise<Map<string, OrgImpact>> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Organisation counts are unavailable.");
  const read = unstable_cache(async () => {
    const { data, error } = await admin.rpc("list_public_org_impacts");
    if (error) throw new Error("Organisation counts could not be loaded.", { cause: error });
    if (!Array.isArray(data)) throw new Error("Organisation counts returned an invalid response.");
    return data as any[];
  }, ["public-org-directory-impacts-v2"], { revalidate: 60 });
  const rows = await read();
  return new Map(rows.map((row: any) => [String(row.ngo_id), {
    animalsRecorded: number(row.animals_recorded),
    sterilised: number(row.sterilised),
    vaccinated: number(row.vaccinated),
    caseRecords: number(row.case_records),
    activeCases: number(row.active_cases),
    resolvedCases: number(row.resolved_cases),
  }]));
}


async function readPublicOrgMapCells(ngoId: string): Promise<PublicOrgMapCell[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa
    .from("public_org_map_cells")
    .select("lat, lng, records")
    .eq("ngo_id", ngoId)
    .order("records", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? [])
    .map((row: any) => ({
      lat: number(row.lat),
      lng: number(row.lng),
      records: Math.max(0, Math.round(number(row.records))),
    }))
    .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng) && row.records > 0);
}

export function getPublicOrgMapCells(ngoId: string): Promise<PublicOrgMapCell[]> {
  return unstable_cache(
    () => readPublicOrgMapCells(ngoId),
    ["public-org-map-cells", ngoId],
    { revalidate: 300 }
  )();
}


async function readPublicOrgH3Cells(ngoId: string): Promise<PublicOrgH3Cell[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];
  const counts = new Map<string, number>();
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await admin
      .from("dogs")
      .select("h3_r8")
      .eq("ngo_id", ngoId)
      .eq("is_demo", false)
      .not("h3_r8", "is", null)
      .range(from, from + pageSize - 1);
    if (error) return [];
    for (const row of data ?? []) {
      const h3 = String((row as any).h3_r8 ?? "").trim();
      if (h3) counts.set(h3, (counts.get(h3) ?? 0) + 1);
    }
    if ((data ?? []).length < pageSize) break;
  }
  return [...counts.entries()]
    .map(([h3, records]) => ({ h3, records }))
    .sort((a, b) => b.records - a.records);
}

export function getPublicOrgH3Cells(ngoId: string): Promise<PublicOrgH3Cell[]> {
  return unstable_cache(
    () => readPublicOrgH3Cells(ngoId),
    ["public-org-h3-cells", ngoId],
    { revalidate: 300 }
  )();
}

async function readPublicOrgMedianFirstActionDays(ngoId: string): Promise<number | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const values: number[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 20000; from += pageSize) {
    const { data, error } = await supa
      .from("public_case_facts")
      .select("first_action_days")
      .eq("ngo_id", ngoId)
      .gte("first_action_days", 0)
      .range(from, from + pageSize - 1);
    if (error) return null;
    for (const row of data ?? []) {
      const value = number((row as any).first_action_days);
      if (value >= 0) values.push(value);
    }
    if ((data ?? []).length < pageSize) break;
  }
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] ?? null;
}

export function getPublicOrgMedianFirstActionDays(ngoId: string): Promise<number | null> {
  return unstable_cache(
    () => readPublicOrgMedianFirstActionDays(ngoId),
    ["public-org-median-first-action-days", ngoId],
    { revalidate: 300 }
  )();
}

export async function getPublicOrgAnimals(ngoId: string, limit = 18): Promise<Dog[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("public_animal_profiles")
    .select("id, name, species, zone, status, cover_photo, external_image_url, photo_attribution, photo_source_url, size, color, is_friendly, needs_help, sterilised, vaccinated, sterilisation_status, vaccination_status, ear_notch, trust_score, sightings_count, feed_count, first_seen, last_seen, last_fed_at, created_at, ngo_id, ngo_name, provenance, code, photo_sensitive")
    .eq("ngo_id", ngoId)
    .order("last_seen", { ascending: false })
    .limit(limit);
  return (data ?? []).map(mapPublicAnimal);
}

export async function getPublicOrgActivity(ngoId: string, limit = 8): Promise<PublicOrgActivity[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("public_field_activity")
    .select("id, dog_id, occurred_at, zone")
    .eq("ngo_id", ngoId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    animalId: row.dog_id ?? null,
    kind: String(row.id).startsWith("medical:") ? "care" : "case",
    occurredAt: row.occurred_at,
    area: row.zone ?? null,
  }));
}

export async function getPublicOrgProgrammes(slug: string, limit = 6): Promise<PublicProgramme[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("public_programme_cards")
    .select("id, name, kind, starts_on, ends_on, zone, public_summary, animals_recorded, sterilised_recorded, vaccinated_recorded")
    .eq("ngo_slug", slug)
    .order("ends_on", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    kind: row.kind ?? "other",
    startsOn: row.starts_on ?? null,
    endsOn: row.ends_on ?? null,
    area: row.zone ?? null,
    summary: row.public_summary ?? null,
    animalsRecorded: number(row.animals_recorded),
    sterilisedRecorded: number(row.sterilised_recorded),
    vaccinatedRecorded: number(row.vaccinated_recorded),
  }));
}

export async function getPublicOrgBySlug(slug: string): Promise<NGO | null> {
  /* Organisation profiles are public records rendered on the server. Directory
     entries do not all have anonymous access to the operational ngos table,
     so use the server credential when it exists, returning only the mapped
     public identity fields to the page. */
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from("ngos").select("*").eq("slug", slug).eq("demo_mode", false).maybeSingle();
    if (data) return mapOrg(data);
  }
  return getOrgBySlug(slug);
}

export function publicOrgSummary(org: NGO) {
  return {
    name: org.name,
    slug: org.slug ?? "",
    logoUrl: org.logo_url,
    city: org.city,
    state: org.state,
  };
}
