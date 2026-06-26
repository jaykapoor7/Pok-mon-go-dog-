// ─────────────────────────────────────────────────────────────
// DEMO SEED — the ONE shared, deterministic, read-only demo dataset.
//
// This module is the single source of demo content for the map, the feed AND
// the NGO dashboard. It never touches the database and is never mixed into real
// submissions. Everything is seeded (stable across server/client renders) so a
// prospect sees an identical, living product every time.
//
// Spread across four metros (Delhi, Mumbai, Bengaluru, Pune), grouped into
// named colonies — the unit grants and municipal ABC contracts measure.
// ─────────────────────────────────────────────────────────────

import { DOG_PHOTOS } from "./photos";
import { seededRandom, dogLabel } from "./utils";
import { DEMO_ID_PREFIX } from "./config";
import type {
  Dog,
  DogProfile,
  DogSize,
  Sighting,
  MoodTag,
  Case,
  CaseUpdate,
  CaseStatus,
  CaseSeverity,
  CaseCategory,
  NGO,
} from "./types";

export type DemoTag = "hungry" | "injured" | "friendly" | "sleeping" | "roaming";

export interface DemoSighting {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO, within the last 1–14 days
  tag: DemoTag;
  note?: string;
  colony: string;
  city: string;
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

const COLORS = ["Brown", "Black & Tan", "White", "Golden", "Brindle", "Black"];
const SIZES: DogSize[] = ["puppy", "small", "medium", "large"];

interface SeedCity {
  city: string;
  lat: number;
  lng: number;
  colonies: string[];
  count: number;
}

// ~42 dogs spread across four metros and their colonies.
const SEED_CITIES: SeedCity[] = [
  {
    city: "Delhi",
    lat: 28.61,
    lng: 77.21,
    colonies: ["Hauz Khas", "Saket", "Rohini", "Dwarka", "Karol Bagh", "Lajpat Nagar"],
    count: 16,
  },
  {
    city: "Mumbai",
    lat: 19.08,
    lng: 72.88,
    colonies: ["Bandra", "Andheri", "Dadar", "Borivali"],
    count: 10,
  },
  {
    city: "Bengaluru",
    lat: 12.97,
    lng: 77.59,
    colonies: ["Indiranagar", "Koramangala", "Whitefield", "Jayanagar"],
    count: 10,
  },
  {
    city: "Pune",
    lat: 18.52,
    lng: 73.86,
    colonies: ["Kothrud", "Viman Nagar", "Hadapsar"],
    count: 6,
  },
];

function pick<T>(arr: T[], seed: string): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

/** Deterministic colony centre = city centre + a small seeded offset. */
function colonyCentre(city: SeedCity, colony: string) {
  const ox = (seededRandom(`${city.city}-${colony}-x`) - 0.5) * 0.14;
  const oy = (seededRandom(`${city.city}-${colony}-y`) - 0.5) * 0.14;
  return { lat: city.lat + oy, lng: city.lng + ox };
}

function build(): DemoSighting[] {
  const out: DemoSighting[] = [];
  let n = 0;

  for (const city of SEED_CITIES) {
    for (let i = 0; i < city.count; i++) {
      n += 1;
      const id = `${DEMO_ID_PREFIX}${n}`;
      const r = (k: string) => seededRandom(`${id}-${k}`);

      const colony = city.colonies[i % city.colonies.length];
      const c = colonyCentre(city, colony);
      // small jitter around the colony centre
      const lat = c.lat + (r("jy") - 0.5) * 0.03;
      const lng = c.lng + (r("jx") - 0.5) * 0.03;

      const tag = pick(TAGS, `${id}-tag`);
      const days = 1 + Math.floor(Math.pow(r("t"), 1.6) * 13);
      const ts = new Date(Date.now() - days * 86_400_000 - r("th") * 86_400_000);

      out.push({
        id,
        latitude: Number(lat.toFixed(5)),
        longitude: Number(lng.toFixed(5)),
        timestamp: ts.toISOString(),
        tag,
        note: pick(NOTES[tag], `${id}-note`),
        colony,
        city: city.city,
      });
    }
  }
  return out;
}

/** The raw demo sightings (id, lat, lng, timestamp, tag, note, colony, city). */
export const demoSightings: DemoSighting[] = build();

/** Map a demo sighting onto a Dog so it renders with the exact same markers/UI. */
function toDog(s: DemoSighting): Dog {
  const r = (k: string) => seededRandom(`${s.id}-d-${k}`);
  const injured = s.tag === "injured";
  const hungry = s.tag === "hungry";
  // Coverage tuned into the realistic 50–70% band for a believable demo.
  const sterilised = r("st") > 0.42; // ~58%
  const vaccinated = r("vc") > 0.36; // ~64%
  const friendly = s.tag === "friendly" || r("fr") > 0.45;
  const fedRecently = !hungry && !injured && r("fed") > 0.5;
  const photo = DOG_PHOTOS[Math.floor(r("ph") * DOG_PHOTOS.length)];

  return {
    id: s.id,
    name: null, // strays are identified by area, not names
    zone: s.colony,
    colony: s.colony,
    city: s.city,
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

// ── Demo NGOs / volunteers (partners + case owners) ───────────────
export const demoNGOs: NGO[] = [
  { id: "demo-ngo-1", name: "Paws & Care India", area: "Delhi NCR", logo_url: null, dogs_helped: 1240, verified: true },
  { id: "demo-ngo-2", name: "Mumbai Street Angels", area: "Mumbai", logo_url: null, dogs_helped: 980, verified: true },
  { id: "demo-ngo-3", name: "Bengaluru Animal Rescue", area: "Bengaluru", logo_url: null, dogs_helped: 1520, verified: true },
  { id: "demo-ngo-4", name: "Pune Paw Project", area: "Pune", logo_url: null, dogs_helped: 610, verified: false },
];

export const demoVolunteers = [
  { id: "demo-vol-aarav", name: "Aarav Sharma" },
  { id: "demo-vol-priya", name: "Priya Nair" },
  { id: "demo-vol-kabir", name: "Kabir Singh" },
  { id: "demo-vol-ishita", name: "Ishita Rao" },
];

// ── Demo cases (the NGO operations layer) ─────────────────────────
const CASE_CATS: CaseCategory[] = ["injury", "sterilisation", "rescue", "vaccination", "other"];
const OUTCOME_NOTES = [
  "Treated on-site and released; wound healing well.",
  "Sterilised and ear-notched; recovered fully.",
  "Rescued, vaccinated and rehomed with a foster.",
  "Antibiotics course completed; back with its colony.",
];

function daysAgoIso(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
function hoursAgoIso(h: number) {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}

function buildCases(): { cases: Case[]; updates: CaseUpdate[] } {
  const cases: Case[] = [];
  const updates: CaseUpdate[] = [];
  // ~20 cases drawn from the demo dogs (injured ones become urgent cases).
  const pool = demoDogs.slice(0, 22);

  pool.forEach((dog, i) => {
    const r = (k: string) => seededRandom(`case-${dog.id}-${k}`);
    const id = `demo-case-${i + 1}`;

    // Deterministic but varied status distribution.
    const roll = r("roll");
    let status: CaseStatus;
    if (dog.needs_help && roll > 0.4) status = roll > 0.7 ? "in_progress" : "assigned";
    else if (roll < 0.18) status = "unverified";
    else if (roll < 0.34) status = "assigned";
    else if (roll < 0.5) status = "in_progress";
    else if (roll < 0.86) status = "resolved";
    else status = "closed";

    const severity: CaseSeverity = dog.needs_help
      ? r("sv") > 0.5 ? "critical" : "high"
      : (["low", "normal", "normal", "high"][Math.floor(r("sv2") * 4)] as CaseSeverity);

    const category: CaseCategory = dog.needs_help
      ? r("c") > 0.5 ? "injury" : "rescue"
      : CASE_CATS[Math.floor(r("c2") * CASE_CATS.length)];

    const assigned = status !== "unverified";
    const vol = demoVolunteers[Math.floor(r("v") * demoVolunteers.length)];
    const resolved = status === "resolved" || status === "closed";

    const createdAt = daysAgoIso(4 + Math.floor(r("ca") * 26));
    // Some active cases are intentionally stale → "overdue".
    const lastActivity = resolved
      ? daysAgoIso(1 + Math.floor(r("la") * 8))
      : daysAgoIso(Math.floor(r("la2") * 9)); // 0–9 days; ≥5 reads as overdue
    const resolvedAt = resolved ? lastActivity : null;

    cases.push({
      id,
      dog_id: dog.id,
      title: `${category[0].toUpperCase() + category.slice(1)} — ${dogLabel(dog)}`,
      description: dog.community_notes[0] ?? "Reported by the community.",
      zone: dog.colony ?? dog.zone,
      lat: dog.lat,
      lng: dog.lng,
      severity,
      category,
      tags: dog.needs_help ? ["urgent"] : [],
      status,
      resolution: resolved ? (["treated", "sterilized", "rescued"][Math.floor(r("res") * 3)] as Case["resolution"]) : null,
      assignee_id: assigned ? vol.id : null,
      assignee_name: assigned ? vol.name : null,
      created_by_id: "demo-vol-aarav",
      created_by_name: "Aarav Sharma",
      created_at: createdAt,
      updated_at: lastActivity,
      last_activity_at: lastActivity,
      due_at: null,
      resolved_at: resolvedAt,
      before_url: resolved ? dog.cover_photo : null,
      after_url: resolved ? DOG_PHOTOS[Math.floor(r("af") * DOG_PHOTOS.length)] : null,
      outcome_note: resolved ? pick(OUTCOME_NOTES, `${id}-out`) : null,
    });

    updates.push({
      id: `${id}-u0`, case_id: id, actor_id: "demo-vol-aarav", actor_name: "Aarav Sharma",
      type: "created", from_status: null, to_status: "unverified", note: "Case opened",
      created_at: createdAt,
    });
    if (assigned) {
      updates.push({
        id: `${id}-u1`, case_id: id, actor_id: vol.id, actor_name: vol.name,
        type: "claimed", from_status: "unverified", to_status: "assigned",
        note: `${vol.name} claimed this case`,
        created_at: hoursAgoIso(2 + Math.floor(r("u1") * 40)),
      });
    }
    if (resolved) {
      updates.push({
        id: `${id}-u2`, case_id: id, actor_id: vol.id, actor_name: vol.name,
        type: "status_changed", from_status: "in_progress", to_status: "resolved",
        note: pick(OUTCOME_NOTES, `${id}-out`), created_at: resolvedAt!,
      });
    }
  });

  return { cases, updates };
}

const DEMO_CASE_DATA = buildCases();
export const demoCases: Case[] = DEMO_CASE_DATA.cases;
export const demoCaseUpdates: CaseUpdate[] = DEMO_CASE_DATA.updates;
