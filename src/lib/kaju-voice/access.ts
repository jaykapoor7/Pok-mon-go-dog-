import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { voiceMode } from "./deployment";
import { createBoundedSupabaseFetch } from "@/lib/bounded-supabase-fetch";

export type VoiceAccess = { actorId: string; auth: "local-test" | "supabase"; scope: { kind: "standalone" | "organisation"; id: string }; db?: SupabaseClient };
type Env = Record<string, string | undefined>;
export class VoiceError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const set = (raw?: string) => new Set((raw ?? "").split(",").map((v) => v.trim()).filter(Boolean));
const digest = (v: string) => createHash("sha256").update(v).digest();

/** Authenticate a local operator or an explicitly allowed real StrayPaw user.
 * Hosted modes (production and the staging preview) verify the caller's own
 * Supabase session and keep its caller-scoped client for the shared usage
 * ledger, whose RPCs check the database's own access list again. Organisation
 * identity, where used, is verified through the RLS-bound workspace RPC, never
 * JWT user_metadata or a client-selected role. No service role key. */
export async function voiceAccess(req: Request, env: Env = process.env, request: typeof fetch = fetch): Promise<VoiceAccess> {
  const mode = voiceMode(env);
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token.length > 8192) throw new VoiceError("Sign in to StrayPaw to use Kaju Voice.", 401);
  const org = req.headers.get("X-StrayPaw-Voice-Organisation");
  const local = env.SARVAM_VOICE_LOCAL_TOKEN?.trim();
  if (mode !== "production" && mode !== "preview" && env.NODE_ENV === "development" && !env.VERCEL && local && local.length >= 32 && timingSafeEqual(digest(local), digest(token))) {
    if (org) throw new VoiceError("Local test access cannot act for an organisation.", 403);
    return { actorId: "local-operator", auth: "local-test", scope: { kind: "standalone", id: "local-operator" } };
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim(), anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) throw new VoiceError("Sign in to StrayPaw to use Kaju Voice.", 401);
  const db = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` }, fetch: createBoundedSupabaseFetch({ request, timeoutMs: 7000 }) },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new VoiceError("Your session has expired. Sign in again.", 401);
  const userId = data.user.id;
  if (mode === "production") {
    // Live voice starts with named accounts only. Organisation and programme
    // permissions are a later, separate rollout; nothing here infers them.
    if (org) throw new VoiceError("Kaju Voice is not available for organisations yet.", 403);
    if (!set(env.SARVAM_VOICE_ALLOWED_USER_IDS).has(userId)) throw new VoiceError("Kaju Voice is not available for your account yet.", 403);
    return { actorId: userId, auth: "supabase", scope: { kind: "standalone", id: userId }, db };
  }
  if (mode === "preview") {
    const email = data.user.email?.toLowerCase();
    if (org || !data.user.email_confirmed_at || !email || !set(env.SARVAM_VOICE_ALLOWED_EMAILS?.toLowerCase()).has(email)) {
      throw new VoiceError("Kaju Voice is restricted to the approved staging tester.", 403);
    }
    return { actorId: userId, auth: "supabase", scope: { kind: "standalone", id: userId }, db };
  }
  if (org) {
    if (!set(env.SARVAM_VOICE_ALLOWED_ORG_IDS).has(org)) throw new VoiceError("Voice is not enabled for this organisation.", 403);
    const workspaces = await db.rpc("nx_my_workspaces");
    const rows: unknown = workspaces.data;
    if (workspaces.error || !Array.isArray(rows) || !rows.some((r) => r?.org_id === org && ["owner", "admin", "coordinator"].includes(r?.role))) {
      throw new VoiceError("Your organisation role does not allow voice testing.", 403);
    }
    return { actorId: userId, auth: "supabase", scope: { kind: "organisation", id: org } };
  }
  if (!set(env.SARVAM_VOICE_ALLOWED_USER_IDS).has(userId)) throw new VoiceError("Your account is not enabled for voice testing.", 403);
  return { actorId: userId, auth: "supabase", scope: { kind: "standalone", id: userId } };
}
