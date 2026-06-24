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
}

export async function createCase(
  input: CreateCaseInput,
  actor: Actor
): Promise<string | null> {
  const supa = getSupabase();
  if (!supa) return "demo-case";
  await ensureVolunteer(actor);
  const { data, error } = await supa.rpc("create_case", {
    p_title: input.title,
    p_description: input.description || null,
    p_dog_id: input.dogId || null,
    p_zone: input.zone || null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_severity: input.severity,
    p_category: input.category,
    p_tags: input.tags ?? [],
    p_actor_id: actor.id,
    p_actor_name: actor.name,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
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
  opts: { resolution?: CaseResolution; note?: string } = {}
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
  });
  if (error) throw new Error(error.message);
  return (data as StatusResult) ?? { ok: false, error: "Unknown error" };
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
