import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isVoiceRequest, settingsForVoiceAccess, voiceEnabled } from "@/lib/kaju-voice/server";
import { voiceAccess, VoiceError } from "@/lib/kaju-voice/access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!voiceEnabled() || !isVoiceRequest(req)) return NextResponse.json({ error: "Kaju Voice is not available." }, { status: 403, headers });
  try {
    const access = await voiceAccess(req);
    const settings = settingsForVoiceAccess(access);
    if ("missing" in settings) return NextResponse.json({ error: "Kaju Voice is not available right now." }, { status: 503, headers });
    return NextResponse.json({ ...settings.config, user_identifier: `voice-${randomUUID()}`, scope: access.scope }, { headers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof VoiceError ? err.message : "Kaju Voice is not available right now. Try again in a moment." }, { status: err instanceof VoiceError ? err.status : 503, headers });
  }
}
