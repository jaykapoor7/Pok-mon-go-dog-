// ─────────────────────────────────────────────────────────────
// StrayPaw — domain types
// These mirror the Supabase schema in /supabase/schema.sql
// ─────────────────────────────────────────────────────────────

export type DogStatus =
  | "seen"
  | "hungry"
  | "injured"
  | "sterilised"
  | "vaccinated";

export type MoodTag =
  | "friendly"
  | "hungry"
  | "injured"
  | "sleeping"
  | "puppies"
  | "shy"
  | "playful";

export type DogSize = "puppy" | "small" | "medium" | "large";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface User {
  id: string;
  name: string;
  avatar_url: string | null;
  is_ngo: boolean;
  ngo_id: string | null;
  sightings_count: number;
  trust_level: number; // 0–100, reputation of the reporter
  created_at: string;
}

export interface Sighting {
  id: string;
  dog_id: string | null; // null until clustered into a dog profile
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  photo_url: string;
  lat: number;
  lng: number;
  zone: string; // human-readable Delhi locality
  nickname: string | null;
  mood_tags: MoodTag[];
  notes: string | null;
  trust_score: number; // 0–100 confidence this sighting is accurate
  likes: number;
  status: "pending" | "live"; // moderation state; only "live" is public
  created_at: string;
}

export interface FeedEvent {
  id: string;
  dog_id: string;
  user_id: string;
  user_name: string;
  food_type: string | null;
  created_at: string;
}

export interface Vaccination {
  id: string;
  dog_id: string;
  vaccine: string; // e.g. "Anti-Rabies"
  administered_by: string | null; // NGO name
  ngo_id: string | null;
  date: string;
}

export interface Sterilisation {
  id: string;
  dog_id: string;
  status: "scheduled" | "completed";
  performed_by: string | null;
  ngo_id: string | null;
  date: string;
}

export interface Comment {
  id: string;
  dog_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  body: string;
  created_at: string;
}

export interface NGO {
  id: string;
  name: string;
  area: string;
  logo_url: string | null;
  dogs_helped: number;
  verified: boolean;
}

export interface DogMatch {
  id: string;
  dog_id_a: string;
  dog_id_b: string;
  confidence: number; // 0–1 likelihood they are the same dog
  reason: string;
  status: "suggested" | "merged" | "rejected";
}

export interface Dog {
  id: string;
  name: string | null; // aggregated nickname
  zone: string;
  colony?: string | null; // named colony grouping (ABC/grant unit)
  city?: string | null;
  lat: number; // centroid of sightings
  lng: number;
  status: DogStatus;
  cover_photo: string;
  photos: string[];
  size: DogSize;
  color: string;
  is_friendly: boolean;
  needs_help: boolean;
  sterilised: boolean;
  vaccinated: boolean;
  ear_notch?: string | null; // ABC sterilisation mark: 'left' | 'right' | 'both'
  trust_score: number; // aggregate confidence of the profile
  sightings_count: number;
  feed_count: number;
  first_seen: string;
  last_seen: string;
  last_fed_at: string | null;
  community_notes: string[];
}

// Convenience aggregate returned by the dog-profile builder.
export interface DogProfile {
  dog: Dog;
  sightings: Sighting[];
  feedEvents: FeedEvent[];
  vaccinations: Vaccination[];
  sterilisations: Sterilisation[];
  comments: Comment[];
  matchSuggestions: { dog: Dog; confidence: number; reason: string }[];
}

export interface CityStats {
  dogsSpotted: number;
  dogsFed: number;
  dogsSterilised: number;
  dogsVaccinated: number;
  needsHelp: number;
  volunteers: number;
}

export const STATUS_META: Record<
  DogStatus,
  { label: string; emoji: string; color: string }
> = {
  seen: { label: "Seen", emoji: "🐕", color: "#9A9C88" },
  hungry: { label: "Hungry", emoji: "🍗", color: "#D9A441" },
  injured: { label: "Injured", emoji: "🚑", color: "#C0492E" },
  sterilised: { label: "Sterilised", emoji: "✂️", color: "#3E8473" },
  vaccinated: { label: "Vaccinated", emoji: "💉", color: "#4E8A5F" },
};

export const MOOD_META: Record<MoodTag, { label: string; emoji: string }> = {
  friendly: { label: "Friendly", emoji: "🥰" },
  hungry: { label: "Hungry", emoji: "🍗" },
  injured: { label: "Injured", emoji: "🚑" },
  sleeping: { label: "Sleeping", emoji: "😴" },
  puppies: { label: "Puppies", emoji: "🐶" },
  shy: { label: "Shy", emoji: "🙈" },
  playful: { label: "Playful", emoji: "🎾" },
};

export type MapFilter =
  | "all"
  | "recent"
  | "friendly"
  | "needs_help"
  | "sterilised"
  | "vaccinated";

// ─────────────────────────────────────────────────────────────
// NGO operations layer (cases) — mirrors /supabase/cases.sql
// ─────────────────────────────────────────────────────────────

export type CaseStatus =
  | "unverified"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed";

export type CaseSeverity = "low" | "normal" | "high" | "critical";

export type CaseCategory =
  | "injury"
  | "sterilisation"
  | "rescue"
  | "vaccination"
  | "other";

export type CaseResolution = "sterilized" | "rescued" | "treated";

export type CaseUpdateType =
  | "created"
  | "claimed"
  | "assigned"
  | "status_changed"
  | "note"
  | "reopened";

export interface Volunteer {
  id: string;
  name: string;
  phone: string | null;
  ngo_id: string | null;
}

export interface Case {
  id: string;
  dog_id: string | null;
  title: string;
  description: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  severity: CaseSeverity;
  category: CaseCategory;
  tags: string[];
  status: CaseStatus;
  resolution: CaseResolution | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by_id: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  due_at: string | null;
  resolved_at?: string | null; // when it moved to resolved (for response time)
  before_url?: string | null; // before/after proof on resolved cases
  after_url?: string | null;
  outcome_note?: string | null;
  proof_verified?: boolean; // a StrayPaw admin has verified the outcome proof
  verified_at?: string | null;
}

export interface CaseUpdate {
  id: string;
  case_id: string;
  actor_id: string | null;
  actor_name: string | null;
  type: CaseUpdateType;
  from_status: CaseStatus | null;
  to_status: CaseStatus | null;
  note: string | null;
  created_at: string;
}

export const CASE_STATUS_META: Record<
  CaseStatus,
  { label: string; color: string }
> = {
  unverified: { label: "Unverified", color: "#9A9C88" },
  assigned: { label: "Assigned", color: "#4E7C8A" },
  in_progress: { label: "In Progress", color: "#D9A441" },
  resolved: { label: "Resolved", color: "#3E8473" },
  closed: { label: "Closed", color: "#7A7C6A" },
};

export const CASE_SEVERITY_META: Record<
  CaseSeverity,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "#9A9C88" },
  normal: { label: "Normal", color: "#6E7A45" },
  high: { label: "High", color: "#D9A441" },
  critical: { label: "Critical", color: "#C0492E" },
};

export const CASE_CATEGORY_META: Record<
  CaseCategory,
  { label: string; emoji: string }
> = {
  injury: { label: "Injury", emoji: "🚑" },
  sterilisation: { label: "Sterilisation", emoji: "✂️" },
  rescue: { label: "Rescue", emoji: "🆘" },
  vaccination: { label: "Vaccination", emoji: "💉" },
  other: { label: "Other", emoji: "📋" },
};

/** Days without activity before a case is considered overdue. */
export const OVERDUE_DAYS = 5;

export function isOverdue(c: Case): boolean {
  if (c.status === "resolved" || c.status === "closed") return false;
  const days = (Date.now() - +new Date(c.last_activity_at)) / 86_400_000;
  return days >= OVERDUE_DAYS;
}
