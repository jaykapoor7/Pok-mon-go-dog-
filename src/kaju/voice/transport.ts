import type { AsyncAudioInterface, ConversationAgent, InteractionConfig } from "sarvam-conv-ai-sdk/browser";
import type { VoiceLanguage, VoiceTestConfig } from "@/lib/kaju-voice/shared";

type SDK = typeof import("sarvam-conv-ai-sdk/browser");
export type VoiceEvidence = { sent: boolean; received: boolean; interrupted: boolean };
type Options = {
  config: VoiceTestConfig; language: VoiceLanguage; headers: Record<string, string>;
  status: (state: string) => void; transcript: (role: string, text: string) => void;
  evidence: (value: VoiceEvidence) => void; ended: () => void; failed: (kind: string) => void;
  /** Loudness of the latest 16-bit PCM chunk, 0 to 1: the caller's microphone or Kaju's reply. UI only; nothing leaves the page. */
  level?: (source: "you" | "kaju", value: number) => void;
};

/** RMS of little-endian 16-bit PCM, normalised to 0..1. */
export function pcmLevel(data: Uint8Array) {
  const samples = data.byteLength >> 1;
  if (!samples) return 0;
  const view = new DataView(data.buffer, data.byteOffset, samples * 2);
  let sum = 0;
  for (let i = 0; i < samples; i++) { const v = view.getInt16(i * 2, true) / 32768; sum += v * v; }
  return Math.min(1, Math.sqrt(sum / samples) * 4);
}

/** Official SDK adapter, isolated from UI, records, identity and billing.
 * Injectable loader is for lifecycle tests, never a production fallback. */
export async function createVoiceTransport(options: Options, load: () => Promise<SDK> = () => import("sarvam-conv-ai-sdk/browser")) {
  const sdk = await load();
  const audio = new sdk.BrowserAudioInterface(16000);
  let disposed = false;
  let ended = false;
  let flags: VoiceEvidence = { sent: false, received: false, interrupted: false };
  let agent: ConversationAgent;
  const end = () => { if (!ended) { ended = true; options.ended(); } };
  const stop = async () => {
    disposed = true;
    try { await agent.stop(); } finally { await audio.stop(); end(); }
  };
  const fail = (kind: string) => {
    if (disposed) return;
    options.failed(kind);
    void stop().catch(() => {});
  };
  const guardedAudio: AsyncAudioInterface = {
    async start(callback) {
      if (disposed) return;
      try {
        await audio.start(async (data, frames) => { if (!disposed) { options.level?.("you", pcmLevel(data)); await callback(data, frames); } });
        if (disposed) await audio.stop();
      } catch (err) { await audio.stop(); fail(err instanceof Error ? err.name : "audio"); throw Error("Microphone unavailable"); }
    },
    async stop() { await audio.stop(); },
    async output(data, sampleRate) { if (!disposed) { options.level?.("kaju", pcmLevel(data)); await audio.output(data, sampleRate); } },
    interrupt() { audio.interrupt(); },
  };
  agent = new sdk.ConversationAgent({
    apiKey: "", baseUrl: "/api/kaju/voice/", customHeaders: options.headers,
    config: {
      org_id: options.config.org_id, workspace_id: options.config.workspace_id, app_id: options.config.app_id,
      version: options.config.version, user_identifier: options.config.user_identifier!, user_identifier_type: "custom",
      interaction_type: sdk.InteractionType.CALL, input_sample_rate: 16000, output_sample_rate: 16000,
      initial_language_name: options.language as InteractionConfig["initial_language_name"],
      // Server-issued only (see /api/kaju/voice/config); never typed in the browser.
      ...(options.config.agent_variables ? { agent_variables: options.config.agent_variables } : {}),
    },
    audioInterface: guardedAudio,
    stateCallback: (state) => { if (!disposed) options.status(state); },
    transcriptCallback: async (msg) => { if (!disposed) options.transcript(msg.role === "user" ? "You" : "Kaju", msg.content); },
    telemetryCallback: (event) => {
      if (disposed) return;
      if (event.name === "first_audio_packet_sent") flags = { ...flags, sent: true };
      else if (event.name === "first_audio_packet_received") flags = { ...flags, received: true };
      else if (event.name === "user_interrupted") flags = { ...flags, interrupted: true };
      else if (event.name === "ws_error" || event.name === "error") { fail("connection"); return; }
      else if (event.name === "ws_disconnected") { void stop().catch(() => {}); return; }
      options.evidence(flags);
    },
    endCallback: async () => { disposed = true; await audio.stop(); end(); },
  });
  return {
    async start() {
      if (disposed) return;
      try {
        await agent.start();
        // SDK start() can finish after Stop while a signed URL was pending.
        if (disposed) { await agent.stop(); await audio.stop(); return; }
        if (!(await agent.waitForConnect(15))) throw Error("Voice connection timed out");
        if (disposed) { await agent.stop(); await audio.stop(); }
      } catch { fail("connection"); throw Error("Voice connection failed"); }
    },
    stop,
    mute() { agent.mute(); }, unmute() { agent.unmute(); },
    isMuted: () => agent.isMuted(), isConnected: () => !disposed && agent.isConnected(),
    reference: () => agent.reference_id, interaction: () => agent.getInteractionId(),
  };
}
export type VoiceTransport = Awaited<ReturnType<typeof createVoiceTransport>>;
