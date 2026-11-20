import { getSupabaseAdmin } from "@/lib/supabase";

/** Pull the caller's IP from the usual proxy headers. */
export function clientIp(req: Request): string | null {
  return (
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

/** What the limiter says: within the budget, over it, or unable to tell (no caller address, no server key, or the
    counter failed). Callers refuse in both of the last two cases; they only tell the person different things. */
export type Limit = "ok" | "limited" | "unavailable";

/**
 * Sliding-window rate limit backed by Supabase (see supabase/rate-limits.sql).
 * Fails closed when identity, configuration or the counter is unavailable.
 * Only an explicit database true permits the protected operation.
 */
export async function rateLimit(bucket: string | null, action: string, max: number, windowSeconds: number): Promise<Limit> {
  if (!bucket?.trim()) return "unavailable";
  const supa = getSupabaseAdmin();
  if (!supa) return "unavailable";
  try {
    const { data, error } = await supa.rpc("check_rate_limit", { p_bucket: bucket, p_action: action, p_max: max, p_window_seconds: windowSeconds });
    if (error) return "unavailable";
    return data === true ? "ok" : "limited";
  } catch {
    return "unavailable";
  }
}

/** The same, as yes or no: anything but an explicit "within the budget" is no. */
export async function allowRequest(bucket: string | null, action: string, max: number, windowSeconds: number): Promise<boolean> {
  return (await rateLimit(bucket, action, max, windowSeconds)) === "ok";
}

/** The DB binds this budget to the verified session's auth.uid(). */
export async function allowUserRequest(db: import("@supabase/supabase-js").SupabaseClient, action: string): Promise<boolean> {
  try { const { data, error } = await db.rpc("check_own_rate_limit", { p_action: action }); return !error && data === true; }
  catch { return false; }
}
