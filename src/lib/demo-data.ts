// ─────────────────────────────────────────────────────────────
// Deterministic demo dataset for StrayPaw.
//
// Generates a believable city-wide network of dogs, sightings, feed events,
// vaccinations, comments and NGOs so the entire product is explorable with
// zero configuration. All randomness is seeded → stable across SSR/CSR.
// ─────────────────────────────────────────────────────────────

import { DELHI_ZONES } from "./delhi";
import { DOG_PHOTOS, AVATAR_PHOTOS } from "./photos";
import { seededRandom } from "./utils";
import type {
  Dog,
  Sighting,
  FeedEvent,
  Vaccination,
  Sterilisation,
  Comment,
  NGO,
  User,
  DogStatus,
  MoodTag,
  DogSize,
} from "./types";

const NAMES = [
  "Bruno", "Sheru", "Moti", "Kaalu", "Rani", "Laali", "Tommy", "Julie",
  "Brownie", "Tiger", "Goldie", "Champ", "Coco", "Bubbly", "Raja", "Simba",
  "Lucky", "Bablu", "Pinky", "Chotu", "Snowy", "Hira", "Jugnu", "Mowgli",
];

const REPORTERS = [
  "Aarav Sharma", "Priya Nair", "Rohan Mehta", "Ananya Gupta", "Kabir Singh",
  "Ishita Rao", "Vikram Joshi", "Neha Kapoor", "Arjun Reddy", "Sara Ali",
];

const COLORS = ["Brown", "Black & Tan", "White", "Golden", "Brindle", "Black"];
const SIZES: DogSize[] = ["puppy", "small", "medium", "large"];
const FOODS = ["Rice & curd", "Biscuits", "Chicken", "Pedigree", "Roti & milk", "Eggs"];

const NOTE_POOL = [
  "Seen near the chai stall every morning ☕",
  "Very gentle with kids in the park.",
  "Limps slightly on the back-left leg.",
  "Sleeps under the parked autos at noon.",
  "Guards the building gate at night.",
  "Loves belly rubs, comes when called.",
  "Pregnant — needs extra care 🐶",
  "Scared of motorbikes, otherwise friendly.",
  "Always with two other dogs, a small pack.",
  "Ear-notched, looks already sterilised.",
];

const COMMENT_POOL = [
  "Fed him this morning, looking healthier!",
  "Saw her near the metro station today.",
  "Someone please check the wound on his paw.",
  "Such a sweetheart, followed me home 🥹",
  "The puppies are doing well now 🐾",
  "NGO came and vaccinated the whole pack.",
  "He recognises me now, wags his tail!",
];

export const DEMO_NGOS: NGO[] = [
  { id: "ngo-1", name: "Delhi Paws Trust", area: "South Delhi", logo_url: null, dogs_helped: 1240, verified: true },
  { id: "ngo-2", name: "Friendicoes SECA", area: "Defence Colony", logo_url: null, dogs_helped: 3890, verified: true },
  { id: "ngo-3", name: "Sanjay Gandhi Animal Care", area: "West Delhi", logo_url: null, dogs_helped: 2100, verified: true },
  { id: "ngo-4", name: "Street Dogs of Rohini", area: "Rohini", logo_url: null, dogs_helped: 760, verified: false },
];

export const DEMO_USERS: User[] = REPORTERS.map((name, i) => ({
  id: `user-${i + 1}`,
  name,
  avatar_url: AVATAR_PHOTOS[i % AVATAR_PHOTOS.length],
  is_ngo: i < 2,
  ngo_id: i < 2 ? DEMO_NGOS[i].id : null,
  sightings_count: 4 + Math.floor(seededRandom(`sc-${i}`) * 60),
  trust_level: 55 + Math.floor(seededRandom(`tl-${i}`) * 45),
  created_at: daysAgo(120 + i * 10),
}));

function daysAgo(days: number, hoursJitter = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(days));
  d.setHours(d.getHours() - Math.floor(hoursJitter));
  return d.toISOString();
}

function pick<T>(arr: T[], seed: string): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

const DOG_COUNT = 24;

function buildDogs(): {
  dogs: Dog[];
  sightings: Sighting[];
  feedEvents: FeedEvent[];
  vaccinations: Vaccination[];
  sterilisations: Sterilisation[];
  comments: Comment[];
} {
  const dogs: Dog[] = [];
  const sightings: Sighting[] = [];
  const feedEvents: FeedEvent[] = [];
  const vaccinations: Vaccination[] = [];
  const sterilisations: Sterilisation[] = [];
  const comments: Comment[] = [];

  for (let i = 0; i < DOG_COUNT; i++) {
    const id = `dog-${i + 1}`;
    const zone = DELHI_ZONES[i % DELHI_ZONES.length];
    const r = (k: string) => seededRandom(`${id}-${k}`);

    // Jitter the centroid a little around the zone anchor.
    const lat = zone.lat + (r("lat") - 0.5) * 0.02;
    const lng = zone.lng + (r("lng") - 0.5) * 0.02;

    const isFriendly = r("friendly") > 0.35;
    const needsHelp = r("help") > 0.7;
    const sterilised = r("ster") > 0.55;
    const vaccinated = r("vacc") > 0.45;

    let status: DogStatus = "seen";
    if (needsHelp) status = r("injured") > 0.5 ? "injured" : "hungry";
    else if (sterilised) status = "sterilised";
    else if (vaccinated) status = "vaccinated";

    const photoBase = Math.floor(r("photo") * DOG_PHOTOS.length);
    const photos = [
      DOG_PHOTOS[photoBase % DOG_PHOTOS.length],
      DOG_PHOTOS[(photoBase + 7) % DOG_PHOTOS.length],
      DOG_PHOTOS[(photoBase + 13) % DOG_PHOTOS.length],
    ];

    const sightingCount = 2 + Math.floor(r("scount") * 7);
    const firstSeenDays = 30 + Math.floor(r("first") * 220);

    // Build sightings for this dog, ordered newest → oldest.
    let lastSeenIso = daysAgo(9999);
    for (let s = 0; s < sightingCount; s++) {
      const sr = (k: string) => seededRandom(`${id}-s${s}-${k}`);
      const daysBack = Math.floor((firstSeenDays / sightingCount) * s) + Math.floor(sr("d") * 3);
      const createdAt = daysAgo(daysBack, sr("h") * 24);
      if (s === 0) lastSeenIso = createdAt;

      const moods: MoodTag[] = [];
      if (isFriendly && sr("m1") > 0.4) moods.push("friendly");
      if (needsHelp && sr("m2") > 0.3) moods.push(sr("m2b") > 0.5 ? "injured" : "hungry");
      if (sr("m3") > 0.7) moods.push("sleeping");
      if (sr("m4") > 0.85) moods.push("puppies");
      if (sr("m5") > 0.75) moods.push("playful");
      if (moods.length === 0) moods.push("friendly");

      const reporterIdx = Math.floor(sr("rep") * DEMO_USERS.length);
      const reporter = DEMO_USERS[reporterIdx];

      sightings.push({
        id: `${id}-sight-${s}`,
        dog_id: id,
        user_id: reporter.id,
        user_name: reporter.name,
        user_avatar: reporter.avatar_url,
        photo_url: photos[s % photos.length],
        lat: lat + (sr("jlat") - 0.5) * 0.004,
        lng: lng + (sr("jlng") - 0.5) * 0.004,
        zone: zone.name,
        nickname: s === 0 ? pick(NAMES, `${id}-name`) : null,
        mood_tags: moods,
        notes: sr("note") > 0.5 ? pick(NOTE_POOL, `${id}-s${s}-n`) : null,
        trust_score: 50 + Math.floor(reporter.trust_level * 0.4) + Math.floor(sr("ts") * 12),
        likes: Math.floor(sr("likes") * 240),
        status: "live",
        created_at: createdAt,
      });
    }

    // Feed events.
    const feedCount = needsHelp ? 1 + Math.floor(r("fc") * 3) : 2 + Math.floor(r("fc") * 8);
    for (let f = 0; f < feedCount; f++) {
      const fr = (k: string) => seededRandom(`${id}-f${f}-${k}`);
      const feeder = DEMO_USERS[Math.floor(fr("u") * DEMO_USERS.length)];
      feedEvents.push({
        id: `${id}-feed-${f}`,
        dog_id: id,
        user_id: feeder.id,
        user_name: feeder.name,
        food_type: pick(FOODS, `${id}-f${f}`),
        created_at: daysAgo(Math.floor(fr("d") * firstSeenDays), fr("h") * 24),
      });
    }

    if (vaccinated) {
      vaccinations.push({
        id: `${id}-vacc-1`,
        dog_id: id,
        vaccine: "Anti-Rabies (ARV)",
        administered_by: pick(DEMO_NGOS, `${id}-vngo`).name,
        ngo_id: pick(DEMO_NGOS, `${id}-vngo`).id,
        date: daysAgo(Math.floor(r("vdate") * 200)),
      });
    }
    if (sterilised) {
      sterilisations.push({
        id: `${id}-ster-1`,
        dog_id: id,
        status: "completed",
        performed_by: pick(DEMO_NGOS, `${id}-sngo`).name,
        ngo_id: pick(DEMO_NGOS, `${id}-sngo`).id,
        date: daysAgo(Math.floor(r("sdate") * 200)),
      });
    } else if (r("sched") > 0.7) {
      sterilisations.push({
        id: `${id}-ster-sched`,
        dog_id: id,
        status: "scheduled",
        performed_by: pick(DEMO_NGOS, `${id}-sngo`).name,
        ngo_id: pick(DEMO_NGOS, `${id}-sngo`).id,
        date: daysAgo(-Math.floor(r("future") * 14)), // future date
      });
    }

    const commentCount = Math.floor(r("cc") * 4);
    for (let c = 0; c < commentCount; c++) {
      const cr = (k: string) => seededRandom(`${id}-c${c}-${k}`);
      const author = DEMO_USERS[Math.floor(cr("u") * DEMO_USERS.length)];
      comments.push({
        id: `${id}-comment-${c}`,
        dog_id: id,
        user_id: author.id,
        user_name: author.name,
        user_avatar: author.avatar_url,
        body: pick(COMMENT_POOL, `${id}-c${c}`),
        created_at: daysAgo(Math.floor(cr("d") * 30), cr("h") * 24),
      });
    }

    const dogSightings = sightings.filter((s) => s.dog_id === id);
    const notes = Array.from(
      new Set(dogSightings.map((s) => s.notes).filter(Boolean) as string[])
    ).slice(0, 3);

    const nickname = dogSightings.find((s) => s.nickname)?.nickname ?? pick(NAMES, `${id}-name`);
    const avgTrust = Math.round(
      dogSightings.reduce((a, s) => a + s.trust_score, 0) / dogSightings.length
    );

    dogs.push({
      id,
      name: nickname,
      zone: zone.name,
      lat,
      lng,
      status,
      cover_photo: photos[0],
      photos,
      size: pick(SIZES, `${id}-size`),
      color: pick(COLORS, `${id}-color`),
      is_friendly: isFriendly,
      needs_help: needsHelp,
      sterilised,
      vaccinated,
      trust_score: Math.min(99, avgTrust + Math.floor(dogSightings.length * 1.5)),
      sightings_count: dogSightings.length,
      feed_count: feedCount,
      first_seen: daysAgo(firstSeenDays),
      last_seen: lastSeenIso,
      // Some fed within the recency window, others gone stale → "needs feeding".
      last_fed_at:
        feedCount > 0
          ? daysAgo(0, Math.floor(r("fedh") * 26))
          : null,
      community_notes: notes,
    });
  }

  // Sort the global feed newest-first.
  sightings.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  return { dogs, sightings, feedEvents, vaccinations, sterilisations, comments };
}

// Build once at module load — deterministic, so safe to memoise.
export const DEMO = buildDogs();
