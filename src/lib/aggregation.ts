// ─────────────────────────────────────────────────────────────
// Smart system: the logic that turns a stream of raw sightings into
// structured dog profiles.
//
//  • trust scoring        — how reliable is a single sighting / a profile
//  • duplicate detection  — could two sightings be the same dog?
//  • merge suggestions    — which existing dogs might be one dog
//  • clustering           — group loose sightings into candidate dogs
// ─────────────────────────────────────────────────────────────

import { distanceMeters } from "./utils";
import type { Dog, Sighting, MoodTag } from "./types";

/**
 * Trust score for a single sighting (0–100). Combines:
 *  - reporter reputation
 *  - photo presence
 *  - note richness
 *  - recency
 */
export function scoreSighting(input: {
  reporterTrust: number;
  hasPhoto: boolean;
  hasNotes: boolean;
  createdAt: string;
}): number {
  let score = 30;
  score += input.reporterTrust * 0.4; // up to +40
  if (input.hasPhoto) score += 18;
  if (input.hasNotes) score += 8;

  const ageDays = (Date.now() - +new Date(input.createdAt)) / 86_400_000;
  if (ageDays < 7) score += 6;
  else if (ageDays > 120) score -= 8;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Aggregate trust score for a whole dog profile. More corroborating
 * sightings from different reporters → higher confidence.
 */
export function scoreProfile(sightings: Sighting[]): number {
  if (sightings.length === 0) return 0;
  const avg =
    sightings.reduce((a, s) => a + s.trust_score, 0) / sightings.length;
  const distinctReporters = new Set(sightings.map((s) => s.user_id)).size;
  const corroboration = Math.min(20, distinctReporters * 4);
  return Math.max(0, Math.min(99, Math.round(avg * 0.8 + corroboration)));
}

const MOOD_SIGNATURE: MoodTag[] = ["friendly", "puppies", "injured"];

/**
 * Likelihood (0–1) that two sightings are the *same dog*.
 * Weighted blend of spatial proximity, temporal plausibility and
 * descriptive similarity (nickname + mood overlap).
 */
export function sightingSimilarity(a: Sighting, b: Sighting): number {
  // Spatial — same dog usually roams within a few hundred metres.
  const d = distanceMeters(a, b);
  const spatial = d < 150 ? 1 : d < 400 ? 0.7 : d < 800 ? 0.4 : d < 1500 ? 0.15 : 0;

  // Descriptive — shared nickname is a very strong signal.
  let descriptive = 0;
  if (a.nickname && b.nickname) {
    descriptive = a.nickname.toLowerCase() === b.nickname.toLowerCase() ? 1 : 0.1;
  }

  // Mood overlap on stable traits.
  const aSig = a.mood_tags.filter((m) => MOOD_SIGNATURE.includes(m));
  const bSig = b.mood_tags.filter((m) => MOOD_SIGNATURE.includes(m));
  const shared = aSig.filter((m) => bSig.includes(m)).length;
  const moodScore = aSig.length && bSig.length ? shared / Math.max(aSig.length, bSig.length) : 0;

  // Same zone bonus.
  const zoneBonus = a.zone === b.zone ? 0.2 : 0;

  const score = spatial * 0.55 + descriptive * 0.25 + moodScore * 0.1 + zoneBonus;
  return Math.max(0, Math.min(1, score));
}

/** Pairwise similarity between two aggregated dog profiles. */
export function dogSimilarity(a: Dog, b: Dog): { confidence: number; reason: string } {
  const d = distanceMeters(a, b);
  const spatial = d < 200 ? 1 : d < 600 ? 0.6 : d < 1200 ? 0.3 : 0;
  const sameZone = a.zone === b.zone;
  const sameName =
    !!a.name && !!b.name && a.name.toLowerCase() === b.name.toLowerCase();
  const sameLook = a.color === b.color && a.size === b.size;

  let confidence = spatial * 0.5;
  if (sameName) confidence += 0.3;
  if (sameLook) confidence += 0.15;
  if (sameZone) confidence += 0.1;
  confidence = Math.min(0.98, confidence);

  const reasons: string[] = [];
  if (d < 600) reasons.push(`${Math.round(d)}m apart`);
  if (sameName) reasons.push(`both called "${a.name}"`);
  if (sameLook) reasons.push(`${a.size} · ${a.color}`);
  else if (sameZone) reasons.push(`same area (${a.zone})`);

  return { confidence, reason: reasons.join(" · ") || "nearby & similar" };
}

/**
 * Suggest possible merges for a given dog against the rest of the population.
 * Returns the strongest candidates above a confidence threshold.
 */
export function suggestMerges(
  target: Dog,
  population: Dog[],
  threshold = 0.55
): { dog: Dog; confidence: number; reason: string }[] {
  return population
    .filter((d) => d.id !== target.id)
    .map((d) => ({ dog: d, ...dogSimilarity(target, d) }))
    .filter((m) => m.confidence >= threshold)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * Cluster a flat list of unassigned sightings into candidate dog groups
 * using a greedy single-link approach on sightingSimilarity.
 */
export function clusterSightings(
  sightings: Sighting[],
  threshold = 0.5
): Sighting[][] {
  const clusters: Sighting[][] = [];
  for (const s of sightings) {
    let placed = false;
    for (const cluster of clusters) {
      const best = Math.max(...cluster.map((c) => sightingSimilarity(c, s)));
      if (best >= threshold) {
        cluster.push(s);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([s]);
  }
  return clusters;
}
