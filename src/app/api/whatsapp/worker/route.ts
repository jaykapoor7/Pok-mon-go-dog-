import { getSupabaseAdmin } from "@/lib/supabase";
import { assertCareosEnvironment } from "@/lib/whatsapp/config";
import { equalSecret } from "@/lib/whatsapp/security";
import { runWorker } from "@/lib/whatsapp/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function POST(req: Request) {
  const secret = process.env.CAREOS_WORKER_SECRET;
  if (!secret || !equalSecret(req.headers.get("authorization") || "", `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });
  try {
    assertCareosEnvironment(); const db = getSupabaseAdmin();
    if (!db) throw new Error("not_configured");
    return Response.json(await runWorker(db), { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "CareOS unavailable" }, { status: 503 }); }
}
export const GET = POST;
