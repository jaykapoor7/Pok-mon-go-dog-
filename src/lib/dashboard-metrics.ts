// ─────────────────────────────────────────────────────────────
// Pure dashboard metric helpers. Computed client-side from whatever dataset is
// active (real, or real+demo when Demo mode is on) so the NGO dashboard lights
// up with the SAME seed that drives the map — and falls back to clean empty
// states when Demo is off and there's no real data yet.
// ─────────────────────────────────────────────────────────────

import type { Case, Dog, Sighting } from "./types";

/** WHO ~70% threshold for rabies herd immunity / effective ABC coverage. */
export const HERD_THRESHOLD = 70;

export function coverage(dogs: Dog[]) {
  const total = Math.max(1, dogs.length);
  const sterilised = dogs.filter((d) => d.sterilised).length;
  const vaccinated = dogs.filter((d) => d.vaccinated).length;
  return {
    tracked: dogs.length,
    needsHelp: dogs.filter((d) => d.needs_help).length,
    sterilised,
    vaccinated,
    sterilisedPct: Math.round((sterilised / total) * 100),
    vaccinatedPct: Math.round((vaccinated / total) * 100),
  };
}

export interface ColonyCoverage {
  colony: string;
  city: string | null;
  total: number;
  needsHelp: number;
  sterilisedPct: number;
  vaccinatedPct: number;
  aboveThreshold: boolean; // sterilisation ≥ herd threshold
}

/** Group dogs into named colonies (falls back to zone) with per-colony coverage. */
export function colonyCoverage(dogs: Dog[]): ColonyCoverage[] {
  const map = new Map<string, Dog[]>();
  for (const d of dogs) {
    const key = d.colony || d.zone || "Unknown";
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return Array.from(map.entries())
    .map(([colony, ds]) => {
      const total = ds.length;
      const sterilisedPct = Math.round(
        (ds.filter((d) => d.sterilised).length / total) * 100
      );
      const vaccinatedPct = Math.round(
        (ds.filter((d) => d.vaccinated).length / total) * 100
      );
      return {
        colony,
        city: ds[0]?.city ?? null,
        total,
        needsHelp: ds.filter((d) => d.needs_help).length,
        sterilisedPct,
        vaccinatedPct,
        aboveThreshold: sterilisedPct >= HERD_THRESHOLD,
      };
    })
    .sort((a, b) => a.sterilisedPct - b.sterilisedPct); // worst coverage first
}

/** Median response time (days) from case opened → resolved, over resolved cases. */
export function medianResponseDays(cases: Case[]): number | null {
  const spans = cases
    .filter((c) => c.resolved_at)
    .map(
      (c) =>
        (+new Date(c.resolved_at as string) - +new Date(c.created_at)) /
        86_400_000
    )
    .filter((d) => d >= 0)
    .sort((a, b) => a - b);
  if (spans.length === 0) return null;
  const mid = Math.floor(spans.length / 2);
  const median =
    spans.length % 2 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;
  return Math.round(median * 10) / 10;
}

export function topContributors(sightings: Sighting[], sinceDays?: number) {
  const cutoff = sinceDays ? Date.now() - sinceDays * 86_400_000 : null;
  const map = new Map<string, { name: string; count: number; last: string }>();
  for (const s of sightings) {
    if (cutoff && +new Date(s.created_at) < cutoff) continue;
    const name = s.user_name || "Anonymous";
    const e = map.get(name) ?? { name, count: 0, last: s.created_at };
    e.count += 1;
    if (+new Date(s.created_at) > +new Date(e.last)) e.last = s.created_at;
    map.set(name, e);
  }
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/** Underserved colonies — high need + low sterilisation (legacy heatmap). */
export function underservedZones(dogs: Dog[]) {
  return colonyCoverage(dogs)
    .map((z) => ({
      zone: z.colony,
      underserved: Math.min(
        1,
        z.needsHelp / Math.max(1, z.total) + (1 - z.sterilisedPct / 100) * 0.5
      ),
    }))
    .sort((a, b) => b.underserved - a.underserved);
}
