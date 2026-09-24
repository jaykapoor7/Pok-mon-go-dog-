"use client";

/* ─────────────────────────────────────────────────────────────
   One case, read with the member's own session.

   Cases are readable only by the organisation that holds them (RLS
   cases_org_read is authenticated and scoped to my_ngo()), so this must
   run in the browser: the server has no session and would see nothing,
   which is why the old server page answered "Case not found" to
   everyone, members included.

   Alongside the case: its history, its follow-ups, the facts the register
   derives (animal, follow-up counts, review date), and the other cases
   recorded in the same cell or on the same animal — a place that keeps
   producing requests is itself something to act on.
   ───────────────────────────────────────────────────────────── */

import { getSupabase } from "./supabase";
import { mapCase, mapUpdate } from "./cases";
import type { Case, CaseUpdate } from "./types";

/** Every column the case file shows; never source_metadata, which carries the raw workbook row. */
const COLS = [
  "id,dog_id,title,description,zone,lat,lng,severity,category,tags,status,resolution,assignee_id,assignee_name,ngo_id",
  "created_by_id,created_by_name,created_at,updated_at,last_activity_at,due_at,resolved_at,before_url,after_url,outcome_note",
  "proof_verified,verified_at,cost_estimate,cost_spent,species,follow_up_at,medical_notes,photos",
  "case_code,stage,condition_text,hospital,next_action,provenance,h3_r8,city,location_precision,condition_class,status_class",
  "closure_reason,intake_channel,first_action_at,resolved_at_source,status_reviewed_at,source_event_at",
].join(",");

export type CaseRegister = {
  case_code: string | null; stage: string | null; condition_text: string | null; hospital: string | null; next_action: string | null;
  provenance: string | null; h3_r8: string | null; city: string | null; location_precision: string | null;
  condition_class: string | null; status_class: string | null; closure_reason: string | null; intake_channel: string | null;
  first_action_at: string | null; resolved_at_source: string | null; status_reviewed_at: string | null;
  /** When it happened: the workbook's date for an imported case, the report's for a new one. */
  occurred_at: string;
};
export type CaseAnimal = { name: string | null; straypaw_id: string | null; photo: string | null };
export type CaseFollowupRow = { id: string; due_at: string; status: string; kind: string | null; note: string | null; completed_at: string | null };
export type Neighbour = {
  id: string; case_code: string | null; title: string | null; condition_class: string | null; status_class: string | null;
  closure_reason: string | null; occurred_at: string | null; animal_name: string | null; dog_id: string | null;
};
export type CaseFile = {
  c: Case; reg: CaseRegister; animal: CaseAnimal | null; updates: CaseUpdate[]; followups: CaseFollowupRow[];
  neighbours: Neighbour[]; sameAnimal: Neighbour[];
};

const NFIELDS = "id,case_code,title,condition_class,status_class,closure_reason,occurred_at,animal_name,dog_id";

export async function loadCaseFile(id: string): Promise<CaseFile | null> {
  const supa = getSupabase();
  if (!supa) return null;
  const [{ data: row, error }, { data: ups }, { data: fus }, { data: facts }] = await Promise.all([
    supa.from("cases").select(COLS).eq("id", id).maybeSingle(),
    supa.from("case_updates").select("*").eq("case_id", id).order("created_at", { ascending: true }),
    supa.from("animal_followups").select("id,due_at,status,kind,note,completed_at").eq("case_id", id).order("due_at", { ascending: true }),
    supa.from("org_case_facts").select("occurred_at,animal_name,straypaw_id,cover_photo").eq("id", id).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!row) return null;
  const r = row as unknown as Record<string, unknown>;
  const f = (facts ?? null) as { occurred_at: string | null; animal_name: string | null; straypaw_id: string | null; cover_photo: string | null } | null;
  const s = (k: string) => (r[k] as string | null) ?? null;
  const reg: CaseRegister = {
    case_code: s("case_code"), stage: s("stage"), condition_text: s("condition_text"), hospital: s("hospital"), next_action: s("next_action"),
    provenance: s("provenance"), h3_r8: s("h3_r8"), city: s("city"), location_precision: s("location_precision"),
    condition_class: s("condition_class"), status_class: s("status_class"), closure_reason: s("closure_reason"), intake_channel: s("intake_channel"),
    first_action_at: s("first_action_at"), resolved_at_source: s("resolved_at_source"), status_reviewed_at: s("status_reviewed_at"),
    occurred_at: f?.occurred_at ?? s("source_event_at") ?? (r.created_at as string),
  };
  const c = mapCase(r);

  const [near, same] = await Promise.all([
    reg.h3_r8
      ? supa.from("org_case_facts").select(NFIELDS).eq("h3_r8", reg.h3_r8).neq("id", id).order("occurred_at", { ascending: false }).limit(60)
      : Promise.resolve({ data: [] }),
    c.dog_id
      ? supa.from("org_case_facts").select(NFIELDS).eq("dog_id", c.dog_id).neq("id", id).order("occurred_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    c, reg,
    animal: c.dog_id ? { name: f?.animal_name ?? null, straypaw_id: f?.straypaw_id ?? null, photo: f?.cover_photo ?? null } : null,
    updates: (ups ?? []).map(mapUpdate),
    followups: (fus ?? []) as CaseFollowupRow[],
    neighbours: (near.data ?? []) as Neighbour[],
    sameAnimal: (same.data ?? []) as Neighbour[],
  };
}
