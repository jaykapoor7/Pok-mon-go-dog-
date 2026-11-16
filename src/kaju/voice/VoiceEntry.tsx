"use client";

import { useEffect, useState } from "react";
import { Mic } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { VOICE_TEST_HEADERS } from "@/lib/kaju-voice/shared";

/* NEXT_PUBLIC_KAJU_VOICE_TEST: the staging preview and next dev, where the
   voice page itself offers the tester sign-in, so the link always shows.
   NEXT_PUBLIC_KAJU_VOICE: production, where the link shows only to a signed-in
   person the server says may use voice, so nobody is sent to a dead end.
   No SDK is loaded until the person starts a conversation. */
const ALWAYS = process.env.NEXT_PUBLIC_KAJU_VOICE_TEST === "true";
const CHECKED = process.env.NEXT_PUBLIC_KAJU_VOICE === "true";
/* NEXT_PUBLIC_KAJU_VOICE_PUBLIC=on: everyone else, signed in or not, gets the
   public conversation (/talk): no account, no tools, no records. */
const PUBLIC = process.env.NEXT_PUBLIC_KAJU_VOICE_PUBLIC === "on";

// One check per account per page load, shared by the dock and the workspace.
const checks = new Map<string, Promise<boolean>>();
function availableFor(userId: string) {
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

export function VoiceEntry({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    setAllowed(false);
    if (ALWAYS || !CHECKED || !user?.id) return;
    let live = true;
    void availableFor(user.id).then((ok) => { if (live) setAllowed(ok); });
    return () => { live = false; };
  }, [user?.id]);
  const href = ALWAYS || (CHECKED && allowed) ? "/kaju/voice" : PUBLIC ? "/talk" : null;
  if (!href) return null;
  // Full navigation loads the voice page's microphone Permissions-Policy.
  // A client-side transition would retain the previous document's denial.
  // App button classes: 44px touch targets on phones come from nx.css.
  return <a href={href} className={compact ? "nx-ib" : "nx-btn is-quiet"} aria-label="Kaju Voice" title="Kaju Voice">
    <Mic size={15} aria-hidden />{compact ? null : "Kaju Voice"}
  </a>;
}
