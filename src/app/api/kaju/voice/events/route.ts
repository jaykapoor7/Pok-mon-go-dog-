import { NextResponse } from "next/server";
import { VoiceError, voiceAccess } from "@/lib/kaju-voice/access";
import { isVoiceRequest, voiceTestEnabled } from "@/lib/kaju-voice/server";
import { usageForVoiceAccess } from "@/lib/kaju-voice/usage";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  if (!voiceTestEnabled() || !isVoiceRequest(req)) return fail("Voice test is unavailable.", 403);
  try {
    const access = await voiceAccess(req);
    const raw = await req.text();
    if (raw.length > 2048) return fail("Invalid voice event.", 400);
    let data: Record<string, unknown>;
    try { data = JSON.parse(raw); } catch { return fail("Invalid voice event.", 400); }
    if (!data || typeof data.referenceId !== "string" || data.referenceId.length > 256 || !data.referenceId
      || !["client_connected", "client_ended"].includes(data.event as string)) return fail("Invalid voice event.", 400);
    await usageForVoiceAccess(access).report(access, data.referenceId, data.event as "client_connected" | "client_ended", {
      audioSent: data.audioSent === true, audioReceived: data.audioReceived === true, interrupted: data.interrupted === true,
    });
    return NextResponse.json({ ok: true }, { headers });
  } catch (err) {
    return fail(err instanceof VoiceError ? err.message : "Voice event could not be recorded.", err instanceof VoiceError ? err.status : 503);
  }
}
