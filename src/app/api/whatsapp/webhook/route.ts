import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertCareosEnvironment } from "@/lib/whatsapp/config";
import { receiveWebhook, verifyWebhook } from "@/lib/whatsapp/webhook";
import { rpc, runWorker } from "@/lib/whatsapp/worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export function GET(req: Request) { return verifyWebhook(req); }
export async function POST(req: Request) {
  return receiveWebhook(req, async events => {
    assertCareosEnvironment();
    const db = getSupabaseAdmin();
    if (!db) throw new Error("database_not_configured");
    await rpc(db, "careos_enqueue", { p_events: events });
    // A scheduled drain recovers jobs if after() is interrupted or this invocation fails.
    after(async () => { try { await runWorker(db); } catch { console.error("CareOS worker deferred; scheduled retry required"); } });
  });
}
