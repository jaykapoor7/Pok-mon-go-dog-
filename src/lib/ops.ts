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
  animal_name: string | null; dog_id: string | null; zone: string | null; h3_r8: string | null;
  next_due: string | null; followups_missed: number | null;
};
export type DueFollowup = { id: string; case_id: string | null; dog_id: string | null; due_at: string; status: string | null; kind: string | null };
export type Change = { id: string; title: string | null; condition_class: string | null; status_class: string | null; closure_reason: string | null; animal_name: string | null; zone: string | null; last_activity_at: string | null };

export async function openCases(): Promise<OpenCase[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("org_case_facts")
    .select("id,case_code,title,condition_class,status_class,occurred_at,last_activity_at,severity,assignee_name,animal_name,dog_id,zone,h3_r8,next_due,followups_missed")
    .in("status_class", ["open", "in_progress"]).order("occurred_at", { ascending: false }).limit(800);
  if (error) throw new Error(error.message);
  return (data ?? []) as OpenCase[];
}

/** Follow-ups not yet done, due before a week from now (overdue ones included). */
export async function dueFollowups(): Promise<DueFollowup[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const week = new Date(Date.now() + 7 * 86_400_000).toISOString();
  const { data } = await supa.from("animal_followups").select("id,case_id,dog_id,due_at,status,kind")
    .eq("status", "upcoming").lte("due_at", week).order("due_at", { ascending: true }).limit(200);
  return (data ?? []) as DueFollowup[];
}

export async function recentChanges(limit = 6): Promise<Change[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data } = await supa.from("org_case_facts")
    .select("id,title,condition_class,status_class,closure_reason,animal_name,zone,last_activity_at")
    .not("status_class", "in", "(open,in_progress)").not("last_activity_at", "is", null)
    .order("last_activity_at", { ascending: false }).limit(limit);
  return (data ?? []) as Change[];
}

const DAY = 86_400_000;
/** Open, older than ninety days, and nothing recorded for thirty: work for a person to decide. */
export const isStale = (c: OpenCase, now = Date.now()) =>
  !!c.occurred_at && now - Date.parse(c.occurred_at) > 90 * DAY && (!c.last_activity_at || now - Date.parse(c.last_activity_at) > 30 * DAY);

/** The live queue's order. Overdue follow-ups first, then critical cases,
    then the rest; within each group the OLDEST first — the item that has
    waited longest is the one most likely to be forgotten behind newer
    work. `age` is days waited (days overdue, for a follow-up). */
export type QueueItem = { kind: "followup" | "case"; crit: boolean; age: number };
export const queueRank = (x: QueueItem) => (x.kind === "followup" ? 0 : x.crit ? 1 : 2);
export const queueOrder = (a: QueueItem, b: QueueItem) => queueRank(a) - queueRank(b) || b.age - a.age;
