// ─────────────────────────────────────────────────────────────
// Cases data access (read side). Mirrors lib/data.ts conventions: live
// Supabase when configured, deterministic demo data otherwise.
// ─────────────────────────────────────────────────────────────

import { getSupabase, isSupabaseConfigured } from "./supabase";
import { DEMO } from "./demo-data";
import { seededRandom } from "./utils";
import type {
  Case,
  CaseUpdate,
  CaseStatus,
  CaseSeverity,
  CaseCategory,
} from "./types";

const ALLOW_DEMO = process.env.NEXT_PUBLIC_DEMO === "1";
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
    created_by_id: r.created_by_id ?? null,
    created_by_name: r.created_by_name ?? null,
    created_at: r.created_at,
    updated_at: r.updated_at ?? r.created_at,
    last_activity_at: r.last_activity_at ?? r.created_at,
    due_at: r.due_at ?? null,
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
  return ALLOW_DEMO ? DEMO_CASES.cases : [];
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
  if (!ALLOW_DEMO) return null;
  const c = DEMO_CASES.cases.find((x) => x.id === id);
  if (!c) return null;
  return {
    case: c,
    updates: DEMO_CASES.updates
      .filter((x) => x.case_id === id)
      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)),
  };
}

// ── Deterministic demo cases (local dev only) ────────────────

const VOLUNTEERS = [
  { id: "vol-aarav", name: "Aarav Sharma" },
  { id: "vol-priya", name: "Priya Nair" },
  { id: "vol-kabir", name: "Kabir Singh" },
];
const CATS: CaseCategory[] = ["injury", "sterilisation", "rescue", "vaccination", "other"];
const SEVS: CaseSeverity[] = ["low", "normal", "high", "critical"];
const STATUSES: CaseStatus[] = ["unverified", "assigned", "in_progress", "resolved", "closed"];

function daysAgoIso(d: number) {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}

function buildDemoCases() {
  const cases: Case[] = [];
  const updates: CaseUpdate[] = [];
  const dogs = DEMO.dogs.slice(0, 14);

  dogs.forEach((dog, i) => {
    const r = (k: string) => seededRandom(`case-${dog.id}-${k}`);
    const status = STATUSES[Math.floor(r("st") * STATUSES.length)];
    const severity = SEVS[Math.floor(r("sv") * SEVS.length)];
    const category = dog.needs_help
      ? r("c") > 0.5 ? "injury" : "rescue"
      : CATS[Math.floor(r("c2") * CATS.length)];
    const assigned = status !== "unverified";
    const vol = VOLUNTEERS[Math.floor(r("v") * VOLUNTEERS.length)];
    // Some cases are intentionally stale to demo "overdue".
    const lastActivity = daysAgoIso(Math.floor(r("la") * 11));
    const createdAt = daysAgoIso(10 + Math.floor(r("ca") * 30));
    const id = `case-${i + 1}`;

    cases.push({
      id,
      dog_id: dog.id,
      title: `${category[0].toUpperCase() + category.slice(1)} — ${dog.name}`,
      description: dog.community_notes[0] ?? "Reported by the community.",
      zone: dog.zone,
      lat: dog.lat,
      lng: dog.lng,
      severity,
      category: category as CaseCategory,
      tags: dog.needs_help ? ["urgent"] : [],
      status,
      resolution: status === "resolved" ? "treated" : null,
      assignee_id: assigned ? vol.id : null,
      assignee_name: assigned ? vol.name : null,
      created_by_id: "vol-aarav",
      created_by_name: "Aarav Sharma",
      created_at: createdAt,
      updated_at: lastActivity,
      last_activity_at: lastActivity,
      due_at: null,
    });

    updates.push({
      id: `${id}-u0`,
      case_id: id,
      actor_id: "vol-aarav",
      actor_name: "Aarav Sharma",
      type: "created",
      from_status: null,
      to_status: "unverified",
      note: "Case opened",
      created_at: createdAt,
    });
    if (assigned) {
      updates.push({
        id: `${id}-u1`,
        case_id: id,
        actor_id: vol.id,
        actor_name: vol.name,
        type: "claimed",
        from_status: "unverified",
        to_status: "assigned",
        note: `${vol.name} claimed this case`,
        created_at: daysAgoIso(9 + Math.floor(r("u1") * 20)),
      });
    }
    if (status === "in_progress" || status === "resolved" || status === "closed") {
      updates.push({
        id: `${id}-u2`,
        case_id: id,
        actor_id: vol.id,
        actor_name: vol.name,
        type: "status_changed",
        from_status: "assigned",
        to_status: "in_progress",
        note: "On the ground",
        created_at: lastActivity,
      });
    }
  });

  return { cases, updates };
}

const DEMO_CASES = buildDemoCases();
