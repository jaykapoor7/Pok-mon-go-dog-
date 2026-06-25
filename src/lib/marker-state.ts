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
  needs_help: { key: "needs_help", label: "Needs Help", emoji: "🚑", color: "#C0492E" },
  adoptable: { key: "adoptable", label: "Adoptable", emoji: "🏡", color: "#C06A86" },
  sterilised: { key: "sterilised", label: "Sterilised", emoji: "✂️", color: "#3E8473" },
  fed: { key: "fed", label: "Fed", emoji: "🍗", color: "#D9A441" },
  seen: { key: "seen", label: "Seen", emoji: "🐕", color: "#9A9C88" },
};

export const MARKER_ORDER: MarkerState[] = [
  "seen",
  "fed",
  "needs_help",
  "sterilised",
  "adoptable",
];

/** Dogs are "Fed" only within this window — after that they need feeding again. */
export const FED_WINDOW_HOURS = 10;

/** Hours since the dog was last fed, or null if never fed. */
export function hoursSinceFed(dog: Dog): number | null {
  if (!dog.last_fed_at) return null;
  return (Date.now() - +new Date(dog.last_fed_at)) / 3_600_000;
}

/** Fed recently enough to still count as "Fed". */
export function fedRecently(dog: Dog): boolean {
  const h = hoursSinceFed(dog);
  return h !== null && h <= FED_WINDOW_HOURS;
}

/** Derive the single display state for a dog from existing fields. */
export function markerStateFor(dog: Dog): MarkerState {
  if (dog.needs_help) return "needs_help";
  // Healthy, fixed, vaccinated & friendly dogs are adoption-ready.
  if (dog.is_friendly && dog.sterilised && dog.vaccinated) return "adoptable";
  if (dog.sterilised) return "sterilised";
  if (fedRecently(dog)) return "fed"; // decays — see FED_WINDOW_HOURS
  return "seen";
}

export function markerMetaFor(dog: Dog): MarkerMeta {
  return MARKER_META[markerStateFor(dog)];
}

/** Does a dog match a chosen marker-state filter? */
export function dogMatchesState(dog: Dog, state: MarkerState): boolean {
  return markerStateFor(dog) === state;
}
