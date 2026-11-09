import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";

/* Who is asking for an organisation report, and the client to read it with.

   With the server key (production) the routes read with it, scoped to the
   caller's organisation, as before. Without it (previews and the public demo,
   which never hold the key) the same routes read under the caller's own
   session, so row-level security decides what is included: never more than
   the person can already see in the app. */
export async function partnerActor(request: Request): Promise<{ admin: SupabaseClient; ngoId: string; scoped: boolean } | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: identity } = await admin.auth.getUser(token);
    if (!identity.user) return null;
    const { data: member } = await admin.from("ngo_members").select("ngo_id").eq("user_id", identity.user.id).maybeSingle();
    return member?.ngo_id ? { admin, ngoId: member.ngo_id as string, scoped: false } : null;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: identity } = await db.auth.getUser(token);
  if (!identity.user) return null;
  const { data: ngoId, error } = await db.rpc("my_ngo");
  return !error && typeof ngoId === "string" && ngoId ? { admin: db, ngoId, scoped: true } : null;
}
