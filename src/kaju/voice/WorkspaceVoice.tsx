"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import type { VoiceMode } from "@/lib/kaju-voice/deployment";
import { StagingSignIn } from "./StagingSignIn";
import { VoiceExperience } from "./VoiceExperience";

/** Kaju Voice for a signed-in person. production: the StrayPaw account only.
 * preview: the staging tester sign-in. local: next dev with a local access code. */
export function WorkspaceVoice({ ready, mode }: { ready: boolean; mode: VoiceMode }) {
  const { user, openSignIn, ready: authReady } = useAuth();
  const [localCode, setLocalCode] = useState("");
  const authorize = async () => {
    if (mode === "local" && localCode.trim()) return localCode.trim();
    const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
    if (!token) throw Error("Sign in to StrayPaw to talk with Kaju.");
    return token;
  };
  const gate = mode === "production" ? (authReady && !user ? <div className="kv-access">
      <p className="kv-note">Sign in to StrayPaw to talk with Kaju.</p>
      <button type="button" onClick={openSignIn}>Sign in</button>
    </div> : null)
    : mode === "preview" ? (!user ? <StagingSignIn /> : <p className="kv-note">Signed in as {user.email}</p>)
    : <div className="kv-access">
      <label htmlFor="kv-access">Local voice access code</label>
      <input id="kv-access" type="password" autoComplete="off" spellCheck={false} value={localCode}
        onChange={(e) => setLocalCode(e.target.value)} aria-describedby="kv-access-help" />
      <p className="kv-note" id="kv-access-help">Use SARVAM_VOICE_LOCAL_TOKEN from your local configuration. Keep the Sarvam API key on the server.</p>
      <button type="button" onClick={() => { if (user) setLocalCode(""); else openSignIn(); }}>{user ? "Use your signed-in StrayPaw account instead" : "Sign in to StrayPaw instead"}</button>
    </div>;
  return <VoiceExperience ready={ready} authorize={authorize} identity={user?.id ?? null}
    canStart={mode === "local" ? !!(localCode.trim() || user) : !!user} gate={gate}
    unavailable={<p>Kaju Voice is not available right now.</p>}
    diagnostics={mode !== "production"}
    privacy={mode === "production"
      ? "A conversation stops after 2 minutes. The words stay on this page only. StrayPaw records when each conversation starts and ends, never its audio or words. Sarvam handles the audio under its own data retention settings."
      : "Stops after 2 minutes. Transcript stays on this page; session metadata is recorded in the staging workspace. Sarvam workspace retention settings still apply."} />;
}
