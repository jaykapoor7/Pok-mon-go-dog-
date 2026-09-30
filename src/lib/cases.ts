// ─────────────────────────────────────────────────────────────
// Cases data access (read side). Live Supabase when configured; empty otherwise.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Case, CaseUpdate, CaseStatus, CaseSeverity, CaseCategory } from "./types";
import { isRecordingDemo, recordingDemoCases } from "./recording-demo";

export const CASES_LIVE = isSupabaseConfigured;

/** The columns a case row needs; never source_metadata, which carries the
    raw workbook row and would multiply what reaches the browser. */
const CASE_COLS = "id,dog_id,title,description,zone,lat,lng,severity,category,tags,status,resolution,assignee_id,assignee_name,ngo_id,created_by_id,created_by_name,created_at,updated_at,last_activity_at,due_at,resolved_at,before_url,after_url,outcome_note,proof_verified,verified_at,cost_estimate,cost_spent,informer_contact,hospital,species,follow_up_at,medical_notes,photos";

export function mapCase(r: any): Case {
  return {
    id: r.id, dog_id: r.dog_id ?? null, title: r.title, description: r.description ?? null,
    zone: r.zone ?? null, lat: r.lat ?? null, lng: r.lng ?? null,
    severity: (r.severity ?? "normal") as CaseSeverity, category: (r.category ?? "other") as CaseCategory,
    tags: r.tags ?? [], status: (r.status ?? "unverified") as CaseStatus, resolution: r.resolution ?? null,
    assignee_id: r.assignee_id ?? null, assignee_name: r.assignee_name ?? null, ngo_id: r.ngo_id ?? null,
    created_by_id: r.created_by_id ?? null, created_by_name: r.created_by_name ?? null,
    created_at: r.created_at, updated_at: r.updated_at ?? r.created_at, last_activity_at: r.last_activity_at ?? r.created_at,
    due_at: r.due_at ?? null, resolved_at: r.resolved_at ?? null, before_url: r.before_url ?? null,
    after_url: r.after_url ?? null, outcome_note: r.outcome_note ?? null, proof_verified: r.proof_verified ?? false,
    verified_at: r.verified_at ?? null, cost_estimate: r.cost_estimate ?? null, cost_spent: r.cost_spent ?? null,
    informer_contact: r.informer_contact ?? null, hospital: r.hospital ?? null,
    species: r.species ?? "dog", follow_up_at: r.follow_up_at ?? null, medical_notes: r.medical_notes ?? null,
    photos: r.photos ?? [],
  };
}

export function mapUpdate(r: any): CaseUpdate {
  return { id: r.id, case_id: r.case_id, actor_id: r.actor_id ?? null, actor_name: r.actor_name ?? null,
    type: r.type, from_status: r.from_status ?? null, to_status: r.to_status ?? null, note: r.note ?? null, created_at: r.created_at };
}

export type CasePage = { items: Case[]; nextCursor: { at: string; id: string } | null };

/**
 * A bounded page of the signed-in organisation's cases plus the claimable
 * community queue.  This intentionally goes through a keyset-paginated RPC:
 * downloading an organisation's history just to render one screen caused
 * imported partners to freeze their dashboard.
 */
export async function getPartnerCasesPage(input: {
  limit?: number;
  cursor?: { at: string; id: string } | null;
} = {}): Promise<CasePage> {
  if (isRecordingDemo) return { items: recordingDemoCases.slice(0, input.limit ?? 100), nextCursor: null };
  const supa = getSupabase();
  if (!supa) return { items: [], nextCursor: null };
  const limit = Math.min(200, Math.max(1, Math.floor(input.limit ?? 100)));
  const { data, error } = await supa.rpc("list_org_cases", {
    p_limit: limit + 1,
    p_before_at: input.cursor?.at ?? null,
    p_before_id: input.cursor?.id ?? null,
  }).select(CASE_COLS);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as any[];
  const page = rows.slice(0, limit).map(mapCase);
  const tail = page.at(-1);
  return {
    items: page,
    nextCursor: rows.length > limit && tail ? { at: tail.last_activity_at, id: tail.id } : null,
  };
}

/** Backwards-compatible first page for small selectors and secondary panels. */
export async function getPartnerCases(limit = 100): Promise<Case[]> {
  const page = await getPartnerCasesPage({ limit });
  return page.items;
}
