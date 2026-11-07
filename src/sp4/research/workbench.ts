import "server-only";

/* Research workbench data: monthly series built from the public views only
   (public_care_facts, public_case_facts), with the anonymous key, so row-level
   security and the views' own redactions apply. Counts are of records, never
   of animals in a place: there is no population denominator here. A failed or
   partial read is reported as such, never as zero. Cached for an hour. */

const base = () => { const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(); return url && key ? { url, key } : null; };
const PAGE = 1000, MAX_ROWS = 60000;

async function readAll<T>(view: string, select: string, order: string): Promise<{ rows: T[]; complete: boolean } | null> {
  const b = base(); if (!b) return null;
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let r: Response;
    try {
      r = await fetch(`${b.url}/rest/v1/${view}?select=${select}&order=${order}`, { headers: { apikey: b.key, Authorization: `Bearer ${b.key}`, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" }, next: { revalidate: 3600 } });
    } catch { return rows.length ? { rows, complete: false } : null; }
    if (!r.ok) return rows.length ? { rows, complete: false } : null;
    const page = (await r.json()) as T[];
    rows.push(...page);
    if (page.length < PAGE) return { rows, complete: true };
  }
  return { rows, complete: false };
}

export type CareRow = { kind: string; event_date: string | null };
export type CaseRow = { city: string | null; occurred_at: string | null; condition_class: string | null; status_class: string | null; source: string | null; first_action_days: number | null; followups_done: number | null; followups_missed: number | null };

export type CaseAgg = { month: string; city: string; condition: string; status: string; source: string; n: number; actedWithin2d: number; actedKnown: number; fuDone: number; fuMissed: number };
export type Workbench = {
  builtAt: string;
  care: { months: string[]; kinds: string[]; series: Record<string, number[]>; undated: number; total: number; complete: boolean } | null;
  cases: { months: string[]; cities: string[]; rows: CaseAgg[]; undated: number; total: number; complete: boolean } | null;
};

const month = (iso: string | null) => (iso && /^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : null);
function monthsBetween(a: string, b: string) {
  const out: string[] = []; let [y, m] = a.split("-").map(Number); const [by, bm] = b.split("-").map(Number);
  while (y < by || (y === by && m <= bm)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } if (out.length > 400) break; }
  return out;
}

export async function workbench(): Promise<Workbench> {
  const [care, cases] = await Promise.all([
    readAll<CareRow>("public_care_facts", "kind,event_date", "event_date.asc.nullslast,id.asc"),
    readAll<CaseRow>("public_case_facts", "city,occurred_at,condition_class,status_class,source,first_action_days,followups_done,followups_missed", "occurred_at.asc.nullslast,id.asc"),
  ]);
  const out: Workbench = { builtAt: new Date().toISOString(), care: null, cases: null };

  if (care) {
    const dated = care.rows.map((r) => ({ k: r.kind || "other", m: month(r.event_date) })).filter((r): r is { k: string; m: string } => !!r.m);
    const ms = dated.map((r) => r.m).sort();
    const months = ms.length ? monthsBetween(ms[0], ms[ms.length - 1]) : [];
    const idx = new Map(months.map((m, i) => [m, i]));
    const kinds = [...new Set(dated.map((r) => r.k))].sort();
    const series: Record<string, number[]> = Object.fromEntries(kinds.map((k) => [k, months.map(() => 0)]));
    for (const r of dated) series[r.k][idx.get(r.m)!]++;
    out.care = { months, kinds, series, undated: care.rows.length - dated.length, total: care.rows.length, complete: care.complete };
  }

  if (cases) {
    const key = new Map<string, CaseAgg>();
    let undated = 0;
    for (const r of cases.rows) {
      const m = month(r.occurred_at); if (!m) { undated++; continue; }
      const k = [m, r.city || "Place not recorded", r.condition_class || "not recorded", r.status_class || "not recorded", r.source || "not recorded"].join("|");
      const row = key.get(k) ?? { month: m, city: r.city || "Place not recorded", condition: r.condition_class || "not recorded", status: r.status_class || "not recorded", source: r.source || "not recorded", n: 0, actedWithin2d: 0, actedKnown: 0, fuDone: 0, fuMissed: 0 };
      row.n++;
      if (typeof r.first_action_days === "number") { row.actedKnown++; if (r.first_action_days <= 2) row.actedWithin2d++; }
      row.fuDone += Number(r.followups_done ?? 0); row.fuMissed += Number(r.followups_missed ?? 0);
      key.set(k, row);
    }
    const rows = [...key.values()].sort((a, b) => a.month.localeCompare(b.month) || a.city.localeCompare(b.city));
    const ms = rows.map((r) => r.month);
    out.cases = { months: ms.length ? monthsBetween(ms[0], ms[ms.length - 1]) : [], cities: [...new Set(rows.map((r) => r.city))].sort(), rows, undated, total: cases.rows.length, complete: cases.complete };
  }
  return out;
}
