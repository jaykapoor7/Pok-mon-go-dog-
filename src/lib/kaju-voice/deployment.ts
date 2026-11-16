/** Shared deployment guard (see mode.mjs); no secret values are exported to the browser. */
import { voiceMode } from "./mode.mjs";

export { voiceMode, PRODUCTION_SUPABASE_URL, STAGING_SUPABASE_URL, PRODUCTION_VOICE_HOSTS } from "./mode.mjs";
export type VoiceMode = "production" | "preview" | "local";

export function voicePreviewEnabled(env: Record<string, string | undefined> = process.env) {
  return voiceMode(env) === "preview";
}
