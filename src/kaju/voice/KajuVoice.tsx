"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { VOICE_ACCOUNTS, VOICE_PUBLIC, VOICE_TEST, accountVoiceFor } from "./availability";
import { PublicVoice } from "./PublicVoice";
import { WorkspaceVoice } from "./WorkspaceVoice";

/** Kaju Voice inside the app: the Kaju dock and the /kaju workspace. An
 * allowlisted account talks through its own session; everyone else, signed in
 * or not, through the public path (consent, bot check, limits; no tools or
 * records). The server decides every session either way. */
export function KajuVoice({ compact = false }: { compact?: boolean }) {
  const { user, ready } = useAuth();
  const [route, setRoute] = useState<"checking" | "account" | "public" | "off">("checking");
  useEffect(() => {
    if (VOICE_TEST) { setRoute("account"); return; }
    if (!ready) return;
    if (!user?.id || !VOICE_ACCOUNTS) { setRoute(VOICE_PUBLIC ? "public" : "off"); return; }
    let live = true;
    setRoute("checking");
    void accountVoiceFor(user.id).then((ok) => { if (live) setRoute(ok ? "account" : VOICE_PUBLIC ? "public" : "off"); });
    return () => { live = false; };
  }, [ready, user?.id]);

  if (route === "checking") return <p className="kvx-fine" role="status">Getting Kaju ready…</p>;
  if (route === "off") return <p className="kvx-unavailable">Kaju Voice is not available right now.</p>;
  if (route === "public") return <PublicVoice ready mode="on" compact={compact} />;
  return <WorkspaceVoice ready compact={compact} mode={VOICE_TEST ? (process.env.NODE_ENV === "development" ? "local" : "preview") : "production"} />;
}
