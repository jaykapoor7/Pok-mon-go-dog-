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
};

const FIELDS = "id,case_code,title,condition_class,status_class,closure_reason,occurred_at,last_activity_at,resolved_at,resolved_at_source,reviewed_at,severity,assignee_name,animal_name,straypaw_id,dog_id,zone,h3_r8,next_due,followups_done,followups_missed,intake_channel";
export const PAGE = 150;

export async function openRegister(): Promise<RegisterRow[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const out: RegisterRow[] = [];
  for (let from = 0; from < 5000; from += 1000) {
    const { data, error } = await supa.from("org_case_facts").select(FIELDS)
      .in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as RegisterRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
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
  return { closed: a.count ?? 0, reasonless: b.count ?? 0 };
}
