"use client";

/* ─────────────────────────────────────────────────────────────
   The operations room's reads (client, the member's own session).

   Aggregates come from the compact spatial dataset; these are the few
   rows the room lists by name: open cases (for the queue and the
   review count), follow-ups due within a week, and what changed last.
   Each is bounded, so the dashboard never pulls the whole register
   into the browser.
   ───────────────────────────────────────────────────────────── */

import { getSupabase } from "./supabase";

export type OpenCase = {
  id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null;
  occurred_at: string | null; last_activity_at: string | null; severity: string | null; assignee_name: string | null;
  animal_name: string | null; dog_id: string | null; zone: string | null; city: string | null; h3_r8: string | null;
  next_due: string | null; followups_missed: number | null; provenance: string | null; reviewed_at: string | null;
};
export type DueFollowup = {
  id: string; case_id: string | null; dog_id: string | null; due_at: string; status: string | null; kind: string | null;
  note: string | null; import_batch_id: string | null; import_source_key: string | null;
  source: "scheduled" | "historical_import";
  case_code: string | null; case_title: string | null; condition_class: string | null; assignee_name: string | null;
  animal_name: string | null; straypaw_id: string | null; zone: string | null; city: string | null;
};
export type Change = { id: string; title: string | null; condition_class: string | null; status_class: string | null; closure_reason: string | null; animal_name: string | null; zone: string | null; last_activity_at: string | null };

export async function openCases(): Promise<OpenCase[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("org_case_facts")
    .select("id,case_code,title,condition_class,status_class,occurred_at,last_activity_at,severity,assignee_name,animal_name,dog_id,zone,city,h3_r8,next_due,followups_missed,provenance,reviewed_at")
    .in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: false }).limit(800);
  if (error) throw new Error(error.message);
  return (data ?? []) as OpenCase[];
}

/** Follow-ups not yet done, due before a week from now (overdue ones included). */
export async function dueFollowups(): Promise<DueFollowup[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const week = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { data, error } = await supa.from("animal_followups").select("id,case_id,dog_id,due_at,status,kind,note,import_batch_id,import_source_key")
    .eq("status", "upcoming").lte("due_at", week).order("due_at", { ascending: true }).limit(200);
  if (error) throw new Error(error.message);
  type Base = Omit<DueFollowup, "source" | "case_code" | "case_title" | "condition_class" | "assignee_name" | "animal_name" | "straypaw_id" | "zone" | "city">;
  type CaseIdentity = { id: string; dog_id: string | null; case_code: string | null; title: string | null; condition_class: string | null; assignee_name: string | null; zone: string | null; city: string | null; provenance: string | null };
  type AnimalIdentity = { id: string; name: string | null; straypaw_id: string | null; zone: string | null; city: string | null; provenance: string | null };
  const base = (data ?? []) as Base[];
  const caseIds = [...new Set(base.map((x) => x.case_id).filter(Boolean) as string[])];
  const dogIds = [...new Set(base.map((x) => x.dog_id).filter(Boolean) as string[])];
  const caseRes = caseIds.length ? await supa.from("org_case_facts").select("id,dog_id,case_code,title,condition_class,assignee_name,zone,city,provenance").in("id", caseIds) : { data: [] as CaseIdentity[], error: null };
  if (caseRes.error) throw new Error(caseRes.error.message);
  const cases = new Map(((caseRes.data ?? []) as CaseIdentity[]).map((x) => [x.id, x]));
  for (const c of cases.values()) if (c.dog_id && !dogIds.includes(c.dog_id)) dogIds.push(c.dog_id);
  const dogRes = dogIds.length ? await supa.from("dogs").select("id,name,straypaw_id,zone,city,provenance").in("id", dogIds) : { data: [] as AnimalIdentity[], error: null };
  if (dogRes.error) throw new Error(dogRes.error.message);
  const animals = new Map(((dogRes.data ?? []) as AnimalIdentity[]).map((x) => [x.id, x]));
  return base.map((f) => {
    const c = f.case_id ? cases.get(f.case_id) : null;
    const a = f.dog_id ? animals.get(f.dog_id) : c?.dog_id ? animals.get(c.dog_id) : null;
    const historical = Boolean(f.import_batch_id || f.import_source_key || /^imported\b/i.test(f.kind ?? "") || c?.provenance === "imported_historical_record" || (!f.case_id && a?.provenance === "imported_historical_record"));
    return {
      ...f,
      source: historical ? "historical_import" : "scheduled",
      case_code: c?.case_code ?? null,
      case_title: c?.title ?? null,
      condition_class: c?.condition_class ?? null,
      assignee_name: c?.assignee_name ?? null,
      animal_name: a?.name ?? null,
      straypaw_id: a?.straypaw_id ?? null,
      zone: c?.zone ?? a?.zone ?? null,
      city: c?.city ?? a?.city ?? null,
    };
  });
}

/** Exact organisation totals for the dashboard tiles. The queue above lists a
 * bounded page of rows; these counts are authoritative (head-only, RLS-scoped),
 * so a tile never reports the 800-row page cap as the organisation's total. */
export type OpsCounts = { currentOpen: number; liveWork: number; quiet: number; historicalOpen: number; historicalReview: number; overdueScheduled: number; critical: number };
export async function opsCounts(): Promise<OpsCounts | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const now = Date.now();
  const ninety = new Date(now - 90 * DAY).toISOString();
  const thirty = new Date(now - 30 * DAY).toISOString();
  const nowIso = new Date(now).toISOString();
  const criticalConditions = ["Road accident", "Maggot wound", "Human abuse", "Dog bite", "Entrapment", "Suspected rabies"];
  const current = "provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null";
  const [openRes, quietRes, historicalRes, historicalReviewRes, overdueRes, criticalRes] = await Promise.all([
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).lt("occurred_at", ninety).or(`last_activity_at.is.null,last_activity_at.lt.${thirty}`),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).eq("provenance", "imported_historical_record").is("reviewed_at", null),
    supa.rpc("org_historical_review_queue", undefined, { count: "exact", head: true }),
    supa.from("animal_followups").select("id", { count: "exact", head: true }).eq("status", "upcoming").not("case_id", "is", null).lt("due_at", nowIso),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).in("condition_class", criticalConditions),
  ]);
  if ([openRes, quietRes, historicalRes, historicalReviewRes, overdueRes, criticalRes].some((r) => r.error)) throw new Error("Organisation workload counts could not be read.");
  const currentOpen = openRes.count ?? 0, quiet = quietRes.count ?? 0;
  return {
    currentOpen,
    quiet,
    historicalOpen: historicalRes.count ?? 0,
    historicalReview: historicalReviewRes.count ?? 0,
    overdueScheduled: overdueRes.count ?? 0,
    critical: criticalRes.count ?? 0,
    liveWork: Math.max(0, currentOpen - quiet),
  };
}

export async function recentChanges(limit = 6): Promise<Change[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("org_case_facts")
    .select("id,title,condition_class,status_class,closure_reason,animal_name,zone,last_activity_at")
    .not("status_class", "in", "(open,in_progress)").not("last_activity_at", "is", null)
    .order("last_activity_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as Change[];
}

const DAY = 86_400_000;
/** Open, older than ninety days, and nothing recorded for thirty: work for a person to decide. */
export const isStale = (c: OpenCase, now = Date.now()) =>
  !!c.occurred_at && now - Date.parse(c.occurred_at) > 90 * DAY && (!c.last_activity_at || now - Date.parse(c.last_activity_at) > 30 * DAY);

export const isHistoricalCase = (c: Pick<OpenCase, "provenance" | "reviewed_at">) =>
  c.provenance === "imported_historical_record" && !c.reviewed_at;

/** The live queue's order. Critical cases first, then follow-ups that
    slipped in the last ninety days, then the other live cases; follow-ups
    overdue by more than ninety days (usually an imported register's old
    review dates) come last, so a backlog never buries today's emergencies.
    Within each group the OLDEST first: the item that has waited longest is
    the one most likely to be forgotten. `age` is days waited (days
    overdue, for a follow-up). */
export type QueueItem = { kind: "followup" | "case"; crit: boolean; age: number };
export const queueRank = (x: QueueItem) => (x.kind === "case" ? (x.crit ? 0 : 2) : x.age <= 90 ? 1 : 3);
export const queueOrder = (a: QueueItem, b: QueueItem) => queueRank(a) - queueRank(b) || b.age - a.age;

export type OrgOpenWorkCell = {
  city: string; h3_r8: string; open_cases: number; stale_cases: number; historical_cases: number; critical_cases: number;
};

/** Exact cell-level open-work totals for the NGO operations map. The named
 * queue remains bounded, but the geography is never inferred from that page. */
export async function orgOpenWorkCells(): Promise<OrgOpenWorkCell[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("list_org_open_work_cells_v2");
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgOpenWorkCell[];
}

