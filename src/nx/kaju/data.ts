"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Vocab } from "./intent";

/* What Kaju's screens read. Every read goes through the person's own session, so row-level security decides. */

/** Names the composer may recognise: this organisation's places, teams, channels and people. */
export function useKajuVocab(orgId: string | null, workspace: string | null): Vocab {
  const [v, setV] = useState<Vocab>({ places: [], teams: [], channels: [], people: [] });
  useEffect(() => {
    const db = getSupabase(); if (!db || !orgId) return;
    let alive = true;
    void Promise.all([
      workspace === "ngo" ? db.from("cases").select("zone,assignee_name").eq("ngo_id", orgId).is("resolved_at", null).limit(500) : Promise.resolve({ data: [] }),
      db.from("nx_channels").select("name").eq("org_id", orgId).in("kind", ["channel", "announcement"]).limit(100),
      db.rpc("nx_org_people", { p_org: orgId }),
    ]).then(([c, ch, pp]) => {
      if (!alive) return;
      const rows = (c.data ?? []) as { zone: string | null; assignee_name: string | null }[];
      const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x && x.trim().length > 1).map((x) => x.trim()))].sort();
      setV({
        places: uniq(rows.map((r) => r.zone)), teams: uniq(rows.map((r) => r.assignee_name)),
        channels: ((ch.data ?? []) as { name: string }[]).map((x) => x.name),
        people: ((pp.data ?? []) as { user_id: string; name: string }[]).filter((p) => p.name && p.name !== "A colleague").map((p) => ({ id: p.user_id, name: p.name })),
      });
    });
    return () => { alive = false; };
  }, [orgId, workspace]);
  return v;
}

export type StepRow = { id: string; position: number; label: string; tool: string | null; state: string; level: number | null; why: string | null; attempts: number; max_attempts: number; next_attempt_at: string | null; started_at: string | null; finished_at: string | null; error: string | null; result: Record<string, unknown> | null; input: Record<string, unknown>; approved_at: string | null; note: string | null };
export type MissionRow = { id: string; org_id: string; title: string; state: string; source: string; created_at: string; updated_at: string; error: string | null; deadline: string | null; request: Record<string, unknown>; nx_mission_steps: StepRow[] };
export type EventRow = { id: number; step_id: string | null; at: string; kind: string; message: string; data: Record<string, unknown> | null };

const MISSION = "id,org_id,title,state,source,created_at,updated_at,error,deadline,request,nx_mission_steps(id,position,label,tool,state,level,why,attempts,max_attempts,next_attempt_at,started_at,finished_at,error,result,input,approved_at,note)";
/** The person's own missions, newest first. Polls gently while any is running or retrying. */
export function useMissionList(orgId: string | null) {
  const [rows, setRows] = useState<MissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  useEffect(() => {
    const db = getSupabase(); if (!db) return;
    let alive = true;
    let q = db.from("nx_missions").select(MISSION).order("created_at", { ascending: false }).limit(100);
    if (orgId) q = q.eq("org_id", orgId);
    void q.then(({ data, error: e }) => { if (!alive) return; if (e) setError(e.message); else { setError(null); setRows((data ?? []) as unknown as MissionRow[]); } });
    return () => { alive = false; };
  }, [orgId, tick]);
  const active = (rows ?? []).some((m) => ["ready", "running", "retrying"].includes(m.state));
  useEffect(() => { if (!active) return; const t = window.setInterval(reload, 4000); return () => window.clearInterval(t); }, [active, reload]);
  return { rows, error, reload };
}

export function useMissionEvents(missionId: string | null, tick: unknown) {
  const [rows, setRows] = useState<EventRow[] | null>(null);
  useEffect(() => {
    const db = getSupabase(); if (!db || !missionId) { setRows(null); return; }
    let alive = true;
    void db.from("nx_mission_events").select("id,step_id,at,kind,message,data").eq("mission_id", missionId).order("id").limit(300).then(({ data }) => { if (alive) setRows((data ?? []) as EventRow[]); });
    return () => { alive = false; };
  }, [missionId, tick]);
  return rows;
}

export const decideStep = async (step: string, decision: "approve" | "reject" | "done", input?: Record<string, unknown> | null, note?: string | null) =>
  await getSupabase()!.rpc("nx_mission_decide", { p_step: step, p_decision: decision, p_input: input ?? null, p_note: note ?? null });
export const retryMission = async (id: string) => await getSupabase()!.rpc("nx_mission_retry", { p_mission: id });
export const cancelMission = async (id: string) => await getSupabase()!.rpc("nx_mission_cancel", { p_mission: id });
/** Run what is due now, while the person is here. The scheduler runs it anyway when they are not. */
export const runMine = async () => await getSupabase()!.rpc("nx_mission_run_mine");

export type Prefs = { predictive: boolean; autonomy_cap: number };
/** The person's own limits on Kaju. Missing row means the defaults: understanding on, low-risk steps run on their own. */
export function useKajuPrefs() {
  const [p, setP] = useState<Prefs>({ predictive: true, autonomy_cap: 2 });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const db = getSupabase(); if (!db) return;
    let alive = true;
    void db.from("nx_kaju_prefs").select("predictive,autonomy_cap").maybeSingle().then(({ data }) => { if (alive && data) setP(data as Prefs); });
    return () => { alive = false; };
  }, [tick]);
  const save = useCallback(async (next: Prefs) => {
    const db = getSupabase()!; const uid = (await db.auth.getUser()).data.user?.id;
    const r = await db.from("nx_kaju_prefs").upsert({ user_id: uid, ...next, updated_at: new Date().toISOString() });
    if (!r.error) { setP(next); setTick((n) => n + 1); }
    return r;
  }, []);
  return { prefs: p, save };
}
