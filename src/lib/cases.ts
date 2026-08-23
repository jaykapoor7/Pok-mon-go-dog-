// ─────────────────────────────────────────────────────────────
// Cases data access (read side). Live Supabase when configured; empty otherwise.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  Case,
  CaseUpdate,
  CaseStatus,
  CaseSeverity,
  CaseCategory,
} from "./types";

export const CASES_LIVE = isSupabaseConfigured;

function mapCase(r: any): Case {
  return {
    id: r.id,
    dog_id: r.dog_id ?? null,
    title: r.title,
    description: r.description ?? null,
    zone: r.zone ?? null,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    severity: (r.severity ?? "normal") as CaseSeverity,
    category: (r.category ?? "other") as CaseCategory,
    tags: r.tags ?? [],
    status: (r.status ?? "unverified") as CaseStatus,
    resolution: r.resolution ?? null,
    assignee_id: r.assignee_id ?? null,
    assignee_name: r.assignee_name ?? null,
    ngo_id: r.ngo_id ?? null,
    created_by_id: r.created_by_id ?? null,
    created_by_name: r.created_by_name ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.created_at,
    last_activity_at: r.last_activity_at ?? r.created_at,
    due_at: r.due_at ?? null,
    resolved_at: r.resolved_at ?? null,
    before_url: r.before_url ?? null,
    after_url: r.after_url ?? null,
    outcome_note: r.outcome_note ?? null,
    proof_verified: r.proof_verified ?? false,
    verified_at: r.verified_at ?? null,
    cost_estimate: r.cost_estimate ?? null,
    cost_spent: r.cost_spent ?? null,
    species: r.species ?? "dog",
    follow_up_at: r.follow_up_at ?? null,
    medical_notes: r.medical_notes ?? null,
    photos: r.photos ?? [],
  };
}

function mapUpdate(r: any): CaseUpdate {
  return {
    id: r.id,
    case_id: r.case_id,
    actor_id: r.actor_id ?? null,
    actor_name: r.actor_name ?? null,
    type: r.type,
    from_status: r.from_status ?? null,
    to_status: r.to_status ?? null,
    note: r.note ?? null,
    created_at: r.created_at,
  };
}

export async function getCases(): Promise<Case[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("cases")
      .select("*")
      .order("last_activity_at", { ascending: false })
      .limit(500);
    if (data) return data.map(mapCase);
  }
  return [];
}

/**
 * Cases scoped to the signed-in partner's org — their own claimed cases plus
 * the shared pool of unclaimed community reports. Runs client-side with the
 * authenticated session (my_org_cases uses my_ngo()), so each NGO sees only
 * their own data. Falls back to the shared list on older DBs without the RPC.
 */
export async function getPartnerCases(): Promise<Case[]> {
  const supa = getSupabase();
  if (!supa) return [];
  const { data, error } = await supa.rpc("my_org_cases");
  if (error) return getCases(); // RPC not deployed yet → shared list
  return (data ?? []).map(mapCase);
}

export async function getCasesForDog(dogId: string): Promise<Case[]> {
  const supa = getSupabase();
  if (supa) {
    const { data } = await supa
      .from("cases")
      .select("*")
      .eq("dog_id", dogId)
      .order("last_activity_at", { ascending: false });
    if (data) return data.map(mapCase);
  }
  return [];
}

export async function getCaseById(
  id: string
): Promise<{ case: Case; updates: CaseUpdate[] } | null> {
  const supa = getSupabase();
  if (supa) {
    const [{ data: c }, { data: u }] = await Promise.all([
      supa.from("cases").select("*").eq("id", id).single(),
      supa
        .from("case_updates")
        .select("*")
        .eq("case_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (!c) return null;
    return { case: mapCase(c), updates: (u ?? []).map(mapUpdate) };
  }
  return null;
}

