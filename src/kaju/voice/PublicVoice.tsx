"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { HAS_TURNSTILE, Turnstile } from "@/components/ui/Turnstile";
import { getSupabase } from "@/lib/supabase";
import { VOICE_TEST_HEADERS } from "@/lib/kaju-voice/shared";
import { VoiceExperience } from "./VoiceExperience";

/** Kaju Voice for anyone, without a StrayPaw account. "owner": the same
 * public path, but only an allowlisted signed-in account can start, so the
 * owner verifies it on the live site before it opens. */
export function PublicVoice({ ready, mode, compact = false }: { ready: boolean; mode: "owner" | "on"; compact?: boolean }) {
  const { user, openSignIn, ready: authReady } = useAuth();
  const [consent, setConsent] = useState(false);
  const [human, setHuman] = useState<string | null>(null);
  const [round, setRound] = useState(0); // a bot-check token works once

  const authorize = async () => {
    const headers: Record<string, string> = { ...VOICE_TEST_HEADERS, "Content-Type": "application/json" };
    if (mode === "owner") {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) throw Error("Sign in to StrayPaw to try Kaju Voice before it opens to everyone.");
      headers.Authorization = `Bearer ${token}`;
    }
    const used = human;
    setHuman(null); setRound((n) => n + 1);
    const r = await fetch("/api/kaju/voice/public/session", { method: "POST", headers, cache: "no-store", signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({ consent, turnstile: used }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || typeof body.token !== "string") throw Error(typeof body.error === "string" ? body.error : "Kaju Voice is not available right now.");
    return body.token as string;
  };

  const gate = <>
    <label className="kvx-consent">
      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
      <span><span>I understand Kaju is an automated assistant and my voice is processed to hold this conversation.</span> <a href="/privacy">Privacy</a></span>
    </label>
    {HAS_TURNSTILE ? <div className="kvx-check"><Turnstile key={round} onVerify={setHuman} /></div> : null}
    {mode === "owner" && authReady && !user ? <p className="kvx-fine"><span>Kaju Voice is not open to everyone yet.</span> <button type="button" className="kvx-link" onClick={openSignIn}>Sign in to try it</button></p> : null}
  </>;

  return <VoiceExperience ready={ready && HAS_TURNSTILE} authorize={authorize} identity={user?.id ?? "public"} compact={compact}
    canStart={consent && !!human && (mode === "on" || !!user)} gate={gate}
    unavailable={<p>Kaju Voice is not available right now. Please try again later.</p>}
    privacy="A conversation stops after 2 minutes. The words stay on this screen only. StrayPaw records when each conversation starts and ends, never its audio or words." />;
}
