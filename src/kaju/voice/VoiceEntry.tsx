"use client";

import { Mic } from "lucide-react";

/** No SDK is loaded until the person starts voice. Enabled only by the branch-scoped public flag. */
export function VoiceEntry({ compact = false }: { compact?: boolean }) {
  if (process.env.NEXT_PUBLIC_KAJU_VOICE_TEST !== "true") return null;
  // Full navigation loads the voice page's microphone Permissions-Policy.
  // A client-side transition would retain the previous document's denial.
  return <a href="/kaju/voice" className={compact ? "ai3-icon" : "nx-btn is-sm"} aria-label="Kaju Voice" title="Kaju Voice"
    style={{ minHeight: 44, minWidth: 44, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
    <Mic size={16} aria-hidden />{compact ? null : "Kaju Voice"}
  </a>;
}
