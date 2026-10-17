"use client";

/* ════════════════════════════════════════════════════════════════════
   Honest reads for the NGO record tools.

   The 1.0 readers (getPartnerMedicalEvents, getMyAnimals,
   getPartnerRecordRows, getOrgVolunteers) answer a failed query with an
   empty list. They are still the source of the rows here, so what the
   page shows is what 1.0 showed; beside them each reader asks the
   database how many rows exist under the same scope. When that count
   fails, or says rows exist that the 1.0 reader did not return, the
   read throws and the page says "Not read" instead of showing an empty
   list or a zero. Nothing here writes.
   ════════════════════════════════════════════════════════════════════ */

import { getSupabase } from "@/lib/supabase";
import { getMyAnimals, getPartnerMedicalEvents, type PartnerMedicalEvent } from "@/lib/animal-actions";
import { getPartnerRecordRows, type PartnerRecordRow } from "@/lib/partner-record-explorer";
import type { Volunteer } from "@/lib/team-actions";

const NOT_CONNECTED = "Not connected to the record.";
const PARTIAL = "Only part of the record came back.";

/** Same limits the 1.0 readers use. */
export const CARE_LIMIT = 200;
export const ANIMAL_LIMIT = 200;
const OUTCOME_EVENTS = ["import:release", "import:outcome", "outcome", "release", "adoption", "foster", "death", "transfer"];

async function org() {
  const supa = getSupabase();
  if (!supa) throw new Error(NOT_CONNECTED);
  const { data, error } = await supa.rpc("my_ngo");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your organisation could not be found for this account.");
  return { supa, ngoId: data as string };
}

type Head = { count: number | null; error: { message: string } | null };
function counted(r: Head, what: string): number {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.count ?? 0;
}

/** The organisation's care events (newest 200, as in 1.0) and how many exist. */
export async function readCare(): Promise<{ rows: PartnerMedicalEvent[]; total: number }> {
  const { supa, ngoId } = await org();
  const [rows, head] = await Promise.all([
    getPartnerMedicalEvents(CARE_LIMIT),
    supa.from("medical_events").select("id, dogs!inner(ngo_id)", { count: "exact", head: true }).eq("dogs.ngo_id", ngoId),
  ]);
  const total = counted(head as Head, "Care events");
  if (total > 0 && rows.length === 0) throw new Error(PARTIAL);
  return { rows, total };
}

export type QualityInput = {
  animals: Awaited<ReturnType<typeof getMyAnimals>>;
  records: PartnerRecordRow[];
  totals: { animals: number; cases: number; care: number; followups: number; outcomes: number };
};

/** Everything the data-quality queues are computed from, with the scope it covers. */
export async function readQuality(): Promise<QualityInput> {
  const { supa, ngoId } = await org();
  const [animals, records, a, c, m, f, t] = await Promise.all([
    getMyAnimals(ANIMAL_LIMIT),
    getPartnerRecordRows(),
    supa.from("dogs").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId),
    supa.from("cases").select("id", { count: "exact", head: true }).eq("ngo_id", ngoId),
    supa.from("medical_events").select("id, dogs!inner(ngo_id)", { count: "exact", head: true }).eq("dogs.ngo_id", ngoId),
    supa.from("animal_followups").select("id, dogs!inner(ngo_id)", { count: "exact", head: true }).eq("dogs.ngo_id", ngoId),
    supa.from("animal_timeline_events").select("id, dogs!inner(ngo_id)", { count: "exact", head: true }).eq("ngo_id", ngoId).in("event_type", OUTCOME_EVENTS),
  ]);
  const totals = {
    animals: counted(a as Head, "Animals"),
    cases: counted(c as Head, "Cases"),
    care: counted(m as Head, "Care events"),
    followups: counted(f as Head, "Follow-ups"),
    outcomes: counted(t as Head, "Outcome entries"),
  };
  const by = (s: PartnerRecordRow["source"]) => records.filter((r) => r.source === s).length;
  const rescues = records.filter((r) => r.kind === "rescue").length;
  if (
    (totals.animals > 0 && animals.length === 0) ||
    rescues < totals.cases ||
    (totals.care > 0 && by("medical") === 0) ||
    (totals.followups > 0 && by("follow_up") === 0) ||
    (totals.outcomes > 0 && by("timeline") === 0)
  ) throw new Error(PARTIAL);
  return { animals, records, totals };
}

/** Volunteer sign-ups: the same org_volunteers RPC as 1.0, with its error kept. */
export async function readVolunteers(): Promise<Volunteer[]> {
  const supa = getSupabase();
  if (!supa) throw new Error(NOT_CONNECTED);
  const { data, error } = await supa.rpc("org_volunteers");
  if (error) throw new Error(error.message);
  return (data ?? []) as Volunteer[];
}

export type OwnStory = { id: string; case_id: string | null; title: string; location_label: string | null; published_at: string | null };

/** Stories this organisation has published (case_stories_own_read). */
export async function readOwnStories(): Promise<OwnStory[]> {
  const { supa, ngoId } = await org();
  const { data, error } = await supa.from("case_stories").select("id,case_id,title,location_label,published_at").eq("ngo_id", ngoId).order("published_at", { ascending: false, nullsFirst: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as OwnStory[];
}
