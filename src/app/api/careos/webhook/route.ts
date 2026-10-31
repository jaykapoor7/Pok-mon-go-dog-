import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { toJobs, verifySignature } from "@/lib/careos/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* WhatsApp Cloud API webhook for CareOS.

   Configuration (server-only):
     WHATSAPP_VERIFY_TOKEN  the token entered in the Meta app's webhook settings
     WHATSAPP_APP_SECRET    the Meta app secret, used to check X-Hub-Signature-256
     SUPABASE_SERVICE_ROLE_KEY  already set; careos_enqueue is service-role only
   Until both WhatsApp values are set, every request is refused with 503 and
   nothing is read or stored. Status: not connected in production (no Meta
   credentials, no careos_* functions in the production database). */

const configured = () => Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim() && process.env.WHATSAPP_APP_SECRET?.trim());

/** Meta's subscription handshake. */
export async function GET(req: Request) {
  if (!configured()) return NextResponse.json({ error: "CareOS WhatsApp is not configured on this deployment." }, { status: 503 });
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN?.trim()) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/** Inbound messages and delivery statuses. */
export async function POST(req: Request) {
  if (!configured()) return NextResponse.json({ error: "CareOS WhatsApp is not configured on this deployment." }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET!.trim())) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const jobs = toJobs(body);
  if (!jobs.length) return NextResponse.json({ queued: 0 });
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: "Record store unavailable" }, { status: 503 });
  const { error } = await admin.rpc("careos_enqueue", { p_events: jobs });
  if (error) {
    const missing = ["PGRST202", "42883", "42P01"].includes(error.code ?? "");
    console.error("careos_enqueue failed", error.code, error.message);
    /* 503 makes Meta retry later instead of dropping the message. */
    return NextResponse.json({ error: missing ? "CareOS database functions are not deployed" : "Could not queue" }, { status: 503 });
  }
  return NextResponse.json({ queued: jobs.length });
}
