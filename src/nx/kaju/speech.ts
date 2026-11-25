"use client";

/* Speaking with Kaju inside the conversation: one spoken turn is recorded in the browser (16 kHz mono WAV, at most
   28 seconds, ending by itself after a pause), sent to /api/kaju/speech to become text, and asked like any typed
   question. The answer's words are fetched as audio and played. No audio is kept anywhere. */

export const LANGUAGE_NAMES: Record<string, string> = { "en-IN": "English", "hi-IN": "Hindi", "kn-IN": "Kannada", "ta-IN": "Tamil", "te-IN": "Telugu", "ml-IN": "Malayalam", "mr-IN": "Marathi", "bn-IN": "Bengali", "gu-IN": "Gujarati", "pa-IN": "Punjabi", "od-IN": "Odia" };

function wav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([buf], { type: "audio/wav" });
}
/** Any sample rate down to 16 kHz by averaging: enough for speech, with no extra library. */
function to16k(chunks: Float32Array[], from: number): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0), all = new Float32Array(total);
  let at = 0; for (const c of chunks) { all.set(c, at); at += c.length; }
  if (from === 16_000) return all;
  const ratio = from / 16_000, out = new Float32Array(Math.floor(total / ratio));
  for (let i = 0; i < out.length; i++) { const a = Math.floor(i * ratio), b = Math.min(total, Math.floor((i + 1) * ratio)); let s = 0; for (let j = a; j < b; j++) s += all[j]; out[i] = s / Math.max(1, b - a); }
  return out;
}

export type Recording = { stop: () => void; cancel: () => void; done: Promise<Blob | null> };
/** Record one turn. Ends when the person stops speaking for about a second, when stop() is called, or at 28 seconds.
    Resolves with null when nothing was said or it was cancelled. Throws when the microphone is refused. */
export async function recordTurn(onLevel: (level: number) => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream), proc = ctx.createScriptProcessor(4096, 1, 1);
  const kept: Float32Array[] = [];
  let spoke = 0, loudAt = 0, noise = 0.004, over = false, cancelled = false;
  const t0 = performance.now();
  let finish: (b: Blob | null) => void = () => undefined;
  const done = new Promise<Blob | null>((r) => { finish = r; });
  const end = () => {
    if (over) return; over = true;
    try { proc.disconnect(); src.disconnect(); } catch { /* already gone */ }
    stream.getTracks().forEach((t) => t.stop()); void ctx.close().catch(() => undefined); onLevel(0);
    finish(cancelled || !spoke || !kept.length ? null : wav(to16k(kept, ctx.sampleRate).slice(0, 16_000 * 28), 16_000));
  };
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0);
    let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    const rms = Math.sqrt(s / d.length), now = performance.now();
    onLevel(Math.min(1, rms * 9));
    noise = Math.min(noise * 1.01, Math.max(rms, 0.002));
    const loud = rms > Math.max(0.014, noise * 3);
    if (loud) { if (!spoke) spoke = now; loudAt = now; }
    kept.push(new Float32Array(d));
    /* Before any words, keep only the last half second, so the turn starts just ahead of the voice. */
    if (!spoke && kept.length > 6) kept.shift();
    if (spoke ? now - loudAt > 1300 || now - spoke > 27_000 : now - t0 > 9_000) end();
  };
  src.connect(proc); proc.connect(ctx.destination);
  return { stop: end, cancel: () => { cancelled = true; end(); }, done };
}

export type Heard = { text: string; lang: string | null } | { error: string };
export async function hearTurn(audio: Blob, token: string, signal?: AbortSignal): Promise<Heard> {
  try {
    const r = await fetch("/api/kaju/speech?op=hear", { method: "POST", headers: { "Content-Type": "audio/wav", Authorization: `Bearer ${token}` }, body: audio, signal });
    const j = (await r.json().catch(() => ({}))) as { transcript?: string; lang?: string | null; confidence?: number | null; error?: string };
    if (!r.ok) return { error: j.error ?? "The voice service could not be reached. Try again." };
    const text = (j.transcript ?? "").trim();
    return text ? { text, lang: j.lang ?? null } : { error: "I could not hear any words. Try again." };
  } catch { return { error: "The voice service could not be reached. Try again." }; }
}

/** What is read aloud: the answer's words without its markup, and only the opening when the answer is long. */
export function spokenText(text: string) {
  const plain = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^\s*[-•]\s+/gm, "").replace(/[#_`>|]/g, " ").replace(/\s*\n+\s*/g, ". ").replace(/\.\s*\./g, ".").replace(/\s+/g, " ").trim();
  if (plain.length <= 520) return plain;
  const cut = plain.slice(0, 520), stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("। "), cut.lastIndexOf("? "));
  return stop > 200 ? cut.slice(0, stop + 1) : cut;
}

let player: HTMLAudioElement | null = null;
/** Called from the tap that starts a spoken turn, so the browser lets the answer play without another tap. */
export function unlockPlayback() {
  if (typeof window === "undefined") return;
  player ??= new Audio();
  try { player.muted = true; player.src = URL.createObjectURL(wav(new Float32Array(800), 16_000)); void player.play().catch(() => undefined).finally(() => { if (player) player.muted = false; }); } catch { /* the answer simply waits for a tap */ }
}
export function stopPlayback() { try { player?.pause(); } catch { /* nothing playing */ } }
/** Say an answer aloud. Resolves true when it played to the end, false when it could not start or was stopped. */
export async function sayAnswer(text: string, lang: string, token: string, signal: AbortSignal, onStart?: () => void): Promise<boolean> {
  const line = spokenText(text); if (!line) return false;
  let j: { audio?: string; type?: string };
  try {
    const r = await fetch("/api/kaju/speech?op=speak", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: line, lang }), signal });
    if (!r.ok) return false;
    j = await r.json();
  } catch { return false; }
  if (signal.aborted || !j.audio) return false;
  player ??= new Audio();
  const a = player;
  return new Promise((done) => {
    let ended = false;
    const finish = (ok: boolean) => { if (ended) return; ended = true; a.onended = null; a.onerror = null; signal.removeEventListener("abort", stop); done(ok); };
    const stop = () => { a.pause(); finish(false); };
    signal.addEventListener("abort", stop);
    a.onended = () => finish(true); a.onerror = () => finish(false);
    a.src = `data:${j.type ?? "audio/mpeg"};base64,${j.audio}`;
    a.play().then(() => onStart?.()).catch(() => finish(false));
  });
}
