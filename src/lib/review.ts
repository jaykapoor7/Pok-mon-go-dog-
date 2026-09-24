"use client";

/* ─────────────────────────────────────────────────────────────
   Case review (client). A person decides what happened to a case
   that has been open for months, or why a closed one closed without
   field action. Every write goes through review_case() in
   supabase/case-review.sql, which checks the case belongs to the
   caller's organisation and writes the decision into the case's own
   history. Nothing here runs on a timer.
   ───────────────────────────────────────────────────────────── */

import { getSupabase } from "./supabase";

export type ReviewDecision = "still_active" | "closed_done" | "closed_no_action" | "other_ngo" | "set_reason";
export type ReviewReason = "could_not_locate" | "died" | "recovered" | "caller_unreachable" | "duplicate" | "not_attended" | "other";

export const REVIEW_REASONS: { id: ReviewReason; label: string }[] = [
  { id: "could_not_locate", label: "The animal could not be found" },
  { id: "caller_unreachable", label: "The caller could not be reached" },
  { id: "died", label: "It died before help arrived" },
  { id: "recovered", label: "It recovered on its own" },
  { id: "duplicate", label: "A duplicate of another request" },
  { id: "not_attended", label: "Nobody could attend" },
  { id: "other", label: "Something else (say what)" },
];

export type ReviewCase = {
  id: string;
  case_code: string | null;
  title: string | null;
  condition_class: string | null;
  status_class: string | null;
  closure_reason: string | null;
  occurred_at: string | null;
  last_activity_at: string | null;
  severity: string | null;
  assignee_name: string | null;
  animal_name: string | null;
  straypaw_id: string | null;
  zone: string | null;
  h3_r8: string | null;
  followups_done: number | null;
  followups_missed: number | null;
  provenance: string | null;
};

const FIELDS = "id,case_code,title,condition_class,status_class,closure_reason,occurred_at,last_activity_at,severity,assignee_name,animal_name,straypaw_id,zone,h3_r8,followups_done,followups_missed,provenance";

/** Open cases older than `days`, untouched for thirty days: the review queue. */
export async function staleCases(days = 90): Promise<ReviewCase[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const opened = new Date(Date.now() - days * 86_400_000).toISOString();
  const quiet = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const out: ReviewCase[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supa.from("org_case_facts").select(FIELDS)
      .in("status_class", ["open", "in_progress"]).lt("occurred_at", opened)
      .or(`last_activity_at.is.null,last_activity_at.lt.${quiet}`)
      .order("occurred_at", { ascending: true }).range(from, from + 499);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as ReviewCase[]));
    if (!data || data.length < 500) return out;
  }
}

/** Cases closed without field action whose reason nobody recorded. */
export async function reasonlessCases(): Promise<ReviewCase[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const out: ReviewCase[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supa.from("org_case_facts").select(FIELDS)
      .in("status_class", ["no_action", "not_attended"])
      .or("closure_reason.is.null,closure_reason.eq.unspecified")
      .order("occurred_at", { ascending: false }).range(from, from + 499);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as ReviewCase[]));
    if (!data || data.length < 500) return out;
  }
}

export async function reviewCase(input: {
  caseId: string; decision: ReviewDecision; actorName: string; reason?: ReviewReason | null; note?: string | null;
}): Promise<{ ok: boolean; error?: string; status_class?: string }> {
  const supa = getSupabase();
  if (!supa) return { ok: false, error: "Not connected." };
  const { data, error } = await supa.rpc("review_case", {
    p_case_id: input.caseId,
    p_decision: input.decision,
    p_actor_name: input.actorName,
    p_closure_reason: input.reason ?? null,
    p_note: input.note?.trim() || null,
  });
  if (error) return { ok: false, error: error.message };
  return (data as { ok: boolean; error?: string; status_class?: string }) ?? { ok: false, error: "No answer from the register." };
}
