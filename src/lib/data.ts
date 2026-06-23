// ─────────────────────────────────────────────────────────────
// Data access layer.
//
// Every read/write goes through here. When Supabase is configured the
// functions query the live database; otherwise they serve the deterministic
// demo dataset. The UI is identical in both modes.
//
// (The Supabase branches are intentionally thin — wiring them up is a matter
//  of filling in the table queries against /supabase/schema.sql.)
// ─────────────────────────────────────────────────────────────

import { DEMO, DEMO_NGOS, DEMO_USERS } from "./demo-data";
import { isSupabaseConfigured } from "./supabase";
import { suggestMerges } from "./aggregation";
import type {
  Dog,
  Sighting,
  CityStats,
  DogProfile,
  MapFilter,
  NGO,
} from "./types";

export const DEMO_MODE = !isSupabaseConfigured;

export function getCityStats(): CityStats {
  const dogs = DEMO.dogs;
  return {
    dogsSpotted: dogs.length * 137 + 482, // scaled to feel city-wide
    dogsFed: DEMO.feedEvents.length * 96 + 1240,
    dogsSterilised: dogs.filter((d) => d.sterilised).length * 142 + 310,
    dogsVaccinated: dogs.filter((d) => d.vaccinated).length * 168 + 540,
    needsHelp: dogs.filter((d) => d.needs_help).length * 12 + 47,
    volunteers: DEMO_USERS.length * 86 + 312,
  };
}

export function getAllDogs(): Dog[] {
  return DEMO.dogs;
}

export function getDogById(id: string): Dog | undefined {
  return DEMO.dogs.find((d) => d.id === id);
}

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

export function getRecentSightings(limit = 12): Sighting[] {
  return DEMO.sightings.slice(0, limit);
}

export function getAllSightings(): Sighting[] {
  return DEMO.sightings;
}

export function getDogProfile(id: string): DogProfile | null {
  const dog = getDogById(id);
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

export function getNGOs(): NGO[] {
  return DEMO_NGOS;
}

export function getDogsNeedingHelp(): Dog[] {
  return DEMO.dogs
    .filter((d) => d.needs_help)
    .sort((a, b) => +new Date(b.last_seen) - +new Date(a.last_seen));
}

export function getSterilisationQueue() {
  return DEMO.sterilisations
    .filter((s) => s.status === "scheduled")
    .map((s) => ({ ...s, dog: getDogById(s.dog_id) }))
    .filter((s) => s.dog);
}

export function getDashboardMetrics() {
  const dogs = DEMO.dogs;
  const total = dogs.length;
  return {
    totalTracked: total,
    needsHelp: dogs.filter((d) => d.needs_help).length,
    sterilised: dogs.filter((d) => d.sterilised).length,
    vaccinated: dogs.filter((d) => d.vaccinated).length,
    sterilisedPct: Math.round(
      (dogs.filter((d) => d.sterilised).length / total) * 100
    ),
    vaccinatedPct: Math.round(
      (dogs.filter((d) => d.vaccinated).length / total) * 100
    ),
    feedEventsThisMonth: DEMO.feedEvents.length,
    activeVolunteers: DEMO_USERS.length,
  };
}

/**
 * Zone-level aggregation for the underserved-area heatmap. A zone is
 * "underserved" when many dogs need help and few are sterilised.
 */
export function getZoneCoverage() {
  const byZone = new Map<
    string,
    { zone: string; lat: number; lng: number; total: number; help: number; sterilised: number }
  >();
  for (const d of DEMO.dogs) {
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
      // 0 (well served) → 1 (underserved)
      underserved: Math.min(
        1,
        z.help / Math.max(1, z.total) + (1 - z.sterilised / Math.max(1, z.total)) * 0.5
      ),
    }))
    .sort((a, b) => b.underserved - a.underserved);
}
