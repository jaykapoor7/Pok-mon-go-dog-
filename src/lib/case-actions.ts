"use client";

// ─────────────────────────────────────────────────────────────
// Case write actions (client). All persistence flows through the SECURITY
// DEFINER functions in supabase/cases.sql. The "actor" is the existing
// lightweight identity ({id,name}); no new auth system.
//
// With no Supabase configured the helpers simulate success for local dev.
// ─────────────────────────────────────────────────────────────

import { getSupabase } from "./supabase";
import type {
  CaseStatus,
  CaseSeverity,
  CaseCategory,
  CaseResolution,
} from "./types";

export interface Actor {
  id: string;
  name: string;
}

/** Register/refresh the volunteer record (best-effort, fire-and-forget). */
export async function ensureVolunteer(actor: Actor) {
  const supa = getSupabase();
  if (!supa) return;
  try {
    await supa.rpc("upsert_volunteer", { p_id: actor.id, p_name: actor.name });
  } catch {
    /* non-fatal */
  }
}

export interface CreateCaseInput {
  title: string;
  description?: string;
  dogId?: string | null;
  zone?: string | null;
  lat?: number | null;
  lng?: number | null;
  severity: CaseSeverity;
  category: CaseCategory;
  tags?: string[];
  species?: string;
}

export async function createCase(
  input: CreateCaseInput,
  actor: Actor
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-case";
  await ensureVolunteer(actor);
  // Demo dogs don't exist in the DB, never link a case to one.
  const dogId = input.dogId && !input.dogId.startsWith("demo-") ? input.dogId : null;
  const { data, error } = await supa.rpc("create_case", {
    p_title: input.title,
    p_description: input.description || null,
    p_dog_id: dogId,
    p_zone: input.zone || null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_severity: input.severity,
    p_category: input.category,
    p_tags: input.tags ?? [],
    p_actor_id: actor.id,
    p_actor_name: actor.name,
    p_species: input.species ?? "dog",
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

/** Handler/NGO-only: set a case's medical notes. */
export async function setCaseMedical(caseId: string, medicalNotes: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_case_medical", {
    p_case_id: caseId,
    p_medical_notes: medicalNotes,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Handler/NGO-only: append a photo to a case. */
export async function addCasePhoto(caseId: string, url: string): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("add_case_photo", {
    p_case_id: caseId,
    p_url: url,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Handler/NGO-only: set or clear a case's follow-up date (YYYY-MM-DD | null). */
export async function setCaseFollowup(caseId: string, followUpAt: string | null): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_case_followup", {
    p_case_id: caseId,
    p_follow_up_at: followUpAt,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export interface CaseFollowup {
  id: string;
  due_at: string;
  note: string | null;
  status: string;
  kind: string;
  completed_at: string | null;
  created_at: string;
}

/** A dated follow-up is a first-class operational record, not just a date on
 * a case. The database trigger places it on the linked animal timeline. */
export async function addCaseFollowup(input: { caseId: string; dogId?: string | null; dueAt: string; note?: string | null }): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-followup";
  const { data, error } = await supa.rpc("add_case_followup", {
    p_case_id: input.caseId, p_dog_id: input.dogId ?? null, p_due_at: input.dueAt, p_note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

export async function getCaseFollowups(caseId: string): Promise<CaseFollowup[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.from("animal_followups").select("id,due_at,note,status,kind,completed_at,created_at").eq("case_id", caseId).order("due_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row: any) => ({ id: row.id, due_at: row.due_at, note: row.note ?? null, status: row.status, kind: row.kind, completed_at: row.completed_at ?? null, created_at: row.created_at }));
}

export async function updateCaseFollowupStatus(input: { followupId: string; status: "upcoming" | "done" | "missed" | "postponed" | "cancelled"; note?: string | null; dueAt?: string | null }): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("update_case_followup_status", {
    p_followup_id: input.followupId,
    p_status: input.status,
    p_note: input.note ?? null,
    p_due_at: input.dueAt ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function claimCase(caseId: string, actor: Actor): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  await ensureVolunteer(actor);
  const { data, error } = await supa.rpc("claim_case", {
    p_case_id: caseId,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export interface StatusResult {
  ok: boolean;
  error?: string;
}

export async function updateCaseStatus(
  caseId: string,
  toStatus: CaseStatus,
  actor: Actor,
  opts: {
    resolution?: CaseResolution;
    note?: string;
    beforeUrl?: string | null;
    afterUrl?: string | null;
    outcomeNote?: string | null;
  } = {}
): Promise<StatusResult> {
  const supa = getSupabase();
  if (!supa) return { ok: true };
  const { data, error } = await supa.rpc("update_case_status", {
    p_case_id: caseId,
    p_to_status: toStatus,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
    p_resolution: opts.resolution ?? null,
    p_note: opts.note ?? null,
    p_before_url: opts.beforeUrl ?? null,
    p_after_url: opts.afterUrl ?? null,
    p_outcome_note: opts.outcomeNote ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as StatusResult) ?? { ok: false, error: "Unknown error" };
}

/** Assign (or reassign) a case to a teammate. */
export async function assignCase(caseId: string, assignee: { id: string; name: string }, actor: Actor): Promise<void> {
  const supa = getSupabase();
  if (!supa) return;
  const { error } = await supa.rpc("assign_case", {
    p_case_id: caseId,
    p_assignee_id: assignee.id,
    p_assignee_name: assignee.name,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
  });
  if (error) throw new Error(error.message);
}

export async function addCaseNote(caseId: string, actor: Actor, note: string) {
  const supa = getSupabase();
  if (!supa) return;
  await supa.rpc("add_case_note", {
    p_case_id: caseId,
    p_actor_id: actor.id,
    p_actor_name: actor.name,
    p_note: note,
  });
}

/** Handler/NGO-only: set the estimated and/or spent cost for a case (INR). */
export async function setCaseCost(
  caseId: string,
  patch: { estimate?: number | null; spent?: number | null }
): Promise<boolean> {
  const supa = getSupabase();
  if (!supa) return true;
  const { data, error } = await supa.rpc("set_case_cost", {
    p_case_id: caseId,
    p_estimate: patch.estimate ?? null,
    p_spent: patch.spent ?? null,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

/** Strict UI validation mirrors numeric(12,2): normal INR integers and
 * decimals are accepted, while malformed/negative values never become ₹0. */
export function parseINRAmount(value: string): number | null {
  const text = value.trim().replace(/^₹\s*/, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount <= 9_999_999_999.99 ? amount : null;
}
