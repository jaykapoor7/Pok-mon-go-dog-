import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isVoiceRequest, settingsForVoiceAccess, voiceTestEnabled } from "@/lib/kaju-voice/server";
import { voiceAccess, VoiceError } from "@/lib/kaju-voice/access";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!voiceTestEnabled() || !isVoiceRequest(req)) return NextResponse.json({ error: "Voice test is unavailable." }, { status: 403, headers });
  try {
    const access = await voiceAccess(req);
    const settings = settingsForVoiceAccess(access);
    if ("missing" in settings) return NextResponse.json({ error: "Voice Agents settings are incomplete. Check the server configuration." }, { status: 503, headers });
    return NextResponse.json({ ...settings.config, user_identifier: `voice-${randomUUID()}`, scope: access.scope }, { headers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof VoiceError ? err.message : "Voice access could not be checked." }, { status: err instanceof VoiceError ? err.status : 503, headers });
  }
}
