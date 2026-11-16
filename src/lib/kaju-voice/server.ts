import "server-only";
import { randomUUID } from "node:crypto";
import { VOICE_LANGUAGES, type VoiceTestConfig } from "./shared";
import type { VoiceAccess } from "./access";
import { PRODUCTION_VOICE_HOSTS, voiceMode } from "./deployment";

const REQUIRED = ["SARVAM_VOICE_API_KEY", "SARVAM_VOICE_ORG_ID", "SARVAM_VOICE_WORKSPACE_ID", "SARVAM_VOICE_APP_ID", "SARVAM_VOICE_VERSION"] as const;
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

/** Voice runs only where voiceMode() names a mode: production on its own
 * database and domains, the assigned preview branch on staging, or next dev.
 * Everywhere else every voice route fails closed. */
export function voiceEnabled(env: Record<string, string | undefined> = process.env) {
  return voiceMode(env) !== null;
}

export function readVoiceSettings(env: Record<string, string | undefined> = process.env): { config: VoiceTestConfig; apiKey: string } | { missing: string[] } {
  const missing: string[] = REQUIRED.filter((name) => !env[name]?.trim());
  for (const name of REQUIRED.slice(1, 4)) {
    if (env[name]?.trim() && !ID.test(env[name]!.trim())) missing.push(name);
  }
  const rawVersion = env.SARVAM_VOICE_VERSION?.trim() ?? "";
  const version = Number(rawVersion);
  if (rawVersion && (!/^\d+$/.test(rawVersion) || !Number.isSafeInteger(version) || version < 1)) missing.push("SARVAM_VOICE_VERSION");
  if (missing.length) return { missing };
  return {
    apiKey: env.SARVAM_VOICE_API_KEY!.trim(),
    config: {
      org_id: env.SARVAM_VOICE_ORG_ID!.trim(), workspace_id: env.SARVAM_VOICE_WORKSPACE_ID!.trim(),
      app_id: env.SARVAM_VOICE_APP_ID!.trim(), version, languages: [...VOICE_LANGUAGES],
    },
  };
}

/** The public agent: its own Samvaad app and committed version, never the
 * staff agent by default. Same organisation, workspace and server key. */
export function publicVoiceSettings(env: Record<string, string | undefined> = process.env): { config: VoiceTestConfig; apiKey: string } | { missing: string[] } {
  const settings = readVoiceSettings(env);
  if ("missing" in settings) return settings;
  const app = env.SARVAM_VOICE_PUBLIC_APP_ID?.trim() ?? "", raw = env.SARVAM_VOICE_PUBLIC_VERSION?.trim() ?? "", version = Number(raw);
  if (!ID.test(app) || !/^\d+$/.test(raw) || !Number.isSafeInteger(version) || version < 1) return { missing: ["SARVAM_VOICE_PUBLIC_APP_ID", "SARVAM_VOICE_PUBLIC_VERSION"] };
  return { apiKey: settings.apiKey, config: { ...settings.config, app_id: app, version } };
}

/** Explicit per-organisation agent assignment; no cross-tenant fallback. */
export function settingsForVoiceAccess(access: VoiceAccess, env: Record<string, string | undefined> = process.env) {
  const settings = readVoiceSettings(env);
  if ("missing" in settings) return settings;
  if (access.scope.kind === "public") return publicVoiceSettings(env);
  if (access.scope.kind === "standalone") return settings;
  try {
    const assignments = JSON.parse(env.SARVAM_VOICE_ORG_AGENTS ?? "{}");
    const assigned = assignments[access.scope.id];
    if (!assigned || typeof assigned.app_id !== "string" || !ID.test(assigned.app_id)
      || !Number.isSafeInteger(assigned.version) || assigned.version < 1) throw Error("Missing assignment");
    return { apiKey: settings.apiKey, config: { ...settings.config, app_id: assigned.app_id, version: assigned.version } };
  } catch { return { missing: ["SARVAM_VOICE_ORG_AGENTS"] }; }
}

/** Custom header prevents simple cross-origin requests; Host + Origin prevent
 * DNS rebinding. Bind the dev server to 127.0.0.1, never a public interface. */
export function isLocalVoiceRequest(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("host");
  if (!host || host !== url.host || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return false;
  if (req.headers.get("X-StrayPaw-Voice-Test") !== "1") return false;
  const origin = req.headers.get("origin");
  if (origin && origin !== url.origin) return false;
  const site = req.headers.get("sec-fetch-site");
  return !site || site === "same-origin";
}

/** Same-origin HTTPS only: production custom domains, or the assigned
 * preview's own deployment hosts. The Host header is what Vercel routed on.
 * The bearer token (never a cookie) is the real authority; these checks keep
 * other sites and other deployments from driving the endpoints at all. */
export function isVoiceRequest(req: Request, env: Record<string, string | undefined> = process.env) {
  const mode = voiceMode(env);
  if (!mode) return false;
  if (mode === "local") return isLocalVoiceRequest(req);
  const host = req.headers.get("host") ?? "";
  const hosts: readonly string[] = mode === "production" ? PRODUCTION_VOICE_HOSTS : [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter((h): h is string => !!h);
  if (!hosts.includes(host)) return false;
  const protocol = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(/:$/, "");
  if (protocol !== "https") return false;
  if (req.headers.get("X-StrayPaw-Voice-Test") !== "1") return false;
  const origin = req.headers.get("origin"), site = req.headers.get("sec-fetch-site");
  return (!origin || origin === `https://${host}`) && (!site || site === "same-origin");
}

export async function issueVoiceSession(config: VoiceTestConfig, apiKey: string, fetcher: typeof fetch = fetch, env: Record<string, string | undefined> = process.env) {
  const requestId = randomUUID();
  const mode = voiceMode(env) ?? "off";
  // Only this fixed API and server-selected agent/version can receive the key.
  const url = new URL(`https://apps.sarvam.ai/api/app-runtime/orgs/${config.org_id}/workspaces/${config.workspace_id}/apps/${config.app_id}/url`);
  url.searchParams.set("interaction_type", "call");
  url.searchParams.set("version", String(config.version));
  // A short, fixed reason for the logs: an HTTP status or a category, never a
  // provider body, key, signed URL, audio or transcript.
  let reason = "network";
  try {
    const upstream = await fetcher(url, {
      headers: { "X-API-Key": apiKey, Accept: "application/json" },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!upstream.ok) { reason = `provider_${upstream.status}`; throw new Error("Provider refused the session"); }
    reason = "invalid_response";
    const data: unknown = await upstream.json();
    if (!data || typeof data !== "object" || !("url" in data) || !("reference_id" in data)
      || typeof data.url !== "string" || typeof data.reference_id !== "string" || !data.reference_id || data.reference_id.length > 256) throw new Error("Invalid session");
    reason = "invalid_host";
    const socket = new URL(data.url);
    if (socket.protocol !== "wss:" || socket.username || socket.password || socket.port
      || !(socket.hostname === "sarvam.ai" || socket.hostname.endsWith(".sarvam.ai"))) throw new Error("Invalid voice host");
    // No keys, signed URLs, raw errors, audio or transcripts in application logs.
    console.info("kaju_voice_session", { requestId, mode, version: config.version, outcome: "issued" });
    return { url: data.url, reference_id: data.reference_id };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") reason = "timeout";
    console.info("kaju_voice_session", { requestId, mode, version: config.version, outcome: "failed", reason });
    throw new Error("Kaju Voice could not connect.");
  }
}
