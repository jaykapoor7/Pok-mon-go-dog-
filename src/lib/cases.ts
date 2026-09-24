// ─────────────────────────────────────────────────────────────
// Cases data access (read side). Live Supabase when configured; empty otherwise.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Case, CaseUpdate, CaseStatus, CaseSeverity, CaseCategory } from "./types";
import { isRecordingDemo, recordingDemoCases } from "./recording-demo";

export const CASES_LIVE = isSupabaseConfigured;

/** The columns a case row needs; never source_metadata, which carries the
    raw workbook row and would multiply what reaches the browser. */
const CASE_COLS = "id,dog_id,title,description,zone,lat,lng,severity,category,tags,status,resolution,assignee_id,assignee_name,ngo_id,created_by_id,created_by_name,created_at,updated_at,last_activity_at,due_at,resolved_at,before_url,after_url,outcome_note,proof_verified,verified_at,cost_estimate,cost_spent,species,follow_up_at,medical_notes,photos";

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
    species: r.species ?? "dog", follow_up_at: r.follow_up_at ?? null, medical_notes: r.medical_notes ?? null,
    photos: r.photos ?? [],
  };
}

export function mapUpdate(r: any): CaseUpdate {
  return { id: r.id, case_id: r.case_id, actor_id: r.actor_id ?? null, actor_name: r.actor_name ?? null,
    type: r.type, from_status: r.from_status ?? null, to_status: r.to_status ?? null, note: r.note ?? null, created_at: r.created_at };
}

async function pagedCases(query: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) break;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows;
}

/**
 * Complete case history for the signed-in organisation, plus the shared
 * unclaimed pool. The base-table read is RLS-scoped to my_ngo() and is paged,
 * so a historical register with 2,000+ cases is never silently truncated.
 * my_org_cases() is retained only to add the shared community pool; rows are
 * de-duplicated by id.
 */
export async function getPartnerCases(): Promise<Case[]> {
  if (isRecordingDemo) return recordingDemoCases;
  const supa = getSupabase();
  if (!supa) return [];

  const own = await pagedCases((from, to) => supa.from("cases").select(CASE_COLS).order("last_activity_at", { ascending: false }).range(from, to));
  const { data: shared } = await supa.rpc("my_org_cases");
  const merged = new Map<string, any>();
  for (const row of [...own, ...(shared ?? [])]) merged.set(row.id, row);
  return [...merged.values()].map(mapCase).sort((a, b) => +new Date(b.last_activity_at) - +new Date(a.last_activity_at));
}
