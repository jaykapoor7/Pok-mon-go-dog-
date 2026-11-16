/* Where Kaju Voice may run. The one guard shared by next.config.mjs (the
   microphone Permissions-Policy, decided at build time) and the server routes.
   Each hosted mode is pinned to its own database, so production can never use
   staging records and a preview can never use production records. Reads no
   secret values and exports none to the browser. */

export const PRODUCTION_SUPABASE_URL = "https://toujthlzjmhmoyykmayx.supabase.co";
export const STAGING_SUPABASE_URL = "https://ucxfxiddufwqithtdtix.supabase.co";
/** Production custom domains. Legacy hosts redirect to www.straypaw.org first. */
export const PRODUCTION_VOICE_HOSTS = Object.freeze(["www.straypaw.org", "straypaw.org"]);

/**
 * @param {Record<string, string | undefined>} [env]
 * @returns {"production" | "preview" | "local" | null}
 */
export function voiceMode(env = process.env) {
  if (env.SARVAM_VOICE_ENABLED !== "true") return null;
  const db = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if (env.VERCEL_ENV === "production") return db === PRODUCTION_SUPABASE_URL ? "production" : null;
  if (env.VERCEL_ENV === "preview") {
    const branch = env.SARVAM_VOICE_PREVIEW_BRANCH?.trim();
    return branch && env.VERCEL_GIT_COMMIT_REF === branch && db === STAGING_SUPABASE_URL ? "preview" : null;
  }
  return env.NODE_ENV === "development" && !env.VERCEL ? "local" : null;
}

/** The public page (/talk) and its microphone permission: owner or on, never off. */
export function publicVoicePage(env = process.env) {
  const v = env.SARVAM_VOICE_PUBLIC?.trim();
  return !!voiceMode(env) && (v === "owner" || v === "on");
}
