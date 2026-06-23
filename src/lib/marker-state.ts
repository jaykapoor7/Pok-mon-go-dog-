// ─────────────────────────────────────────────────────────────
// Map marker display states.
//
// The product surfaces five marker states — Seen, Fed, Needs Help, Sterilised,
// Adoptable — derived from the existing data model (no backend change). The
// derivation is a simple priority cascade over the dog's existing flags.
// ─────────────────────────────────────────────────────────────

import type { Dog } from "./types";

export type MarkerState =
  | "seen"
  | "fed"
  | "needs_help"
  | "sterilised"
  | "adoptable";

export interface MarkerMeta {
  key: MarkerState;
  label: string;
  emoji: string;
  color: string;
}

export const MARKER_META: Record<MarkerState, MarkerMeta> = {
  needs_help: { key: "needs_help", label: "Needs Help", emoji: "🚑", color: "#ef4444" },
  adoptable: { key: "adoptable", label: "Adoptable", emoji: "🏡", color: "#ec4899" },
  sterilised: { key: "sterilised", label: "Sterilised", emoji: "✂️", color: "#8b5cf6" },
  fed: { key: "fed", label: "Fed", emoji: "🍗", color: "#f59e0b" },
  seen: { key: "seen", label: "Seen", emoji: "🐕", color: "#64748b" },
};

export const MARKER_ORDER: MarkerState[] = [
  "seen",
  "fed",
  "needs_help",
  "sterilised",
  "adoptable",
];

/** Derive the single display state for a dog from existing fields. */
export function markerStateFor(dog: Dog): MarkerState {
  if (dog.needs_help) return "needs_help";
  // Healthy, fixed, vaccinated & friendly dogs are adoption-ready.
  if (dog.is_friendly && dog.sterilised && dog.vaccinated) return "adoptable";
  if (dog.sterilised) return "sterilised";
  if (dog.feed_count > 0) return "fed";
  return "seen";
}

export function markerMetaFor(dog: Dog): MarkerMeta {
  return MARKER_META[markerStateFor(dog)];
}

/** Does a dog match a chosen marker-state filter? */
export function dogMatchesState(dog: Dog, state: MarkerState): boolean {
  return markerStateFor(dog) === state;
}
