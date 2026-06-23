// ─────────────────────────────────────────────────────────────
// Data access layer (read side).
//
// When Supabase is configured every read hits the live database; otherwise it
// serves the deterministic demo dataset so the app still runs locally with no
// configuration. All functions are async and the UI is identical in both modes.
// ─────────────────────────────────────────────────────────────

import { DEMO, DEMO_NGOS, DEMO_USERS } from "./demo-data";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { suggestMerges } from "./aggregation";
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

export const DEMO_MODE = !isSupabaseConfigured;

// Demo data is OFF by default — the app starts fresh and empty, and fills up
// only with real sightings. Opt back in for local UI work with NEXT_PUBLIC_DEMO=1.
const ALLOW_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

// ── Row mappers ──────────────────────────────────────────────

function mapDog(row: any): Dog {
  return {
    id: row.id,
    name: row.name ?? null,
    zone: row.zone ?? "Delhi",
    lat: row.lat,
    lng: row.lng,
    status: (row.status ?? "seen") as DogStatus,
    cover_photo: row.cover_photo ?? "",
    photos: row.cover_photo ? [row.cover_photo] : [],
    size: (row.size ?? "medium") as DogSize,
    color: row.color ?? "Brown",
    is_friendly: row.is_friendly ?? true,
    needs_help: row.needs_help ?? false,
    sterilised: row.sterilised ?? false,
    vaccinated: row.vaccinated ?? false,
    trust_score: row.trust_score ?? 50,
    sightings_count: row.sightings_count ?? 1,
    feed_count: row.feed_count ?? 0,
    first_seen: row.first_seen ?? row.created_at,
    last_seen: row.last_seen ?? row.created_at,
    community_notes: [],
  };
}

function mapSighting(row: any): Sighting {
  return {
    id: row.id,
    dog_id: row.dog_id ?? null,
    user_id: "",
    user_name: row.reporter_name ?? "Someone in Delhi",
    user_avatar: null,
    photo_url: row.photo_url,
    lat: row.lat,
    lng: row.lng,
    zone: row.zone ?? "Delhi",
    nickname: row.nickname ?? null,
    mood_tags: (row.mood_tags ?? []) as MoodTag[],
    notes: row.notes ?? null,
    trust_score: row.trust_score ?? 50,
    likes: row.likes ?? 0,
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
  if (!ALLOW_DEMO) {
    return {
      dogsSpotted: 0,
      dogsFed: 0,
      dogsSterilised: 0,
      dogsVaccinated: 0,
      needsHelp: 0,
      volunteers: 0,
    };
  }
  // Honest demo counts — no inflated multipliers.
  const dogs = DEMO.dogs;
  return {
    dogsSpotted: dogs.length,
    dogsFed: DEMO.feedEvents.length,
    dogsSterilised: dogs.filter((d) => d.sterilised).length,
    dogsVaccinated: dogs.filter((d) => d.vaccinated).length,
    needsHelp: dogs.filter((d) => d.needs_help).length,
    volunteers: DEMO_USERS.length,
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
  return ALLOW_DEMO ? DEMO.dogs : [];
}

export async function getDogById(id: string): Promise<Dog | null> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa.from("dogs").select("*").eq("id", id).single();
    return data ? mapDog(data) : null;
  }
  return ALLOW_DEMO ? DEMO.dogs.find((d) => d.id === id) ?? null : null;
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
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data.map(mapSighting);
  }
  return ALLOW_DEMO ? DEMO.sightings.slice(0, limit) : [];
}

export async function getAllSightings(limit = 100): Promise<Sighting[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("sightings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data.map(mapSighting);
  }
  return ALLOW_DEMO ? DEMO.sightings : [];
}

// ── Dog profile (aggregate) ──────────────────────────────────

export async function getDogProfile(id: string): Promise<DogProfile | null> {
  const supa = getSupabase();

  if (supa) {
    const dog = await getDogById(id);
    if (!dog) return null;

    const [sightingsRes, feedRes, vaccRes, sterRes, commentsRes, allDogsRes] =
      await Promise.all([
        supa.from("sightings").select("*").eq("dog_id", id).order("created_at", { ascending: false }),
        supa.from("feed_events").select("*").eq("dog_id", id).order("created_at", { ascending: false }),
        supa.from("vaccinations").select("*").eq("dog_id", id),
        supa.from("sterilisations").select("*").eq("dog_id", id),
        supa.from("comments").select("*").eq("dog_id", id).order("created_at", { ascending: true }),
        supa.from("dogs").select("*").limit(2000),
      ]);

    const sightings = (sightingsRes.data ?? []).map(mapSighting);
    const allDogs = (allDogsRes.data ?? []).map(mapDog);

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
      matchSuggestions: suggestMerges(dog, allDogs),
    };
  }

  // Demo fallback (off unless explicitly enabled).
  if (!ALLOW_DEMO) return null;
  const dog = DEMO.dogs.find((d) => d.id === id);
  if (!dog) return null;
  return {
    dog,
    sightings: DEMO.sightings
      .filter((s) => s.dog_id === id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    feedEvents: DEMO.feedEvents
      .filter((f) => f.dog_id === id)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    vaccinations: DEMO.vaccinations.filter((v) => v.dog_id === id),
    sterilisations: DEMO.sterilisations.filter((s) => s.dog_id === id),
    comments: DEMO.comments
      .filter((c) => c.dog_id === id)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
    matchSuggestions: suggestMerges(dog, DEMO.dogs),
  };
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
      return data.map((n: any) => ({
        id: n.id,
        name: n.name,
        area: n.area ?? "",
        logo_url: n.logo_url ?? null,
        dogs_helped: n.dogs_helped ?? 0,
        verified: n.verified ?? false,
      }));
    }
  }
  return ALLOW_DEMO ? DEMO_NGOS : [];
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
