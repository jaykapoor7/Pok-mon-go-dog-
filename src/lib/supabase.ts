import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

/** Only accept a well-formed http(s) URL, guards against bad/empty env values
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

/* A database outage must not leave a server render alive until Vercel's
 * five-minute function limit. This applies to every Supabase client made by
 * this module, including the server-role reader, and turns a stalled network
 * request into the existing per-route empty/error states. */
const SUPABASE_REQUEST_TIMEOUT_MS = 7_000;

async function boundedSupabaseFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    init?.signal?.removeEventListener("abort", abortFromCaller);
  }
}

/** True when valid Supabase credentials are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/**
 * Returns a Supabase client, or null when not configured / misconfigured.
 * Never throws, the data layer transparently falls back to demo data.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    try {
      client = createClient(url!, anonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Implicit flow puts the token in the URL hash, so a password-reset
          // link works
          // even when opened on a different device/browser than it was
          // requested from (PKCE needs the original browser's verifier and
          // otherwise fails with "string did not match the expected pattern").
          flowType: "implicit",
        },
        global: { fetch: boundedSupabaseFetch },
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
 * Turnstile check passes. Never import this into client components, the
 * service role key is not exposed to the browser.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  try {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: boundedSupabaseFetch },
    });
  } catch {
    return null;
  }
}
