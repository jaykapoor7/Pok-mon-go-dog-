import { NextResponse } from "next/server";
import { clientIp } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isVoiceRequest, publicVoiceSettings } from "@/lib/kaju-voice/server";
import { VoiceError, voiceAccess } from "@/lib/kaju-voice/access";
import { mintPublicToken, publicVoiceMode, verifyHuman, withinPublicLimits } from "@/lib/kaju-voice/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Starts one public conversation: consent, a bot check and limits, then a
 * ledger row and a short-lived token that can sign exactly one provider
 * session. In "owner" mode only an allowlisted signed-in account may start. */
export async function POST(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  const mode = publicVoiceMode();
  if (mode === "off" || !isVoiceRequest(req)) return fail("Kaju Voice is not available.", 403);
  let body: { consent?: unknown; turnstile?: unknown };
  try { const raw = await req.text(); if (raw.length > 4096) return fail("Start again.", 400); body = JSON.parse(raw); } catch { return fail("Start again.", 400); }
  if (body?.consent !== true) return fail("Tick the box to agree before you start.", 400);
  const settings = publicVoiceSettings();
  if ("missing" in settings) return fail("Kaju Voice is not available right now.", 503);
  try {
    if (mode === "owner") {
      const owner = await voiceAccess(req);
      if (owner.auth !== "supabase") return fail("Kaju Voice is not open to the public yet.", 403);
    }
    const ip = clientIp(req);
    if (!await verifyHuman(body.turnstile, ip)) return fail("The check did not complete. Try it again, then press Start talking.", 403);
    if (!await withinPublicLimits(ip)) return fail("Kaju is busy right now. Try again in a few minutes.", 429);
    const admin = getSupabaseAdmin();
    if (!admin) return fail("Kaju Voice is not available right now.", 503);
    const { data, error } = await admin.rpc("kaju_voice_public_reserve", { p_version: settings.config.version });
    if (error || typeof data !== "string") return error?.message?.includes("VOICE_LIMIT") ? fail("Kaju is busy right now. Try again later today.", 429) : fail("Kaju Voice is not available right now.", 503);
    return NextResponse.json({ token: mintPublicToken(data) }, { headers });
  } catch (err) {
    if (err instanceof VoiceError) return fail(mode === "owner" && err.status === 401 ? "Sign in to StrayPaw to try Kaju Voice before it opens to everyone." : err.message, err.status);
    return fail("Kaju Voice is not available right now.", 503);
  }
}
