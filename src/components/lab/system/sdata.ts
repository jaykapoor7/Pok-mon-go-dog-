/* Derived data for the integrated system. Everything here is computed from
   the lab snapshot (public views) and from the anonymised aggregates of the
   rescue register imported into StrayPaw. Nothing is invented; where the
   product needs a rule the data does not hold (triage classes), the rule is
   named as a default an organisation can change. */

import { LAB, KIND, dayToDate, daysBetween, zoneAt, type Ev } from "../data";
import { hexbin, km, type Box } from "../geo";

export const R = (LAB as unknown as { rescue: Rescue }).rescue;
export type Rescue = {
  source: string; requests: number; matrix: [number, string, string, number][];
  lag: { withPlan: number; median: number; p25: number; p75: number; bins: [string, number][]; noPlan: number };
  chronology: Record<string, number>;
  fields: [string, number][];
  tvt: { courses: number; open: number; entries: number[]; missed: number[] };
  abc: { enrolled: number; female: number; male: number; sexNotRecorded: number; stays: number[]; fields: [string, number][] };
  review: { appointments: number };
};

/** The day the snapshot was taken, in the event clock (days since 1 Jan 2024). */
export const NOW_DAY = daysBetween("2024-01-01", "2026-09-23");

/** Outcome taxonomy, exactly as the rescue register records it. Order is the reading order everywhere. */
export const STATUSES = ["Closed", "Other NGO", "In progress", "Open", "Closed, no action", "Not attended", "Not recorded"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_STYLE: Record<Status, { fill: string; hatch?: boolean; label: string; note: string }> = {
  "Closed": { fill: "var(--sx-blue)", label: "Closed", note: "work done and closed" },
  "Other NGO": { fill: "var(--sx-blue-2)", label: "Handed to another NGO", note: "rescued by a partner" },
  "In progress": { fill: "var(--sx-flame)", label: "In progress", note: "being worked" },
  "Open": { fill: "var(--sx-flame-ink)", label: "Open", note: "not yet started" },
  "Closed, no action": { fill: "var(--sx-ink-3)", label: "Closed, no action", note: "closed without intervention" },
  "Not attended": { fill: "var(--sx-ink-2)", label: "Not attended", note: "no one reached it" },
  "Not recorded": { fill: "none", hatch: true, label: "Not recorded", note: "status never entered" },
};

export const CONDITIONS = ["Road accident", "Maggot wound", "TVT", "Skin & mange", "Dog bite", "Tumour", "Distemper (CD)", "Eye & ear", "Minor injury", "Human abuse", "Other", "Not recorded"] as const;

/** Triage class: a StrayPaw default, editable by each organisation. */
export function triage(category: string): { cls: "Critical" | "Priority" | "Routine" | "Unclassified"; rank: number } {
  const c = category.toLowerCase();
  if (/accident|maggot|abuse|bite|rta/.test(c)) return { cls: "Critical", rank: 0 };
  if (/tvt|tumou?r|distemper|surgery|fracture/.test(c)) return { cls: "Priority", rank: 1 };
  if (/not recorded|unknown|^$/.test(c)) return { cls: "Unclassified", rank: 3 };
  return { cls: "Routine", rank: 2 };
}

/** Condition × status × year from the rescue register. */
export function matrixBy(year?: number) {
  const m = new Map<string, Map<string, number>>();
  for (const [y, c, s, n] of R.matrix) {
    if (year && y !== year) continue;
    const row = m.get(c) ?? m.set(c, new Map()).get(c)!;
    row.set(s, (row.get(s) ?? 0) + n);
  }
  return CONDITIONS.map((c) => {
    const row = m.get(c) ?? new Map<string, number>();
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    return { condition: c, total, by: STATUSES.map((s) => ({ s, n: row.get(s) ?? 0 })) };
  }).filter((r) => r.total > 0);
}
export const YEARS = [2024, 2025, 2026];
export const yearTotal = (y: number) => R.matrix.filter((r) => r[0] === y).reduce((a, r) => a + r[3], 0);

/* ── spatial: the sample city on the 0.5 km hex ─────────────────────── */

export const CBE_BOX: Box = [76.86, 10.9, 77.08, 11.1];
export const HEX_KM = 0.55;

export type Cell = {
  key: string; ring: [number, number][]; center: [number, number];
  animals: number; help: number; ster: number; vacc: number;
  events: number; recent: number; cases: number; care: number; abc: number; arv: number;
  lastDay: number; open: number; locality: string;
};

const inBox = (lng: number, lat: number, b: Box) => lng >= b[0] && lng <= b[2] && lat >= b[1] && lat <= b[3];

/** Nearest named locality to a point, from the centroids of everything recorded under each name. */
export function nearestLocality(lng: number, lat: number) {
  let best = "", bd = Infinity;
  for (const l of LAB.cbe.localities) { const d = (l.lng - lng) ** 2 + (l.lat - lat) ** 2; if (d < bd) { bd = d; best = l.name; } }
  return best;
}

let cellCache: Cell[] | null = null;
/** Every hex cell with anything recorded in it. The unit of coverage everywhere in the system. */
export function cells(): Cell[] {
  if (cellCache) return cellCache;
  type It = { t: "a"; p: (typeof LAB.cbe.animals)[number] } | { t: "e"; p: Ev } | { t: "q"; lng: number; lat: number };
  const items: It[] = [
    ...LAB.cbe.animals.filter((a) => inBox(a[0], a[1], CBE_BOX)).map((p) => ({ t: "a" as const, p })),
    ...LAB.cbe.events.filter((e) => inBox(e[0], e[1], CBE_BOX)).map((p) => ({ t: "e" as const, p })),
    ...LAB.queue.map((q) => zoneAt(q.zone)).filter((z): z is [number, number] => !!z && inBox(z[0], z[1], CBE_BOX)).map(([lng, lat]) => ({ t: "q" as const, lng, lat })),
  ];
  const ll = (i: It): [number, number] => (i.t === "q" ? [i.lng, i.lat] : [i.p[0], i.p[1]]);
  cellCache = hexbin(items, ll, 11, HEX_KM).map((h) => {
    const c: Cell = { key: h.key, ring: h.ring, center: h.center, animals: 0, help: 0, ster: 0, vacc: 0, events: 0, recent: 0, cases: 0, care: 0, abc: 0, arv: 0, lastDay: -1, open: 0, locality: nearestLocality(h.center[0], h.center[1]) };
    for (const i of h.items) {
      if (i.t === "a") { c.animals++; c.help += i.p[2]; c.ster += i.p[3]; c.vacc += i.p[4]; }
      else if (i.t === "q") c.open++;
      else {
        const [, , d, k] = i.p;
        c.events++; if (d > NOW_DAY - 365) c.recent++; if (d > c.lastDay) c.lastDay = d;
        if (k === 0) c.cases++; else c.care++;
        if (k === 2) c.abc++; if (k === 3) c.arv++;
      }
    }
    return c;
  });
  return cellCache;
}

/** Cells where animals are recorded but no field work has been logged in the last twelve months. */
export const isGap = (c: Cell) => c.animals > 0 && c.recent === 0;

export function kindName(k: number) { return KIND[k] ?? "Field record"; }
export function dayLabel(d: number) { const x = dayToDate(d); return `${x.getUTCDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][x.getUTCMonth()]} ${x.getUTCFullYear()}`; }
export const distKm = (a: [number, number], b: [number, number]) => km(a, b);

/** Monthly series, trimmed to the months the register actually covers. */
export function months() { return LAB.cbe.monthly.filter((m) => m.m >= "2024-01" && m.m <= "2026-09"); }
