"use client";

/* Kaju's voice for bite help. With Sarvam AI (the /api/oh/voice route, key on the server): the caller's answer is
   recorded on the device until they pause, turned into English text by Saaras whatever Indian language they speak,
   and Kaju's line is said by one Bulbul voice for the whole call, in English, Hindi or Kannada. Without it, the
   browser's own speech recognition and voice are used, with one voice chosen at the start of the call and kept.
   No AI model decides anything: what Kaju understands is src/oh/biteIntake.ts, fixed rules on the device. Nothing
   reaches StrayPaw until the person confirms the notice. */

export type VoiceProblem = "unsupported" | "denied" | "no-mic" | "insecure" | "network" | "no-speech" | "failed" | "busy";
export type Heard = { text: string; lang?: string | null } | { error: VoiceProblem };

/** What to tell the person when voice cannot run, in words they can act on. */
export function problemText(p: VoiceProblem): string {
  const brave = typeof navigator !== "undefined" && "brave" in navigator;
  switch (p) {
    case "unsupported": return "This browser cannot use the microphone here. Try Chrome, Edge or Safari, or chat with Kaju instead.";
    case "denied": return "The microphone is blocked for this site. Allow it from the icon at the left of the address bar, then call again.";
    case "no-mic": return "No microphone was found. Connect one, or chat with Kaju instead.";
    case "insecure": return "Voice needs a secure (https) page. Chat with Kaju instead.";
    case "network": return brave ? "Brave switches off the browser's speech service. Use Chrome, Edge or Safari, or chat instead." : "Kaju's voice could not be reached. Check the connection and call again, or chat instead.";
    case "no-speech": return "I didn't hear anything. Press Answer and speak, or tap an answer.";
    case "busy": return "Kaju's voice is busy just now. Try again in a minute, or chat instead.";
    default: return "The call dropped. Call again, or chat with Kaju instead.";
  }
}

/* ── Sarvam: Kaju's own voice and ears ── */
let ready: Promise<boolean> | null = null;
/** Whether this site can use Sarvam (asked once per page). */
export const sarvamReady = () => (ready ??= fetch("/api/oh/voice", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { sarvam: false })).then((j: { sarvam?: boolean }) => !!j.sarvam).catch(() => false));

/** Mono samples to a 16 kHz, 16-bit WAV, the format speech services read best. */
export function wav(samples: Float32Array, rate: number, to = 16_000): Blob {
  const step = rate / to, n = Math.floor(samples.length / step), pcm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * step), b = Math.min(samples.length, Math.floor((i + 1) * step));
    let s = 0; for (let k = a; k < b; k++) s += samples[k];
    const v = Math.max(-1, Math.min(1, s / Math.max(1, b - a)));
    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
  }
  const head = new DataView(new ArrayBuffer(44));
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) head.setUint8(o + i, t.charCodeAt(i)); };
  str(0, "RIFF"); head.setUint32(4, 36 + pcm.byteLength, true); str(8, "WAVE"); str(12, "fmt ");
  head.setUint32(16, 16, true); head.setUint16(20, 1, true); head.setUint16(22, 1, true); head.setUint32(24, to, true);
  head.setUint32(28, to * 2, true); head.setUint16(32, 2, true); head.setUint16(34, 16, true); str(36, "data"); head.setUint32(40, pcm.byteLength, true);
  return new Blob([head.buffer, pcm.buffer], { type: "audio/wav" });
}

/** The microphone for one call: opened once, then one answer at a time, each ending when the caller pauses. */
export class Ears {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private end: (() => void) | null = null;

  async open(): Promise<VoiceProblem | null> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) return "unsupported";
    if (!window.isSecureContext) return "insecure";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (e) {
      const n = (e as { name?: string }).name;
      return n === "NotAllowedError" || n === "SecurityError" ? "denied" : n === "NotFoundError" || n === "OverconstrainedError" ? "no-mic" : "failed";
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return "unsupported";
    this.ctx = new AC();
    return null;
  }
  close() { this.end?.(); this.stream?.getTracks().forEach((t) => t.stop()); void this.ctx?.close().catch(() => undefined); this.ctx = null; this.stream = null; }
  /** Ends the current answer now ("Done"). */
  stop() { this.end?.(); }

  /** Records one answer: waits up to 8 s for speech, ends after 0.9 s of quiet or 15 s of talking. */
  record(signal: AbortSignal, onLevel: (v: number) => void): Promise<Blob | "no-speech"> {
    const ctx = this.ctx, stream = this.stream;
    if (!ctx || !stream) return Promise.resolve("no-speech");
    void ctx.resume().catch(() => undefined);
    return new Promise((done) => {
      const src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(2048, 1, 1);
      const kept: Float32Array[] = [], before: Float32Array[] = [];
      const t0 = performance.now();
      /* The room's quiet level: the lowest recent loudness, drifting up slowly, so a caller who starts talking at
         once is not mistaken for background noise. */
      let started = 0, loudAt = 0, noise = 0.01, finished = false;
      const finish = () => {
        if (finished) return; finished = true; this.end = null;
        try { proc.disconnect(); src.disconnect(); } catch { /* already */ }
        signal.removeEventListener("abort", finish); onLevel(0);
        if (!started || signal.aborted) { done("no-speech"); return; }
        const all = new Float32Array(kept.reduce((n, c) => n + c.length, 0));
        let o = 0; for (const c of kept) { all.set(c, o); o += c.length; }
        done(wav(all, ctx.sampleRate));
      };
      this.end = finish;
      signal.addEventListener("abort", finish);
      proc.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0);
        let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
        const rms = Math.sqrt(s / d.length), now = performance.now();
        onLevel(Math.min(1, rms * 10));
        noise = Math.min(noise * 1.01, Math.max(rms, 0.002));
        const loud = rms > Math.max(0.015, noise * 3);
        const copy = new Float32Array(d);
        if (loud) { if (!started) { started = now; kept.push(...before); } loudAt = now; }
        if (started) kept.push(copy); else { before.push(copy); if (before.length > 4) before.shift(); }
        if (started ? now - loudAt > 900 || now - started > 15_000 : now - t0 > 8_000) finish();
      };
      src.connect(proc); proc.connect(ctx.destination);
    });
  }
}

/** Sends one recorded answer to Sarvam; the text comes back in English, with the language spoken. */
export async function hearSarvam(audio: Blob, signal: AbortSignal): Promise<Heard> {
  try {
    const r = await fetch("/api/oh/voice?op=hear", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: audio, signal });
    if (r.status === 429) return { error: "busy" };
    if (!r.ok) return { error: "network" };
    const j = (await r.json()) as { transcript?: string; lang?: string | null; p?: number | null };
    const text = (j.transcript ?? "").trim();
    return text ? { text, lang: j.p === null || j.p === undefined || j.p > 0.6 ? j.lang : null } : { error: "no-speech" };
  } catch { return signal.aborted ? { error: "no-speech" } : { error: "network" }; }
}

let player: HTMLAudioElement | null = null;
/** Called from the tap that starts the call, so the browser lets Kaju's voice play. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  player ??= new Audio();
  try { player.muted = true; player.src = URL.createObjectURL(wav(new Float32Array(1600), 16_000)); void player.play().catch(() => undefined).finally(() => { if (player) player.muted = false; }); } catch { /* the first line simply waits for a tap */ }
}
/** Kaju says a line in his Sarvam voice. onStart fires when the sound begins; resolves with what was said. */
export async function sayAloud(text: string, lang: string, signal: AbortSignal, onStart: () => void): Promise<{ said: string } | { error: VoiceProblem }> {
  let j: { audio: string; type: string; text: string };
  try {
    const r = await fetch("/api/oh/voice?op=speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, lang }), signal });
    if (r.status === 429) return { error: "busy" };
    if (!r.ok) return { error: "network" };
    j = await r.json();
  } catch { return signal.aborted ? { said: "" } : { error: "network" }; }
  if (signal.aborted) return { said: "" };
  player ??= new Audio();
  const a = player;
  return new Promise((done) => {
    const finish = () => { a.onended = null; a.onerror = null; signal.removeEventListener("abort", stop); done({ said: j.text }); };
    const stop = () => { a.pause(); finish(); };
    signal.addEventListener("abort", stop);
    a.onended = finish; a.onerror = finish;
    a.src = `data:${j.type};base64,${j.audio}`;
    a.play().then(onStart).catch(finish);
  });
}
export function hush() { try { player?.pause(); } catch { /* fine */ } try { window.speechSynthesis?.cancel(); } catch { /* fine */ } }

/* ── The browser's own speech: only when Sarvam is not available ── */
type Rec = {
  start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};
const Rec = (): (new () => Rec) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const canListen = () => !!Rec();
export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Asks for the microphone once, so a blocked or missing one is explained before Kaju starts talking. */
export async function checkMic(): Promise<VoiceProblem | null> {
  if (!canListen()) return "unsupported";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return null;
  try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach((t) => t.stop()); return null; } catch (e) {
    const n = (e as { name?: string }).name;
    return n === "NotAllowedError" || n === "SecurityError" ? "denied" : n === "NotFoundError" || n === "OverconstrainedError" ? "no-mic" : null;
  }
}

/** One voice for the whole call: chosen once the browser has listed its voices, never swapped mid-call. */
export async function lockVoice(): Promise<SpeechSynthesisVoice | null> {
  if (!canSpeak()) return null;
  const pick = () => {
    const all = window.speechSynthesis.getVoices(), en = all.filter((v) => /^en[-_]/i.test(v.lang));
    const good = (v: SpeechSynthesisVoice) => /natural|neural|online|google|samantha|daniel|serena|karen|moira/i.test(v.name);
    return en.find((v) => /^en[-_]IN/i.test(v.lang) && good(v)) ?? en.find((v) => /^en[-_]GB/i.test(v.lang) && good(v)) ?? en.find(good) ?? en.find((v) => /^en[-_]IN/i.test(v.lang)) ?? en[0] ?? null;
  };
  if (window.speechSynthesis.getVoices().length) return pick();
  await new Promise<void>((r) => { const t = window.setTimeout(r, 1200); window.speechSynthesis.addEventListener?.("voiceschanged", () => { window.clearTimeout(t); r(); }, { once: true }); });
  return pick();
}

/** Says a line with the browser's voice, sentence by sentence (Chrome cuts long utterances short). */
export function speak(line: string, signal: AbortSignal, voice: SpeechSynthesisVoice | null = null): Promise<void> {
  if (!canSpeak() || !line.trim()) return Promise.resolve();
  const synth = window.speechSynthesis;
  const parts = line.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [line];
  return new Promise((done) => {
    let i = 0, timer = 0;
    const finish = () => { window.clearTimeout(timer); signal.removeEventListener("abort", stop); done(); };
    const stop = () => { synth.cancel(); finish(); };
    signal.addEventListener("abort", stop);
    const next = () => {
      if (signal.aborted) return;
      if (i >= parts.length) { finish(); return; }
      const u = new SpeechSynthesisUtterance(parts[i++]);
      u.lang = voice?.lang ?? "en-IN"; if (voice) u.voice = voice; u.rate = 1.02;
      let moved = false;
      const go = () => { if (moved) return; moved = true; window.clearTimeout(timer); next(); };
      u.onend = go; u.onerror = go;
      window.clearTimeout(timer);
      timer = window.setTimeout(go, 1500 + u.text.split(/\s+/).length * 450);
      synth.speak(u);
    };
    synth.cancel();
    window.setTimeout(next, 60);
  });
}

/** Listens for one answer with the browser's recognition; finish.current ends it early. */
export function listen(onWords: (s: string) => void, signal: AbortSignal, finish?: { current: (() => void) | null }): Promise<Heard> {
  const R = Rec();
  if (!R) return Promise.resolve({ error: "unsupported" });
  return new Promise((done) => {
    const r = new R();
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    let said = "", settled = false, problem: VoiceProblem | null = null;
    const settle = (h: Heard) => { if (settled) return; settled = true; signal.removeEventListener("abort", stop); if (finish) finish.current = null; done(h); };
    const stop = () => { try { r.abort(); } catch { /* already stopped */ } settle({ text: "" }); };
    signal.addEventListener("abort", stop);
    r.onresult = (e) => { let s = ""; for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; said = s.trim(); onWords(said); };
    r.onerror = (e) => { problem = e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : e.error === "audio-capture" ? "no-mic" : e.error === "network" ? "network" : e.error === "no-speech" ? "no-speech" : e.error === "aborted" ? null : "failed"; };
    r.onend = () => settle(said ? { text: said } : { error: problem ?? "no-speech" });
    if (finish) finish.current = () => { try { r.stop(); } catch { /* already stopped */ } };
    try { r.start(); } catch { settle({ error: "failed" }); }
  });
}

/* Reading short spoken answers. */
const yesRe = /^(?:\s*(?:yes|yeah|yep|yup|yah|ya|sure|ok(?:ay)?|please|haan?|ha|correct|right|go ahead|do it|send|tell)\b)/i;
const noRe = /^(?:\s*(?:no|nope|nah|none|nothing|not really|neither|illa|nahi)\b)/i;
export function yesNo(s: string): "yes" | "no" | null {
  const t = s.toLowerCase().trim();
  if (noRe.test(t) || /\bnone of (?:these|them|this)\b/.test(t)) return "no";
  if (yesRe.test(t) || /\b(?:yes|please do|go ahead)\b/.test(t)) return "yes";
  return null;
}
export function whenWord(s: string): "today" | "yesterday" | "earlier" | null {
  const t = s.toLowerCase();
  if (/\b(today|this morning|this afternoon|this evening|just now|tonight|an? hour ago|few minutes)\b/.test(t)) return "today";
  if (/\b(yesterday|last night)\b/.test(t)) return "yesterday";
  if (/\b(earlier|before|last week|days? ago|week)\b/.test(t)) return "earlier";
  return null;
}
export const digits = (s: string) => {
  const words: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
  return s.toLowerCase().replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => words[w]).replace(/\D/g, "");
};
