"use client";

import { getSupabase } from "@/lib/supabase";

/* A write's answer, as the server gave it. Nothing is reported as saved
   before the server confirms it; a second press of the same action while
   one is in flight is refused here, not sent twice. */
export type Receipt = { ok: true; at: string; what: string } | { ok: false; error: string };

const inflight = new Set<string>();
export async function run(key: string, what: string, fn: () => Promise<boolean | { ok: boolean; error?: string } | string | null | void>): Promise<Receipt> {
  if (!getSupabase()) return { ok: false, error: "Not connected to the record. Nothing was saved." };
  if (inflight.has(key)) return { ok: false, error: "Already sending this. Wait for the answer." };
  inflight.add(key);
  try {
    const r = await fn();
    const ok = r === true || r === undefined || (typeof r === "string" && r.length > 0) || (typeof r === "object" && r !== null && r.ok);
    if (!ok) return { ok: false, error: typeof r === "object" && r && "error" in r && r.error ? r.error : "The record did not accept this. Nothing was changed." };
    return { ok: true, at: new Date().toISOString(), what };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, error: /jwt|auth|permission|not allowed|denied|42501/i.test(m) ? "The record refused this for your account. Sign in again, or ask the organisation that holds it." : m || "The record could not be reached. Nothing was changed." };
  } finally {
    inflight.delete(key);
  }
}
