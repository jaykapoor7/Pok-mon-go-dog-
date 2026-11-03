/* ════════════════════════════════════════════════════════════════════
   Kaju · prepared work.

   Pure checks that find operational problems before a person has to go
   looking, built from what real registers actually contain:

   1. Stalled critical cases: a critical case that has an owner but no
      recorded activity for two weeks. The daily brief only flagged
      critical cases with no owner, so a held-but-forgotten case vanished.
   2. Promised reviews: care notes say "Review on 19-Sep" but nobody
      scheduled it, so the review lives only in free text.
   3. Locality spellings: one place typed several ways ("Koundampalayam",
      "Kovundampalayam", "Goundampalayam") splits ward reporting.

   Everything here is deterministic and testable without a database. It
   never decides anything: findings are candidates, and the only actions
   it prepares are follow-ups a person confirms through the audited
   kaju_confirm_action path. Request IDs are derived from the work itself,
   so preparing the same thing twice can never save it twice.
   ════════════════════════════════════════════════════════════════════ */

const DAY = 86_400_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/* ── 1. stalled critical cases ───────────────────────────────────────── */

export type CaseFact = {
  id: string; case_code: string | null; title: string | null; condition_class: string | null;
  occurred_at: string | null; last_activity_at: string | null; assignee_name: string | null;
  dog_id: string | null; zone: string | null; provenance: string | null; critical: boolean;
};
export type Stalled = { caseId: string; label: string; dogId: string | null; zone: string | null; holder: string | null; quietDays: number; lastActivity: string };

export function stalledCritical(cases: CaseFact[], now: Date, quietAfterDays = 14): Stalled[] {
  return cases
    .filter((c) => c.critical && c.provenance !== "imported_historical_record")
    .map((c) => {
      const last = c.last_activity_at ?? c.occurred_at;
      const quiet = last ? Math.floor((now.getTime() - Date.parse(last)) / DAY) : NaN;
      return { c, last, quiet };
    })
    .filter((x) => x.last && Number.isFinite(x.quiet) && x.quiet >= quietAfterDays)
    .sort((a, b) => b.quiet - a.quiet)
    .map(({ c, last, quiet }) => ({
      caseId: c.id, label: c.title || c.condition_class || c.case_code || "Critical case", dogId: c.dog_id, zone: c.zone,
      holder: c.assignee_name ? personName(c.assignee_name) : null, quietDays: quiet, lastActivity: last as string,
    }));
}

/** People as people read them: never a raw email address. */
export const personName = (n: string) => n.includes("@") ? n.split("@")[0].replace(/[._-]+/g, " ").replace(/\d+$/, "").trim() : n;

/* ── 2. reviews promised in care notes ───────────────────────────────── */

export type CareEvent = { id: string; dog_id: string; case_id: string | null; event_date: string | null; notes: string | null; dog_label: string; zone: string | null };
export type FollowupRow = { dog_id: string | null; case_id: string | null; due_at: string | null };
export type PromisedReview = {
  eventId: string; dogId: string; caseId: string | null; dogLabel: string; zone: string | null;
  promisedFor: string; quote: string; state: "missed" | "upcoming";
};

/**
 * Finds "Review on 19-Sep", "review on 21/4", "recheck on 3 Oct" in a care
 * note and resolves it to a date after the care event. Unreadable dates
 * ("Review on 21-Rev") are skipped, never guessed.
 */
export function reviewDate(note: string, eventDate: string): { date: string; quote: string } | null {
  const m = note.match(/\b(review|re-?check|revisit|follow[- ]?up)\s+(?:on|by|date)?\s*(\d{1,2})(?:st|nd|rd|th)?[\s\-/.]*([a-z]{3,9}|\d{1,2})\b/i);
  if (!m) return null;
  /* "Review on 16-Jul done" and "Review Done" mean it happened. */
  const after = note.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 14).toLowerCase();
  if (/^\W*(done|completed|over)\b/.test(after)) return null;
  const day = Number(m[2]);
  const month = /^\d+$/.test(m[3]) ? Number(m[3]) - 1 : MONTHS.indexOf(m[3].slice(0, 3).toLowerCase());
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const base = new Date(`${eventDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  let d = new Date(Date.UTC(base.getUTCFullYear(), month, day));
  if (d.getUTCDate() !== day) return null;
  /* A review is after the care it follows; "Review on 3-Jan" after a December event is next year. */
  if (d.getTime() < base.getTime() - DAY) d = new Date(Date.UTC(base.getUTCFullYear() + 1, month, day));
  if (d.getTime() - base.getTime() > 120 * DAY) return null;
  return { date: d.toISOString().slice(0, 10), quote: m[0].trim() };
}

export function promisedReviews(events: CareEvent[], followups: FollowupRow[], now: Date): PromisedReview[] {
  const laterCare = new Map<string, number[]>();
  for (const e of events) if (e.event_date) laterCare.set(e.dog_id, [...(laterCare.get(e.dog_id) ?? []), Date.parse(e.event_date)]);
  const scheduled = new Map<string, number[]>();
  for (const f of followups) if (f.dog_id && f.due_at) scheduled.set(f.dog_id, [...(scheduled.get(f.dog_id) ?? []), Date.parse(f.due_at)]);
  const out: PromisedReview[] = [];
  const seen = new Set<string>();
  for (const e of events) {
    if (!e.notes || !e.event_date) continue;
    const r = reviewDate(e.notes, e.event_date);
    if (!r) continue;
    const due = Date.parse(r.date);
    const key = `${e.dog_id}|${r.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    /* Resolved when anything was recorded for the animal from a day before
       the promised date, or a follow-up is scheduled for it or later. */
    const cared = (laterCare.get(e.dog_id) ?? []).some((t) => t > Date.parse(e.event_date as string) && t >= due - DAY);
    const planned = (scheduled.get(e.dog_id) ?? []).some((t) => t >= due - 3 * DAY);
    if (cared || planned) continue;
    out.push({ eventId: e.id, dogId: e.dog_id, caseId: e.case_id, dogLabel: e.dog_label, zone: e.zone, promisedFor: r.date, quote: r.quote, state: due + DAY < now.getTime() ? "missed" : "upcoming" });
  }
  return out.sort((a, b) => a.promisedFor.localeCompare(b.promisedFor));
}

/* ── 3. one place, several spellings ─────────────────────────────────── */

export type LocalityGroup = { canonical: string; total: number; variants: { zone: string; count: number }[] };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");
const words = (s: string) => s.split(/[\s,/]+/).map(norm).filter(Boolean);
function distance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > cap) return cap + 1;
    prev = row;
  }
  return prev[b.length];
}
/* K and G are written interchangeably for the same Tamil sound; any other
   first letter must match ("Edayarpalayam" is not "Udayampalayam"). */
const head = (w: string) => (w[0] === "g" ? "k" : w[0]);
function sameWord(a: string, b: string) {
  if (a === b) return true;
  if (a.length <= 4 || b.length <= 4 || head(a) !== head(b)) return false;
  const cap = Math.min(a.length, b.length) >= 10 ? 2 : 1;
  return distance(a, b, cap) <= cap;
}
/** Same place written differently: word by word, or one word split ("Sai Baba" / "Saibaba"). */
function similar(x: string, y: string) {
  const a = words(x), b = words(y);
  if (!a.length || !b.length) return false;
  if (a.length === b.length) return a.every((w, i) => sameWord(w, b[i]));
  /* Different word counts: short words such as "SP" or "TVS" must appear in the other spelling. */
  const ja = a.join(""), jb = b.join("");
  const shortOk = [...a.filter((w) => w.length <= 4).map((w) => jb.includes(w)), ...b.filter((w) => w.length <= 4).map((w) => ja.includes(w))].every(Boolean);
  return shortOk && sameWord(ja, jb);
}

export function localityVariants(zones: { zone: string; count: number }[], minTotal = 5): LocalityGroup[] {
  const items = zones.filter((z) => z.zone && norm(z.zone).length > 0);
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    if (similar(items[i].zone, items[j].zone)) parent[find(i)] = find(j);
  }
  const groups = new Map<number, { zone: string; count: number }[]>();
  items.forEach((z, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), z]));
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const variants = [...g].sort((a, b) => b.count - a.count || a.zone.localeCompare(b.zone));
      return { canonical: variants[0].zone, total: variants.reduce((s, v) => s + v.count, 0), variants };
    })
    .filter((g) => g.total >= minTotal)
    .sort((a, b) => b.variants.length - a.variants.length || b.total - a.total);
}

/* ── deterministic request IDs for the confirm path ──────────────────── */

/** FNV-1a, twice, as hex: stable across server and browser, no crypto import. */
export function workId(prefix: string, ...parts: string[]) {
  const s = parts.join("|");
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ s.charCodeAt(s.length - 1 - i), 0x01000193) >>> 0;
  }
  return `${prefix}-${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}
