/* ════════════════════════════════════════════════════════════════════
   Kaju automations: the pure measures behind the weekly digest, the
   overdue follow-up nudges, the claim draft and the municipal brief.

   Everything here is arithmetic on rows the caller was allowed to read.
   Nothing is estimated: counts are recorded counts, a missing read is
   reported as unknown by the caller, and a shift in activity is flagged
   only when there was enough activity before it to compare against.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;

/** Whole days between an ISO time and now (never negative). */
export const daysSince = (iso: string | null | undefined, now: number) => (iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / DAY)) : null);

/** Which of the last `weeks` seven-day windows an ISO time falls in (0 = oldest), or -1. */
export function weekIndex(iso: string | null | undefined, now: number, weeks: number): number {
  if (!iso) return -1;
  const t = Date.parse(iso);
  if (Number.isNaN(t) || t > now) return -1;
  const back = Math.floor((now - t) / (7 * DAY));
  return back >= weeks ? -1 : weeks - 1 - back;
}

export type Series = { key: string; weeks: number[] };
export type Shift = { key: string; kind: "drop" | "spike"; recent: number; baseline: number };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

/** A sudden drop or spike: the mean of the last `recent` weeks against the median
 *  of the weeks before. Flagged only when the earlier weeks carried at least
 *  `minBaseline` records a week, so a quiet ward never reads as a "drop". */
export function activityShifts(series: Series[], recent = 2, minBaseline = 2): Shift[] {
  const out: Shift[] = [];
  for (const s of series) {
    if (s.weeks.length < recent + 3) continue;
    const before = s.weeks.slice(0, -recent), last = s.weeks.slice(-recent);
    const baseline = median(before), now = last.reduce((a, b) => a + b, 0) / recent;
    if (baseline >= minBaseline && now <= baseline * 0.4) out.push({ key: s.key, kind: "drop", recent: round1(now), baseline: round1(baseline) });
    else if (now >= Math.max(minBaseline * 2, baseline * 2.5) && now - baseline >= 3) out.push({ key: s.key, kind: "spike", recent: round1(now), baseline: round1(baseline) });
  }
  return out.sort((a, b) => Math.abs(b.recent - b.baseline) - Math.abs(a.recent - a.baseline));
}

/** Weekly counts per key from dated rows (oldest week first). */
export function weeklySeries<T>(rows: T[], keyOf: (r: T) => string | null, dateOf: (r: T) => string | null, now: number, weeks = 8): Series[] {
  const by = new Map<string, number[]>();
  for (const r of rows) {
    const k = keyOf(r)?.trim(), w = weekIndex(dateOf(r), now, weeks);
    if (!k || w < 0) continue;
    const arr = by.get(k) ?? Array<number>(weeks).fill(0);
    arr[w]++; by.set(k, arr);
  }
  return [...by].map(([key, w]) => ({ key, weeks: w }));
}

export type CoverageAnimal = { zone: string | null; sterilisation_status: string | null; vaccination_status: string | null };
export type WardCoverage = { zone: string; recorded: number; sterilised: number; vaccinated: number; sterilisationUnknown: number; vaccinationUnknown: number };

/** Per ward: animals on the record and how many have a sterilisation or
 *  vaccination recorded. The denominator is recorded animals, never the
 *  street population; unknown status is counted, not treated as "no". */
export function wardCoverage(animals: CoverageAnimal[]): WardCoverage[] {
  const by = new Map<string, WardCoverage>();
  for (const a of animals) {
    const zone = a.zone?.trim();
    if (!zone) continue;
    const w = by.get(zone) ?? { zone, recorded: 0, sterilised: 0, vaccinated: 0, sterilisationUnknown: 0, vaccinationUnknown: 0 };
    w.recorded++;
    const st = (a.sterilisation_status ?? "").toLowerCase(), vx = (a.vaccination_status ?? "").toLowerCase();
    if (st === "sterilised" || st === "sterilized") w.sterilised++; else if (!st || st === "unknown") w.sterilisationUnknown++;
    if (vx === "vaccinated") w.vaccinated++; else if (!vx || vx === "unknown") w.vaccinationUnknown++;
    by.set(zone, w);
  }
  return [...by.values()].sort((a, b) => b.recorded - a.recorded);
}

export type OverdueFollowup = { id: string; case_id: string | null; dog_id: string | null; due_at: string; kind: string | null; holder: string | null; label: string };
export type OverdueGroup = { holder: string; items: (OverdueFollowup & { daysLate: number })[] };

/** Overdue follow-ups grouped by who holds the case, most overdue first. */
export function overdueGroups(rows: OverdueFollowup[], now: number): OverdueGroup[] {
  const by = new Map<string, OverdueGroup>();
  for (const r of rows) {
    const t = Date.parse(r.due_at);
    if (Number.isNaN(t) || t >= now) continue;
    const holder = r.holder?.trim() || "Not assigned";
    const g = by.get(holder) ?? { holder, items: [] };
    g.items.push({ ...r, daysLate: Math.floor((now - t) / DAY) });
    by.set(holder, g);
  }
  for (const g of by.values()) g.items.sort((a, b) => b.daysLate - a.daysLate);
  return [...by.values()].sort((a, b) => b.items.length - a.items.length || (b.items[0]?.daysLate ?? 0) - (a.items[0]?.daysLate ?? 0));
}

/** The date a missed follow-up is re-proposed for: two days from now (YYYY-MM-DD). */
export const rescheduleDate = (now: number) => new Date(now + 2 * DAY).toISOString().slice(0, 10);

export type DigestInput = {
  opened: number | null; closed: number | null;
  care: Record<string, number> | null;
  signoffs: { vet: number; reviewed: number } | null;
  packages: { submitted: number; decided: number } | null;
  waiting: { vet: number; review: number; evidence: number } | null;
  overdue: number | null;
};

const n = (v: number | null | undefined) => (v === null || v === undefined ? "unknown" : String(v));
const plural = (v: number, one: string, many = `${one}s`) => `${v} ${v === 1 ? one : many}`;

/** The weekly digest as short lines: what changed, then who needs to act. */
export function digestLines(d: DigestInput): { changed: string[]; needs: string[] } {
  const changed: string[] = [];
  changed.push(`Cases: ${n(d.opened)} opened · ${n(d.closed)} closed`);
  if (d.care === null) changed.push("Care recorded: unknown");
  else {
    const parts = Object.entries(d.care).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k.replace(/_/g, " ")}`);
    changed.push(`Care recorded: ${parts.length ? parts.join(" · ") : "none"}`);
  }
  changed.push(d.signoffs === null ? "Sign-offs: unknown" : `Sign-offs: ${d.signoffs.vet} by a vet · ${d.signoffs.reviewed} evidence reviews`);
  if (d.packages === null) changed.push("Claims: unknown");
  else if (d.packages.submitted || d.packages.decided) changed.push(`Claims: ${d.packages.submitted} submitted · ${d.packages.decided} decided by the office`);
  const needs: string[] = [];
  if (d.waiting === null) needs.push("ABC queue: unknown");
  else {
    if (d.waiting.vet) needs.push(`Vets: ${plural(d.waiting.vet, "record")} to authorise`);
    if (d.waiting.review) needs.push(`Coordinators: ${plural(d.waiting.review, "record")} to review`);
    if (d.waiting.evidence) needs.push(`Field team: ${plural(d.waiting.evidence, "record")} missing evidence`);
  }
  if (d.overdue === null) needs.push("Follow-ups: unknown");
  else if (d.overdue) needs.push(`Case holders: ${plural(d.overdue, "overdue follow-up")}`);
  return { changed, needs };
}
