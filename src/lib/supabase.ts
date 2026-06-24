import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Only accept a well-formed http(s) URL — guards against bad/empty env values
 *  that would otherwise crash createClient (and the build). */
function validUrl(u?: string): string | null {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

const url = validUrl(rawUrl);

/** True when valid Supabase credentials are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Returns a Supabase client, or null when not configured / misconfigured.
 * Never throws — the data layer transparently falls back to demo data.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    try {
      client = createClient(url!, anonKey!, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
    } catch {
      return null;
    }
  }
  return client;
}

/**
 * Server-only client using the service role key. Used by the protected
 * /api/report route so writes happen with elevated privileges after the
 * Turnstile check passes. Never import this into client components — the
 * service role key is not exposed to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}
