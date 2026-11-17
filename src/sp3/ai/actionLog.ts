import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ════════════════════════════════════════════════════════════════════
   The Kaju action log (public.ai_action_log): one row for each action a
   person confirmed and for each time Kaju read patient records for them.
   Written with the person's own session, so row-level security decides,
   exactly as /api/ai/log does for confirmed actions.

   The table is supabase/migrations/20261118110000_kaju_action_log.sql
   (append-only; applied on staging and production). Where it is missing
   this answers "not_deployed". Each read of patient records is also
   written to the server's own log (one line: who, which facility, which
   register function, how many rows; never a patient detail). Opening one bite record also leaves a "read" row in the
   health register's own audit (oh_clinic_exposure), and every confirmed
   write has its own history.
   ════════════════════════════════════════════════════════════════════ */

export const LOG_KINDS = ["open_case", "add_note", "schedule_followup", "record_care", "add_task", "register_exposure", "health_read"] as const;
export type LogKind = (typeof LOG_KINDS)[number];
export type LogRow = { kind: LogKind; ok: boolean; target?: string | null; summary?: string | null; ngoId?: string | null; organisationId?: string | null; actor?: string | null };
export type LogResult = "logged" | "not_deployed" | "error";

export async function logKaju(db: Pick<SupabaseClient, "from">, row: LogRow): Promise<LogResult> {
  /* The server's own line: who read what kind of record where, never the record. */
  if (row.kind === "health_read") console.info(JSON.stringify({ kaju: "health_read", at: new Date().toISOString(), actor: row.actor ?? null, organisation: row.organisationId ?? null, target: row.target?.slice(0, 120) ?? null, ok: row.ok, summary: row.summary?.slice(0, 120) ?? null }));
  try {
    const { error } = await db.from("ai_action_log").insert({
      kind: row.kind, ok: row.ok, target: row.target?.slice(0, 200) ?? null, summary: row.summary?.slice(0, 200) ?? null,
      ngo_id: row.ngoId ?? null, ...(row.organisationId ? { organisation_id: row.organisationId } : {}),
    });
    if (!error) return "logged";
    return /does not exist|42P01|PGRST205|PGRST204|42703/.test(`${error.code ?? ""} ${error.message ?? ""}`) ? "not_deployed" : "error";
  } catch { return "error"; }
}
