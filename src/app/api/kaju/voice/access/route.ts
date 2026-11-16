import { NextResponse } from "next/server";
import { isVoiceRequest, settingsForVoiceAccess, voiceEnabled } from "@/lib/kaju-voice/server";
import { voiceAccess } from "@/lib/kaju-voice/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether the signed-in caller may start Kaju Voice, so the Kaju entry is
 * shown only to people it will work for. Always 200 with a boolean: it says
 * nothing about why, and nothing about anyone else. No provider call. */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const unavailable = () => NextResponse.json({ available: false }, { headers });
  if (!voiceEnabled() || !isVoiceRequest(req)) return unavailable();
  try {
    const access = await voiceAccess(req);
    return NextResponse.json({ available: !("missing" in settingsForVoiceAccess(access)) }, { headers });
  } catch { return unavailable(); }
}
