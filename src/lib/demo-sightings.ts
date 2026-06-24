// ─────────────────────────────────────────────────────────────
// DEMO SIGHTINGS — strictly isolated, read-only sample data.
//
// This module is the ONLY source of demo content. It never touches the
// database and is never mixed into real submissions. Real data flows through
// lib/data.ts; this is kept deliberately separate (demoSightings vs real).
//
// Generates ~42 sightings spread naturally across Delhi, with organic
// timestamps (1–14 days) and human-sounding notes. Deterministic (seeded) so
// it's stable across server/client renders.
// ─────────────────────────────────────────────────────────────

import { DELHI_BOUNDS, nearestZone } from "./delhi";
import { DOG_PHOTOS } from "./photos";
import { seededRandom } from "./utils";
import { DEMO_ID_PREFIX } from "./config";
import type { Dog, DogProfile, DogSize, Sighting, MoodTag } from "./types";

export type DemoTag = "hungry" | "injured" | "friendly" | "sleeping" | "roaming";

export interface DemoSighting {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO, within the last 1–14 days
  tag: DemoTag;
  note?: string;
}

const TAGS: DemoTag[] = ["hungry", "injured", "friendly", "sleeping", "roaming"];

const NOTES: Record<DemoTag, string[]> = {
  hungry: [
    "looks hungry near the market",
    "waiting by the dhaba for scraps",
    "thin, hasn't eaten — by the tea stall",
    "begging gently near the bakery",
  ],
  injured: [
    "limping on the back leg",
    "small wound near the ear",
    "favouring a front paw by the gate",
    "looks hurt, resting in the shade",
  ],
  friendly: [
    "very friendly near the tea stall",
    "wagged its tail, came right up",
    "gentle, loves belly rubs by the park",
    "followed me for a bit, super sweet",
  ],
  sleeping: [
    "curled up under a parked auto",
    "napping in the afternoon sun",
    "fast asleep near the temple steps",
    "dozing by the shop shutters",
  ],
  roaming: [
    "trotting along the main road",
    "patrolling near the metro gate",
    "roaming the colony lanes",
    "wandering by the bus stop",
  ],
};

const NAMES = [
  "Bruno", "Sheru", "Moti", "Laali", "Tommy", "Brownie", "Goldie", "Raja",
  "Coco", "Simba", "Rani", "Bablu", "Snowy", "Hira", "Mowgli", "Kaalu",
];
const COLORS = ["Brown", "Black & Tan", "White", "Golden", "Brindle", "Black"];
const SIZES: DogSize[] = ["puppy", "small", "medium", "large"];

const COLS = 7;
const ROWS = 6; // 42 cells → 42 evenly-spread sightings (no clustering)

function pick<T>(arr: T[], seed: string): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function build(): DemoSighting[] {
  const out: DemoSighting[] = [];
  const latSpan = DELHI_BOUNDS.maxLat - DELHI_BOUNDS.minLat;
  const lngSpan = DELHI_BOUNDS.maxLng - DELHI_BOUNDS.minLng;

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const id = `${DEMO_ID_PREFIX}${row * COLS + col + 1}`;
      const r = (k: string) => seededRandom(`${id}-${k}`);

      // One point per grid cell, jittered within the cell → even, organic spread.
      const lat =
        DELHI_BOUNDS.minLat + ((row + 0.2 + r("jy") * 0.6) / ROWS) * latSpan;
      const lng =
        DELHI_BOUNDS.minLng + ((col + 0.2 + r("jx") * 0.6) / COLS) * lngSpan;

      const tag = pick(TAGS, `${id}-tag`);
      // Organic timestamps: weighted toward recent, spread across 1–14 days.
      const days = 1 + Math.floor(Math.pow(r("t"), 1.6) * 13);
      const ts = new Date(Date.now() - days * 86_400_000 - r("th") * 86_400_000);

      out.push({
        id,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lng.toFixed(5)),
        timestamp: ts.toISOString(),
        tag,
        note: pick(NOTES[tag], `${id}-note`),
      });
    }
  }
  return out;
}

/** The raw demo sightings (the required shape: id, lat, lng, timestamp, tag, note). */
export const demoSightings: DemoSighting[] = build();

/** Map a demo sighting onto a Dog so it renders with the exact same markers/UI. */
function toDog(s: DemoSighting): Dog {
  const r = (k: string) => seededRandom(`${s.id}-d-${k}`);
  const injured = s.tag === "injured";
  const hungry = s.tag === "hungry";
  const sterilised = r("st") > 0.6;
  const vaccinated = r("vc") > 0.55;
  const friendly = s.tag === "friendly" || r("fr") > 0.45;
  const fedRecently = !hungry && !injured && r("fed") > 0.5;
  const photo = DOG_PHOTOS[Math.floor(r("ph") * DOG_PHOTOS.length)];

  return {
    id: s.id,
    name: pick(NAMES, `${s.id}-name`),
    zone: nearestZone(s.latitude, s.longitude),
    lat: s.latitude,
    lng: s.longitude,
    status: injured ? "injured" : hungry ? "hungry" : "seen",
    cover_photo: photo,
    photos: [photo],
    size: pick(SIZES, `${s.id}-size`),
    color: pick(COLORS, `${s.id}-color`),
    is_friendly: friendly,
    needs_help: injured,
    sterilised,
    vaccinated,
    trust_score: 60 + Math.floor(r("tr") * 35),
    sightings_count: 1 + Math.floor(r("sc") * 4),
    feed_count: fedRecently ? 1 + Math.floor(r("fc") * 3) : 0,
    first_seen: s.timestamp,
    last_seen: s.timestamp,
    last_fed_at: fedRecently
      ? new Date(Date.now() - r("fa") * 8 * 3_600_000).toISOString()
      : null,
    community_notes: s.note ? [s.note] : [],
  };
}

/** Demo dogs for the map — clearly separate from real dogs. */
export const demoDogs: Dog[] = demoSightings.map(toDog);

const byId = new Map(demoDogs.map((d) => [d.id, d]));

export function getDemoDogById(id: string): Dog | undefined {
  return byId.get(id);
}

/** A minimal, self-contained profile for a demo dog (no DB, no cases). */
export function getDemoProfile(id: string): DogProfile | null {
  const dog = byId.get(id);
  if (!dog) return null;
  return {
    dog,
    sightings: [
      {
        id: `${id}-s1`,
        dog_id: id,
        user_id: "",
        user_name: "Demo reporter",
        user_avatar: null,
        photo_url: dog.cover_photo,
        lat: dog.lat,
        lng: dog.lng,
        zone: dog.zone,
        nickname: dog.name,
        mood_tags: [],
        notes: dog.community_notes[0] ?? null,
        trust_score: dog.trust_score,
        likes: 0,
        status: "live",
        created_at: dog.last_seen,
      },
    ],
    feedEvents: [],
    vaccinations: [],
    sterilisations: [],
    comments: [],
    matchSuggestions: [],
  };
}

// ── Demo sightings for the FEED (so /feed looks active too) ───────
const REPORTERS = ["Aarav", "Priya", "Kabir", "Ishita", "Rohan", "Neha", "Sara", "Arjun"];
const TAG_TO_MOOD: Partial<Record<DemoTag, MoodTag>> = {
  hungry: "hungry",
  injured: "injured",
  friendly: "friendly",
  sleeping: "sleeping",
};

export const demoFeedSightings: Sighting[] = demoSightings
  .map((s): Sighting => {
    const dog = byId.get(s.id)!;
    const mood = TAG_TO_MOOD[s.tag];
    return {
      id: `${s.id}-feed`,
      dog_id: s.id,
      user_id: "",
      user_name: REPORTERS[Math.floor(seededRandom(`${s.id}-rep`) * REPORTERS.length)],
      user_avatar: null,
      photo_url: dog.cover_photo,
      lat: s.latitude,
      lng: s.longitude,
      zone: dog.zone,
      nickname: dog.name,
      mood_tags: mood ? [mood] : [],
      notes: s.note ?? null,
      trust_score: dog.trust_score,
      likes: Math.floor(seededRandom(`${s.id}-likes`) * 180),
      status: "live",
      created_at: s.timestamp,
    };
  })
  .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
