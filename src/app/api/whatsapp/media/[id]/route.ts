import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertCareosEnvironment } from "@/lib/whatsapp/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const token = req.headers.get("authorization");
  if (!token?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
  try {
    assertCareosEnvironment();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const caller = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: token } } });
    const { data, error } = await caller.rpc("careos_media_path", { p_id: (await context.params).id });
    if (error || !data) return new Response("Not found", { status: 404 });
    const admin = getSupabaseAdmin();
    if (!admin) throw new Error("not_configured");
    const signed = await admin.storage.from("careos-private").createSignedUrl(data, 60);
    if (signed.error || !signed.data) throw new Error("storage_unavailable");
    return Response.json({ url: signed.data.signedUrl }, { headers: { "Cache-Control": "private, no-store", "Vary": "Authorization" } });
  } catch { return new Response("Unavailable", { status: 503 }); }
}
