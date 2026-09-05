// ─────────────────────────────────────────────────────────────
// Data access layer (read side). Every read hits the live Supabase database;
// with no config the reads simply return empty. All functions are async.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import type {
  Dog,
  Sighting,
  CityStats,
  DogProfile,
  MapFilter,
  NGO,
  DogStatus,
  DogSize,
  MoodTag,
} from "./types";

// ── Location privacy ─────────────────────────────────────────
// Public surfaces (map, feed, profiles) only ever receive a GENERAL area,
// coordinates rounded to ~1km. Exact coordinates stay server-side and are
// available to verified partner NGOs via the get_precise_locations RPC
// (see supabase/location-privacy.sql). This rounding runs in the read mappers,
// which feed the server-rendered pages, so exact coords never reach the browser
// through the app.
function coarse(v: number): number {
  return Math.round(v * 100) / 100; // 2 decimals ≈ 1.1 km
}

// ── Row mappers ──────────────────────────────────────────────

function mapDog(row: any): Dog {
  return {
    id: row.id,
    name: row.name ?? null,
    zone: row.zone ?? "India",
    colony: row.colony ?? null,
    city: row.city ?? null,
    lat: coarse(row.lat),
    lng: coarse(row.lng),
    status: (row.status ?? "seen") as DogStatus,
    cover_photo: row.cover_photo ?? "",
    photos: row.cover_photo ? [row.cover_photo] : [],
    size: (row.size ?? "medium") as DogSize,
    color: row.color ?? "Brown",
    is_friendly: row.is_friendly ?? true,
    needs_help: row.needs_help ?? false,
    sterilised: row.sterilised ?? false,
    vaccinated: row.vaccinated ?? false,
    ear_notch: row.ear_notch ?? null,
    trust_score: row.trust_score ?? 50,
    sightings_count: row.sightings_count ?? 1,
    feed_count: row.feed_count ?? 0,
    first_seen: row.first_seen ?? row.created_at,
    last_seen: row.last_seen ?? row.created_at,
    last_fed_at: row.last_fed_at ?? null,
    community_notes: [],
    species: row.species ?? "dog",
    ngo_id: row.ngo_id ?? null,
    code: row.code ?? null,
    assignee_id: row.assignee_id ?? null,
    assignee_name: row.assignee_name ?? null,
    intake_notes: row.intake_notes ?? null,
    owner_name: row.owner_name ?? null,
    owner_contact: row.owner_contact ?? null,
  };
}

// Animals owned by an organization (the partner registry).
export async function getOrgAnimals(ngoId: string): Promise<Dog[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("dogs")
    .select("*")
    .eq("ngo_id", ngoId)
    .order("last_seen", { ascending: false })
    .limit(1000);
  return (data ?? []).map(mapDog);
}

function mapSighting(row: any): Sighting {
  return {
    id: row.id,
    dog_id: row.dog_id ?? null,
    user_id: row.user_id ?? "",
    user_name: row.reporter_name ?? "Someone in India",
    user_avatar: null,
    photo_url: row.photo_url,
    lat: coarse(row.lat),
    lng: coarse(row.lng),
    zone: row.zone ?? "India",
    nickname: row.nickname ?? null,
    mood_tags: (row.mood_tags ?? []) as MoodTag[],
    notes: row.notes ?? null,
    trust_score: row.trust_score ?? 50,
    likes: row.likes ?? 0,
    status: (row.status ?? "live") as "pending" | "live",
    created_at: row.created_at,
  };
}

// ── Stats ────────────────────────────────────────────────────

export async function getCityStats(): Promise<CityStats> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa.rpc("get_city_stats");
    if (data) return data as CityStats;
  }
  return {
    dogsSpotted: 0,
    dogsFed: 0,
    dogsSterilised: 0,
    dogsVaccinated: 0,
    needsHelp: 0,
    volunteers: 0,
  };
}

// ── Dogs ─────────────────────────────────────────────────────

export async function getAllDogs(): Promise<Dog[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("dogs")
      .select("*")
      .order("last_seen", { ascending: false })
      .limit(2000);
    if (data) return data.map(mapDog);
  }
  return [];
}

/** Small, real sample of dogs that have a cover photo, for the landing
 *  page's reported-dogs showcase. Returns an empty array (never fabricated
 *  entries) when no dogs with photos exist yet. */
export async function getShowcaseDogs(limit = 10): Promise<Dog[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("dogs")
    .select("*")
    .not("cover_photo", "is", null)
    .order("last_seen", { ascending: false })
    .limit(limit * 4);
  if (!data) return [];
  return data
    .map(mapDog)
    .filter((d) => d.cover_photo.length > 0)
    .slice(0, limit);
}

export async function getDogById(id: string): Promise<Dog | null> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa.from("dogs").select("*").eq("id", id).single();
    return data ? mapDog(data) : null;
  }
  return null;
}

/** Pure, client-safe filter applied to an already-fetched list. */
export function filterDogs(dogs: Dog[], filter: MapFilter): Dog[] {
  switch (filter) {
    case "recent":
      return [...dogs].sort(
        (a, b) => +new Date(b.last_seen) - +new Date(a.last_seen)
      );
    case "friendly":
      return dogs.filter((d) => d.is_friendly);
    case "needs_help":
      return dogs.filter((d) => d.needs_help);
    case "sterilised":
      return dogs.filter((d) => d.sterilised);
    case "vaccinated":
      return dogs.filter((d) => d.vaccinated);
    default:
      return dogs;
  }
}

// ── Sightings ────────────────────────────────────────────────

export async function getRecentSightings(limit = 12): Promise<Sighting[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("sightings")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data.map(mapSighting);
  }
  return [];
}

export async function getAllSightings(limit = 100): Promise<Sighting[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("sightings")
      .select("*")
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data.map(mapSighting);
  }
  return [];
}

// ── Dog profile (aggregate) ──────────────────────────────────

export async function getDogProfile(id: string): Promise<DogProfile | null> {
  const supa = getSupabase();

  if (supa) {
    const dog = await getDogById(id);
    if (!dog) return null;

    const [sightingsRes, feedRes, vaccRes, sterRes, commentsRes] =
      await Promise.all([
        supa.from("sightings").select("*").eq("dog_id", id).eq("status", "live").order("created_at", { ascending: false }),
        supa.from("feed_events").select("*").eq("dog_id", id).order("created_at", { ascending: false }),
        supa.from("vaccinations").select("*").eq("dog_id", id),
        supa.from("sterilisations").select("*").eq("dog_id", id),
        supa.from("comments").select("*").eq("dog_id", id).order("created_at", { ascending: true }),
      ]);

    const sightings = (sightingsRes.data ?? []).map(mapSighting);

    // Enrich the profile with photos + notes drawn from its sightings.
    dog.photos = Array.from(
      new Set([dog.cover_photo, ...sightings.map((s) => s.photo_url)].filter(Boolean))
    ).slice(0, 6);
    dog.community_notes = Array.from(
      new Set(sightings.map((s) => s.notes).filter(Boolean) as string[])
    ).slice(0, 4);

    return {
      dog,
      sightings,
      feedEvents: (feedRes.data ?? []).map((f: any) => ({
        id: f.id,
        dog_id: f.dog_id,
        user_id: "",
        user_name: f.reporter_name ?? "Someone",
        food_type: f.food_type ?? null,
        created_at: f.created_at,
      })),
      vaccinations: (vaccRes.data ?? []).map((v: any) => ({
        id: v.id,
        dog_id: v.dog_id,
        vaccine: v.vaccine,
        administered_by: v.administered_by ?? null,
        ngo_id: null,
        date: v.date,
      })),
      sterilisations: (sterRes.data ?? []).map((s: any) => ({
        id: s.id,
        dog_id: s.dog_id,
        status: s.status,
        performed_by: s.performed_by ?? null,
        ngo_id: null,
        date: s.date,
      })),
      comments: (commentsRes.data ?? []).map((c: any) => ({
        id: c.id,
        dog_id: c.dog_id,
        user_id: "",
        user_name: c.reporter_name ?? "Someone",
        user_avatar: null,
        body: c.body,
        created_at: c.created_at,
      })),
    };
  }

  return null;
}

// ── NGO dashboard reads ──────────────────────────────────────

export async function getNGOs(): Promise<NGO[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("ngos")
      .select("*")
      .order("dogs_helped", { ascending: false });
    if (data && data.length) {
      return data.map(mapOrg);
    }
  }
  return [];
}

// Full org-profile mapper, used by the directory and public profile pages.
export function mapOrg(n: any): NGO {
  return {
    id: n.id,
    name: n.name,
    area: n.area ?? "",
    logo_url: n.logo_url ?? null,
    dogs_helped: n.dogs_helped ?? 0,
    verified: n.verified ?? false,
    slug: n.slug ?? null,
    mission: n.mission ?? null,
    about: n.about ?? null,
    website: n.website ?? null,
    contact_email: n.contact_email ?? null,
    contact_phone: n.contact_phone ?? null,
    city: n.city ?? null,
    state: n.state ?? null,
    areas_of_work: n.areas_of_work ?? [],
    cover_photo: n.cover_photo ?? null,
    founded_year: n.founded_year ?? null,
    registration_no: n.registration_no ?? null,
    verified_at: n.verified_at ?? null,
    config: n.config ?? {},
  };
}

// Public org directory, verified orgs first, then by impact.
export async function getOrgs(): Promise<NGO[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa
    .from("ngos")
    .select("*")
    .order("verified", { ascending: false })
    .order("dogs_helped", { ascending: false });
  return (data ?? []).map(mapOrg);
}

export async function getOrgBySlug(slug: string): Promise<NGO | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("ngos").select("*").eq("slug", slug).maybeSingle();
  return data ? mapOrg(data) : null;
}

export async function getOrgById(id: string): Promise<NGO | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const { data } = await supa.from("ngos").select("*").eq("id", id).maybeSingle();
  return data ? mapOrg(data) : null;
}

// Lightweight impact numbers for an org's public profile, real counts only.
export async function getOrgImpact(
  ngoId: string
): Promise<{ casesResolved: number; casesActive: number; campaignsActive: number }> {
  const supa = getSupabase();
  if (!supa) return { casesResolved: 0, casesActive: 0, campaignsActive: 0 };
  const [resolved, active, campaigns] = await Promise.all([
    supa.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).eq("status", "resolved"),
    supa.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).neq("status", "resolved"),
    supa.from("fundraisers").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId).eq("status", "active"),
  ]);
  return {
    casesResolved: resolved.count ?? 0,
    casesActive: active.count ?? 0,
    campaignsActive: campaigns.count ?? 0,
  };
}

export async function getDogsNeedingHelp(): Promise<Dog[]> {
  const dogs = await getAllDogs();
  return dogs
    .filter((d) => d.needs_help)
    .sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
}

export async function getDashboardMetrics() {
  const dogs = await getAllDogs();
  const stats = await getCityStats();
  const total = Math.max(1, dogs.length);
  return {
    totalTracked: dogs.length,
    needsHelp: dogs.filter((d) => d.needs_help).length,
    sterilised: dogs.filter((d) => d.sterilised).length,
    vaccinated: dogs.filter((d) => d.vaccinated).length,
    sterilisedPct: Math.round((dogs.filter((d) => d.sterilised).length / total) * 100),
    vaccinatedPct: Math.round((dogs.filter((d) => d.vaccinated).length / total) * 100),
    feedEventsThisMonth: stats.dogsFed,
    activeVolunteers: stats.volunteers,
  };
}

export async function getZoneCoverage() {
  const dogs = await getAllDogs();
  const byZone = new Map<
    string,
    { zone: string; lat: number; lng: number; total: number; help: number; sterilised: number }
  >();
  for (const d of dogs) {
    const e =
      byZone.get(d.zone) ??
      { zone: d.zone, lat: d.lat, lng: d.lng, total: 0, help: 0, sterilised: 0 };
    e.total += 1;
    if (d.needs_help) e.help += 1;
    if (d.sterilised) e.sterilised += 1;
    byZone.set(d.zone, e);
  }
  return Array.from(byZone.values())
    .map((z) => ({
      ...z,
      underserved: Math.min(
        1,
        z.help / Math.max(1, z.total) + (1 - z.sterilised / Math.max(1, z.total)) * 0.5
      ),
    }))
    .sort((a, b) => b.underserved - a.underserved);
}


/* Animals already recorded near a point, for a reporter or reviewer to choose
   from. Proximity narrows the list; a person decides. Nothing here links an
   observation to an animal on its own. */
export type AnimalCandidate = {
  id: string;
  name: string | null;
  zone: string | null;
  cover_photo: string | null;
  status: string | null;
  sightings_count: number | null;
  last_seen: string | null;
  distance_m: number;
};

export async function nearbyAnimals(
  lat: number,
  lng: number,
  radiusM = 300,
  limit = 8
): Promise<AnimalCandidate[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("nearby_animals", {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_limit: limit,
  });
  if (error || !Array.isArray(data)) return [];
  return data as AnimalCandidate[];
}
