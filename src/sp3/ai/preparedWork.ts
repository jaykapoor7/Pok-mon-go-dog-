import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TRIAGE, type Condition } from "@/lib/register/taxonomy";
import { localityVariants, promisedReviews, stalledCritical, workId, type CareEvent, type CaseFact, type FollowupRow } from "./prepare";
import type { Proposal } from "./types";

/* Kaju's prepared work, shared by the Home panel (/api/ai/prepared) and
   Kaju's own tool loop. Reads only, under the caller's session (RLS). */

const DAY = 86_400_000;
const label = (d: { name?: string | null; straypaw_id?: string | null; code?: string | null } | null) => d?.name || d?.straypaw_id || d?.code || "Unnamed animal";

export async function preparedWork(db: SupabaseClient, ngoId: string, userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - 150 * DAY).toISOString().slice(0, 10);

  const [cases, care, zones] = await Promise.all([
    db.from("org_case_facts").select("id,case_code,title,condition_class,occurred_at,last_activity_at,assignee_name,dog_id,zone,provenance")
      .eq("ngo_id", ngoId).in("status_class", ["open", "in_progress"]).limit(800),
    db.from("medical_events").select("id,dog_id,case_id,event_date,notes,dogs!inner(ngo_id,name,straypaw_id,code,zone)")
      .eq("dogs.ngo_id", ngoId).gte("event_date", since).order("event_date", { ascending: false }).limit(2000),
    zoneCounts(db, ngoId),
  ]);
  const unavailable: string[] = [];
  if (cases.error) unavailable.push("cases");
  if (care.error) unavailable.push("care notes");
  if (!zones) unavailable.push("localities");

  type CareRow = { id: string; dog_id: string; case_id: string | null; event_date: string | null; notes: string | null; dogs: { name: string | null; straypaw_id: string | null; code: string | null; zone: string | null } | { name: string | null; straypaw_id: string | null; code: string | null; zone: string | null }[] | null };
  const events: CareEvent[] = ((care.data ?? []) as CareRow[]).map((e) => {
    const d = Array.isArray(e.dogs) ? e.dogs[0] ?? null : e.dogs;
    return { id: e.id, dog_id: e.dog_id, case_id: e.case_id, event_date: e.event_date, notes: e.notes, dog_label: label(d), zone: d?.zone ?? null };
  });
  const dogIds = [...new Set(events.map((e) => e.dog_id))];
  let followups: FollowupRow[] = [];
  if (dogIds.length) {
    /* In chunks: a long id list would overflow the request URL and silently read nothing. */
    for (let i = 0; i < dogIds.length; i += 100) {
      const f = await db.from("animal_followups").select("dog_id,case_id,due_at").in("dog_id", dogIds.slice(i, i + 100)).gte("due_at", since).limit(1000);
      if (f.error) { unavailable.push("follow-ups"); break; }
      followups = followups.concat((f.data ?? []) as FollowupRow[]);
    }
  }

  const facts: CaseFact[] = ((cases.data ?? []) as Omit<CaseFact, "critical">[]).map((x) => ({ ...x, critical: DEFAULT_TRIAGE[(x.condition_class ?? "Not recorded") as Condition] === "Critical" }));
  const stalled = cases.error ? [] : stalledCritical(facts, now);
  /* Without the follow-up read a review cannot be called missed. */
  const reviews = care.error || unavailable.includes("follow-ups") ? [] : promisedReviews(events, followups, now);
  const localities = zones ? localityVariants(zones).slice(0, 8) : [];

  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
  const proposals: Proposal[] = [];
  for (const s of stalled.slice(0, 5)) {
    proposals.push({
      id: workId("kp", "stalled", s.caseId, s.lastActivity), kind: "schedule_followup", why: `Critical, no update for ${s.quietDays} days`,
      caseId: s.caseId, caseLabel: s.label, dogId: s.dogId, dueAt: tomorrow,
      note: `Critical case with no recorded update since ${s.lastActivity.slice(0, 10)}. Check the animal and record what happened.`,
    });
  }
  const recentMiss = (r: (typeof reviews)[number]) => r.state === "missed" && now.getTime() - Date.parse(r.promisedFor) < 30 * DAY;
  for (const r of reviews.filter((r) => r.caseId && (r.state === "upcoming" || recentMiss(r))).slice(0, 8)) {
    proposals.push({
      id: workId("kp", "review", r.eventId, r.promisedFor), kind: "schedule_followup", why: r.state === "missed" ? `Review promised for ${r.promisedFor} was not recorded` : `Care note says “${r.quote}”`,
      caseId: r.caseId as string, caseLabel: r.dogLabel, dogId: r.dogId, dueAt: r.state === "missed" ? tomorrow : `${r.promisedFor}T00:00:00.000Z`,
      note: `Review promised in the care note (“${r.quote}”).${r.state === "missed" ? " The promised date passed with nothing recorded." : ""}`,
    });
  }

  /* Work this person already confirmed: their own receipts (RLS: actor and organisation). */
  const done: string[] = [];
  if (proposals.length) {
    const r = await db.from("kaju_action_receipts").select("request_id").eq("actor_id", userId).in("request_id", proposals.map((p) => p.id));
    for (const x of r.data ?? []) done.push(x.request_id as string);
  }

  return {
    checkedAt: now.toISOString(), unavailable,
    /* Reads that hit their cap are reported, so a short list is never taken as complete. */
    partial: [(cases.data ?? []).length >= 800 && "open cases (first 800)", (care.data ?? []).length >= 2000 && "care notes (latest 2,000)"].filter(Boolean),
    stalled: stalled.slice(0, 5),
    reviews: { missed: reviews.filter((r) => r.state === "missed").length, upcoming: reviews.filter((r) => r.state === "upcoming").length, items: reviews.slice(-12).reverse() },
    localities,
    proposals,
    done,
    rules: {
      stalled: "Critical condition, open, not an imported record, no recorded activity for 14 days.",
      reviews: "A care note in the last 150 days names a review date; nothing was recorded for the animal from that date and no follow-up is scheduled from three days before it onwards.",
      localities: "Locality names on your animals that differ by one or two letters. Candidates only; a person decides whether they are the same place.",
    },
  };
}

async function zoneCounts(db: SupabaseClient, ngoId: string) {
  const counts = new Map<string, number>();
  for (let page = 0; page < 10; page++) {
    const { data, error } = await db.from("dogs").select("zone").eq("ngo_id", ngoId).not("zone", "is", null).order("id").range(page * 1000, page * 1000 + 999);
    if (error) return null;
    for (const r of data ?? []) { const z = String(r.zone).trim(); if (z) counts.set(z, (counts.get(z) ?? 0) + 1); }
    if ((data ?? []).length < 1000) break;
  }
  return [...counts].map(([zone, count]) => ({ zone, count }));
}
