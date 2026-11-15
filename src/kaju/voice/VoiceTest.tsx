"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { VOICE_LANGUAGES, VOICE_TEST_HEADERS, type VoiceLanguage, type VoiceTestConfig } from "@/lib/kaju-voice/shared";
import { StagingSignIn } from "./StagingSignIn";
import { createVoiceTransport, type VoiceTransport, type VoiceEvidence } from "./transport";

const emptyEvidence = { sent: false, received: false, interrupted: false };
const STATUS: Record<string, string> = { idle: "Ready", connecting: "Connecting", connected: "Connected", listening: "Listening", speaking: "Speaking", error: "Connection failed" };

export function VoiceTest({ ready, preview = false }: { ready: boolean; preview?: boolean }) {
  const { user, openSignIn } = useAuth();
  const [localCode, setLocalCode] = useState("");
  const [language, setLanguage] = useState<VoiceLanguage>("English");
  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const [usageWarning, setUsageWarning] = useState("");
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [interaction, setInteraction] = useState("");
  const [evidence, setEvidence] = useState<VoiceEvidence>(emptyEvidence);
  const agentRef = useRef<VoiceTransport | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // Identity change/unmount ends capture and prevents cross-account transcripts.
  useEffect(() => {
    mounted.current = true;
    setMessages([]); setInteraction(""); setBusy(false); setConnected(false); setMuted(false);
    return () => {
      mounted.current = false; attemptRef.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      void agentRef.current?.stop().catch(() => {}); agentRef.current = null;
    };
  }, [user?.id]);

  const stop = async () => {
    attemptRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const agent = agentRef.current; agentRef.current = null;
    try { await agent?.stop(); } catch { /* Capture cleanup is also in the adapter. */ }
    if (mounted.current) { setBusy(false); setConnected(false); setMuted(false); setStatus("Stopped"); }
  };

  const start = async () => {
    if (busy || agentRef.current) return;
    const attempt = ++attemptRef.current;
    const current = () => mounted.current && attempt === attemptRef.current;
    setBusy(true); setConnected(false); setError(""); setUsageWarning(""); setStatus("Connecting"); setMessages([]); setInteraction("");
    setEvidence(emptyEvidence);
    let sessionEvidence = emptyEvidence;
    let agent: VoiceTransport | null = null;
    let headers: Record<string, string> = {};
    const report = async (event: "client_connected" | "client_ended") => {
      const referenceId = agent?.reference(); if (!referenceId) return;
      try {
        const r = await fetch("/api/kaju/voice/events", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId, event, audioSent: sessionEvidence.sent, audioReceived: sessionEvidence.received, interrupted: sessionEvidence.interrupted }),
          keepalive: true, signal: AbortSignal.timeout(7000) });
        if (!r.ok) throw Error("Usage event unavailable");
      } catch { if (current()) setUsageWarning("The session event could not be recorded."); }
    };
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Error("Use localhost or HTTPS so the browser can access your microphone.");
      const session = (await getSupabase()?.auth.getSession())?.data.session;
      const token = (!preview && localCode.trim()) || session?.access_token;
      if (!token) throw Error("Sign in to StrayPaw to start Kaju Voice.");
      headers = { ...VOICE_TEST_HEADERS, Authorization: `Bearer ${token}` };
      const response = await fetch("/api/kaju/voice/config", { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw Error(typeof body.error === "string" ? body.error : "Voice configuration is unavailable."); }
      const config: VoiceTestConfig = await response.json();
      if (!current()) return;
      agent = await createVoiceTransport({ config, language, headers,
        status: (state) => { if (current()) setStatus(STATUS[state] ?? "Connecting"); },
        transcript: (role, text) => { if (current()) setMessages((old) => [...old.slice(-49), { role, text }]); },
        evidence: (value) => { if (current()) { sessionEvidence = value; setEvidence(value); } },
        failed: (kind) => { if (current()) setError(kind === "NotAllowedError" ? "Allow microphone access for this page, then try again." : kind === "NotFoundError" ? "No microphone was found. Connect one and try again." : "Voice connection failed. Check microphone access and the server's Voice Agents configuration."); },
        ended: () => {
          void report("client_ended");
          if (current()) {
            if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null;
            agentRef.current = null; setBusy(false); setConnected(false); setMuted(false); setStatus("Ended");
          }
        },
      });
      if (!current()) { await agent.stop(); return; }
      agentRef.current = agent;
      timerRef.current = setTimeout(() => { void stop(); }, 120_000);
      await agent.start();
      if (!current()) { await agent.stop(); return; }
      if (!agent.isConnected()) throw Error("The voice session ended before it connected.");
      setConnected(true); setInteraction(agent.interaction() ?? agent.reference());
      void report("client_connected");
    } catch (err) {
      if (current()) {
        setError((old) => old || (err instanceof Error ? err.message : "Kaju could not connect.")); await stop();
      } else { await agent?.stop().catch(() => {}); }
    }
  };

  return <section aria-label="Kaju voice conversation" className="kv-test">
    {preview ? (!user ? <StagingSignIn /> : <p className="kv-note">Signed in as {user.email}</p>) : <div className="kv-access">
      <label htmlFor="kv-access">Local voice access code</label>
      <input id="kv-access" type="password" autoComplete="off" spellCheck={false} value={localCode} disabled={busy}
        onChange={(e) => setLocalCode(e.target.value)} aria-describedby="kv-access-help" />
      <p className="kv-note" id="kv-access-help">Use SARVAM_VOICE_LOCAL_TOKEN from your local configuration. Keep the Sarvam API key on the server.</p>
      <button type="button" disabled={busy} onClick={() => { if (user) setLocalCode(""); else openSignIn(); }}>{user ? "Use your signed-in StrayPaw account instead" : "Sign in to StrayPaw instead"}</button>
    </div>}
    <label htmlFor="kv-language">Starting language</label>
    <select id="kv-language" value={language} disabled={busy} onChange={(e) => setLanguage(e.target.value as VoiceLanguage)}>
      {VOICE_LANGUAGES.map((name) => <option key={name}>{name}</option>)}
    </select>
    <div className="kv-actions">
      <button onClick={() => void start()} disabled={!ready || busy || (preview && !user)}>Start conversation</button>
      <button onClick={() => void stop()} disabled={!busy}>Stop</button>
      <button disabled={!connected} onClick={() => {
        const agent = agentRef.current; if (!agent) return;
        if (agent.isMuted()) agent.unmute(); else agent.mute(); setMuted(agent.isMuted());
      }}>{muted ? "Unmute" : "Mute"}</button>
    </div>
    <p role="status">{ready ? status : "Not connected · setup needed"}{muted ? " · Microphone muted" : ""}</p>
    {error ? <p role="alert">{error}</p> : null}
    {usageWarning ? <p role="alert">{usageWarning}</p> : null}
    {interaction ? <p className="kv-note">Sarvam interaction: {interaction}</p> : null}
    {busy || interaction ? <p className="kv-note">Audio sent: {evidence.sent ? "yes" : "not yet"} · Audio received: {evidence.received ? "yes" : "not yet"} · Interrupted: {evidence.interrupted ? "yes" : "not yet"}</p> : null}
    <ol className="kv-transcript" aria-live="polite" aria-label="Conversation transcript">
      {messages.map((msg, index) => <li key={index}><strong>{msg.role}:</strong> {msg.text}</li>)}
    </ol>
    <p className="kv-note">Stops after 2 minutes. Transcript stays on this page; session metadata is recorded in the staging workspace. Sarvam workspace retention settings still apply.</p>
  </section>;
}
