"use client";

/* ─────────────────────────────────────────────────────────────
   The cases register's reads (client, the member's own session).

   Open work is small (a couple of hundred cases) and is read whole, so the
   triage board and the lenses over it are exact. Closed work is the other
   ninety per cent of the register; it is read a page at a time, newest
   first, and a search runs in the database across everything. Nothing
   here ever pulls the whole register, or source_metadata, into the page.
   ───────────────────────────────────────────────────────────── */

import { getSupabase } from "./supabase";

export type RegisterRow = {
  id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null;
  closure_reason: string | null; occurred_at: string | null; last_activity_at: string | null; resolved_at: string | null;
  resolved_at_source: string | null; reviewed_at: string | null; severity: string | null; assignee_name: string | null;
  animal_name: string | null; straypaw_id: string | null; dog_id: string | null; zone: string | null; h3_r8: string | null;
  next_due: string | null; followups_done: number | null; followups_missed: number | null; intake_channel: string | null;
  provenance: string | null;
};

const FIELDS = "id,case_code,title,condition_class,status_class,closure_reason,occurred_at,last_activity_at,resolved_at,resolved_at_source,reviewed_at,severity,assignee_name,animal_name,straypaw_id,dog_id,zone,h3_r8,next_due,followups_done,followups_missed,intake_channel,provenance";
export const PAGE = 150;
export const OPEN_REGISTER_LIMIT = 300;

export async function openRegister(): Promise<RegisterRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("org_case_facts").select(FIELDS)
    .in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: true }).limit(OPEN_REGISTER_LIMIT);
  if (error) throw new Error(error.message);
  return (data ?? []) as RegisterRow[];
}

export type ClosedLens = "closed" | "reasonless";

/** Closed cases, newest activity first, one page at a time. */
export async function closedRegister(lens: ClosedLens, from = 0): Promise<RegisterRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  let q = supa.from("org_case_facts").select(FIELDS).not("status_class", "in", "(open,in_progress)");
  if (lens === "reasonless") q = q.in("status_class", ["no_action", "not_attended"]).or("closure_reason.is.null,closure_reason.eq.unspecified");
  const { data, error } = await q.order("occurred_at", { ascending: false }).range(from, from + PAGE - 1);
  if (error) throw new Error(error.message);
  return (data ?? []) as RegisterRow[];
}

/** A search across the whole register, open and closed. */
export async function searchRegister(text: string): Promise<RegisterRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const t = text.trim().replace(/[%,()*]/g, " ").replace(/\s+/g, " ");
  if (!t) return [];
  const like = `*${t}*`;
  const { data, error } = await supa.from("org_case_facts").select(FIELDS)
    .or(["case_code", "title", "animal_name", "straypaw_id", "zone", "condition_class"].map((c) => `${c}.ilike.${like}`).join(","))
    .order("occurred_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as RegisterRow[];
}

/** How many closed cases there are, and how many still owe a reason (counts only). */
export async function closedCounts(): Promise<{ closed: number; reasonless: number }> {
  const supa = getSupabase();
  if (!supa) return { closed: 0, reasonless: 0 };
  const [a, b] = await Promise.all([
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).not("status_class", "in", "(open,in_progress)"),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["no_action", "not_attended"]).or("closure_reason.is.null,closure_reason.eq.unspecified"),
  ]);
  if (a.error || b.error) throw new Error("Case totals could not be loaded.");
  return { closed: a.count ?? 0, reasonless: b.count ?? 0 };
}

export type CaseScopeCounts = { currentOpen: number; historicalOpen: number; historicalReview: number; currentQuiet: number; critical: number; unassigned: number; flaggedOverdue: number };

/** Exact cohorts shared by Today, Cases and the operations room. Imported
 * source statuses are review work, not current field cases. */
export async function caseScopeCounts(): Promise<CaseScopeCounts> {
  const supa = getSupabase();
  if (!supa) return { currentOpen: 0, historicalOpen: 0, historicalReview: 0, currentQuiet: 0, critical: 0, unassigned: 0, flaggedOverdue: 0 };
  const now = Date.now();
  const ninety = new Date(now - 90 * 86_400_000).toISOString();
  const thirty = new Date(now - 30 * 86_400_000).toISOString();
  const current = "provenance.is.null,provenance.neq.imported_historical_record,reviewed_at.not.is.null";
  const criticalConditions = ["Road accident", "Maggot wound", "Human abuse", "Dog bite", "Entrapment", "Suspected rabies"];
  const [a, b, review, c, d, e, f] = await Promise.all([
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).eq("provenance", "imported_historical_record").is("reviewed_at", null),
    supa.rpc("org_historical_review_queue", undefined, { count: "exact", head: true }),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).lt("occurred_at", ninety).or(`last_activity_at.is.null,last_activity_at.lt.${thirty}`),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).in("condition_class", criticalConditions),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).is("assignee_name", null),
    supa.from("org_case_facts").select("id", { count: "exact", head: true }).in("status_class", ["open", "in_progress"]).or(current).not("next_due", "is", null).lt("next_due", new Date(now).toISOString()),
  ]);
  if (a.error || b.error || review.error || c.error || d.error || e.error || f.error) throw new Error("Case scope totals could not be loaded.");
  return { currentOpen: a.count ?? 0, historicalOpen: b.count ?? 0, historicalReview: review.count ?? 0, currentQuiet: c.count ?? 0, critical: d.count ?? 0, unassigned: e.count ?? 0, flaggedOverdue: f.count ?? 0 };
}
