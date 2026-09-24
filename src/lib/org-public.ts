import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabase, getSupabaseAdmin } from "@/lib/supabase";
import { getOrgBySlug } from "@/lib/data";
import type { Dog, NGO } from "@/lib/types";

export type OrgImpact = {
  animalsRecorded: number;
  sterilised: number;
  vaccinated: number;
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
    cover_photo: row.cover_photo ?? "",
    photos: row.cover_photo ? [row.cover_photo] : [],
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
  };
}

/**
 * Public-only impact read. It runs server-side with the existing service-role
 * client and returns only counts. The browser never receives a service key,
 * raw case row, exact coordinate, or operational note. If a deployment is
 * missing that server credential, the safe profile view still supplies the
 * three animal counts; case metrics remain absent rather than guessed.
 */
async function readPublicOrgImpact(ngoId: string): Promise<OrgImpact> {
  const admin = getSupabaseAdmin();
  const supa = getSupabase();
  const empty: OrgImpact = {
    animalsRecorded: 0,
    sterilised: 0,
    vaccinated: 0,
    activeCases: 0,
    resolvedCases: 0,
  };
  if (admin) {
    const [animals, sterilised, vaccinated, activeCases, resolvedCases] = await Promise.all([
      admin.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId),
      admin.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId)
        .or("sterilisation_status.eq.sterilised,and(sterilisation_status.is.null,sterilised.eq.true)"),
      admin.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId)
        .or("vaccination_status.eq.vaccinated,and(vaccination_status.is.null,vaccinated.eq.true)"),
      admin.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).not("status", "in", "(resolved,closed)"),
      admin.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).in("status", ["resolved", "closed"]),
    ]);
    if (![animals, sterilised, vaccinated, activeCases, resolvedCases].some((result) => result.error)) {
      return {
        animalsRecorded: animals.count ?? 0,
        sterilised: sterilised.count ?? 0,
        vaccinated: vaccinated.count ?? 0,
        activeCases: activeCases.count ?? 0,
        resolvedCases: resolvedCases.count ?? 0,
      };
    }
  }

  if (!supa) return empty;
  const { data: profiles } = await supa
    .from("public_animal_profiles")
    .select("id, sterilised, vaccinated, sterilisation_status, vaccination_status")
    .eq("ngo_id", ngoId)
    .limit(5000);
  const rows = profiles ?? [];
  return {
    animalsRecorded: rows.length,
    sterilised: rows.filter((row: any) => row.sterilisation_status === "sterilised" || (row.sterilisation_status == null && row.sterilised)).length,
    vaccinated: rows.filter((row: any) => row.vaccination_status === "vaccinated" || (row.vaccination_status == null && row.vaccinated)).length,
    activeCases: 0,
    resolvedCases: 0,
  };
}

/** Cache the narrow aggregate briefly so an NGO homepage stays responsive
 * without turning every visitor into five database count queries. */
export function getPublicOrgImpact(ngoId: string): Promise<OrgImpact> {
  return unstable_cache(
    () => readPublicOrgImpact(ngoId),
    ["public-org-impact", ngoId],
    { revalidate: 60 }
  )();
}

export async function getPublicOrgAnimals(ngoId: string, limit = 18): Promise<Dog[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("public_animal_profiles")
    .select("id, name, species, zone, status, cover_photo, size, color, is_friendly, needs_help, sterilised, vaccinated, sterilisation_status, vaccination_status, ear_notch, trust_score, sightings_count, feed_count, first_seen, last_seen, last_fed_at, created_at, ngo_id, ngo_name, provenance, code")
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
  // This mapping deliberately uses the existing organization identity rather
  // than introducing an embed-only profile or duplicate organization table.
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
