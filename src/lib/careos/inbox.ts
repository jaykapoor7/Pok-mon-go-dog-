import { getSupabase } from "@/lib/supabase";
import { CAREOS_RPC, type CareInboxAction, type CareInboxItem, type CareInboxStatus, type CareOsResult, type ReporterNotice } from "./contract";

/* The workspace's only door to the WhatsApp backend. If the backend's RPCs
   are not deployed yet, PostgREST answers PGRST202 (no such function) or
   42883; that is reported as "not_deployed", never as an empty inbox, so the
   UI can say "WhatsApp is not connected yet" instead of "nothing waiting". */

const MISSING = new Set(["PGRST202", "42883", "42P01"]);

function fail(error: { code?: string; message?: string } | null): CareOsResult<never> {
  if (error?.code && MISSING.has(error.code)) return { connected: false, reason: "not_deployed" };
  return { connected: false, reason: "error", detail: error?.message };
}

export async function careInbox(status?: CareInboxStatus[]): Promise<CareOsResult<CareInboxItem[]>> {
  const supa = getSupabase();
  if (!supa) return { connected: false, reason: "error", detail: "Record store unavailable" };
  const { data, error } = await supa.rpc(CAREOS_RPC.list, { p_status: status ?? null, p_limit: 200, p_offset: 0 });
  if (error) return fail(error);
  return { connected: true, data: Array.isArray(data) ? (data as CareInboxItem[]) : [] };
}

export async function careInboxAct(action: CareInboxAction): Promise<CareOsResult<CareInboxItem>> {
  const supa = getSupabase();
  if (!supa) return { connected: false, reason: "error", detail: "Record store unavailable" };
  const { data, error } = await supa.rpc(CAREOS_RPC.act, { p_action: action });
  if (error) return fail(error);
  return { connected: true, data: data as CareInboxItem };
}

export async function notifyReporter(caseId: string, notice: ReporterNotice): Promise<CareOsResult<{ queued: boolean }>> {
  const supa = getSupabase();
  if (!supa) return { connected: false, reason: "error", detail: "Record store unavailable" };
  const { data, error } = await supa.rpc(CAREOS_RPC.notify, { p_case_id: caseId, p_notice: notice });
  if (error) return fail(error);
  return { connected: true, data: (data as { queued: boolean }) ?? { queued: false } };
}

export async function careOsHealth(): Promise<CareOsResult<{ connected: boolean; number_verified: boolean }>> {
  const supa = getSupabase();
  if (!supa) return { connected: false, reason: "error", detail: "Record store unavailable" };
  const { data, error } = await supa.rpc(CAREOS_RPC.health);
  if (error) return fail(error);
  return { connected: true, data: data as { connected: boolean; number_verified: boolean } };
}
