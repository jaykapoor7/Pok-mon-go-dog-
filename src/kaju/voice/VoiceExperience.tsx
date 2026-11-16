"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { Mic, MicOff, PhoneOff, RotateCcw } from "lucide-react";
import { Kaju } from "@/kaju/Kaju";
import type { KajuState } from "@/kaju/poses";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { VOICE_LANGUAGES, VOICE_TEST_HEADERS, type VoiceLanguage, type VoiceTestConfig } from "@/lib/kaju-voice/shared";
import { createVoiceTransport, type VoiceEvidence, type VoiceTransport } from "./transport";
import "@/kaju/kaju.css";
import "./voice.css";

/* One conversation with Kaju, the same in every place it is offered: the
   public page, the staff workspace and the preview. Kaju himself carries the
   state (his existing poses, never redrawn), one short line says it in words,
   and the transcript stays secondary: the latest line as a caption, the whole
   conversation one tap away. What is shown comes from real signals only: the
   SDK's state, the caller's finished turn, and the loudness of the actual
   microphone and reply audio. */

export type VoicePhase = "ready" | "connecting" | "listening" | "thinking" | "speaking" | "ended" | "error";
const POSE: Record<VoicePhase, KajuState> = { ready: "sitting", connecting: "looking", listening: "listening", thinking: "thinking", speaking: "explaining", ended: "goodbye", error: "concerned" };
const LANGUAGE_LABEL: Record<VoiceLanguage, { native: string; lang: string }> = {
  English: { native: "English", lang: "en" }, Hindi: { native: "हिन्दी", lang: "hi" }, Kannada: { native: "ಕನ್ನಡ", lang: "kn" },
};
const FROM_LOCALE: Record<string, VoiceLanguage> = { hi: "Hindi", kn: "Kannada" };
const LIMIT_MS = 120_000;
const empty: VoiceEvidence = { sent: false, received: false, interrupted: false };

type Props = {
  /** Server settings are complete for this deployment. */
  ready: boolean;
  /** A bearer credential for one attempt: the person's StrayPaw session, a public session, or a local code. */
  authorize: () => Promise<string>;
  /** The gate before Start is met (signed in, or consent given). */
  canStart: boolean;
  /** What stands before Start: sign-in, consent, a bot check. Hidden once a conversation begins. */
  gate?: ReactNode;
  /** Shown instead of the controls when this deployment cannot offer voice. */
  unavailable?: ReactNode;
  /** One plain line about where the audio goes. */
  privacy: ReactNode;
  /** Preview and next dev only: provider reference and audio observations. */
  diagnostics?: boolean;
  /** A new identity ends any conversation (and its transcript) from the last one. */
  identity?: string | null;
  /** Inside the Kaju dock: smaller Kaju, tighter spacing. */
  compact?: boolean;
};

export function VoiceExperience({ ready, authorize, canStart, gate, unavailable, privacy, diagnostics = false, identity = null, compact = false }: Props) {
  const calm = !!useReducedMotion();
  const { locale } = useLocale();
  const [language, setLanguage] = useState<VoiceLanguage>(FROM_LOCALE[locale] ?? "English");
  const [sdk, setSdk] = useState("idle");
  const [awaiting, setAwaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<{ role: "You" | "Kaju"; text: string }[]>([]);
  const [left, setLeft] = useState<number | null>(null);
  const [evidence, setEvidence] = useState<VoiceEvidence>(empty);
  const [reference, setReference] = useState("");
  const [usageWarning, setUsageWarning] = useState("");
  const agentRef = useRef<VoiceTransport | null>(null);
  const attemptRef = useRef(0);
  const timers = useRef<{ stop?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});
  const mounted = useRef(true);
  const stage = useRef<HTMLDivElement>(null);
  const level = useRef({ you: 0, kaju: 0, frame: 0 });
  const touchedLanguage = useRef(false);

  // Reached through an in-app link, this document still carries the previous
  // page's Permissions-Policy, which blocks the microphone (Chromium enforces
  // it; other engines ignore the header). Load this page as its own document,
  // once, so it gets its own policy.
  useEffect(() => {
    const doc = document as Document & { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } };
    const policy = doc.permissionsPolicy ?? doc.featurePolicy;
    const mark = `kvx-reload:${location.pathname}`;
    try {
      if (!policy?.allowsFeature || policy.allowsFeature("microphone")) { sessionStorage.removeItem(mark); return; }
      if (sessionStorage.getItem(mark)) return;
      sessionStorage.setItem(mark, "1");
    } catch { return; }
    location.reload();
  }, []);

  // Follow the site language until the person picks one themselves.
  useEffect(() => { if (!touchedLanguage.current) setLanguage(FROM_LOCALE[locale] ?? "English"); }, [locale]);

  const clearTimers = () => {
    if (timers.current.stop) clearTimeout(timers.current.stop);
    if (timers.current.tick) clearInterval(timers.current.tick);
    timers.current = {}; setLeft(null);
  };

  // Identity change or leaving the page ends capture and drops the transcript.
  useEffect(() => {
    mounted.current = true;
    setMessages([]); setReference(""); setBusy(false); setConnected(false); setMuted(false); setEnded(false);
    return () => {
      mounted.current = false; attemptRef.current += 1; clearTimers();
      void agentRef.current?.stop().catch(() => {}); agentRef.current = null;
    };
  }, [identity]);

  const paintLevel = (source: "you" | "kaju", value: number) => {
    if (calm) return;
    const l = level.current;
    l[source] = Math.max(value, l[source] * 0.82);
    if (l.frame) return;
    l.frame = requestAnimationFrame(() => {
      l.frame = 0;
      const el = stage.current; if (!el) return;
      const speaking = el.dataset.phase === "speaking";
      el.style.setProperty("--kvx-level", (speaking ? l.kaju : el.dataset.phase === "listening" ? l.you : 0).toFixed(3));
      l.you *= 0.9; l.kaju *= 0.9;
    });
  };

  const stop = async (why: "stopped" | "limit" = "stopped") => {
    attemptRef.current += 1; clearTimers();
    const agent = agentRef.current; agentRef.current = null;
    try { await agent?.stop(); } catch { /* the adapter also releases capture */ }
    if (mounted.current) {
      setBusy(false); setConnected(false); setMuted(false); setAwaiting(false); setSdk("idle"); setEnded(true);
      if (why === "limit") setError("The conversation reached its 2-minute limit. Start again to keep talking.");
    }
  };

  const start = async () => {
    if (busy || agentRef.current) return;
    const attempt = ++attemptRef.current;
    const current = () => mounted.current && attempt === attemptRef.current;
    setBusy(true); setConnected(false); setEnded(false); setError(""); setUsageWarning(""); setSdk("connecting"); setAwaiting(false);
    setMessages([]); setReference(""); setEvidence(empty);
    let flags = empty;
    let agent: VoiceTransport | null = null;
    let headers: Record<string, string> = {};
    const report = async (event: "client_connected" | "client_ended") => {
      const referenceId = agent?.reference(); if (!referenceId) return;
      try {
        const r = await fetch("/api/kaju/voice/events", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId, event, audioSent: flags.sent, audioReceived: flags.received, interrupted: flags.interrupted }),
          keepalive: true, signal: AbortSignal.timeout(7000) });
        if (!r.ok) throw Error("Usage event unavailable");
      } catch { if (current()) setUsageWarning("The session event could not be recorded."); }
    };
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw Error("This browser cannot use a microphone here. Open StrayPaw in Chrome, Safari or Firefox.");
      headers = { ...VOICE_TEST_HEADERS, Authorization: `Bearer ${await authorize()}` };
      const response = await fetch("/api/kaju/voice/config", { headers, cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) { const body = await response.json().catch(() => ({})); throw Error(typeof body.error === "string" ? body.error : "Kaju Voice is not available right now."); }
      const config: VoiceTestConfig = await response.json();
      if (!current()) return;
      agent = await createVoiceTransport({ config, language, headers,
        status: (state) => { if (!current()) return; setSdk(state); if (state === "speaking") setAwaiting(false); },
        transcript: (role, text) => {
          if (!current()) return;
          setMessages((old) => [...old.slice(-49), { role: role === "You" ? "You" : "Kaju", text }]);
          setAwaiting(role === "You");
        },
        evidence: (value) => { if (current()) { flags = value; setEvidence(value); } },
        level: paintLevel,
        failed: (kind) => { if (current()) setError(kind === "NotAllowedError" ? "Microphone access is blocked. Allow it for straypaw.org in your browser, then try again." : kind === "NotFoundError" ? "No microphone was found. Connect one and try again." : "The connection to Kaju dropped. Check your internet, then start again."); },
        ended: () => {
          void report("client_ended");
          if (current()) { clearTimers(); agentRef.current = null; setBusy(false); setConnected(false); setMuted(false); setAwaiting(false); setSdk("idle"); setEnded(true); }
        },
      });
      if (!current()) { await agent.stop(); return; }
      agentRef.current = agent;
      const began = Date.now();
      timers.current.stop = setTimeout(() => { void stop("limit"); }, LIMIT_MS);
      timers.current.tick = setInterval(() => { const s = Math.ceil((LIMIT_MS - (Date.now() - began)) / 1000); setLeft(s <= 30 ? Math.max(0, s) : null); }, 1000);
      await agent.start();
      if (!current()) { await agent.stop(); return; }
      if (!agent.isConnected()) throw Error("The conversation ended before it connected. Start again.");
      setConnected(true); setReference(agent.interaction() ?? agent.reference() ?? "");
      void report("client_connected");
    } catch (err) {
      if (current()) { setError((old) => old || (err instanceof Error ? err.message : "Kaju could not connect.")); await stop(); setEnded(false); }
      else await agent?.stop().catch(() => {});
    }
  };

  const toggleMute = () => {
    const agent = agentRef.current; if (!agent) return;
    if (agent.isMuted()) agent.unmute(); else agent.mute();
    setMuted(agent.isMuted());
  };

  const phase: VoicePhase = error && !busy ? "error"
    : !busy ? (ended ? "ended" : "ready")
    : sdk === "speaking" ? "speaking"
    : connected && (sdk === "listening" || sdk === "connected") ? (awaiting ? "thinking" : "listening")
    : "connecting";
  const status = !ready ? "Kaju Voice is not available right now."
    : phase === "ready" ? "Choose a language, then press Start talking."
    : phase === "connecting" ? "Connecting to Kaju…"
    : phase === "listening" ? (muted ? "Your microphone is off." : "Kaju is listening.")
    : phase === "thinking" ? "Kaju is preparing a reply."
    : phase === "speaking" ? "Kaju is speaking. Speak any time to interrupt."
    : phase === "ended" ? "Conversation ended."
    : "Kaju could not continue.";
  const caption = messages.at(-1);
  const inCall = busy;

  return (
    <section className={`kvx${compact ? " is-compact" : ""}`} aria-label="Conversation with Kaju">
      <div ref={stage} className={`kvx-stage${calm ? " is-calm" : ""}`} data-phase={phase}>
        <span className="kvx-halo" aria-hidden />
        <Kaju state={POSE[phase]} size={compact ? 136 : 208} still={calm} className="kvx-kaju" label="Kaju" />
      </div>

      <p className="kvx-status" role="status">
        {status}{left !== null && inCall ? <span>{` ${left} seconds left.`}</span> : null}
      </p>
      {inCall || caption ? <p className="kvx-caption">
        {caption ? <><span className="kvx-who">{caption.role === "You" ? "You" : "Kaju"}</span> {caption.text}</> : null}
      </p> : null}

      {unavailable && !ready ? <div className="kvx-unavailable">{unavailable}</div> : <>
        {!inCall ? <fieldset className="kvx-langs">
          <legend>Start in</legend>
          {VOICE_LANGUAGES.map((name) => (
            <label key={name} className="kvx-lang" lang={LANGUAGE_LABEL[name].lang}>
              <input type="radio" name="kvx-language" value={name} checked={language === name}
                onChange={() => { touchedLanguage.current = true; setLanguage(name); }} />
              <span translate="no">{LANGUAGE_LABEL[name].native}</span>
            </label>
          ))}
        </fieldset> : null}

        {!inCall && gate ? <div className="kvx-gate">{gate}</div> : null}

        <div className="kvx-controls">
          {inCall ? <>
            <button type="button" className="kvx-btn is-end" onClick={() => void stop()}><PhoneOff size={20} aria-hidden />End</button>
            <button type="button" className="kvx-btn is-quiet" aria-pressed={muted} disabled={!connected} onClick={toggleMute}>
              {muted ? <MicOff size={20} aria-hidden /> : <Mic size={20} aria-hidden />}{muted ? "Unmute" : "Mute"}
            </button>
          </> : (
            <button type="button" className="kvx-btn is-start" disabled={!ready || !canStart} onClick={() => void start()}>
              {ended || phase === "error" ? <RotateCcw size={20} aria-hidden /> : <Mic size={20} aria-hidden />}
              {ended || phase === "error" ? "Talk again" : "Start talking"}
            </button>
          )}
        </div>
      </>}

      {error ? <p className="kvx-alert" role="alert">{error}</p> : null}
      {diagnostics && usageWarning ? <p className="kvx-alert" role="alert">{usageWarning}</p> : null}

      {messages.length ? <details className="kvx-log">
        <summary>{`Show the conversation (${messages.length})`}</summary>
        <ol role="log" aria-label="Conversation transcript">
          {messages.map((m, i) => <li key={i} className={m.role === "You" ? "is-you" : "is-kaju"}><span className="kvx-who">{m.role === "You" ? "You" : "Kaju"}</span>{m.text}</li>)}
        </ol>
      </details> : null}

      {diagnostics && (inCall || reference) ? <p className="kvx-fine">
        Voice interaction: {reference || "not yet"} · Audio sent: {evidence.sent ? "yes" : "not yet"} · Audio received: {evidence.received ? "yes" : "not yet"} · Interrupted: {evidence.interrupted ? "yes" : "not yet"}
      </p> : null}
      <p className="kvx-fine">{privacy}</p>
    </section>
  );
}
