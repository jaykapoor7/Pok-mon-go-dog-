import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { allowRequest } from "@/lib/rate-limit";
import { voiceMode } from "./deployment";

/* Public browser voice: no StrayPaw account. Everything that makes that safe
   lives here and fails closed.

   SARVAM_VOICE_PUBLIC   off (default) | owner | on
     owner  the public page and its whole anonymous path (consent, bot check,
            limits, public session token, public agent) run, but a session is
            only minted for an allowlisted signed-in account: the owner can
            verify the real public path on the live site before anyone else.
     on     anyone may start, within the limits below.
   SARVAM_VOICE_PUBLIC_APP_ID / _VERSION
            the public agent. Never the staff agent by default: what Kaju may
            say to the public is its own Samvaad prompt and version.

   A public caller gets no tools, no records and no StrayPaw identity: only a
   short-lived session token, bound to one ledger row, that can sign one
   provider session and report how it ended. */

type Env = Record<string, string | undefined>;
export type PublicVoiceMode = "off" | "owner" | "on";

export function publicVoiceMode(env: Env = process.env): PublicVoiceMode {
  if (!voiceMode(env)) return "off";
  const v = env.SARVAM_VOICE_PUBLIC?.trim();
  return v === "on" || v === "owner" ? v : "off";
}

/** Turnstile is required for the public path: with no secret nothing starts. */
export async function verifyHuman(token: unknown, ip: string | null, env: Env = process.env, request: typeof fetch = fetch) {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || typeof token !== "string" || !token || token.length > 2048) return false;
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form, signal: AbortSignal.timeout(8000), cache: "no-store" });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch { return false; }
}

/** Per device (IP) and for the whole site. Fails closed without a counter. */
export async function withinPublicLimits(ip: string | null, env: Env = process.env, allow: typeof allowRequest = allowRequest) {
  if (!ip) return false;
  const daily = Number(env.SARVAM_VOICE_PUBLIC_DAILY_CAP ?? 200);
  const cap = Number.isSafeInteger(daily) && daily > 0 && daily <= 5000 ? daily : 200;
  return await allow(ip, "kaju-voice-public-10m", 3, 600)
    && await allow(ip, "kaju-voice-public-day", 10, 86_400)
    && await allow("all", "kaju-voice-public-all", cap, 86_400);
}

const PREFIX = "pub.";
const TTL_MS = 5 * 60_000; // signing happens within seconds; the end report within the 2-minute call
function key(env: Env) {
  const base = env.SARVAM_VOICE_API_KEY?.trim();
  if (!base) return null;
  // Domain-separated: the provider key never signs anything else, and is never sent with these tokens.
  return createHmac("sha256", base).update("straypaw:kaju-voice:public-session:v1").digest();
}
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function mintPublicToken(sessionId: string, env: Env = process.env, now = Date.now()) {
  const k = key(env); if (!k) throw Error("Public voice is not configured.");
  const body = b64(JSON.stringify({ sid: sessionId, exp: now + TTL_MS, n: randomUUID() }));
  return `${PREFIX}${body}.${b64(createHmac("sha256", k).update(body).digest())}`;
}

export function isPublicToken(token: string) { return token.startsWith(PREFIX); }

/** Returns the session id, or null for anything forged, expired or malformed. */
export function readPublicToken(token: string, env: Env = process.env, now = Date.now()): string | null {
  const k = key(env);
  if (!k || !isPublicToken(token) || token.length > 512) return null;
  const [body, sig] = token.slice(PREFIX.length).split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", k).update(body).digest();
  const got = Buffer.from(sig, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { sid?: unknown; exp?: unknown };
    if (typeof data.sid !== "string" || !/^[0-9a-f-]{36}$/.test(data.sid) || typeof data.exp !== "number" || data.exp < now) return null;
    return data.sid;
  } catch { return null; }
}
