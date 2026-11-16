"use client";

import { getSupabase } from "@/lib/supabase";
import { VOICE_TEST_HEADERS } from "@/lib/kaju-voice/shared";

/* Which Kaju Voice a browser is offered. Build-time public flags only; the
   server still decides every session.
   NEXT_PUBLIC_KAJU_VOICE_TEST   the staging preview and next dev
   NEXT_PUBLIC_KAJU_VOICE        allowlisted accounts (checked by the server)
   NEXT_PUBLIC_KAJU_VOICE_PUBLIC everyone else, through the public path */
export const VOICE_TEST = process.env.NEXT_PUBLIC_KAJU_VOICE_TEST === "true";
export const VOICE_ACCOUNTS = process.env.NEXT_PUBLIC_KAJU_VOICE === "true";
export const VOICE_PUBLIC = process.env.NEXT_PUBLIC_KAJU_VOICE_PUBLIC === "on";
export const VOICE_OFFERED = VOICE_TEST || VOICE_ACCOUNTS || VOICE_PUBLIC;

// One check per account per page load, shared by the dock and the workspace.
const checks = new Map<string, Promise<boolean>>();
export function accountVoiceFor(userId: string) {
  let check = checks.get(userId);
  if (!check) {
    check = (async () => {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) return false;
      const r = await fetch("/api/kaju/voice/access", { headers: { ...VOICE_TEST_HEADERS, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      return r.ok && (await r.json()).available === true;
    })().catch(() => false);
    checks.set(userId, check);
  }
  return check;
}
