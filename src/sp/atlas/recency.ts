/* ════════════════════════════════════════════════════════════════════
   When an area was last recorded: the Animals lens's default colour.

   The latest of an animal seen, a request opened or care given in the
   area. Five printed inks from fresh to old, so the atlas reads as a
   living record (where the work is now, where the trail has gone cold)
   without inventing a population. An area whose dates were never
   recorded is hatched, never coloured as old.
   ════════════════════════════════════════════════════════════════════ */

import type { MapCell } from "@/lib/livingmap/types";

export type Bucket = { id: string; label: string; short: string; color: string; maxDays: number };
export const RECENCY: Bucket[] = [
  { id: "r0", label: "In the last 3 months", short: "< 3 mo", color: "#ff6f52", maxDays: 92 },
  { id: "r1", label: "3 to 12 months ago", short: "3–12 mo", color: "#a9c4ff", maxDays: 366 },
  { id: "r2", label: "1 to 2 years ago", short: "1–2 yr", color: "#6f9bf5", maxDays: 731 },
  { id: "r3", label: "2 to 5 years ago", short: "2–5 yr", color: "#3d6ad6", maxDays: 1827 },
  { id: "r4", label: "More than 5 years ago", short: "5 yr +", color: "#2a4a9e", maxDays: Infinity },
];
export const UNDATED = { id: "rx", label: "Date not recorded", short: "undated" };

export const lastRecorded = (c: Pick<MapCell, "last_seen" | "last_case" | "care_last">): string | null =>
  [c.last_seen, c.last_case, c.care_last].filter((x): x is string => !!x).sort().pop() ?? null;

export function bucketOf(iso: string | null, now = Date.now()): Bucket | null {
  if (!iso) return null;
  const t = Date.parse(iso); if (!Number.isFinite(t)) return null;
  const days = Math.max(0, (now - t) / 86_400_000);
  return RECENCY.find((b) => days <= b.maxDays) ?? RECENCY[RECENCY.length - 1];
}

/** Areas and animals per bucket, for the key. */
export function recencyTally(rows: { animals: number; last: string | null }[], now = Date.now()) {
  const t = new Map<string, { areas: number; animals: number }>();
  for (const r of rows) { const id = bucketOf(r.last, now)?.id ?? UNDATED.id; const x = t.get(id) ?? { areas: 0, animals: 0 }; x.areas++; x.animals += r.animals; t.set(id, x); }
  return t;
}
