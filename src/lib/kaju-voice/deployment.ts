/** Shared deployment guard; no secret values are exported to the browser. */
export function voicePreviewEnabled(env: Record<string, string | undefined> = process.env) {
  const branch = env.SARVAM_VOICE_PREVIEW_BRANCH?.trim();
  return env.VERCEL_ENV === "preview" && env.SARVAM_VOICE_ENABLED === "true"
    && !!branch && env.VERCEL_GIT_COMMIT_REF === branch
    && env.NEXT_PUBLIC_SUPABASE_URL === "https://ucxfxiddufwqithtdtix.supabase.co";
}
