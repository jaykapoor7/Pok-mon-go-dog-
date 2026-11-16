import { NextResponse } from "next/server";
import { isVoiceRequest, issueVoiceSession, settingsForVoiceAccess, voiceEnabled } from "@/lib/kaju-voice/server";
import { VoiceError, voiceAccess } from "@/lib/kaju-voice/access";
import { usageForVoiceAccess } from "@/lib/kaju-voice/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ orgId: string; workspaceId: string; appId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  if (!voiceEnabled() || !isVoiceRequest(req)) return reply("Kaju Voice is not available.", 403);
  try {
  const access = await voiceAccess(req);
  const settings = settingsForVoiceAccess(access);
  if ("missing" in settings) return reply("Kaju Voice is not available right now.", 503);
  const { config, apiKey } = settings;
  const params = await ctx.params;
  const query = new URL(req.url).searchParams;
  if (params.orgId !== config.org_id || params.workspaceId !== config.workspace_id || params.appId !== config.app_id
    || query.get("interaction_type") !== "call" || query.get("version") !== String(config.version)
    || query.getAll("interaction_type").length !== 1 || query.getAll("version").length !== 1
    || [...query.keys()].some((key) => !["interaction_type", "version"].includes(key))) return reply("That voice session is not allowed.", 403);
  const voiceUsage = usageForVoiceAccess(access);
  const grantId = await voiceUsage.reserve(access, config.version);
  try {
    const session = await issueVoiceSession(config, apiKey);
    await voiceUsage.issued(access, grantId, session.reference_id);
    return NextResponse.json(session, { headers });
  } catch {
    await voiceUsage.failed(access, grantId);
    return reply("Kaju Voice could not connect. Try again in a moment.", 502);
  }
  } catch (err) {
    return reply(err instanceof VoiceError ? err.message : "Kaju Voice is not available right now. Try again in a moment.", err instanceof VoiceError ? err.status : 503);
  }
}
