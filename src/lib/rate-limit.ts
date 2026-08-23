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

/**
 * Sliding-window rate limit backed by Supabase (see supabase/rate-limits.sql).
 * Fails OPEN, if Supabase isn't configured or the check errors, we allow the
 * request rather than block legitimate users. Returns true = allowed.
 */
export async function allowRequest(
  bucket: string | null,
  action: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  if (!bucket) return true;
  const supa = getSupabaseAdmin();
  if (!supa) return true;
  try {
    const { data, error } = await supa.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_action: action,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true; // fail open
    return data !== false;
  } catch {
    return true;
  }
}
