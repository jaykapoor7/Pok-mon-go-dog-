"use client";

/* Kaju's voice for bite help: it says each question aloud and listens for the answer, so a resident can report a
   bite without typing. Both halves are the browser's own: speech recognition (in Chrome and Edge, the vendor's
   speech service; in Safari, Apple's) turns the answer into text, and speech synthesis reads Kaju's fixed lines.
   No audio or text reaches StrayPaw until the person confirms the notice, and no AI model is involved: what Kaju
   understands is src/oh/biteIntake.ts, fixed rules on the device. English (India) for now. */

export type Heard = { text: string } | { error: VoiceProblem };
export type VoiceProblem = "unsupported" | "denied" | "no-mic" | "insecure" | "network" | "no-speech" | "failed";

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

/** What to tell the person when voice cannot run, in words they can act on. */
export function problemText(p: VoiceProblem): string {
  const brave = typeof navigator !== "undefined" && "brave" in navigator;
  switch (p) {
    case "unsupported": return "This browser cannot listen. Use Chrome, Edge or Safari for voice, or type to Kaju below.";
    case "denied": return "The microphone is blocked for this site. Click the icon at the left of the address bar, allow the microphone, then press Talk to Kaju again. Or type below.";
    case "no-mic": return "No microphone was found. Plug one in, or type to Kaju below.";
    case "insecure": return "Voice needs a secure (https) page. Type to Kaju below.";
    case "network": return brave ? "Brave switches off the browser's speech service. Use Chrome, Edge or Safari for voice, or type below." : "The browser's speech service could not be reached. Check the connection and press the mic to try again, or type below.";
    case "no-speech": return "I did not hear anything. Press the mic and answer, or tap an answer.";
    default: return "Voice stopped unexpectedly. Press the mic to try again, or type below.";
  }
}

/** Asks for the microphone once, so a blocked or missing one is explained before Kaju starts talking. */
export async function checkMic(): Promise<VoiceProblem | null> {
  if (!canListen()) return "unsupported";
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return null; /* recognition asks for itself */
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((t) => t.stop());
    return null;
  } catch (e) {
    const n = (e as { name?: string }).name;
    return n === "NotAllowedError" || n === "SecurityError" ? "denied" : n === "NotFoundError" || n === "OverconstrainedError" ? "no-mic" : null;
  }
}

let voice: SpeechSynthesisVoice | null = null;
const pickVoice = () => {
  if (!canSpeak()) return null;
  const all = window.speechSynthesis.getVoices();
  return all.find((v) => v.lang === "en-IN") ?? all.find((v) => /^en[-_]IN/i.test(v.lang)) ?? all.find((v) => v.lang === "en-GB") ?? all.find((v) => /^en/i.test(v.lang)) ?? null;
};
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  voice = pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => { voice = pickVoice(); });
}

/** Says a line, sentence by sentence (Chrome cuts long utterances short). Resolves when it is said, or when it is
    stopped; a browser that never reports the end is given the time the words take. */
export function speak(line: string, signal: AbortSignal): Promise<void> {
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
      u.lang = voice?.lang ?? "en-IN"; if (voice) u.voice = voice; u.rate = 1;
      let moved = false;
      const go = () => { if (moved) return; moved = true; window.clearTimeout(timer); next(); };
      u.onend = go; u.onerror = go;
      window.clearTimeout(timer);
      timer = window.setTimeout(go, 1500 + u.text.split(/\s+/).length * 450);
      synth.speak(u);
    };
    synth.cancel();
    /* Chrome drops an utterance queued in the same tick as cancel(). */
    window.setTimeout(next, 60);
  });
}

/** Listens for one answer. Interim words go to onWords as they are heard; finish.current ends the answer early. */
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
